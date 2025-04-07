import React, { useEffect } from 'react';
import { useStorage } from '@/lib/indexedDB/StorageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export function StorageDebug() {
  const { storageInfo, refreshStorageInfo, isLoading } = useStorage();

  // Log storage info when it changes
  useEffect(() => {
    console.log('StorageDebug: Current storage info:', storageInfo);
  }, [storageInfo]);

  const handleRefresh = async () => {
    console.log('StorageDebug: Manual refresh triggered');
    await refreshStorageInfo();
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Storage Debug Info</CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-sm space-y-2">
          <p>
            <strong>Status:</strong> {isLoading ? 'Loading...' : 'Ready'}
          </p>
          {storageInfo ? (
            <>
              <p>
                <strong>Used:</strong> {storageInfo.formattedUsed} / {storageInfo.formattedQuota} 
                ({Math.round(storageInfo.percentUsed * 100)}%)
              </p>
              <p>
                <strong>Raw Values:</strong> {storageInfo.used} bytes of {storageInfo.quota} bytes
              </p>
              <p>
                <strong>Approaching Limit:</strong> {storageInfo.hasOwnProperty('isApproachingLimit') ? 
                  (storageInfo as any).isApproachingLimit ? 'Yes' : 'No' : 'N/A'}
              </p>
              <p>
                <strong>Critical:</strong> {storageInfo.hasOwnProperty('isNearLimit') ? 
                  (storageInfo as any).isNearLimit ? 'Yes' : 'No' : 'N/A'}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                * This component is for debugging purposes only.
              </p>
            </>
          ) : (
            <p>No storage information available</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}