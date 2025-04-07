/**
 * IndexedDB Synchronization Utilities
 * This module provides functions to synchronize data between the server and IndexedDB
 */

import { Trade, Instrument } from '@shared/schema';
import { getQueryFn, apiRequest, queryClient } from '../queryClient';
import { 
  getAllTrades, 
  addTrade, 
  updateTrade, 
  deleteTrade 
} from './tradeRepository';
import { 
  getAllInstruments, 
  addInstrument, 
  updateInstrument, 
  deleteInstrument 
} from './instrumentRepository';

/**
 * Synchronize trades from the server to IndexedDB
 * @returns A promise that resolves when the synchronization is complete
 */
export const syncTradesToIndexedDB = async (): Promise<void> => {
  try {
    // Fetch trades from server directly with fetch API
    const response = await fetch('/api/trades');
    if (!response.ok) {
      console.error(`Failed to fetch trades: ${response.status} ${response.statusText}`);
      return;
    }
    const serverTrades = await response.json() as Trade[];
    
    if (!serverTrades || !Array.isArray(serverTrades)) {
      console.warn('No trades fetched from server for sync');
      return;
    }
    
    // Get all trades from IndexedDB
    const localTrades = await getAllTrades();
    
    // Create a map of local trades by ID for quick lookup
    const localTradeMap = new Map<number, Trade>();
    localTrades.forEach(trade => {
      localTradeMap.set(trade.id, trade);
    });
    
    // Process each server trade
    for (const serverTrade of serverTrades) {
      const localTrade = localTradeMap.get(serverTrade.id);
      
      if (!localTrade) {
        // Trade doesn't exist locally, add it
        await addTrade(serverTrade);
        console.log(`Added trade ID ${serverTrade.id} to IndexedDB`);
      } else {
        // Trade exists, check if it needs to be updated
        const serverUpdatedAt = serverTrade.createdAt ? new Date(serverTrade.createdAt).getTime() : 0;
        const localUpdatedAt = localTrade.createdAt ? new Date(localTrade.createdAt).getTime() : 0;
        
        if (serverUpdatedAt > localUpdatedAt) {
          // Server trade is newer, update local
          await updateTrade(serverTrade.id, serverTrade);
          console.log(`Updated trade ID ${serverTrade.id} in IndexedDB`);
        }
      }
      
      // Remove the trade from the map so we know we've processed it
      localTradeMap.delete(serverTrade.id);
    }
    
    // Any trades left in the map exist locally but not on the server
    // These could be deleted from the server or created locally while offline
    // For now, we'll keep them (offline-first approach)
    
    console.log('Trade synchronization complete');
  } catch (error) {
    console.error('Error synchronizing trades to IndexedDB:', error);
    throw error;
  }
};

/**
 * Synchronize instruments from the server to IndexedDB
 * @returns A promise that resolves when the synchronization is complete
 */
export const syncInstrumentsToIndexedDB = async (): Promise<void> => {
  try {
    // Fetch instruments from server directly with fetch API instead of getQueryFn
    const response = await fetch('/api/instruments');
    if (!response.ok) {
      console.error(`Failed to fetch instruments: ${response.status} ${response.statusText}`);
      return;
    }
    const serverInstruments = await response.json() as Instrument[];
    
    if (!serverInstruments || !Array.isArray(serverInstruments)) {
      console.warn('No instruments fetched from server for sync');
      return;
    }
    
    // Get all instruments from IndexedDB
    const localInstruments = await getAllInstruments();
    
    // Create a map of local instruments by ID for quick lookup
    const localInstrumentMap = new Map<number, Instrument>();
    localInstruments.forEach(instrument => {
      localInstrumentMap.set(instrument.id, instrument);
    });
    
    // Process each server instrument
    for (const serverInstrument of serverInstruments) {
      const localInstrument = localInstrumentMap.get(serverInstrument.id);
      
      if (!localInstrument) {
        // Instrument doesn't exist locally, add it
        await addInstrument(serverInstrument);
        console.log(`Added instrument ID ${serverInstrument.id} to IndexedDB`);
      } else {
        // Instrument exists, update it to ensure it has the latest data
        await updateInstrument(serverInstrument.id, serverInstrument);
        console.log(`Updated instrument ID ${serverInstrument.id} in IndexedDB`);
      }
      
      // Remove the instrument from the map so we know we've processed it
      localInstrumentMap.delete(serverInstrument.id);
    }
    
    // Note: We're not deleting local-only instruments as they might be custom user instruments
    
    console.log('Instrument synchronization complete');
  } catch (error) {
    console.error('Error synchronizing instruments to IndexedDB:', error);
    throw error;
  }
};

