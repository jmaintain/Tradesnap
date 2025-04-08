/**
 * Storage monitor for IndexedDB
 * Tracks usage and provides warnings for storage limits
 */

// Default storage limits in bytes
const DEFAULT_WARNING_THRESHOLD = 0.7; // 70% of quota
const DEFAULT_CRITICAL_THRESHOLD = 0.9; // 90% of quota
const MB = 1024 * 1024; // 1 MB in bytes
const DEFAULT_QUOTA = 50 * MB; // Default assumption of 50MB limit

// Maximum reasonable quota - many browsers report much more space than is reliably available
const MAX_REASONABLE_QUOTA = 500 * MB; // Cap at 500MB to be realistic

export interface StorageInfo {
  used: number;
  quota: number;
  percentUsed: number;
  isApproachingLimit: boolean;
  isNearLimit: boolean;
  formattedUsed: string;
  formattedQuota: string;
}

/**
 * Format bytes into human-readable format
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Check estimated storage usage for a database
 * @param dbName - The name of the database to check
 */
export async function checkStorageUsage(dbName: string): Promise<StorageInfo | null> {
  try {
    // First check if dbName is valid
    if (!dbName || typeof dbName !== 'string') {
      console.error("Invalid database name provided to checkStorageUsage");
      return createDefaultStorageInfo(DEFAULT_QUOTA); // Return default info instead of null
    }
    
    // First get the browser's estimation (for quota info)
    let reportedQuota = DEFAULT_QUOTA;
    let usageFromNavigator = 0;
    
    try {
      if (navigator.storage && navigator.storage.estimate) {
        console.log("checkStorageUsage: Getting quota from Storage API");
        const estimation = await navigator.storage.estimate();
        console.log("checkStorageUsage: Raw storage estimate:", estimation);
        // Ensure we have valid numbers
        reportedQuota = estimation.quota && !isNaN(estimation.quota) ? estimation.quota : DEFAULT_QUOTA;
        usageFromNavigator = estimation.usage && !isNaN(estimation.usage) ? estimation.usage : 0;
      }
    } catch (storageApiError) {
      console.error("Error accessing Storage API:", storageApiError);
      // Continue with default values
    }
    
    // Cap the quota to a reasonable amount 
    const quota = Math.min(reportedQuota, MAX_REASONABLE_QUOTA);
    
    // Always do our own estimation for more accurate usage tracking
    console.log("checkStorageUsage: Performing manual measurement of IndexedDB size");
    
    try {
      const manualEstimation = await estimateIndexedDBSize(dbName);
      
      if (!manualEstimation) {
        console.log("checkStorageUsage: Manual estimation failed, falling back to navigator values");
        return createStorageInfoFromNavigator(usageFromNavigator, quota);
      }
      
      // Use our manually calculated usage value but keep the quota from the browser
      const used = manualEstimation.used;
      const percentUsed = used / quota;
      
      const result = {
        used,
        quota,
        percentUsed,
        isApproachingLimit: percentUsed >= DEFAULT_WARNING_THRESHOLD,
        isNearLimit: percentUsed >= DEFAULT_CRITICAL_THRESHOLD,
        formattedUsed: formatBytes(used),
        formattedQuota: formatBytes(quota)
      };
      
      console.log("checkStorageUsage: Final storage info:", result);
      return result;
    } catch (estimationError) {
      console.error("Error during manual estimation:", estimationError);
      return createStorageInfoFromNavigator(usageFromNavigator, quota);
    }
  } catch (error) {
    console.error("Failed to check storage usage:", error);
    // Return a default storage info object rather than null to prevent UI errors
    return createDefaultStorageInfo(DEFAULT_QUOTA);
  }
}

/**
 * Create storage info from navigator reported values
 */
function createStorageInfoFromNavigator(usage: number, quota: number): StorageInfo {
  const percentUsed = usage / quota;
  return {
    used: usage,
    quota,
    percentUsed,
    isApproachingLimit: percentUsed >= DEFAULT_WARNING_THRESHOLD,
    isNearLimit: percentUsed >= DEFAULT_CRITICAL_THRESHOLD,
    formattedUsed: formatBytes(usage),
    formattedQuota: formatBytes(quota)
  };
}

/**
 * Create a default storage info object for fallback
 */
function createDefaultStorageInfo(quota = DEFAULT_QUOTA): StorageInfo {
  // Assume a minimal usage to avoid dividing by zero errors
  const minimalUsage = 1024; // 1KB
  return {
    used: minimalUsage,
    quota,
    percentUsed: minimalUsage / quota,
    isApproachingLimit: false,
    isNearLimit: false,
    formattedUsed: formatBytes(minimalUsage),
    formattedQuota: formatBytes(quota)
  };
}

