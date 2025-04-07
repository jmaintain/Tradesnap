import React, { useState } from 'react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { 
  BarChart3, 
  ChevronsUp, 
  ChevronsDown, 
  ListChecks, 
  ArrowRightLeft,
  DollarSign, 
  BarChart, 
  ArrowRight,
  Plus 
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import PerformanceCard from '@/components/ui/performance-card';
import TradeTable from '@/components/ui/trade-table';
import InstrumentTable from '@/components/ui/instrument-table';
import NewTradeModal from '@/components/NewTradeModal';
import TradeViewModal from '@/components/TradeViewModal';
import { StorageDebug } from '@/components/StorageDebug';
import { Trade } from '@shared/schema';

const Dashboard: React.FC = () => {
  const { toast } = useToast();
  const [isNewTradeModalOpen, setIsNewTradeModalOpen] = useState(false);
  const [isViewTradeModalOpen, setIsViewTradeModalOpen] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<Trade | undefined>(undefined);
  
  // Fetch trades
  const { data: trades = [], isLoading: isLoadingTrades } = useQuery<Trade[]>({
    queryKey: ['/api/trades'],
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error loading trades",
        description: error instanceof Error ? error.message : "An error occurred"
      });
    }
  });

  // Fetch instruments
  const { data: instruments = [], isLoading: isLoadingInstruments } = useQuery({
    queryKey: ['/api/instruments'],
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error loading instruments",
        description: error instanceof Error ? error.message : "An error occurred"
      });
    }
  });

  // Calculate performance metrics
  const calculatePerformanceMetrics = () => {
    if (!trades.length) return { totalPnl: 0, winRate: 0, totalTrades: 0, avgTradePnl: 0 };
    
    const totalPnl = trades.reduce((sum, trade) => sum + parseFloat(trade.pnlDollars || '0'), 0);
    const winningTrades = trades.filter(trade => parseFloat(trade.pnlDollars || '0') > 0);
    const winRate = (winningTrades.length / trades.length) * 100;
    const avgTradePnl = totalPnl / trades.length;
    
    return {
      totalPnl,
      winRate,
      totalTrades: trades.length,
      avgTradePnl
    };
  };

  const { totalPnl, winRate, totalTrades, avgTradePnl } = calculatePerformanceMetrics();
  
  // Get recent trades (last 5)
  const recentTrades = [...trades].slice(0, 5);

  const handleViewTrade = (trade: Trade) => {
    setSelectedTrade(trade);
    setIsViewTradeModalOpen(true);
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <div className="mt-3 md:mt-0">
            <Button onClick={() => setIsNewTradeModalOpen(true)}>
              <Plus className="-ml-1 mr-2 h-5 w-5" />
              New Trade
            </Button>
          </div>
        </div>

        {/* Performance Summary Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 mb-8">
          <PerformanceCard
            title="Total P&L"
            value={`${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}`}
            icon={<DollarSign className="h-5 w-5 text-white" />}
            iconBgColor="bg-blue-500"
            textColor={totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}
          />
          
          <PerformanceCard
            title="Win Rate"
            value={`${winRate.toFixed(0)}%`}
            icon={<BarChart className="h-5 w-5 text-white" />}
            iconBgColor="bg-green-500"
          />
          
          <PerformanceCard
            title="Total Trades"
            value={totalTrades}
            icon={<ListChecks className="h-5 w-5 text-white" />}
            iconBgColor="bg-indigo-500"
          />
          
          <PerformanceCard
            title="Avg. Trade P&L"
            value={`${avgTradePnl >= 0 ? '+' : ''}$${avgTradePnl.toFixed(2)}`}
            icon={<ArrowRightLeft className="h-5 w-5 text-white" />}
            iconBgColor="bg-amber-500"
            textColor={avgTradePnl >= 0 ? 'text-green-600' : 'text-red-600'}
          />
        </div>

        {/* Recent Trades */}
        <Card className="mb-8">
          <CardHeader className="border-b border-gray-200">
            <CardTitle>Recent Trades</CardTitle>
            <p className="text-sm text-gray-500">Your last 5 trades</p>
          </CardHeader>
          
          {isLoadingTrades ? (
            <CardContent className="py-6">
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            </CardContent>
          ) : (
            <TradeTable trades={recentTrades} onViewTrade={handleViewTrade} />
          )}
          
          <CardFooter className="bg-gray-50 border-t border-gray-200 justify-end p-4">
            <Link href="/trades">
              <Button variant="outline" className="text-blue-700 bg-blue-100 hover:bg-blue-200 border-blue-100">
                View All Trades
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardFooter>
        </Card>

        {/* Storage Debug Component */}
        <StorageDebug />
        
        {/* Instrument Reference Data */}
        <Card>
          <CardHeader className="border-b border-gray-200">
            <CardTitle>Instrument Reference Data</CardTitle>
            <p className="text-sm text-gray-500">Futures contracts tick sizes and values</p>
          </CardHeader>
          
          {isLoadingInstruments ? (
            <CardContent className="py-6">
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            </CardContent>
          ) : (
            <InstrumentTable instruments={instruments} />
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
    </div>
  );
};

export default Dashboard;
