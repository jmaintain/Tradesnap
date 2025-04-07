/**
 * IndexedDB Initialization
 * This module handles initializing the IndexedDB database with default data
 */

import { InsertInstrument } from '@shared/schema';
import { initDB } from './db';
import { initializeDefaultInstruments } from './instrumentRepository';

// Define local instrument interface matching what we need for initialization
interface LocalInstrument {
  symbol: string;
  description: string;
  tickSize: string;
  tickValue: string;
  pointValue: string;
}

// Default instruments to add when initializing the database
const defaultInstruments: LocalInstrument[] = [
  // Standard futures contracts
  {
    symbol: 'ES',
    description: 'E-mini S&P 500 futures contract',
    tickSize: '0.25',
    tickValue: '12.50',
    pointValue: '50.00'
  },
  {
    symbol: 'NQ',
    description: 'E-mini Nasdaq 100 futures contract',
    tickSize: '0.25',
    tickValue: '5.00',
    pointValue: '20.00'
  },
  {
    symbol: 'CL',
    description: 'Light Sweet Crude Oil futures contract',
    tickSize: '0.01',
    tickValue: '10.00',
    pointValue: '1000.00'
  },
  {
    symbol: 'GC',
    description: 'Gold futures contract',
    tickSize: '0.10',
    tickValue: '10.00',
    pointValue: '100.00'
  },
  {
    symbol: 'YM',
    description: 'E-mini Dow Jones futures contract',
    tickSize: '1.00',
    tickValue: '5.00',
    pointValue: '5.00'
  },
  
  // Micro futures contracts
  {
    symbol: 'MES',
    description: 'Micro E-mini S&P 500 futures contract (1/10 of ES)',
    tickSize: '0.25',
    tickValue: '1.25',
    pointValue: '5.00'
  },
  {
    symbol: 'MNQ',
    description: 'Micro E-mini Nasdaq 100 futures contract (1/10 of NQ)',
    tickSize: '0.25',
    tickValue: '0.50',
    pointValue: '2.00'
  },
  {
    symbol: 'MCL',
    description: 'Micro WTI Crude Oil futures contract (1/10 of CL)',
    tickSize: '0.01',
    tickValue: '1.00',
    pointValue: '100.00'
  },
  {
    symbol: 'MGC',
    description: 'Micro Gold futures contract (1/10 of GC)',
    tickSize: '0.10',
    tickValue: '1.00',
    pointValue: '10.00'
  },
  {
    symbol: 'MYM',
    description: 'Micro E-mini Dow Jones futures contract (1/10 of YM)',
    tickSize: '1.00',
    tickValue: '0.50',
    pointValue: '0.50'
  }
];

/**
 * Initialize the IndexedDB database and populate with default data
 * @returns A promise that resolves when initialization is complete
 */
export const initializeIndexedDB = async (): Promise<void> => {
  try {
    // Initialize the database
    await initDB();
    console.log('IndexedDB initialized');

    // Initialize default instruments
    await initializeDefaultInstruments(defaultInstruments as any);
    console.log('Default instruments initialized');

    console.log('IndexedDB setup complete');
  } catch (error) {
    console.error('Error initializing IndexedDB:', error);
    throw error;
  }
};