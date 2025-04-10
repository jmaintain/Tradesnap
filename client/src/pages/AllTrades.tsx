import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  FileDown,
  Search,
  SlidersHorizontal,
  Trash
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import TradeTable from '@/components/ui/trade-table';
import NewTradeModal from '@/components/NewTradeModal';
import TradeViewModal from '@/components/TradeViewModal';
import { Trade } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useStorageMonitor } from '@/hooks/use-storage-monitor';
import { deleteTrade } from '@/lib/indexedDB/tradeRepository';

const AllTrades: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { refreshInfo } = useStorageMonitor(6, 10000);
  const [isNewTradeModalOpen, setIsNewTradeModalOpen] = useState(false);
  const [isViewTradeModalOpen, setIsViewTradeModalOpen] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<Trade | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSelections, setShowSelections] = useState(false);
  const [selectedTradeIds, setSelectedTradeIds] = useState<number[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Get the current user ID from localStorage
  const userId = localStorage.getItem('userId') || '0';
  
  // Fetch all trades for the current user
  const { data: trades = [], isLoading } = useQuery<Trade[]>({
    queryKey: [`/api/trades?userId=${userId}`]
  });

  // Delete trade mutation
  const deleteTradeMutation = useMutation({
    mutationFn: async (tradeId: number) => {
      await apiRequest('DELETE', `/api/trades/${tradeId}`);
      // Also delete from IndexedDB for consistency
      await deleteTrade(tradeId);
      return tradeId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trades?userId=${userId}`] });
      refreshInfo(); // Update storage info
    }
  });

  // Delete multiple trades mutation
  const deleteMultipleTradesMutation = useMutation({
    mutationFn: async (tradeIds: number[]) => {
      const promises = tradeIds.map(id => deleteTradeMutation.mutateAsync(id));
      return Promise.all(promises);
    },
    onSuccess: () => {
      setSelectedTradeIds([]);
      setIsDeleteDialogOpen(false);
      toast({
        title: "Trades deleted",
        description: `Successfully deleted ${selectedTradeIds.length} trades.`
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error deleting trades",
        description: error instanceof Error ? error.message : "An error occurred"
      });
    }
  });

  // Filter trades based on search term
  const filteredTrades = trades.filter((trade: Trade) => 
    trade.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trade.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewTrade = (trade: Trade) => {
    setSelectedTrade(trade);
    setIsViewTradeModalOpen(true);
  };

  const handleToggleSelections = () => {
    setShowSelections(!showSelections);
    if (showSelections) {
      setSelectedTradeIds([]);
    }
  };

  const handleSelectTrade = (tradeId: number, selected: boolean) => {
    if (selected) {
      setSelectedTradeIds(prev => [...prev, tradeId]);
    } else {
      setSelectedTradeIds(prev => prev.filter(id => id !== tradeId));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedTradeIds.length > 0) {
      setIsDeleteDialogOpen(true);
    }
  };

  const confirmDeleteSelected = () => {
    deleteMultipleTradesMutation.mutate(selectedTradeIds);
  };

  const exportTrades = () => {
    // Create CSV content
    const headers = ['Date', 'Symbol', 'Type', 'Quantity', 'Entry Price', 'Exit Price', 'P&L (Pts)', 'P&L ($)', 'Notes'];
    const csvContent = [
      headers.join(','),
      ...filteredTrades.map((trade: Trade) => [
        new Date(trade.date).toISOString().split('T')[0],
        trade.symbol,
        trade.tradeType,
        trade.quantity,
        trade.entryPrice,
        trade.exitPrice,
        trade.pnlPoints,
        trade.pnlDollars,
        trade.notes ? `"${trade.notes.replace(/"/g, '""')}"` : ''
      ].join(','))
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `trades-export-${new Date().toISOString().split('T')[0]}.csv`);
    a.click();
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">All Trades</h1>
          <div className="mt-3 md:mt-0 flex gap-2 flex-wrap">
            <Button 
              variant={showSelections ? "default" : "outline"}
              onClick={handleToggleSelections}
              className={showSelections ? "bg-blue-600 hover:bg-blue-700" : ""}
            >
              {showSelections ? "Done Selecting" : "Select Trades"}
            </Button>
            <Button 
              variant="outline" 
              onClick={exportTrades}
              disabled={filteredTrades.length === 0}
            >
              <FileDown className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button onClick={() => setIsNewTradeModalOpen(true)}>
              <Plus className="-ml-1 mr-2 h-4 w-4" />
              New Trade
            </Button>
          </div>
        </div>

        {/* Search and filters */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-grow">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search trades..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" className="flex-shrink-0">
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Trades Table */}
        <Card>
          <CardHeader className="border-b border-gray-200">
            <CardTitle>Trade History</CardTitle>
            <p className="text-sm text-gray-500">
              {filteredTrades.length} {filteredTrades.length === 1 ? 'trade' : 'trades'} found
            </p>
          </CardHeader>
          
          {isLoading ? (
            <CardContent className="py-6">
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            </CardContent>
          ) : (
            <TradeTable 
              trades={filteredTrades} 
              onViewTrade={handleViewTrade} 
              showSelections={showSelections}
              selectedTrades={selectedTradeIds}
              onSelectTrade={handleSelectTrade}
              onDeleteSelected={handleDeleteSelected}
            />
          )}
        </Card>
      </div>
      
      <NewTradeModal 
        isOpen={isNewTradeModalOpen} 
        onClose={() => setIsNewTradeModalOpen(false)} 
      />
      
      <TradeViewModal
        isOpen={isViewTradeModalOpen}
        onClose={() => setIsViewTradeModalOpen(false)}
        trade={selectedTrade}
        allTrades={trades}
      />

      {/* Confirmation Dialog for Delete */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Trades</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedTradeIds.length} {selectedTradeIds.length === 1 ? 'trade' : 'trades'}? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteSelected} 
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMultipleTradesMutation.isPending}
            >
              {deleteMultipleTradesMutation.isPending ? 
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Deleting...
                </span> 
                : 'Delete'
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AllTrades;
