/**
 * Trade Repository
 * Handles CRUD operations for trades in IndexedDB
 */

import { Trade } from '@shared/schema';
import { getDB, STORES } from './db';

/**
 * Get all trades
 * @param userId Optional user ID to filter trades by
 * @returns A promise that resolves to an array of trades
 */
export const getAllTrades = async (userId?: number): Promise<Trade[]> => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.TRADES, 'readonly');
      const store = transaction.objectStore(STORES.TRADES);
      let request: IDBRequest;

      if (userId !== undefined) {
        const index = store.index('userId');
        request = index.getAll(userId);
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => {
        // Sort by date descending (newest first)
        const trades = request.result.sort((a: Trade, b: Trade) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        resolve(trades);
      };

      request.onerror = (event) => {
        console.error('Error fetching trades:', (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
    });
  } catch (error) {
    console.error('Error in getAllTrades:', error);
    throw error;
  }
};

/**
 * Get a trade by ID
 * @param id The ID of the trade to get
 * @returns A promise that resolves to the trade or undefined if not found
 */
export const getTradeById = async (id: number): Promise<Trade | undefined> => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.TRADES, 'readonly');
      const store = transaction.objectStore(STORES.TRADES);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || undefined);
      };

      request.onerror = (event) => {
        console.error('Error fetching trade by ID:', (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
    });
  } catch (error) {
    console.error('Error in getTradeById:', error);
    throw error;
  }
};

/**
 * Get trades by symbol
 * @param symbol The symbol to filter trades by
 * @param userId Optional user ID to further filter trades
 * @returns A promise that resolves to an array of trades
 */
export const getTradesBySymbol = async (symbol: string, userId?: number): Promise<Trade[]> => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.TRADES, 'readonly');
      const store = transaction.objectStore(STORES.TRADES);
      const index = store.index('symbol');
      const request = index.getAll(symbol);

      request.onsuccess = () => {
        let trades = request.result;
        
        // Filter by userId if provided
        if (userId !== undefined) {
          trades = trades.filter((trade: Trade) => trade.userId === userId);
        }
        
        // Sort by date descending (newest first)
        trades = trades.sort((a: Trade, b: Trade) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        
        resolve(trades);
      };

      request.onerror = (event) => {
        console.error('Error fetching trades by symbol:', (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
    });
  } catch (error) {
    console.error('Error in getTradesBySymbol:', error);
    throw error;
  }
};

/**
 * Get trades by date range
 * @param startDate The start date of the range
 * @param endDate The end date of the range
 * @param userId Optional user ID to filter trades
 * @returns A promise that resolves to an array of trades
 */
export const getTradesByDateRange = async (
  startDate: Date, 
  endDate: Date, 
  userId?: number
): Promise<Trade[]> => {
  try {
    const allTrades = await getAllTrades(userId);
    
    // Filter by date range
    return allTrades.filter((trade: Trade) => {
      const tradeDate = new Date(trade.date);
      return tradeDate >= startDate && tradeDate <= endDate;
    });
  } catch (error) {
    console.error('Error in getTradesByDateRange:', error);
    throw error;
  }
};

/**
 * Add a new trade
 * @param trade The trade to add
 * @returns A promise that resolves to the added trade with its generated ID
 */
export const addTrade = async (trade: Omit<Trade, 'id'>): Promise<Trade> => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.TRADES, 'readwrite');
      const store = transaction.objectStore(STORES.TRADES);
      
      // Set createdAt timestamp if not already set
      const tradeWithTimestamp = {
        ...trade,
        createdAt: trade.createdAt || new Date()
      };
      
      const request = store.add(tradeWithTimestamp);

      request.onsuccess = () => {
        const newTrade = { ...tradeWithTimestamp, id: request.result as number };
        console.log('Trade added successfully:', newTrade);
        resolve(newTrade as Trade);
      };

      request.onerror = (event) => {
        console.error('Error adding trade:', (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
    });
  } catch (error) {
    console.error('Error in addTrade:', error);
    throw error;
  }
};

/**
 * Update an existing trade
 * @param id The ID of the trade to update
 * @param trade The updated trade data
 * @returns A promise that resolves to the updated trade
 */
export const updateTrade = async (id: number, trade: Partial<Trade>): Promise<Trade> => {
  try {
    const db = await getDB();
    return new Promise(async (resolve, reject) => {
      // First, get the existing trade
      const existingTrade = await getTradeById(id);
      if (!existingTrade) {
        reject(new Error(`Trade with ID ${id} not found`));
        return;
      }

      const transaction = db.transaction(STORES.TRADES, 'readwrite');
      const store = transaction.objectStore(STORES.TRADES);
      
      // Merge existing trade with updates
      const updatedTrade = { ...existingTrade, ...trade, id };
      const request = store.put(updatedTrade);

      request.onsuccess = () => {
        console.log('Trade updated successfully:', updatedTrade);
        resolve(updatedTrade);
      };

      request.onerror = (event) => {
        console.error('Error updating trade:', (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
    });
  } catch (error) {
    console.error('Error in updateTrade:', error);
    throw error;
  }
};

/**
 * Delete a trade by ID
 * @param id The ID of the trade to delete
 * @returns A promise that resolves to true if the trade was deleted
 */
export const deleteTrade = async (id: number): Promise<boolean> => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.TRADES, 'readwrite');
      const store = transaction.objectStore(STORES.TRADES);
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log(`Trade with ID ${id} deleted successfully`);
        resolve(true);
      };

      request.onerror = (event) => {
        console.error('Error deleting trade:', (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
    });
  } catch (error) {
    console.error('Error in deleteTrade:', error);
    throw error;
  }
};

/**
 * Delete all trades
 * @param userId Optional user ID to filter trades to delete
 * @returns A promise that resolves when all trades are deleted
 */
export const deleteAllTrades = async (userId?: number): Promise<void> => {
  try {
    if (userId !== undefined) {
      // If userId is provided, get all trades for that user and delete them one by one
      const userTrades = await getAllTrades(userId);
      const deletePromises = userTrades.map(trade => deleteTrade(trade.id));
      await Promise.all(deletePromises);
    } else {
      // If no userId is provided, clear the entire store
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.TRADES, 'readwrite');
        const store = transaction.objectStore(STORES.TRADES);
        const request = store.clear();

        request.onsuccess = () => {
          console.log('All trades deleted successfully');
          resolve();
        };

        request.onerror = (event) => {
          console.error('Error deleting all trades:', (event.target as IDBRequest).error);
          reject((event.target as IDBRequest).error);
        };
      });
    }
  } catch (error) {
    console.error('Error in deleteAllTrades:', error);
    throw error;
  }
};