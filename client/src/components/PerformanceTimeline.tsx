import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  ZAxis,
  ComposedChart,
  ReferenceLine,
  ReferenceArea,
  Brush
} from 'recharts';
import { format, subDays, subMonths, isAfter, parseISO, isSameDay } from 'date-fns';
import { Trade } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// Define timeframe options
type TimeFrame = '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

interface PerformanceTimelineProps {
  trades: Trade[];
}

interface TradePoint {
  date: string;
  formattedDate: string;
  cumulativePnL: number;
  dailyPnL: number;
  tradesCount: number;
  winCount: number;
  lossCount: number;
  tradeIds: number[];
}

interface TradeMarker {
  date: string;
  pnl: number;
  id: number;
  symbol: string;
  tradeType: string;
  isWin: boolean;
}

// Custom tooltip for the timeline
const CustomTimelineTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 shadow-md rounded-md border">
        <p className="font-medium">{data.formattedDate}</p>
        <p className={`${data.cumulativePnL >= 0 ? 'text-green-600' : 'text-red-600'} font-medium`}>
          Cumulative P&L: {formatCurrency(data.cumulativePnL)}
        </p>
        {data.dailyPnL !== 0 && (
          <p className={`${data.dailyPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            Daily P&L: {formatCurrency(data.dailyPnL)}
          </p>
        )}
        {data.tradesCount > 0 && (
          <p className="text-gray-600">
            Trades: {data.tradesCount} ({data.winCount} W / {data.lossCount} L)
          </p>
        )}
      </div>
    );
  }
  return null;
};

// Custom tooltip for trade markers
const CustomMarkerTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const trade = payload[0].payload;
    return (
      <div className="bg-white p-3 shadow-md rounded-md border">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium">{trade.symbol}</span>
          <Badge variant="outline" className={trade.isWin ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
            {trade.tradeType}
          </Badge>
        </div>
        <p className={`${trade.isWin ? 'text-green-600' : 'text-red-600'} font-medium`}>
          {formatCurrency(trade.pnl)}
        </p>
      </div>
    );
  }
  return null;
};

// Custom streak area tooltip
const CustomStreakTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const streak = payload[0].payload;
    return (
      <div className="bg-white p-3 shadow-md rounded-md border">
        <div className="font-medium mb-1">
          {streak.isWinStreak ? 'Win Streak' : 'Loss Streak'}
        </div>
        <p>Length: {streak.length} trades</p>
        <p className={streak.isWinStreak ? 'text-green-600' : 'text-red-600'}>
          P&L: {formatCurrency(streak.streakPnL)}
        </p>
      </div>
    );
  }
  return null;
};

// Format currency values
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(value);
};

// Format dates for display
const formatDate = (dateString: string) => {
  return format(new Date(dateString), 'MMM d, yyyy');
};

const PerformanceTimeline: React.FC<PerformanceTimelineProps> = ({ trades }) => {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('1M');
  const [showMarkers, setShowMarkers] = useState<boolean>(true);
  const [showStreaks, setShowStreaks] = useState<boolean>(false);

  // Generate timeframe cutoff date
  const timeFrameCutoff = useMemo(() => {
    const now = new Date();
    switch (timeFrame) {
      case '1W':
        return subDays(now, 7);
      case '1M':
        return subMonths(now, 1);
      case '3M':
        return subMonths(now, 3);
      case '6M':
        return subMonths(now, 6);
      case '1Y':
        return subMonths(now, 12);
      case 'ALL':
      default:
        return new Date(0); // Beginning of time
    }
  }, [timeFrame]);

  // Process trades to create timeline data
  const { timelineData, tradeMarkers, streaks } = useMemo(() => {
    // Skip processing if no trades
    if (trades.length === 0) {
      return { timelineData: [], tradeMarkers: [], streaks: [] };
    }

    // Sort trades by date (ascending)
    const sortedTrades = [...trades].sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    // Filter trades by timeframe
    const filteredTrades = sortedTrades.filter(trade => 
      isAfter(new Date(trade.date), timeFrameCutoff)
    );

    // Create a map of dates to track daily stats
    const dateMap = new Map<string, TradePoint>();
    let cumulativePnL = 0;

    // Process each trade
    filteredTrades.forEach(trade => {
      const tradeDate = new Date(trade.date);
      const dateKey = format(tradeDate, 'yyyy-MM-dd');
      const pnl = parseFloat(trade.pnlDollars || '0');
      const isWin = pnl > 0;
      const isLoss = pnl < 0;

      // Update or create daily stats
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {
          date: dateKey,
          formattedDate: format(tradeDate, 'MMM d, yyyy'),
          cumulativePnL: cumulativePnL + pnl,
          dailyPnL: pnl,
          tradesCount: 1,
          winCount: isWin ? 1 : 0,
          lossCount: isLoss ? 1 : 0,
          tradeIds: [trade.id]
        });
      } else {
        const existingData = dateMap.get(dateKey)!;
        existingData.dailyPnL += pnl;
        existingData.tradesCount += 1;
        existingData.winCount += isWin ? 1 : 0;
        existingData.lossCount += isLoss ? 1 : 0;
        existingData.tradeIds.push(trade.id);
        dateMap.set(dateKey, existingData);
      }

      cumulativePnL += pnl;
    });

    // Convert map to array and ensure dates are in order
    let timelinePoints: TradePoint[] = Array.from(dateMap.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Add cumulative P&L values after sorting by date
    let runningTotal = 0;
    timelinePoints = timelinePoints.map(point => {
      runningTotal += point.dailyPnL;
      return {
        ...point,
        cumulativePnL: runningTotal
      };
    });

    // Create trade markers for scatter plot
    const markers: TradeMarker[] = filteredTrades.map(trade => {
      const pnl = parseFloat(trade.pnlDollars || '0');
      return {
        date: format(new Date(trade.date), 'yyyy-MM-dd'),
        pnl,
        id: trade.id,
        symbol: trade.symbol,
        tradeType: trade.tradeType,
        isWin: pnl > 0
      };
    });

    // Find winning and losing streaks
    const streakData: Array<{
      startDate: string;
      endDate: string;
      isWinStreak: boolean;
      length: number;
      streakPnL: number;
    }> = [];

    if (filteredTrades.length > 0) {
      let currentStreakType: 'win' | 'loss' | null = null;
      let streakStart: Trade | null = null;
      let streakEnd: Trade | null = null;
      let streakLength = 0;
      let streakPnL = 0;

      filteredTrades.forEach((trade, i) => {
        const pnl = parseFloat(trade.pnlDollars || '0');
        const isWin = pnl > 0;
        const isLoss = pnl < 0;

        // Skip trades with zero P&L
        if (pnl === 0) return;

        const tradeStreakType = isWin ? 'win' : 'loss';

        // First trade or continuing a streak
        if (currentStreakType === null || currentStreakType === tradeStreakType) {
          if (currentStreakType === null) {
            streakStart = trade;
            streakLength = 1;
            streakPnL = pnl;
          } else {
            streakLength++;
            streakPnL += pnl;
          }
          currentStreakType = tradeStreakType;
          streakEnd = trade;
        } 
        // Streak broken
        else {
          // Save the previous streak if it's at least 3 trades
          if (streakLength >= 3 && streakStart && streakEnd) {
            streakData.push({
              startDate: format(new Date(streakStart.date), 'yyyy-MM-dd'),
              endDate: format(new Date(streakEnd.date), 'yyyy-MM-dd'),
              isWinStreak: currentStreakType === 'win',
              length: streakLength,
              streakPnL
            });
          }

          // Start a new streak
          currentStreakType = tradeStreakType;
          streakStart = trade;
          streakEnd = trade;
          streakLength = 1;
          streakPnL = pnl;
        }

        // If this is the last trade, save the streak if it's significant
        if (i === filteredTrades.length - 1 && streakLength >= 3) {
          streakData.push({
            startDate: format(new Date(streakStart!.date), 'yyyy-MM-dd'),
            endDate: format(new Date(streakEnd!.date), 'yyyy-MM-dd'),
            isWinStreak: currentStreakType === 'win',
            length: streakLength,
            streakPnL
          });
        }
      });
    }

    return { 
      timelineData: timelinePoints, 
      tradeMarkers: markers,
      streaks: streakData
    };
  }, [trades, timeFrameCutoff]);

  // Find the data range for Y axis
  const yAxisDomain = useMemo(() => {
    if (timelineData.length === 0) return [0, 0];
    
    const allValues = [
      ...timelineData.map(point => point.cumulativePnL),
      ...tradeMarkers.map(marker => marker.pnl)
    ];
    
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    
    // Add 10% padding to the range
    const padding = Math.max(Math.abs(maxValue), Math.abs(minValue)) * 0.1;
    
    return [
      Math.floor(minValue - padding),
      Math.ceil(maxValue + padding)
    ];
  }, [timelineData, tradeMarkers]);

  if (trades.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center h-64">
            <p className="text-gray-500 text-lg">No trade data available for timeline</p>
            <p className="text-gray-400 mt-2">Add trades to see your performance over time</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <CardTitle>Performance Timeline</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <TabsList>
            <TabsTrigger 
              value="1W" 
              onClick={() => setTimeFrame('1W')} 
              className={timeFrame === '1W' ? 'bg-blue-100' : ''}
            >
              1W
            </TabsTrigger>
            <TabsTrigger 
              value="1M" 
              onClick={() => setTimeFrame('1M')} 
              className={timeFrame === '1M' ? 'bg-blue-100' : ''}
            >
              1M
            </TabsTrigger>
            <TabsTrigger 
              value="3M" 
              onClick={() => setTimeFrame('3M')} 
              className={timeFrame === '3M' ? 'bg-blue-100' : ''}
            >
              3M
            </TabsTrigger>
            <TabsTrigger 
              value="6M" 
              onClick={() => setTimeFrame('6M')} 
              className={timeFrame === '6M' ? 'bg-blue-100' : ''}
            >
              6M
            </TabsTrigger>
            <TabsTrigger 
              value="1Y" 
              onClick={() => setTimeFrame('1Y')} 
              className={timeFrame === '1Y' ? 'bg-blue-100' : ''}
            >
              1Y
            </TabsTrigger>
            <TabsTrigger 
              value="ALL" 
              onClick={() => setTimeFrame('ALL')} 
              className={timeFrame === 'ALL' ? 'bg-blue-100' : ''}
            >
              ALL
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2 ml-2">
            <Button 
              variant={showMarkers ? "default" : "outline"} 
              size="sm"
              onClick={() => setShowMarkers(!showMarkers)}
              className="text-xs h-8"
            >
              Trades
            </Button>
            <Button 
              variant={showStreaks ? "default" : "outline"} 
              size="sm"
              onClick={() => setShowStreaks(!showStreaks)}
              className="text-xs h-8"
            >
              Streaks
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[500px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={timelineData}
              margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => format(new Date(value), 'MMM d')}
                minTickGap={30}
              />
              <YAxis 
                domain={yAxisDomain} 
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip content={<CustomTimelineTooltip />} />
              <Legend />

              {/* Zero line reference */}
              <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />

              {/* Streaks highlight */}
              {showStreaks && streaks.map((streak, i) => (
                <ReferenceArea
                  key={`streak-${i}`}
                  x1={streak.startDate}
                  x2={streak.endDate}
                  y1={yAxisDomain[0]}
                  y2={yAxisDomain[1]}
                  fill={streak.isWinStreak ? "#4CAF5033" : "#F4433633"}
                  fillOpacity={0.3}
                />
              ))}

              {/* Cumulative P&L line */}
              <Line
                type="monotone"
                dataKey="cumulativePnL"
                name="Cumulative P&L"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />

              {/* Individual trade markers */}
              {showMarkers && (
                <Scatter
                  name="Trades"
                  data={tradeMarkers}
                  fill="#8884d8"
                  line={false}
                  shape={(props: any) => {
                    const { cx, cy, fill } = props;
                    const isWin = props.payload.isWin;
                    
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={5}
                        fill={isWin ? "#4CAF50" : "#F44336"}
                        stroke="#fff"
                        strokeWidth={1}
                      />
                    );
                  }}
                />
              )}

              {/* Time brush for longer periods */}
              {timelineData.length > 14 && (
                <Brush 
                  dataKey="date" 
                  height={30} 
                  stroke="#8884d8"
                  tickFormatter={(value) => format(new Date(value), 'MMM d')}
                  startIndex={Math.max(0, timelineData.length - 14)}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Stats section */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border rounded-md p-3">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Time Period</h3>
            <p className="font-medium">
              {timelineData.length > 0 ? (
                <>
                  {formatDate(timelineData[0].date)} to {formatDate(timelineData[timelineData.length - 1].date)}
                </>
              ) : (
                "No data"
              )}
            </p>
          </div>
          
          <div className="border rounded-md p-3">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Total P&L</h3>
            <p className={`font-medium ${timelineData.length > 0 && timelineData[timelineData.length - 1].cumulativePnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {timelineData.length > 0 ? formatCurrency(timelineData[timelineData.length - 1].cumulativePnL) : "$0.00"}
            </p>
          </div>
          
          <div className="border rounded-md p-3">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Longest Streak</h3>
            {streaks.length > 0 ? (
              <div className="flex items-center gap-2">
                <Badge className={streaks.reduce((longest, current) => 
                  longest.length > current.length ? longest : current
                ).isWinStreak ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {streaks.reduce((longest, current) => 
                    longest.length > current.length ? longest : current
                  ).isWinStreak ? 'WIN' : 'LOSS'}
                </Badge>
                <span className="font-medium">
                  {streaks.reduce((longest, current) => 
                    longest.length > current.length ? longest : current
                  ).length} trades
                </span>
              </div>
            ) : (
              <p className="text-gray-500">No significant streaks</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PerformanceTimeline;