/**
 * Synchronize a newly created trade from IndexedDB to the server
 * @param tradeId The ID of the trade to sync
 * @returns A promise that resolves to the updated trade with server ID
 */
export const syncNewTradeToServer = async (tradeId: number): Promise<Trade> => {
  try {
    // Get the trade from IndexedDB
    const localTrade = await getAllTrades();
    const trade = localTrade.find(t => t.id === tradeId);
    
    if (!trade) {
      throw new Error(`Trade with ID ${tradeId} not found in IndexedDB`);
    }
    
    // Send the trade to the server using fetch directly
    const response = await fetch('/api/trades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trade),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to sync trade to server: ${response.status} ${response.statusText}`);
    }
    
    const serverTrade = await response.json() as Trade;
    
    // Update the local trade with the server ID and data
    await updateTrade(tradeId, serverTrade);
    
    // Invalidate the trades query to refresh the UI
    queryClient.invalidateQueries({ queryKey: ['/api/trades'] });
    
    return serverTrade;
  } catch (error) {
    console.error('Error synchronizing new trade to server:', error);
    throw error;
  }
};

/**
 * Synchronize an updated trade from IndexedDB to the server
 * @param tradeId The ID of the trade to sync
 * @returns A promise that resolves to the updated trade
 */
export const syncUpdatedTradeToServer = async (tradeId: number): Promise<Trade> => {
  try {
    // Get the trade from IndexedDB
    const localTrade = await getAllTrades();
    const trade = localTrade.find(t => t.id === tradeId);
    
    if (!trade) {
      throw new Error(`Trade with ID ${tradeId} not found in IndexedDB`);
    }
    
    // Send the updated trade to the server using fetch directly
    const response = await fetch(`/api/trades/${tradeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trade),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update trade on server: ${response.status} ${response.statusText}`);
    }
    
    const serverTrade = await response.json() as Trade;
    
    // Update the local trade with the server data
    await updateTrade(tradeId, serverTrade);
    
    // Invalidate the trades query to refresh the UI
    queryClient.invalidateQueries({ queryKey: ['/api/trades'] });
    queryClient.invalidateQueries({ queryKey: [`/api/trades/${tradeId}`] });
    
    return serverTrade;
  } catch (error) {
    console.error('Error synchronizing updated trade to server:', error);
    throw error;
  }
};

/**
 * Synchronize a deleted trade from IndexedDB to the server
 * @param tradeId The ID of the trade to delete on the server
 * @returns A promise that resolves when the deletion is complete
 */
export const syncDeletedTradeToServer = async (tradeId: number): Promise<void> => {
  try {
    // Delete the trade on the server using fetch directly
    const response = await fetch(`/api/trades/${tradeId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete trade on server: ${response.status} ${response.statusText}`);
    }
    
    // Invalidate the trades query to refresh the UI
    queryClient.invalidateQueries({ queryKey: ['/api/trades'] });
    
    console.log(`Trade ID ${tradeId} deleted from server`);
  } catch (error) {
    console.error('Error synchronizing deleted trade to server:', error);
    throw error;
  }
};

/**
 * Perform a full synchronization of trades and instruments
 * @returns A promise that resolves when the synchronization is complete
 */
export const performFullSync = async (): Promise<void> => {
  try {
    await syncInstrumentsToIndexedDB();
    await syncTradesToIndexedDB();
    console.log('Full synchronization complete');
  } catch (error) {
    console.error('Error performing full synchronization:', error);
    throw error;
  }
};