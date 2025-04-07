/**
 * Instrument Repository
 * Handles CRUD operations for instruments in IndexedDB
 */

import { Instrument } from '@shared/schema';
import { getDB, STORES } from './db';

/**
 * Get all instruments
 * @returns A promise that resolves to an array of instruments
 */
export const getAllInstruments = async (): Promise<Instrument[]> => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.INSTRUMENTS, 'readonly');
      const store = transaction.objectStore(STORES.INSTRUMENTS);
      const request = store.getAll();

      request.onsuccess = () => {
        // Sort alphabetically by symbol
        const instruments = request.result.sort((a: Instrument, b: Instrument) => 
          a.symbol.localeCompare(b.symbol)
        );
        resolve(instruments);
      };

      request.onerror = (event) => {
        console.error('Error fetching instruments:', (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
    });
  } catch (error) {
    console.error('Error in getAllInstruments:', error);
    throw error;
  }
};

/**
 * Get an instrument by ID
 * @param id The ID of the instrument to get
 * @returns A promise that resolves to the instrument or undefined if not found
 */
export const getInstrumentById = async (id: number): Promise<Instrument | undefined> => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.INSTRUMENTS, 'readonly');
      const store = transaction.objectStore(STORES.INSTRUMENTS);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || undefined);
      };

      request.onerror = (event) => {
        console.error('Error fetching instrument by ID:', (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
    });
  } catch (error) {
    console.error('Error in getInstrumentById:', error);
    throw error;
  }
};

/**
 * Get an instrument by symbol
 * @param symbol The symbol of the instrument to get
 * @returns A promise that resolves to the instrument or undefined if not found
 */
export const getInstrumentBySymbol = async (symbol: string): Promise<Instrument | undefined> => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.INSTRUMENTS, 'readonly');
      const store = transaction.objectStore(STORES.INSTRUMENTS);
      const index = store.index('symbol');
      const request = index.get(symbol);

      request.onsuccess = () => {
        resolve(request.result || undefined);
      };

      request.onerror = (event) => {
        console.error('Error fetching instrument by symbol:', (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
    });
  } catch (error) {
    console.error('Error in getInstrumentBySymbol:', error);
    throw error;
  }
};

/**
 * Add a new instrument
 * @param instrument The instrument to add
 * @returns A promise that resolves to the added instrument with its generated ID
 */
export const addInstrument = async (instrument: Omit<Instrument, 'id'>): Promise<Instrument> => {
  try {
    const db = await getDB();
    return new Promise(async (resolve, reject) => {
      // Check if instrument with same symbol already exists
      const existingInstrument = await getInstrumentBySymbol(instrument.symbol);
      if (existingInstrument) {
        reject(new Error(`Instrument with symbol ${instrument.symbol} already exists`));
        return;
      }

      const transaction = db.transaction(STORES.INSTRUMENTS, 'readwrite');
      const store = transaction.objectStore(STORES.INSTRUMENTS);
      const request = store.add(instrument);

      request.onsuccess = () => {
        const newInstrument = { ...instrument, id: request.result as number };
        console.log('Instrument added successfully:', newInstrument);
        resolve(newInstrument as Instrument);
      };

      request.onerror = (event) => {
        console.error('Error adding instrument:', (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
    });
  } catch (error) {
    console.error('Error in addInstrument:', error);
    throw error;
  }
};

/**
 * Update an existing instrument
 * @param id The ID of the instrument to update
 * @param instrument The updated instrument data
 * @returns A promise that resolves to the updated instrument
 */
export const updateInstrument = async (id: number, instrument: Partial<Instrument>): Promise<Instrument> => {
  try {
    const db = await getDB();
    return new Promise(async (resolve, reject) => {
      // First, get the existing instrument
      const existingInstrument = await getInstrumentById(id);
      if (!existingInstrument) {
        reject(new Error(`Instrument with ID ${id} not found`));
        return;
      }

      // If symbol is being changed, check if new symbol already exists
      if (instrument.symbol && instrument.symbol !== existingInstrument.symbol) {
        const symbolExists = await getInstrumentBySymbol(instrument.symbol);
        if (symbolExists) {
          reject(new Error(`Instrument with symbol ${instrument.symbol} already exists`));
          return;
        }
      }

      const transaction = db.transaction(STORES.INSTRUMENTS, 'readwrite');
      const store = transaction.objectStore(STORES.INSTRUMENTS);
      
      // Merge existing instrument with updates
      const updatedInstrument = { ...existingInstrument, ...instrument, id };
      const request = store.put(updatedInstrument);

      request.onsuccess = () => {
        console.log('Instrument updated successfully:', updatedInstrument);
        resolve(updatedInstrument);
      };

      request.onerror = (event) => {
        console.error('Error updating instrument:', (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
    });
  } catch (error) {
    console.error('Error in updateInstrument:', error);
    throw error;
  }
};

/**
 * Delete an instrument by ID
 * @param id The ID of the instrument to delete
 * @returns A promise that resolves to true if the instrument was deleted
 */
export const deleteInstrument = async (id: number): Promise<boolean> => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.INSTRUMENTS, 'readwrite');
      const store = transaction.objectStore(STORES.INSTRUMENTS);
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log(`Instrument with ID ${id} deleted successfully`);
        resolve(true);
      };

      request.onerror = (event) => {
        console.error('Error deleting instrument:', (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
    });
  } catch (error) {
    console.error('Error in deleteInstrument:', error);
    throw error;
  }
};

/**
 * Initialize default instruments if none exist
 * @param defaultInstruments The default instruments to add
 * @returns A promise that resolves when initialization is complete
 */
export const initializeDefaultInstruments = async (defaultInstruments: Omit<Instrument, 'id'>[]): Promise<void> => {
  try {
    // Check if instruments already exist
    const existingInstruments = await getAllInstruments();
    
    if (existingInstruments.length === 0) {
      console.log('No instruments found, initializing defaults...');
      
      // Add each default instrument
      const promises = defaultInstruments.map(instrument => addInstrument(instrument));
      await Promise.all(promises);
      
      console.log('Default instruments initialized successfully');
    } else {
      console.log('Instruments already exist, skipping initialization');
    }
  } catch (error) {
    console.error('Error initializing default instruments:', error);
    throw error;
  }
};