/**
 * Estimate the size of an IndexedDB database
 * This is a rough estimate based on JSON stringification, giving special attention to screenshot data
 */
async function estimateIndexedDBSize(dbName: string): Promise<StorageInfo | null> {
  try {
    console.log("estimateIndexedDBSize: Opening database", dbName);
    
    // First check if IndexedDB is supported
    if (!window.indexedDB) {
      console.error("IndexedDB is not supported in this browser");
      return null;
    }
    
    // Try to open the database
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      try {
        const request = indexedDB.open(dbName);
        
        request.onerror = (e) => {
          console.error("Failed to open database:", e);
          reject(request.error);
        };
        
        request.onsuccess = () => {
          if (request.result) {
            resolve(request.result);
          } else {
            reject(new Error("Could not open database, result is null"));
          }
        };
        
        // Handle upgradeneeded - shouldn't happen during size check but just in case
        request.onupgradeneeded = (e) => {
          console.warn("Database upgrade needed during size check");
          const db = request.result;
          db.close();
          reject(new Error("Database upgrade needed"));
        };
      } catch (err) {
        console.error("Exception while opening IndexedDB:", err);
        reject(err);
      }
    });
    
    // Safeguard: ensure we have a valid database object
    if (!db || !db.objectStoreNames) {
      console.error("Invalid database object received");
      return null;
    }
    
    const storeNames = Array.from(db.objectStoreNames);
    console.log(`estimateIndexedDBSize: Found stores: ${storeNames.join(', ')}`);
    let totalSize = 0;
    
    // Create a detailed size breakdown for debugging
    const storeSizes: Record<string, number> = {};
    
    for (const storeName of storeNames) {
      try {
        const size = await estimateObjectStoreSize(db, storeName);
        totalSize += size;
        storeSizes[storeName] = size;
      } catch (err) {
        console.error(`Error measuring store ${storeName}:`, err);
        // Continue with other stores even if one fails
      }
    }
    
    console.log("estimateIndexedDBSize: Store size breakdown:", storeSizes);
    console.log("estimateIndexedDBSize: Total estimated size:", formatBytes(totalSize));
    
    try {
      db.close();
    } catch (err) {
      console.warn("Error closing database:", err);
    }
    
    return {
      used: totalSize,
      quota: DEFAULT_QUOTA, // Assume the default quota
      percentUsed: totalSize / DEFAULT_QUOTA,
      isApproachingLimit: totalSize / DEFAULT_QUOTA >= DEFAULT_WARNING_THRESHOLD,
      isNearLimit: totalSize / DEFAULT_QUOTA >= DEFAULT_CRITICAL_THRESHOLD,
      formattedUsed: formatBytes(totalSize),
      formattedQuota: formatBytes(DEFAULT_QUOTA)
    };
  } catch (error) {
    console.error("Failed to estimate IndexedDB size:", error);
    return null;
  }
}

/**
 * Estimate the size of an object store by getting all records and measuring their JSON size,
 * with special handling for trade screenshots which can be large
 */
