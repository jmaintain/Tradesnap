import React, { useState } from 'react';
import { format } from 'date-fns';
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
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  Calendar as CalendarIcon,
  DollarSign,
  PenTool,
  Image,
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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    trade ? new Date(trade.date) : undefined
  );

  // Find the trade for the selected date
  const selectedTrade = selectedDate
    ? allTrades.find(
        (t) => format(new Date(t.date), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
      )
    : trade;

  // Create an array of dates that have trades
  const tradeDates = allTrades.map((t) => new Date(t.date));

  // Function to highlight dates with trades on the calendar
  const isDayWithTrade = (date: Date) => {
    return tradeDates.some(
      (tradeDate) => format(tradeDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
  };

  if (!trade) return null;

  const isProfitable = parseFloat(trade.pnlDollars || '0') > 0;
  const profitLossColor = isProfitable ? 'text-green-600' : 'text-red-600';
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {selectedTrade?.symbol}{' '}
            <Badge
              variant="outline"
              className={cn(
                'font-medium capitalize',
                selectedTrade?.tradeType === 'long'
                  ? 'bg-green-100 text-green-800 border-green-200'
                  : 'bg-red-100 text-red-800 border-red-200'
              )}
            >
              {selectedTrade?.tradeType}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Trade executed on {format(new Date(selectedTrade?.date || trade.date), 'MMMM d, yyyy')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
          {/* Left column: Calendar and trade summary */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Trade Calendar
                </CardTitle>
                <CardDescription>Select a date to view trade details</CardDescription>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border"
                  modifiers={{
                    withTrade: (date) => isDayWithTrade(date),
                  }}
                  modifiersClassNames={{
                    withTrade: "bg-blue-100 font-bold text-blue-900"
                  }}
                />
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Trade Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm font-medium text-gray-500">Symbol</div>
                  <div className="text-sm font-bold">{selectedTrade?.symbol}</div>

                  <div className="text-sm font-medium text-gray-500">Direction</div>
                  <div className="text-sm font-bold capitalize">
                    {selectedTrade?.tradeType}
                  </div>

                  <div className="text-sm font-medium text-gray-500">Quantity</div>
                  <div className="text-sm font-bold">{selectedTrade?.quantity}</div>

                  <div className="text-sm font-medium text-gray-500">Entry Price</div>
                  <div className="text-sm font-bold">{selectedTrade?.entryPrice}</div>

                  <div className="text-sm font-medium text-gray-500">Exit Price</div>
                  <div className="text-sm font-bold">{selectedTrade?.exitPrice}</div>

                  <div className="text-sm font-medium text-gray-500">P&L (Points)</div>
                  <div className={cn("text-sm font-bold", profitLossColor)}>
                    {isProfitable ? '+' : ''}{selectedTrade?.pnlPoints}
                  </div>

                  <div className="text-sm font-medium text-gray-500">P&L (Dollars)</div>
                  <div className={cn("text-sm font-bold", profitLossColor)}>
                    {isProfitable ? '+' : ''}${Math.abs(parseFloat(selectedTrade?.pnlDollars || '0')).toFixed(2)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column: Notes and screenshots */}
          <div className="lg:col-span-2">
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
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Trade Notes</CardTitle>
                    <CardDescription>
                      Your notes for this trade
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedTrade?.notes ? (
                      <div className="whitespace-pre-wrap">{selectedTrade.notes}</div>
                    ) : (
                      <div className="text-gray-500 italic">No notes available for this trade.</div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="screenshots" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Screenshots</CardTitle>
                    <CardDescription>
                      Visual references for this trade
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedTrade?.screenshots && selectedTrade.screenshots.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedTrade.screenshots.map((screenshot, index) => (
                          <div key={index} className="border rounded-lg overflow-hidden">
                            <img 
                              src={screenshot.startsWith('data:') ? screenshot : `/uploads/${screenshot}`} 
                              alt={`Trade screenshot ${index + 1}`}
                              className="w-full h-auto object-contain"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-500 italic">No screenshots available for this trade.</div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TradeViewModal;