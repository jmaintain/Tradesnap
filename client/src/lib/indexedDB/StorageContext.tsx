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
  // Use the storage monitor hook
  const { 
    refreshInfo,
    storageInfo,
    isLoading 
  } = useStorageMonitor(1, 0); // 1 month retention, no auto-refresh

  // Expose a simpler refreshStorageInfo function
  const refreshStorageInfo = useCallback(async () => {
    await refreshInfo();
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