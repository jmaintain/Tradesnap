import * as React from 'react';
import { useState, useMemo, useEffect } from 'react';
import { format, parse, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  Calendar as CalendarIcon,
  DollarSign,
  PenTool,
  Image,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Trade } from '@shared/schema';

interface TradeViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  trade?: Trade;
  allTrades: Trade[];
}

const TradeViewModal: React.FC<TradeViewModalProps> = ({
  isOpen,
  onClose,
  trade,
  allTrades,
}) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(
    trade ? new Date(trade.date) : new Date()
  );
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    trade ? new Date(trade.date) : undefined
  );
  const [selectedTrades, setSelectedTrades] = useState<Trade[]>([]);

  // Group trades by date
  const tradesByDate = useMemo(() => {
    const result = new Map<string, Trade[]>();
    
    allTrades.forEach(trade => {
      const dateKey = format(new Date(trade.date), 'yyyy-MM-dd');
      if (!result.has(dateKey)) {
        result.set(dateKey, []);
      }
      result.get(dateKey)!.push(trade);
    });
    
    return result;
  }, [allTrades]);

  // Calculate daily P&L sums
  const dailyPnL = useMemo(() => {
    const result = new Map<string, { total: number, count: number }>();
    
    // Convert entries to array to avoid iterator issues
    Array.from(tradesByDate.entries()).forEach(([dateKey, trades]) => {
      const sum = trades.reduce((total: number, trade: Trade) => 
        total + parseFloat(trade.pnlDollars || '0'), 0);
      result.set(dateKey, { 
        total: sum, 
        count: trades.length 
      });
    });
    
    return result;
  }, [tradesByDate]);

  // Get days of current month for the calendar
  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // When a date is selected, update the selected trades
  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    
    if (date) {
      const dateKey = format(date, 'yyyy-MM-dd');
      setSelectedTrades(tradesByDate.get(dateKey) || []);
    } else {
      setSelectedTrades([]);
    }
  };

  // Navigate to the previous month
  const goToPreviousMonth = () => {
    const prevMonth = new Date(currentMonth);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    setCurrentMonth(prevMonth);
  };

  // Navigate to the next month
  const goToNextMonth = () => {
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setCurrentMonth(nextMonth);
  };

  // Default to the current trade if nothing is selected
  useEffect(() => {
    if (trade && !selectedDate) {
      setSelectedDate(new Date(trade.date));
      const dateKey = format(new Date(trade.date), 'yyyy-MM-dd');
      setSelectedTrades(tradesByDate.get(dateKey) || [trade]);
    }
  }, [trade, tradesByDate, selectedDate]);

  if (!trade) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto p-0">
        <div className="p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Trade Calendar</DialogTitle>
            <DialogDescription>
              Select a date to view trade details
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Full width custom calendar */}
        <div className="bg-purple-50 p-6 border-t border-b border-purple-100">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-purple-800">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <div className="flex gap-2">
              <button 
                onClick={goToPreviousMonth}
                className="p-1 rounded-full hover:bg-purple-200 transition-colors"
              >
                <ChevronLeft className="h-6 w-6 text-purple-800" />
              </button>
              <button 
                onClick={goToNextMonth}
                className="p-1 rounded-full hover:bg-purple-200 transition-colors"
              >
                <ChevronRight className="h-6 w-6 text-purple-800" />
              </button>
            </div>
          </div>

          {/* Calendar header - days of week */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center font-medium py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {daysInMonth.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayData = dailyPnL.get(dateStr);
              const hasData = !!dayData;
              const isProfitable = hasData && dayData.total > 0;
              const isSelected = selectedDate && isSameDay(day, selectedDate);

              return (
                <button
                  key={dateStr}
                  className={cn(
                    "p-2 h-32 rounded-lg transition-colors text-left relative overflow-hidden",
                    hasData 
                      ? isProfitable 
                        ? "bg-green-200 hover:bg-green-300" 
                        : "bg-red-200 hover:bg-red-300"
                      : "bg-gray-100 hover:bg-gray-200",
                    isSelected && "ring-2 ring-offset-2 ring-blue-500",
                    isSelected && isProfitable && "ring-green-600",
                    isSelected && hasData && !isProfitable && "ring-red-600"
                  )}
                  onClick={() => handleDateSelect(day)}
                >
                  <div className="font-bold text-lg">{format(day, 'd')}</div>
                  
                  {hasData && (
                    <>
                      <div className={cn(
                        "font-bold text-lg",
                        isProfitable ? "text-green-800" : "text-red-800"
                      )}>
                        {isProfitable ? '+' : ''}${Math.abs(dayData.total).toFixed(2)}
                      </div>
                      <div className="text-sm mt-1">
                        {dayData.count} {dayData.count === 1 ? 'trade' : 'trades'}
                      </div>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Selected day's trades */}
        {selectedDate && selectedTrades.length > 0 && (
          <ScrollArea className="p-6 max-h-[40vh]">
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold mb-2">
                  Trades on {format(selectedDate, 'MMMM d, yyyy')}
                </h3>
                <p className="text-gray-500">
                  {selectedTrades.length} {selectedTrades.length === 1 ? 'trade' : 'trades'} executed
                </p>
              </div>

              {/* Trade details */}
              {selectedTrades.map((trade, index) => {
                const isProfitable = parseFloat(trade.pnlDollars || '0') > 0;
                
                return (
                  <Card key={trade.id} className="border-l-4 overflow-hidden shadow-sm" 
                    style={{ borderLeftColor: isProfitable ? '#22c55e' : '#ef4444' }}>
                    <CardHeader className="py-4">
                      <div className="flex justify-between items-center">
                        <CardTitle className="flex items-center gap-2">
                          {trade.symbol}{' '}
                          <Badge
                            variant="outline"
                            className={cn(
                              'font-medium capitalize',
                              trade.tradeType === 'long'
                                ? 'bg-green-100 text-green-800 border-green-200'
                                : 'bg-red-100 text-red-800 border-red-200'
                            )}
                          >
                            {trade.tradeType}
                          </Badge>
                        </CardTitle>
                        <div className={cn(
                          "text-lg font-bold",
                          isProfitable ? "text-green-600" : "text-red-600"
                        )}>
                          {isProfitable ? '+' : ''}${Math.abs(parseFloat(trade.pnlDollars || '0')).toFixed(2)}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                        <div>
                          <p className="text-xs text-gray-500">Quantity</p>
                          <p className="font-medium">{trade.quantity}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Entry</p>
                          <p className="font-medium">{trade.entryPrice}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Exit</p>
                          <p className="font-medium">{trade.exitPrice}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">P&L (Points)</p>
                          <p className={cn("font-medium", isProfitable ? "text-green-600" : "text-red-600")}>
                            {isProfitable ? '+' : ''}{trade.pnlPoints}
                          </p>
                        </div>
                      </div>
                    </CardHeader>

                    {/* Trade Notes & Screenshots */}
                    {(trade.notes || (trade.screenshots && trade.screenshots.length > 0)) && (
                      <CardContent>
                        <Tabs defaultValue="notes" className="w-full">
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="notes" className="flex items-center gap-2">
                              <PenTool className="h-4 w-4" />
                              Notes
                            </TabsTrigger>
                            <TabsTrigger value="screenshots" className="flex items-center gap-2">
                              <Image className="h-4 w-4" />
                              Screenshots
                            </TabsTrigger>
                          </TabsList>
                          
                          <TabsContent value="notes" className="mt-4">
                            {trade.notes ? (
                              <div className="whitespace-pre-wrap text-gray-700 border rounded-md p-4 bg-gray-50">
                                {trade.notes}
                              </div>
                            ) : (
                              <div className="text-gray-500 italic">No notes available for this trade.</div>
                            )}
                          </TabsContent>
                          
                          <TabsContent value="screenshots" className="mt-4">
                            {trade.screenshots && trade.screenshots.length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {trade.screenshots.map((screenshot, index) => (
                                  <div key={index} className="border rounded-lg overflow-hidden">
                                    <img 
                                      src={screenshot.startsWith('data:') 
                                           ? screenshot 
                                           : screenshot.startsWith('/uploads/') 
                                             ? screenshot.substring(1) // Remove leading slash
                                             : `/uploads/${screenshot}`
                                      } 
                                      alt={`Trade screenshot ${index + 1}`}
                                      className="w-full h-auto object-contain"
                                    />
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-gray-500 italic">No screenshots available for this trade.</div>
                            )}
                          </TabsContent>
                        </Tabs>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TradeViewModal;