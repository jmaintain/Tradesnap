import * as React from 'react';
import { useState, useMemo, useEffect } from 'react';
import { format, parse, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay, addDays, subDays, parseISO } from 'date-fns';
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
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  Calendar as CalendarIcon,
  DollarSign,
  PenTool,
  Image,
  ChevronLeft,
  ChevronRight,
  X,
  Maximize2,
  Edit,
  Eye,
  EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Trade } from '@shared/schema';
import ImageViewer from './ImageViewer';
import EditTradeModal from './EditTradeModal';

/**
 * Converts a date to a simple YYYY-MM-DD string format
 * This is used as a consistent key format for date-related operations
 */
const getDateKey = (date: Date | string): string => {
  if (typeof date === 'string') {
    // If it's already a string, try to normalize it
    if (date.includes('T')) {
      // ISO format like "2025-04-03T00:00:00.000Z"
      // Just take the date part
      return date.split('T')[0];
    } else if (date.includes('-') && date.split('-').length === 3) {
      // Already in YYYY-MM-DD format
      return date;
    }
    
    // For other string formats, parse to date first
    const parsedDate = new Date(date);
    if (!isNaN(parsedDate.getTime())) {
      const year = parsedDate.getFullYear();
      const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
      const day = String(parsedDate.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // If parsing failed, return today's date
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // If it's a Date object
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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
  // Parse any string dates into Date objects for calendar functionality
  const tradeDate = trade ? new Date(trade.date) : new Date();
  
  const [currentMonth, setCurrentMonth] = useState<Date>(tradeDate);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    trade ? tradeDate : undefined
  );
  const [selectedTrades, setSelectedTrades] = useState<Trade[]>([]);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [tradeToEdit, setTradeToEdit] = useState<Trade | undefined>(undefined);
  // Toggle for showing exact P&L values or just win/loss indicators
  const [showExactValues, setShowExactValues] = useState<boolean>(true);

  // Group trades by date using consistent date key formatting
  const tradesByDate = useMemo(() => {
    const result = new Map<string, Trade[]>();
    
    allTrades.forEach(trade => {
      // Use a consistent date key format
      const dateKey = getDateKey(trade.date);
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

  // Get full calendar days (including empty days before the start of month)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    // Get the day of the week for the first day of the month (0 = Sunday, 1 = Monday, etc.)
    const firstDayOfWeek = getDay(monthStart);
    
    // Create empty days to fill in the days before the 1st of the month
    const emptyDaysAtStart = Array.from({ length: firstDayOfWeek }, (_, i) => {
      // Use a sentinel value for empty days (subtracting days from the 1st)
      return subDays(monthStart, firstDayOfWeek - i);
    });
    
    // Return the combined array of empty days and actual month days
    return [...emptyDaysAtStart, ...daysInMonth];
  }, [currentMonth]);

  // When a date is selected, update the selected trades
  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    
    if (date) {
      // Use getDateKey for consistent date key formatting
      const dateKey = getDateKey(date);
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
  
  // Handle viewing an image in enlarged mode
  const handleViewImage = (imageSrc: string) => {
    // First, prevent event bubbling that might close the parent dialog
    setEnlargedImage(imageSrc);
  };
  
  // Close the enlarged image view
  const handleCloseEnlargedImage = (e?: React.MouseEvent | React.KeyboardEvent) => {
    // Stop propagation to prevent the calendar modal from closing
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setEnlargedImage(null);
  };
  
  // Handle editing a trade
  const handleEditTrade = (trade: Trade) => {
    setTradeToEdit(trade);
    setIsEditModalOpen(true);
  };

  // Default to the current trade if nothing is selected
  useEffect(() => {
    if (trade && !selectedDate) {
      // Create a Date object from the trade date string
      const tradeDateObj = new Date(trade.date);
      setSelectedDate(tradeDateObj);
      
      // Use the getDateKey function for consistent formatting
      const dateKey = getDateKey(trade.date);
      setSelectedTrades(tradesByDate.get(dateKey) || [trade]);
    }
  }, [trade, tradesByDate, selectedDate]);

  if (!trade) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[900px] w-[95vw] max-h-[90vh] overflow-y-auto p-0">
          <div className="p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-xl sm:text-2xl font-bold">Trade Calendar</DialogTitle>
              <DialogDescription>
                Select a date to view trade details
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Full width custom calendar */}
          <div className="bg-purple-50 p-3 sm:p-6 border-t border-b border-purple-100">
            {/* Month navigation and toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
              <h2 className="text-lg sm:text-2xl font-bold text-purple-800">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <div className="flex items-center justify-between sm:justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1 text-xs sm:text-sm h-8 sm:h-9 bg-white border-purple-200"
                  onClick={() => setShowExactValues(!showExactValues)}
                >
                  {showExactValues ? (
                    <>
                      <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>Hide money</span>
                    </>
                  ) : (
                    <>
                      <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>Show money</span>
                    </>
                  )}
                </Button>
                <div className="flex gap-1">
                  <button 
                    onClick={goToPreviousMonth}
                    className="p-1 rounded-full hover:bg-purple-200 transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6 text-purple-800" />
                  </button>
                  <button 
                    onClick={goToNextMonth}
                    className="p-1 rounded-full hover:bg-purple-200 transition-colors"
                  >
                    <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 text-purple-800" />
                  </button>
                </div>
              </div>
            </div>

            {/* Calendar header - days of week */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                <div key={index} className="text-center font-medium py-1 sm:py-2 text-xs sm:text-sm">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day) => {
                const dateKey = getDateKey(day);
                const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                const dayData = dailyPnL.get(dateKey);
                const hasData = !!dayData;
                const isProfitable = hasData && dayData.total > 0;
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                
                // For days outside the current month (the empty days at the start), we'll render a blank day
                const isEmptyDay = !isCurrentMonth;
                
                if (isEmptyDay) {
                  return (
                    <div
                      key={dateKey}
                      className="p-1 sm:p-2 h-16 sm:h-28 md:h-32 bg-gray-50 rounded-lg text-left relative overflow-hidden opacity-30"
                    >
                      <div className="font-medium text-xs sm:text-base text-gray-400">{format(day, 'd')}</div>
                    </div>
                  );
                }

                return (
                  <button
                    key={dateKey}
                    className={cn(
                      "p-1 sm:p-2 h-16 sm:h-28 md:h-32 rounded-lg transition-colors text-left relative overflow-hidden",
                      hasData 
                        ? isProfitable 
                          ? "bg-green-200 hover:bg-green-300" 
                          : "bg-red-200 hover:bg-red-300"
                        : "bg-gray-100 hover:bg-gray-200",
                      isSelected && "ring-2 ring-offset-1 sm:ring-offset-2 ring-blue-500",
                      isSelected && isProfitable && "ring-green-600",
                      isSelected && hasData && !isProfitable && "ring-red-600"
                    )}
                    onClick={() => handleDateSelect(day)}
                  >
                    <div className="font-bold text-sm sm:text-lg">{format(day, 'd')}</div>
                    
                    {hasData && (
                      <>
                        {showExactValues ? (
                          <div className={cn(
                            "font-bold text-xs sm:text-sm md:text-lg",
                            isProfitable ? "text-green-800" : "text-red-800"
                          )}>
                            {isProfitable ? '+' : ''}${Math.abs(dayData.total).toFixed(2)}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center my-1">
                            {isProfitable ? (
                              <TrendingUp className="w-5 h-5 text-green-600" />
                            ) : (
                              <TrendingDown className="w-5 h-5 text-red-600" />
                            )}
                          </div>
                        )}
                        <div className="text-xs sm:text-sm mt-0 sm:mt-1">
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
            <ScrollArea className="p-4 sm:p-6 max-h-[40vh]">
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold mb-1 sm:mb-2">
                    Trades on {format(selectedDate, 'MMMM d, yyyy')}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selectedTrades.length} {selectedTrades.length === 1 ? 'trade' : 'trades'} executed
                  </p>
                </div>

                {/* Trade details */}
                {selectedTrades.map((trade, index) => {
                  const isProfitable = parseFloat(trade.pnlDollars || '0') > 0;
                  
                  return (
                    <Card key={trade.id} className="border-l-4 overflow-hidden shadow-sm" 
                      style={{ borderLeftColor: isProfitable ? '#22c55e' : '#ef4444' }}>
                      <CardHeader className="p-3 sm:py-4">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                            {trade.symbol}{' '}
                            <Badge
                              variant="outline"
                              className={cn(
                                'font-medium capitalize text-xs',
                                trade.tradeType === 'long'
                                  ? 'bg-green-100 text-green-800 border-green-200'
                                  : 'bg-red-100 text-red-800 border-red-200'
                              )}
                            >
                              {trade.tradeType}
                            </Badge>
                          </CardTitle>
                          <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-2 sm:gap-4">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="flex items-center gap-1 px-2 h-8 text-xs sm:text-sm"
                              onClick={() => handleEditTrade(trade)}
                            >
                              <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span className="sm:block">Edit</span>
                            </Button>
                            <div className={cn(
                              "text-base sm:text-lg font-bold",
                              isProfitable ? "text-green-600" : "text-red-600"
                            )}>
                              {isProfitable ? '+' : ''}${Math.abs(parseFloat(trade.pnlDollars || '0')).toFixed(2)}
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-2">
                          <div>
                            <p className="text-xs text-gray-500">Quantity</p>
                            <p className="font-medium text-sm sm:text-base">{trade.quantity}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Entry</p>
                            <p className="font-medium text-sm sm:text-base">{trade.entryPrice}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Exit</p>
                            <p className="font-medium text-sm sm:text-base">{trade.exitPrice}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">P&L (Points)</p>
                            <p className={cn("font-medium text-sm sm:text-base", isProfitable ? "text-green-600" : "text-red-600")}>
                              {isProfitable ? '+' : ''}{trade.pnlPoints}
                            </p>
                          </div>
                        </div>
                      </CardHeader>

                      {/* Trade Notes & Screenshots */}
                      {(trade.notes || (trade.screenshots && trade.screenshots.length > 0)) && (
                        <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
                          <Tabs defaultValue="notes" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                              <TabsTrigger value="notes" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-1">
                                <PenTool className="h-3 w-3 sm:h-4 sm:w-4" />
                                Notes
                              </TabsTrigger>
                              <TabsTrigger value="screenshots" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-1">
                                <Image className="h-3 w-3 sm:h-4 sm:w-4" />
                                Screenshots
                              </TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="notes" className="mt-3 sm:mt-4">
                              {trade.notes ? (
                                <div className="whitespace-pre-wrap text-gray-700 border rounded-md p-3 sm:p-4 bg-gray-50 text-xs sm:text-sm">
                                  {trade.notes}
                                </div>
                              ) : (
                                <div className="text-gray-500 italic text-xs sm:text-sm">No notes available for this trade.</div>
                              )}
                            </TabsContent>
                            
                            <TabsContent value="screenshots" className="mt-3 sm:mt-4">
                              {trade.screenshots && trade.screenshots.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                                  {trade.screenshots.map((screenshot, index) => {
                                    const imageSrc = screenshot.startsWith('data:') 
                                      ? screenshot 
                                      : screenshot.startsWith('/uploads/') 
                                        ? screenshot.substring(1) // Remove leading slash
                                        : `/uploads/${screenshot}`;
                                        
                                    return (
                                      <div key={index} className="border rounded-lg overflow-hidden group relative">
                                        <img 
                                          src={imageSrc} 
                                          alt={`Trade screenshot ${index + 1}`}
                                          className="w-full h-auto object-contain cursor-pointer"
                                          onClick={() => handleViewImage(imageSrc)}
                                        />
                                        <Button 
                                          size="sm" 
                                          variant="ghost" 
                                          className="absolute top-2 right-2 bg-white/80 hover:bg-white rounded-full p-1 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                                          onClick={() => handleViewImage(imageSrc)}
                                        >
                                          <Maximize2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                        </Button>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="text-gray-500 italic text-xs sm:text-sm">No screenshots available for this trade.</div>
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
      
      {/* Fullscreen image viewer */}
      {enlargedImage && (
        <ImageViewer 
          imageSrc={enlargedImage} 
          onClose={handleCloseEnlargedImage} 
        />
      )}
      
      {/* Edit Trade Modal */}
      <EditTradeModal 
        isOpen={isEditModalOpen} 
        onClose={() => {
          setIsEditModalOpen(false);
          setTradeToEdit(undefined);
        }} 
        trade={tradeToEdit}
      />
    </>
  );
};

export default TradeViewModal;