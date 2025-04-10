import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { 
  PieChart as PieChartIcon, 
  BarChart as BarChartIcon, 
  ArrowUpCircle, 
  ArrowDownCircle,
  Calendar,
  Layers,
  TrendingUp,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Trade } from '@shared/schema';
import PerformanceTimeline from '@/components/PerformanceTimeline';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const Analytics: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("timeline");
  const [showDetailedCharts, setShowDetailedCharts] = useState<boolean>(false);
  
  // Get current user ID
  const userId = localStorage.getItem('userId') || '0';
  
  // Fetch all trades
  const { data: trades = [], isLoading } = useQuery<Trade[]>({
    queryKey: [`/api/trades?userId=${userId}`]
  });

  // Generate data for P&L by Instrument
  const pnlByInstrument = useMemo(() => {
    const instrumentMap = new Map<string, number>();
    
    trades.forEach(trade => {
      const pnl = parseFloat(trade.pnlDollars || '0');
      const currentPnl = instrumentMap.get(trade.symbol) || 0;
      instrumentMap.set(trade.symbol, currentPnl + pnl);
    });
    
    return Array.from(instrumentMap.entries()).map(([symbol, pnl]) => ({
      name: symbol,
      value: pnl
    })).sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  }, [trades]);

  // Generate data for Win/Loss Ratio by Instrument
  const winLossByInstrument = useMemo(() => {
    const instrumentData = new Map<string, { wins: number, losses: number }>();
    
    trades.forEach(trade => {
      const pnl = parseFloat(trade.pnlDollars || '0');
      const data = instrumentData.get(trade.symbol) || { wins: 0, losses: 0 };
      
      if (pnl > 0) {
        data.wins += 1;
      } else if (pnl < 0) {
        data.losses += 1;
      }
      
      instrumentData.set(trade.symbol, data);
    });
    
    return Array.from(instrumentData.entries()).map(([symbol, data]) => ({
      name: symbol,
      wins: data.wins,
      losses: data.losses,
      total: data.wins + data.losses,
      winRate: data.wins / (data.wins + data.losses) * 100
    }));
  }, [trades]);

  // Calculate overall metrics
  const metrics = useMemo(() => {
    if (trades.length === 0) return { 
      totalPnl: 0, 
      winningTrades: 0, 
      losingTrades: 0, 
      winRate: 0, 
      biggestWin: 0,
      biggestLoss: 0,
      averageWin: 0,
      averageLoss: 0
    };
    
    const winningTrades = trades.filter(trade => parseFloat(trade.pnlDollars || '0') > 0);
    const losingTrades = trades.filter(trade => parseFloat(trade.pnlDollars || '0') < 0);
    
    const totalPnl = trades.reduce((sum, trade) => sum + parseFloat(trade.pnlDollars || '0'), 0);
    const winRate = (winningTrades.length / trades.length) * 100;
    
    // Find biggest win and loss
    const sortedByPnl = [...trades].sort((a, b) => 
      parseFloat(b.pnlDollars || '0') - parseFloat(a.pnlDollars || '0')
    );
    const biggestWin = sortedByPnl.length > 0 && parseFloat(sortedByPnl[0].pnlDollars || '0') > 0 
      ? parseFloat(sortedByPnl[0].pnlDollars || '0') 
      : 0;
    
    const biggestLoss = sortedByPnl.length > 0 && parseFloat(sortedByPnl[sortedByPnl.length - 1].pnlDollars || '0') < 0
      ? parseFloat(sortedByPnl[sortedByPnl.length - 1].pnlDollars || '0')
      : 0;
    
    // Calculate average win and loss
    const totalWinAmount = winningTrades.reduce((sum, trade) => sum + parseFloat(trade.pnlDollars || '0'), 0);
    const totalLossAmount = losingTrades.reduce((sum, trade) => sum + parseFloat(trade.pnlDollars || '0'), 0);
    
    const averageWin = winningTrades.length > 0 ? totalWinAmount / winningTrades.length : 0;
    const averageLoss = losingTrades.length > 0 ? totalLossAmount / losingTrades.length : 0;
    
    return {
      totalPnl,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate,
      biggestWin,
      biggestLoss,
      averageWin,
      averageLoss
    };
  }, [trades]);

  // Custom colors for the charts
  const COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#F44336', '#9C27B0', '#3F51B5'];
  const WIN_COLOR = '#4CAF50';
  const LOSS_COLOR = '#F44336';

  // Format currency values
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  // Custom tooltip for the P&L chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 shadow-md rounded-md border">
          <p className="font-medium">{data.name}</p>
          <p className={`${data.value >= 0 ? 'text-green-600' : 'text-red-600'} font-medium`}>
            P&L: {formatCurrency(data.value)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
          
          {trades.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-1"
                onClick={() => setShowDetailedCharts(!showDetailedCharts)}
              >
                {showDetailedCharts ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    <span className="hidden sm:inline">Hide Detailed Charts</span>
                    <span className="sm:hidden">Hide</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    <span className="hidden sm:inline">Show Detailed Charts</span>
                    <span className="sm:hidden">More</span>
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
        
        {trades.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64">
              <TrendingUp className="h-16 w-16 text-gray-400 mb-4" />
              <p className="text-gray-500 text-lg">No trade data available for analysis</p>
              <p className="text-gray-400 mt-2">Add trades to see your performance analytics</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Performance Metrics Summary */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
              <Card>
                <CardContent className="pt-5">
                  <div className="flex items-center">
                    <div className="p-2 rounded-md bg-blue-100 text-blue-600">
                      <Layers className="h-6 w-6" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Total Trades</p>
                      <p className="text-2xl font-semibold text-gray-900">{trades.length}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <span className="text-green-600 font-medium flex items-center">
                        <ArrowUpCircle className="h-4 w-4 mr-1" />
                        {metrics.winningTrades} Wins
                      </span>
                    </div>
                    <div>
                      <span className="text-red-600 font-medium flex items-center">
                        <ArrowDownCircle className="h-4 w-4 mr-1" />
                        {metrics.losingTrades} Losses
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-600 font-medium">
                        {metrics.winRate.toFixed(1)}% Win Rate
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-5">
                  <div className="flex items-center">
                    <div className={`p-2 rounded-md ${metrics.totalPnl >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {metrics.totalPnl >= 0 ? 
                        <ArrowUpCircle className="h-6 w-6" /> : 
                        <ArrowDownCircle className="h-6 w-6" />}
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Total P&L</p>
                      <p className={`text-2xl font-semibold ${metrics.totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(metrics.totalPnl)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-5">
                  <div className="flex items-center">
                    <div className="p-2 rounded-md bg-green-100 text-green-600">
                      <ArrowUpCircle className="h-6 w-6" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Biggest Win</p>
                      <p className="text-2xl font-semibold text-green-600">
                        {formatCurrency(metrics.biggestWin)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Avg Win: <span className="text-green-600 font-medium">{formatCurrency(metrics.averageWin)}</span>
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-5">
                  <div className="flex items-center">
                    <div className="p-2 rounded-md bg-red-100 text-red-600">
                      <ArrowDownCircle className="h-6 w-6" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Biggest Loss</p>
                      <p className="text-2xl font-semibold text-red-600">
                        {formatCurrency(metrics.biggestLoss)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Avg Loss: <span className="text-red-600 font-medium">{formatCurrency(metrics.averageLoss)}</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Performance Timeline */}
            <PerformanceTimeline trades={trades} />

            {/* Detailed Charts Section */}
            {showDetailedCharts && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Detailed Analytics</h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  {/* P&L by Instrument */}
                  <Card>
                    <CardHeader className="pb-0">
                      <CardTitle className="text-lg">P&L by Instrument</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={pnlByInstrument}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis tickFormatter={(value) => `$${value}`} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Bar dataKey="value" name="P&L" fill="#3B82F6">
                              {pnlByInstrument.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.value >= 0 ? WIN_COLOR : LOSS_COLOR} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Win Rate by Instrument */}
                  <Card>
                    <CardHeader className="pb-0">
                      <CardTitle className="text-lg">Win Rate by Instrument</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={winLossByInstrument}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis yAxisId="left" orientation="left" tickFormatter={(value) => `${value}%`} />
                            <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${value}`} />
                            <Tooltip />
                            <Legend />
                            <Bar yAxisId="right" dataKey="wins" name="Wins" fill={WIN_COLOR} />
                            <Bar yAxisId="right" dataKey="losses" name="Losses" fill={LOSS_COLOR} />
                            <Bar yAxisId="left" dataKey="winRate" name="Win Rate %" fill="#3B82F6" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                
                  {/* Win/Loss Distribution */}
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle>Win/Loss Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'Winning Trades', value: metrics.winningTrades },
                                { name: 'Losing Trades', value: metrics.losingTrades }
                              ]}
                              cx="50%"
                              cy="50%"
                              outerRadius={120}
                              fill="#8884d8"
                              dataKey="value"
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                            >
                              <Cell fill={WIN_COLOR} />
                              <Cell fill={LOSS_COLOR} />
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Analytics;