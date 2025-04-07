/**
 * IndexedDB database configuration and initialization
 * This module handles the setup and versioning of the IndexedDB database for TradeSnap
 */

import { Trade, Instrument } from '@shared/schema';

// Database name and version
const DB_NAME = 'TradeSnapDB';
const DB_VERSION = 1;

// Object store names
export const STORES = {
  TRADES: 'trades',
  INSTRUMENTS: 'instruments',
};

// Define index types
interface StoreIndex {
  name: string;
  keyPath: string;
  unique?: boolean;
}

// Define store types
interface StoreConfig {
  name: string;
  keyPath: string;
  indices?: StoreIndex[];
}

// Define database structure
const dbConfig: {
  name: string;
  version: number;
  stores: StoreConfig[];
} = {
  name: DB_NAME,
  version: DB_VERSION,
  stores: [
    {
      name: STORES.TRADES,
      keyPath: 'id',
      indices: [
        { name: 'date', keyPath: 'date' },
        { name: 'symbol', keyPath: 'symbol' },
        { name: 'userId', keyPath: 'userId' },
      ],
    },
    {
      name: STORES.INSTRUMENTS,
      keyPath: 'id',
      indices: [
        { name: 'symbol', keyPath: 'symbol', unique: true },
      ],
    },
  ],
};

// IndexedDB interface
let dbInstance: IDBDatabase | null = null;

/**
 * Initialize the database
 * @returns A promise that resolves when the database is opened
 */
export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    // Check if browser supports IndexedDB
    if (!window.indexedDB) {
      reject(new Error('Your browser doesn\'t support IndexedDB. Some features may not work properly.'));
      return;
    }

    // Open database connection
    const request = window.indexedDB.open(dbConfig.name, dbConfig.version);

    // Handle database versioning and schema changes
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create object stores and indices if they don't exist
      dbConfig.stores.forEach(store => {
        if (!db.objectStoreNames.contains(store.name)) {
          const objectStore = db.createObjectStore(store.name, { keyPath: store.keyPath, autoIncrement: true });
          
          // Create indices for the store
          store.indices?.forEach(index => {
            const indexOptions = index.unique ? { unique: true } : undefined;
            objectStore.createIndex(index.name, index.keyPath, indexOptions);
          });
          
          console.log(`Created object store: ${store.name}`);
        }
      });
    };

    // Handle success
    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      console.log('IndexedDB initialized successfully');
      resolve(dbInstance);
    };

    // Handle errors
    request.onerror = (event) => {
      console.error('Error opening IndexedDB:', (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

/**
 * Get the database instance
 * @returns A promise that resolves to the database instance
 */
export const getDB = async (): Promise<IDBDatabase> => {
  if (dbInstance) return dbInstance;
  return initDB();
};

/**
 * Close the database connection
 */
export const closeDB = (): void => {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    console.log('IndexedDB connection closed');
  }
};

/**
 * Clear all data from a specific store
 * @param storeName The name of the store to clear
 * @returns A promise that resolves when the store is cleared
 */
export const clearStore = (storeName: string): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await getDB();
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => {
        console.log(`Cleared all data from ${storeName}`);
        resolve();
      };

      request.onerror = (event) => {
        console.error(`Error clearing ${storeName}:`, (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
    } catch (error) {
      reject(error);
    }
  });
};