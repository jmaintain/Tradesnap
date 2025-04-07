import React, { useState } from 'react';
import { Database, HardDrive, Trash2, Image, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useStorageMonitor } from '@/hooks/use-storage-monitor';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface StorageManagementProps {
  monthsToRetain?: number;
}

export function StorageManagement({ monthsToRetain = 1 }: StorageManagementProps) {
  const {
    storageInfo,
    isLoading,
    oldTradeCount,
    isClearingScreenshots,
    isDeletingTrades,
    refreshInfo,
    clearOldScreenshots,
    deleteOldTradeRecords
  } = useStorageMonitor(monthsToRetain, 0);

  const [showClearScreenshotsDialog, setShowClearScreenshotsDialog] = useState(false);
  const [showDeleteTradesDialog, setShowDeleteTradesDialog] = useState(false);

  // Handle screenshot clearing confirmation
  const handleClearScreenshots = async () => {
    await clearOldScreenshots();
    setShowClearScreenshotsDialog(false);
  };

  // Handle trade deletion confirmation
  const handleDeleteTrades = async () => {
    await deleteOldTradeRecords();
    setShowDeleteTradesDialog(false);
  };

  // Determine UI states and messages
  const usagePercent = storageInfo?.percentUsed ? Math.round(storageInfo.percentUsed * 100) : 0;
  const isStorageCritical = storageInfo?.isNearLimit || false;
  const isStorageWarning = storageInfo?.isApproachingLimit || false;
  const hasOldTrades = oldTradeCount > 0;
  
  // Get appropriate progress bar color based on usage
  const progressColor = isStorageCritical
    ? 'bg-red-600'
    : isStorageWarning
      ? 'bg-yellow-500'
      : 'bg-blue-600';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Database className="mr-2 h-5 w-5" />
              Local Storage Management
            </CardTitle>
            <CardDescription>
              Manage browser storage usage and data retention
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshInfo} 
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Storage Usage Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">Storage Usage</h3>
            <span className="text-sm text-muted-foreground">
              {isLoading ? 'Calculating...' : 
                storageInfo ? `${storageInfo.formattedUsed} / ${storageInfo.formattedQuota}` : 'Unknown'}
            </span>
          </div>
          
          <Progress 
            value={usagePercent} 
            className={`h-2 ${isStorageCritical ? 'bg-red-200' : isStorageWarning ? 'bg-yellow-200' : 'bg-gray-200'}`}
          />
          
          <div className={`flex items-center mt-2 ${isStorageCritical ? 'text-red-600' : isStorageWarning ? 'text-yellow-600' : 'text-green-600'}`}>
            {isStorageCritical && (
              <>
                <AlertTriangle className="h-4 w-4 mr-1" />
                <span className="text-xs">Critical: Storage nearly full! Clear space now.</span>
              </>
            )}
            {!isStorageCritical && isStorageWarning && (
              <>
                <AlertTriangle className="h-4 w-4 mr-1" />
                <span className="text-xs">Warning: Storage space running low.</span>
              </>
            )}
            {!isStorageCritical && !isStorageWarning && (
              <>
                <HardDrive className="h-4 w-4 mr-1" />
                <span className="text-xs">Storage usage normal.</span>
              </>
            )}
          </div>
        </div>
        
        <Separator />
        
        {/* Data Retention Section */}
        <div>
          <h3 className="text-sm font-medium mb-2">Data Retention Policy</h3>
          <p className="text-sm text-muted-foreground mb-4">
            TradeSnap automatically keeps the last {monthsToRetain} month{monthsToRetain > 1 ? 's' : ''} of trade data locally 
            in your browser. You can manage older data below.
          </p>
          
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-medium">Older Trade Data</h4>
                  <p className="text-xs text-muted-foreground">{oldTradeCount} trades older than {monthsToRetain} month{monthsToRetain > 1 ? 's' : ''}</p>
                </div>
                <div className="space-x-2">
                  {/* Clear Screenshots Dialog */}
                  <AlertDialog open={showClearScreenshotsDialog} onOpenChange={setShowClearScreenshotsDialog}>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={isClearingScreenshots || !hasOldTrades}
                      >
                        <Image className="h-4 w-4 mr-1" />
                        Clear Screenshots
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Clear Old Trade Screenshots</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove all screenshots from {oldTradeCount} trades older than {monthsToRetain} month{monthsToRetain > 1 ? 's' : ''}.
                          Trade records will be kept, but screenshots will be permanently deleted.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearScreenshots}>
                          {isClearingScreenshots ? 'Clearing...' : 'Clear Screenshots'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  
                  {/* Delete Trades Dialog */}
                  <AlertDialog open={showDeleteTradesDialog} onOpenChange={setShowDeleteTradesDialog}>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        disabled={isDeletingTrades || !hasOldTrades}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete Trades
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Old Trade Records</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete {oldTradeCount} trades older than {monthsToRetain} month{monthsToRetain > 1 ? 's' : ''}.
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDeleteTrades}>
                          {isDeletingTrades ? 'Deleting...' : 'Delete Trades'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="bg-gray-50 dark:bg-gray-800 text-xs text-muted-foreground">
        <p>
          StorageMonitor v1.0 - Local browser storage only. Data is stored in your browser using IndexedDB.
        </p>
      </CardFooter>
    </Card>
  );
}