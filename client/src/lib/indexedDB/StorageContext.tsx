import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import { useStorageMonitor } from '@/hooks/use-storage-monitor';

interface StorageContextType {
  refreshStorageInfo: () => Promise<void>;
  storageInfo: {
    used: number;
    quota: number;
    percentUsed: number;
    formattedUsed: string;
    formattedQuota: string;
  } | null;
  isLoading: boolean;
}

// Create the context with a default value
const StorageContext = createContext<StorageContextType>({
  refreshStorageInfo: async () => {},
  storageInfo: null,
  isLoading: false,
});

// Hook to use the storage context
export const useStorage = () => useContext(StorageContext);

interface StorageProviderProps {
  children: ReactNode;
}

// Provider component
export const StorageProvider: React.FC<StorageProviderProps> = ({ children }) => {
  // Use the storage monitor hook with auto-refresh of 30 seconds
  const { 
    refreshInfo,
    storageInfo,
    isLoading 
  } = useStorageMonitor(1, 30000); // 1 month retention, 30 second auto-refresh

  // Expose a simpler refreshStorageInfo function
  const refreshStorageInfo = useCallback(async () => {
    console.log("StorageContext: Starting storage refresh");
    await refreshInfo();
    // Don't reference storageInfo in the dependency array to avoid circular dependency
    console.log("StorageContext: Storage refresh completed");
  }, [refreshInfo]);

  return (
    <StorageContext.Provider
      value={{
        refreshStorageInfo,
        storageInfo,
        isLoading
      }}
    >
      {children}
    </StorageContext.Provider>
  );
};