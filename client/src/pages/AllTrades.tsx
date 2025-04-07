import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  FileDown,
  Search,
  SlidersHorizontal
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import TradeTable from '@/components/ui/trade-table';
import NewTradeModal from '@/components/NewTradeModal';
import { Trade } from '@shared/schema';

const AllTrades: React.FC = () => {
  const { toast } = useToast();
  const [isNewTradeModalOpen, setIsNewTradeModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Fetch all trades
  const { data: trades = [], isLoading } = useQuery<Trade[]>({
    queryKey: ['/api/trades'],
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error loading trades",
        description: error instanceof Error ? error.message : "An error occurred"
      });
    }
  });

  // Filter trades based on search term
  const filteredTrades = trades.filter(trade => 
    trade.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trade.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewTrade = (trade: Trade) => {
    // In a more complex app, this would navigate to a trade detail page
    toast({
      title: `Viewing ${trade.symbol} trade`,
      description: `Executed on ${new Date(trade.date).toLocaleDateString()}`
    });
  };

  const exportTrades = () => {
    // Create CSV content
    const headers = ['Date', 'Symbol', 'Type', 'Quantity', 'Entry Price', 'Exit Price', 'P&L (Pts)', 'P&L ($)', 'Notes'];
    const csvContent = [
      headers.join(','),
      ...filteredTrades.map(trade => [
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
            <TradeTable trades={filteredTrades} onViewTrade={handleViewTrade} />
          )}
        </Card>
      </div>
      
      <NewTradeModal 
        isOpen={isNewTradeModalOpen} 
        onClose={() => setIsNewTradeModalOpen(false)} 
      />
    </div>
  );
};

export default AllTrades;
