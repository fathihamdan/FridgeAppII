import { useState, useRef, useEffect } from 'react';
import { ChefHat, Clock, Users, Heart, Send } from 'lucide-react';
import { FridgeItem } from '../App';

interface RecipesScreenProps {
  fridgeItems: FridgeItem[];
  onUpdateFridgeItems: (items: FridgeItem[]) => void;
}

interface Recipe {
  id: string;
  name: string;
  image: string;
  time: number;
  servings: number;
  ingredients: string[];
  instructions: string[];
  matchPercentage: number;
}

interface Message {
  id: string;
  role: 'user';
  content: string;
}

export function RecipesScreen({ fridgeItems, onUpdateFridgeItems }: RecipesScreenProps) {
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isInitialState = messages.length === 0 && recipes.length === 0;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [recipes]);

  // Load favorites from localStorage on mount
  useEffect(() => {
    const savedFavorites = localStorage.getItem('favoriteRecipes');
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  }, []);

  // Save favorites to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('favoriteRecipes', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (recipeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev =>
      prev.includes(recipeId)
        ? prev.filter(id => id !== recipeId)
        : [...prev, recipeId]
    );
  };

  const generateRecipes = async (userMessage: string): Promise<Recipe[]> => {
    const fridgeContext = fridgeItems.map(item => {
      const today = new Date();
      const expiry = new Date(item.expiryDate);
      const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return `- ${item.name} (${item.quantity} ${item.unit}, expires in ${daysLeft} days)`;
    }).join('\n');

    const systemPrompt = `You are Z.ai, a smart kitchen assistant that suggests recipes based on available fridge ingredients.
The user has these items in their fridge:
${fridgeContext || '(fridge is empty)'}

When the user asks for recipes, respond ONLY with a valid JSON array (no markdown, no extra text) of 3-4 recipe objects.
Each recipe object must have exactly these fields:
{
  "id": "unique string",
  "name": "Recipe Name",
  "image": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400",
  "time": <number in minutes>,
  "servings": <number>,
  "matchPercentage": <0-100, how well fridge items match the recipe>,
  "ingredients": ["ingredient1", "ingredient2", ...],
  "instructions": ["Step 1...", "Step 2...", ...]
}
Prioritize ingredients that are expiring soon when relevant. Keep ingredients lowercase. Respond ONLY with the JSON array, nothing else.`;

    const response = await fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'ilmu-glm-5.1',
        max_tokens: 2000,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      }),
    });
    // const response = await fetch('https://api.ilmu.ai/v1/chat/completions',  {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': 'Bearer sk-8590c38c5b109737b57a0e9d8ed3ac4bdaf4765e8f47df21',
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     model: 'ilmu-glm-5.1',
    //     max_tokens: 2000,
    //     messages: [
    //       { role: 'system', content: systemPrompt },
    //       { role: 'user', content: userMessage },
    //     ],
    //   }),
    // });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Z.ai API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content ?? '';

    // Strip potential markdown code fences
    const cleaned = rawText.replace(/```json|```/g, '').trim();
    const parsed: Recipe[] = JSON.parse(cleaned);

    // Ensure each recipe has a unique id and required fields
    return parsed.map((recipe, index) => ({
      ...recipe,
      id: recipe.id ?? String(Date.now() + index),
      matchPercentage: recipe.matchPercentage ?? 50,
      image: recipe.image ?? 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
    }));
  };

  const handleSend = async (messageText?: string) => {
    const text = messageText || inputValue.trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const generatedRecipes = await generateRecipes(text);
      setRecipes(generatedRecipes);
    } catch (error) {
      console.error('Z.ai error:', error);
      alert(`Z.ai couldn't generate recipes. ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSend(suggestion);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCookRecipe = (recipe: Recipe) => {
    const updatedFridgeItems = fridgeItems.map(item => {
      const itemNameLower = item.name.toLowerCase();
      const usedIngredient = recipe.ingredients.find(ingredient =>
        itemNameLower.includes(ingredient) || ingredient.includes(itemNameLower)
      );

      if (usedIngredient) {
        const newQuantity = item.quantity - 1;
        if (newQuantity <= 0) {
          return null;
        }
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter((item): item is FridgeItem => item !== null);

    onUpdateFridgeItems(updatedFridgeItems);
    setShowConfirmation(true);

    setTimeout(() => {
      setShowConfirmation(false);
      setSelectedRecipe(null);
    }, 2000);
  };

  const suggestions = [
    'Suggest recipes based on my ingredients in my fridge',
    'Suggest recipes that use ingredients almost expired',
    'What can I cook for dinner tonight?',
    'Show me quick 15-minute recipes',
  ];

  const favoriteRecipes = recipes.filter(recipe => favorites.includes(recipe.id));

  const RecipeCard = ({ recipe }: { recipe: Recipe }) => (
    <div
      onClick={() => setSelectedRecipe(recipe)}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer relative"
    >
      <div className="flex gap-4">
        <img
          src={recipe.image}
          alt={recipe.name}
          className="w-32 h-32 object-cover flex-shrink-0"
        />
        <div className="flex-1 p-4 pr-12">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-gray-900 dark:text-white">{recipe.name}</h3>
            <span
              className={`px-2 py-1 rounded text-xs whitespace-nowrap ${
                recipe.matchPercentage >= 80
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : recipe.matchPercentage >= 50
                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {recipe.matchPercentage}% match
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{recipe.time} min</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{recipe.servings} servings</span>
            </div>
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            {recipe.ingredients.length} ingredients
          </p>
        </div>
      </div>
      
      {/* Favorite Button */}
      <button
        onClick={(e) => toggleFavorite(recipe.id, e)}
        className="absolute top-3 right-3 p-2 bg-white dark:bg-gray-800 rounded-full shadow-md hover:shadow-lg transition-all"
      >
        <Heart
          className={`w-5 h-5 ${
            favorites.includes(recipe.id)
              ? 'fill-red-500 text-red-500'
              : 'text-gray-400 dark:text-gray-500'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto h-full flex flex-col">
      {isInitialState ? (
        /* Initial Z.ai State */
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="w-24 h-24 bg-gradient-to-br from-[#007057] to-[#005a45] rounded-3xl flex items-center justify-center mb-6 shadow-lg">
              <span className="text-4xl font-bold text-white">Z</span>
            </div>
            <h1 className="text-3xl text-gray-900 dark:text-white mb-2">Hi, I'm Z.ai</h1>
            <p className="text-gray-600 dark:text-gray-400 text-center mb-8">
              Generate recipe suggestions with Z.ai
            </p>
          </div>

          {/* Suggestion Tags */}
          <div className="px-4 pb-4">
            <div className="flex flex-wrap gap-2 justify-center mb-4">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  disabled={isLoading}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-full text-sm transition-colors border border-gray-200 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Input */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask Z.ai for recipe suggestions..."
                className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 border-0 rounded-full text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007057]"
                disabled={isLoading}
              />
              <button
                onClick={() => handleSend()}
                disabled={!inputValue.trim() || isLoading}
                className="w-12 h-12 bg-[#007057] hover:bg-[#005a45] disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Recipe Results */
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4">
            {/* User Query Display */}
            {messages.length > 0 && (
              <div className="mb-6">
                <div className="inline-block bg-[#007057]/10 dark:bg-[#007057]/20 px-4 py-2 rounded-full">
                  <p className="text-sm text-[#007057] dark:text-[#00a07d]">
                    {messages[messages.length - 1].content}
                  </p>
                </div>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-[#007057] mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Generating recipes...</p>
              </div>
            )}

            {/* Favourites Section */}
            {!isLoading && favoriteRecipes.length > 0 && (
              <div className="mb-8">
                <h2 className="text-gray-900 dark:text-white mb-4">Favourites</h2>
                <div className="space-y-4">
                  {favoriteRecipes.map(recipe => (
                    <RecipeCard key={recipe.id} recipe={recipe} />
                  ))}
                </div>
              </div>
            )}

            {/* Recipe Cards */}
            {!isLoading && recipes.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-gray-900 dark:text-white mb-4">
                  {favoriteRecipes.length > 0 ? 'More Recipes' : 'Here are some recipes for you:'}
                </h3>
                {recipes.filter(recipe => !favorites.includes(recipe.id)).map(recipe => (
                  <RecipeCard key={recipe.id} recipe={recipe} />
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input at Bottom */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask Z.ai for more recipes..."
                className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 border-0 rounded-full text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007057]"
                disabled={isLoading}
              />
              <button
                onClick={() => handleSend()}
                disabled={!inputValue.trim() || isLoading}
                className="w-12 h-12 bg-[#007057] hover:bg-[#005a45] disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recipe Detail Modal */}
      {selectedRecipe && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 w-full sm:max-w-2xl rounded-t-2xl sm:rounded-lg max-h-[90vh] overflow-y-auto">
            <div className="relative">
              <img
                src={selectedRecipe.image}
                alt={selectedRecipe.name}
                className="w-full h-64 object-cover"
              />
              <button
                onClick={() => setSelectedRecipe(null)}
                className="absolute top-4 right-4 w-10 h-10 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-lg"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-gray-900 dark:text-white">{selectedRecipe.name}</h2>
                <span
                  className={`px-3 py-1 rounded-full text-sm ${
                    selectedRecipe.matchPercentage >= 80
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : selectedRecipe.matchPercentage >= 50
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {selectedRecipe.matchPercentage}% match
                </span>
              </div>

              <div className="flex items-center gap-6 mb-6 text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <span>{selectedRecipe.time} minutes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  <span>{selectedRecipe.servings} servings</span>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-gray-900 dark:text-white mb-3">Ingredients</h3>
                <ul className="space-y-2">
                  {selectedRecipe.ingredients.map((ingredient, index) => {
                    const hasIngredient = fridgeItems.some(item =>
                      item.name.toLowerCase().includes(ingredient) ||
                      ingredient.includes(item.name.toLowerCase())
                    );
                    return (
                      <li
                        key={index}
                        className={`flex items-center gap-2 ${
                          hasIngredient
                            ? 'text-green-700 dark:text-green-300'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full ${
                            hasIngredient ? 'bg-green-600' : 'bg-gray-400'
                          }`}
                        ></div>
                        <span className="capitalize">{ingredient}</span>
                        {hasIngredient && (
                          <span className="text-xs text-green-600 dark:text-green-400">
                            (in fridge)
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div>
                <h3 className="text-gray-900 dark:text-white mb-3">Instructions</h3>
                <ol className="space-y-3">
                  {selectedRecipe.instructions.map((instruction, index) => (
                    <li
                      key={index}
                      className="flex gap-3 text-gray-600 dark:text-gray-400"
                    >
                      <span className="flex-shrink-0 w-6 h-6 bg-[#007057] text-white rounded-full flex items-center justify-center text-sm">
                        {index + 1}
                      </span>
                      <span>{instruction}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <button
                onClick={() => setSelectedRecipe(null)}
                className="w-full mt-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
              >
                Close
              </button>

              <button
                onClick={() => handleCookRecipe(selectedRecipe)}
                disabled={showConfirmation}
                className="w-full mt-3 py-3 bg-[#007057] hover:bg-[#005a45] disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <ChefHat className="w-5 h-5" />
                {showConfirmation ? 'Ingredients Deducted!' : 'Cook This Recipe'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