async function estimateObjectStoreSize(db: IDBDatabase, storeName: string): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    try {
      // Validate that the store exists in the database
      if (!db.objectStoreNames.contains(storeName)) {
        console.warn(`Store ${storeName} does not exist in the database`);
        resolve(0); // Return 0 for non-existent stores instead of rejecting
        return;
      }
      
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      
      // Set up error handling for the transaction
      transaction.onerror = (event) => {
        console.error(`Transaction error for store ${storeName}:`, event);
        reject(transaction.error);
      };
      
      const request = store.getAll();
      
      request.onerror = (event) => {
        console.error(`Error getting all items from store ${storeName}:`, event);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        let size = 0;
        let itemsProcessed = 0;
        
        // Handle the case where result might be undefined
        const items = request.result || [];
        console.log(`estimateObjectStoreSize: Processing ${items.length} items in store ${storeName}`);
        
        // Estimate size by JSON stringifying each record
        for (const item of items) {
          try {
            if (!item) {
              // Skip null/undefined items
              continue;
            }
            
            // Special handling for trade records with screenshots
            if (storeName === 'trades' && item.screenshots) {
              // Deep clone the item without screenshots to avoid modifying the original
              const itemWithoutScreenshots = { ...item, screenshots: null };
              
              // Calculate base size without screenshots
              const baseSize = JSON.stringify(itemWithoutScreenshots).length * 2;
              
              // Add size for screenshots if present
              let screenshotSize = 0;
              if (Array.isArray(item.screenshots)) {
                // Calculate size for each screenshot
                for (const screenshot of item.screenshots) {
                  if (typeof screenshot === 'string') {
                    // Base64 encoded images are approximately 4/3 the size of the binary data
                    screenshotSize += screenshot.length * 0.75;
                  }
                }
                console.log(`estimateObjectStoreSize: Trade ${item.id} has ${item.screenshots.length} screenshots, estimated size: ${formatBytes(screenshotSize)}`);
              }
              
              size += baseSize + screenshotSize;
            } else {
              // Normal processing for other records
              const serialized = JSON.stringify(item);
              size += serialized.length * 2;
            }
            
            itemsProcessed++;
          } catch (e) {
            // If serialization fails, make a rough guess
            console.warn(`Could not process item in ${storeName}`, e);
            size += 5000; // Add a larger default size to be safe
            itemsProcessed++;
          }
        }
        
        console.log(`estimateObjectStoreSize: Processed ${itemsProcessed} items in store ${storeName}, total size: ${formatBytes(size)}`);
        resolve(size);
      };
    } catch (error) {
      console.error(`Unexpected error in estimateObjectStoreSize for ${storeName}:`, error);
      // Resolve with 0 instead of rejecting to prevent the entire process from failing
      resolve(0);
    }
  });
}

/**
 * Get old trade records based on a date cutoff
 * @param dbName - Database name
 * @param monthsToKeep - Number of months of trade data to keep
 */
export async function getOldTradeRecords(dbName: string, monthsToKeep = 1): Promise<number[]> {
  try {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(dbName);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsToKeep);
    
    return new Promise<number[]>((resolve, reject) => {
      const transaction = db.transaction('trades', 'readonly');
      const store = transaction.objectStore('trades');
      const request = store.getAll();
      
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
      
      request.onsuccess = () => {
        const oldTradeIds: number[] = [];
        
        for (const trade of request.result) {
          const tradeDate = new Date(trade.date);
          if (tradeDate < cutoffDate) {
            oldTradeIds.push(trade.id);
          }
        }
        
        db.close();
        resolve(oldTradeIds);
      };
    });
  } catch (error) {
    console.error("Failed to get old trade records:", error);
    return [];
  }
}

/**
 * Clear screenshots from old trades to save space
 * @param dbName - Database name
 * @param tradeIds - IDs of trades to clear screenshots from
 */
export async function clearScreenshotsFromTrades(dbName: string, tradeIds: number[]): Promise<boolean> {
  if (!tradeIds.length) return true;
  
  try {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(dbName);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    
    return new Promise<boolean>((resolve, reject) => {
      const transaction = db.transaction('trades', 'readwrite');
      const store = transaction.objectStore('trades');
      
      let completedUpdates = 0;
      let failedUpdates = 0;
      
      transaction.oncomplete = () => {
        db.close();
        resolve(failedUpdates === 0);
      };
      
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
      
      for (const id of tradeIds) {
        const getRequest = store.get(id);
        
        getRequest.onsuccess = () => {
          const trade = getRequest.result;
          if (trade) {
            trade.screenshots = null; // Clear screenshots
            
            const updateRequest = store.put(trade);
            updateRequest.onsuccess = () => completedUpdates++;
            updateRequest.onerror = () => failedUpdates++;
          }
        };
      }
    });
  } catch (error) {
    console.error("Failed to clear screenshots from trades:", error);
    return false;
  }
}

/**
 * Delete old trade records to save space
 * @param dbName - Database name
 * @param tradeIds - IDs of trades to delete
 */
export async function deleteOldTrades(dbName: string, tradeIds: number[]): Promise<boolean> {
  if (!tradeIds.length) return true;
  
  try {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(dbName);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    
    return new Promise<boolean>((resolve, reject) => {
      const transaction = db.transaction('trades', 'readwrite');
      const store = transaction.objectStore('trades');
      
      let completedDeletes = 0;
      let failedDeletes = 0;
      
      transaction.oncomplete = () => {
        db.close();
        resolve(failedDeletes === 0);
      };
      
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
      
      for (const id of tradeIds) {
        const request = store.delete(id);
        request.onsuccess = () => completedDeletes++;
        request.onerror = () => failedDeletes++;
      }
    });
  } catch (error) {
    console.error("Failed to delete old trades:", error);
    return false;
  }
}