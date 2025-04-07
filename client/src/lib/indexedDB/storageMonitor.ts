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
    // Check if browser supports the Storage API
    if (navigator.storage && navigator.storage.estimate) {
      console.log("checkStorageUsage: Using Storage API");
      const estimation = await navigator.storage.estimate();
      console.log("checkStorageUsage: Raw storage estimate:", estimation);
      
      const used = estimation.usage || 0;
      // Cap the quota to a reasonable amount - browsers often report much more than is reliably available
      const reportedQuota = estimation.quota || DEFAULT_QUOTA;
      const quota = Math.min(reportedQuota, MAX_REASONABLE_QUOTA);
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
      console.log("checkStorageUsage: Processed storage info:", result);
      return result;
    } else {
      // Fallback to IndexedDB-specific size estimation
      console.log("checkStorageUsage: Storage API not available, falling back to manual estimation");
      return await estimateIndexedDBSize(dbName);
    }
  } catch (error) {
    console.error("Failed to check storage usage:", error);
    return null;
  }
}

/**
 * Estimate the size of an IndexedDB database
 * This is a rough estimate based on JSON stringification
 */
async function estimateIndexedDBSize(dbName: string): Promise<StorageInfo | null> {
  try {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(dbName);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    
    const storeNames = Array.from(db.objectStoreNames);
    let totalSize = 0;
    
    for (const storeName of storeNames) {
      const size = await estimateObjectStoreSize(db, storeName);
      totalSize += size;
    }
    
    db.close();
    
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
 * Estimate the size of an object store by getting all records and measuring their JSON size
 */
async function estimateObjectStoreSize(db: IDBDatabase, storeName: string): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      let size = 0;
      
      // Estimate size by JSON stringifying each record
      for (const item of request.result) {
        try {
          // Try to serialize the item to estimate its size
          const serialized = JSON.stringify(item);
          // Add 2 bytes per character (UTF-16 encoding)
          size += serialized.length * 2;
        } catch (e) {
          // If serialization fails, make a rough guess
          console.warn(`Could not stringify item in ${storeName}`, e);
          size += 1000; // Add a default size
        }
      }
      
      resolve(size);
    };
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