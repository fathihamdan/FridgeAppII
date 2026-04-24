import { useState } from 'react';
import { X, Camera, Upload, Check } from 'lucide-react';
import { FridgeItem } from '../App';

interface ReceiptScannerModalProps {
  onClose: () => void;
  onAddItems: (items: Omit<FridgeItem, 'id' | 'addedDate'>[]) => void;
}

interface ScannedItem {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  selected: boolean;
}

export function ReceiptScannerModal({ onClose, onAddItems }: ReceiptScannerModalProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [hasScanned, setHasScanned] = useState(false);

  const mockReceiptScan = async (): Promise<ScannedItem[]> => {
    // Mock OCR processing - In production, use OCR API like Google Vision or Azure Computer Vision
    // Example: const response = await fetch('https://vision.googleapis.com/v1/images:annotate', {...})

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock scanned items from receipt
    return [
      { name: 'Whole Milk', category: 'Dairy', quantity: 2, unit: 'L', selected: false },
      { name: 'Organic Eggs', category: 'Dairy', quantity: 12, unit: 'pcs', selected: false },
      { name: 'Fresh Bread', category: 'Bakery', quantity: 1, unit: 'loaf', selected: false },
      { name: 'Chicken Breast', category: 'Meat', quantity: 500, unit: 'g', selected: false },
      { name: 'Tomatoes', category: 'Vegetables', quantity: 6, unit: 'pcs', selected: false },
      { name: 'Lettuce', category: 'Vegetables', quantity: 1, unit: 'head', selected: false },
      { name: 'Cheddar Cheese', category: 'Dairy', quantity: 250, unit: 'g', selected: false },
      { name: 'Orange Juice', category: 'Beverages', quantity: 1, unit: 'L', selected: false },
      { name: 'Apples', category: 'Fruits', quantity: 4, unit: 'pcs', selected: false },
      { name: 'Bananas', category: 'Fruits', quantity: 6, unit: 'pcs', selected: false },
    ];
  };

  const handleScan = async () => {
    setIsScanning(true);
    try {
      const items = await mockReceiptScan();
      setScannedItems(items);
      setHasScanned(true);
    } catch (error) {
      alert('Failed to scan receipt. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const toggleItemSelection = (index: number) => {
    setScannedItems(prev =>
      prev.map((item, i) =>
        i === index ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const selectAll = () => {
    setScannedItems(prev => prev.map(item => ({ ...item, selected: true })));
  };

  const deselectAll = () => {
    setScannedItems(prev => prev.map(item => ({ ...item, selected: false })));
  };

  const handleAddSelected = () => {
    const selectedItems = scannedItems.filter(item => item.selected);

    if (selectedItems.length === 0) {
      alert('Please select at least one item to add.');
      return;
    }

    const itemsToAdd = selectedItems.map(item => {
      const defaultExpiry = new Date();
      const daysToAdd = {
        Dairy: 7,
        Meat: 3,
        Vegetables: 5,
        Fruits: 7,
        Bakery: 5,
        Beverages: 30,
      }[item.category] || 7;

      defaultExpiry.setDate(defaultExpiry.getDate() + daysToAdd);

      return {
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        expiryDate: defaultExpiry.toISOString().split('T')[0],
      };
    });

    onAddItems(itemsToAdd);
    onClose();
  };

  const selectedCount = scannedItems.filter(item => item.selected).length;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white dark:bg-gray-800 w-full sm:max-w-2xl sm:rounded-lg rounded-t-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <h2 className="text-gray-900 dark:text-white">Scan Receipt</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-4">
          {!hasScanned ? (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>How it works:</strong> Take a photo or upload an image of your grocery receipt.
                  AI will automatically detect and extract all items from the receipt.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={handleScan}
                  disabled={isScanning}
                  className="p-8 bg-[#007057]/10 dark:bg-[#007057]/20 border-2 border-[#007057]/30 dark:border-[#007057]/40 rounded-lg hover:bg-[#007057]/20 dark:hover:bg-[#007057]/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Camera className="w-12 h-12 text-[#007057] mx-auto mb-3" />
                  <p className="text-gray-900 dark:text-white mb-1">Take Photo</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Use camera to scan</p>
                </button>

                <button
                  onClick={handleScan}
                  disabled={isScanning}
                  className="p-8 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-3" />
                  <p className="text-gray-900 dark:text-white mb-1">Upload Image</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Choose from gallery</p>
                </button>
              </div>

              {isScanning && (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-[#007057] mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Scanning receipt...</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                    AI is extracting items from your receipt
                  </p>
                </div>
              )}

              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  <strong>Note:</strong> Currently using mock OCR. In production, integrate with Google Cloud Vision,
                  Azure Computer Vision, or AWS Textract for real receipt scanning.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-sm text-green-900 dark:text-green-100">
                  ✓ Successfully scanned {scannedItems.length} items! Select the items you want to add to your fridge.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="flex-1 py-2 px-4 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/40 transition-colors text-sm"
                >
                  Select All
                </button>
                <button
                  onClick={deselectAll}
                  className="flex-1 py-2 px-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
                >
                  Deselect All
                </button>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {scannedItems.map((item, index) => (
                  <div
                    key={index}
                    onClick={() => toggleItemSelection(index)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      item.selected
                        ? 'bg-[#007057]/10 dark:bg-[#007057]/20 border-[#007057]'
                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              item.selected
                                ? 'bg-[#007057] border-[#007057]'
                                : 'border-gray-300 dark:border-gray-500'
                            }`}
                          >
                            {item.selected && <Check className="w-4 h-4 text-white" />}
                          </div>
                          <div>
                            <p className="text-gray-900 dark:text-white">{item.name}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {item.quantity} {item.unit} • {item.category}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setHasScanned(false);
                    setScannedItems([]);
                  }}
                  className="flex-1 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Scan Again
                </button>
                <button
                  onClick={handleAddSelected}
                  disabled={selectedCount === 0}
                  className="flex-1 py-3 bg-[#007057] hover:bg-[#005a45] disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  Add {selectedCount > 0 ? `${selectedCount} ` : ''}Selected
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
