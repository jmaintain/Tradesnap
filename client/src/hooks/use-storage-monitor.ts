import { useState, useEffect, useCallback } from 'react';
import { checkStorageUsage, getOldTradeRecords, clearScreenshotsFromTrades, deleteOldTrades, StorageInfo } from '@/lib/indexedDB/storageMonitor';
import { isIndexedDBSupported, safeIndexedDBOperation } from '@/lib/indexedDB/errorHandling';
import { useToast } from '@/hooks/use-toast';

// Database name constant
const DB_NAME = 'TradeSnapDB';

export interface StorageMonitorState {
  storageInfo: StorageInfo | null;
  isLoading: boolean;
  oldTradeCount: number;
  oldTradeIds: number[];
  isClearingScreenshots: boolean;
  isDeletingTrades: boolean;
  refreshInfo: () => Promise<void>;
  clearOldScreenshots: () => Promise<boolean>;
  deleteOldTradeRecords: () => Promise<boolean>;
}

/**
 * Hook to monitor IndexedDB storage usage and manage old trades
 * @param monthsToRetain - Number of months of trade data to retain
 * @param autoRefreshInterval - Interval in ms to auto-refresh storage info (0 to disable)
 */
export function useStorageMonitor(
  monthsToRetain: number = 1,
  autoRefreshInterval: number = 0
): StorageMonitorState {
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [oldTradeIds, setOldTradeIds] = useState<number[]>([]);
  const [isClearingScreenshots, setIsClearingScreenshots] = useState<boolean>(false);
  const [isDeletingTrades, setIsDeletingTrades] = useState<boolean>(false);
  const { toast } = useToast();

  // Function to refresh storage information
  const refreshInfo = useCallback(async () => {
    if (!isIndexedDBSupported()) {
      toast({
        title: "Browser Storage Not Supported",
        description: "Your browser doesn't support IndexedDB, which is required for local storage features.",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    try {
      // Get storage usage information
      const info = await checkStorageUsage(DB_NAME);
      setStorageInfo(info);
      
      // Get old trade records
      const oldIds = await getOldTradeRecords(DB_NAME, monthsToRetain);
      setOldTradeIds(oldIds);
      
      // Show warning if approaching storage limit
      if (info?.isApproachingLimit && oldIds.length > 0) {
        toast({
          title: "Storage Space Running Low",
          description: `You're using ${info.formattedUsed} of ${info.formattedQuota}. Consider clearing old screenshots or trades to free up space.`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Failed to refresh storage info:", error);
      toast({
        title: "Storage Check Failed",
        description: "Unable to check storage usage. Some storage management features may be unavailable.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [monthsToRetain, toast]);

  // Function to clear screenshots from old trades
  const clearOldScreenshots = useCallback(async (): Promise<boolean> => {
    if (oldTradeIds.length === 0) return true;
    
    setIsClearingScreenshots(true);
    try {
      const result = await safeIndexedDBOperation(
        "clearing old screenshots",
        () => clearScreenshotsFromTrades(DB_NAME, oldTradeIds),
        (error) => {
          toast({
            title: "Error Clearing Screenshots",
            description: error.recommendation || "Failed to clear old screenshots. Please try again.",
            variant: "destructive"
          });
        }
      );
      
      if (result.success && result.data) {
        toast({
          title: "Screenshots Cleared",
          description: `Successfully cleared screenshots from ${oldTradeIds.length} old trades.`,
          variant: "default"
        });
        
        // Refresh storage info after clearing
        await refreshInfo();
        return true;
      }
      return false;
    } finally {
      setIsClearingScreenshots(false);
    }
  }, [oldTradeIds, refreshInfo, toast]);

  // Function to delete old trades
  const deleteOldTradeRecords = useCallback(async (): Promise<boolean> => {
    if (oldTradeIds.length === 0) return true;
    
    setIsDeletingTrades(true);
    try {
      const result = await safeIndexedDBOperation(
        "deleting old trades",
        () => deleteOldTrades(DB_NAME, oldTradeIds),
        (error) => {
          toast({
            title: "Error Deleting Trades",
            description: error.recommendation || "Failed to delete old trades. Please try again.",
            variant: "destructive"
          });
        }
      );
      
      if (result.success && result.data) {
        toast({
          title: "Trades Deleted",
          description: `Successfully deleted ${oldTradeIds.length} old trades.`,
          variant: "default"
        });
        
        // Refresh storage info after deleting
        await refreshInfo();
        return true;
      }
      return false;
    } finally {
      setIsDeletingTrades(false);
    }
  }, [oldTradeIds, refreshInfo, toast]);

  // Initial load and auto-refresh
  useEffect(() => {
    refreshInfo();
    
    // Set up auto-refresh if interval is provided
    let intervalId: number | undefined;
    if (autoRefreshInterval > 0) {
      intervalId = window.setInterval(refreshInfo, autoRefreshInterval);
    }
    
    return () => {
      if (intervalId !== undefined) {
        clearInterval(intervalId);
      }
    };
  }, [refreshInfo, autoRefreshInterval]);

  return {
    storageInfo,
    isLoading,
    oldTradeCount: oldTradeIds.length,
    oldTradeIds,
    isClearingScreenshots,
    isDeletingTrades,
    refreshInfo,
    clearOldScreenshots,
    deleteOldTradeRecords
  };
}