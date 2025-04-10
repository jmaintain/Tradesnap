import React from 'react';
import { Trade } from '@shared/schema';
import { format } from 'date-fns';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, Trash } from 'lucide-react';
import { getDateKey } from '@/lib/date-utils';

interface TradeTableProps {
  trades: Trade[];
  onViewTrade?: (trade: Trade) => void;
  showSelections?: boolean;
  selectedTrades?: number[];
  onSelectTrade?: (tradeId: number, selected: boolean) => void;
  onDeleteSelected?: () => void;
}

const TradeTable: React.FC<TradeTableProps> = ({
  trades,
  onViewTrade,
  showSelections = false,
  selectedTrades = [],
  onSelectTrade,
  onDeleteSelected
}) => {
  if (!trades || trades.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No trades found. Add your first trade to get started.
      </div>
    );
  }

  const areAllSelected = selectedTrades.length === trades.length && trades.length > 0;
  
  const handleSelectAll = (checked: boolean) => {
    if (!onSelectTrade) return;
    
    trades.forEach(trade => {
      onSelectTrade(trade.id, checked);
    });
  };

  return (
    <div>
      {showSelections && selectedTrades.length > 0 && (
        <div className="flex justify-between items-center p-2 mb-2 bg-gray-50 rounded">
          <span className="text-sm font-medium text-gray-700">
            {selectedTrades.length} {selectedTrades.length === 1 ? 'trade' : 'trades'} selected
          </span>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={onDeleteSelected}
            className="flex items-center"
          >
            <Trash className="h-4 w-4 mr-1" />
            Delete Selected
          </Button>
        </div>
      )}
      
      {/* Desktop view - table */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {showSelections && (
                <TableHead className="w-12">
                  <Checkbox 
                    checked={areAllSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all trades"
                  />
                </TableHead>
              )}
              <TableHead className="whitespace-nowrap">Date</TableHead>
              <TableHead className="whitespace-nowrap">Symbol</TableHead>
              <TableHead className="whitespace-nowrap">Type</TableHead>
              <TableHead className="whitespace-nowrap">Quantity</TableHead>
              <TableHead className="whitespace-nowrap">Entry Price</TableHead>
              <TableHead className="whitespace-nowrap">Exit Price</TableHead>
              <TableHead className="whitespace-nowrap">Risk/Reward</TableHead>
              <TableHead className="whitespace-nowrap">P&L (Pts)</TableHead>
              <TableHead className="whitespace-nowrap">P&L ($)</TableHead>
              <TableHead className="whitespace-nowrap">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trades.map((trade) => {
              const isProfitable = parseFloat(trade.pnlDollars || '0') >= 0;
              const profitLossClass = isProfitable ? 'text-green-600' : 'text-red-600';
              const isSelected = selectedTrades.includes(trade.id);
              
              return (
                <TableRow key={trade.id} className={isSelected ? 'bg-blue-50' : undefined}>
                  {showSelections && (
                    <TableCell className="py-2">
                      <Checkbox 
                        checked={isSelected}
                        onCheckedChange={(checked) => onSelectTrade && onSelectTrade(trade.id, !!checked)}
                        aria-label={`Select trade ${trade.id}`}
                      />
                    </TableCell>
                  )}
                  <TableCell className="whitespace-nowrap">
                    {getDateKey(trade.date)}
                  </TableCell>
                  <TableCell className="font-medium whitespace-nowrap">
                    {trade.symbol}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${trade.tradeType === 'long' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                      }`}>
                      {trade.tradeType === 'long' ? 'Long' : 'Short'}
                    </span>
                  </TableCell>
                  <TableCell>{trade.quantity}</TableCell>
                  <TableCell>{trade.entryPrice}</TableCell>
                  <TableCell>{trade.exitPrice}</TableCell>
                  <TableCell>
                    {trade.riskRewardRatio ? `${Number(trade.riskRewardRatio).toFixed(1)}:1` : '-'}
                  </TableCell>
                  <TableCell className={`font-medium ${profitLossClass}`}>
                    {isProfitable ? '+' : ''}{parseFloat(trade.pnlPoints || '0').toFixed(0)}
                  </TableCell>
                  <TableCell className={`font-medium ${profitLossClass}`}>
                    {isProfitable ? '+' : ''}${Math.abs(parseFloat(trade.pnlDollars || '0')).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-blue-600 hover:text-blue-900 p-0"
                      onClick={() => onViewTrade && onViewTrade(trade)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      
      {/* Mobile view - cards */}
      <div className="md:hidden space-y-4">
        {trades.map((trade) => {
          const isProfitable = parseFloat(trade.pnlDollars || '0') >= 0;
          const profitLossClass = isProfitable ? 'text-green-600' : 'text-red-600';
          const isSelected = selectedTrades.includes(trade.id);
          
          return (
            <div 
              key={trade.id} 
              className={`rounded-lg border p-4 ${isSelected ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold">{trade.symbol}</span>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${trade.tradeType === 'long' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                      }`}>
                      {trade.tradeType === 'long' ? 'Long' : 'Short'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">{getDateKey(trade.date)}</div>
                </div>
                <div className={`text-xl font-bold ${profitLossClass}`}>
                  {isProfitable ? '+' : ''}${Math.abs(parseFloat(trade.pnlDollars || '0')).toFixed(2)}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div>
                  <span className="text-gray-500">Quantity:</span> {trade.quantity}
                </div>
                <div>
                  <span className="text-gray-500">P&L Points:</span> <span className={profitLossClass}>{isProfitable ? '+' : ''}{parseFloat(trade.pnlPoints || '0').toFixed(0)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Entry:</span> {trade.entryPrice}
                </div>
                <div>
                  <span className="text-gray-500">Exit:</span> {trade.exitPrice}
                </div>
                <div>
                  <span className="text-gray-500">Risk/Reward:</span> {trade.riskRewardRatio ? `${Number(trade.riskRewardRatio).toFixed(1)}:1` : '-'}
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                {showSelections && (
                  <div className="flex items-center">
                    <Checkbox 
                      id={`select-${trade.id}`}
                      checked={isSelected}
                      onCheckedChange={(checked) => onSelectTrade && onSelectTrade(trade.id, !!checked)}
                      aria-label={`Select trade ${trade.id}`}
                      className="mr-2"
                    />
                    <label htmlFor={`select-${trade.id}`} className="text-sm text-gray-500">Select</label>
                  </div>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-blue-600 hover:text-blue-900"
                  onClick={() => onViewTrade && onViewTrade(trade)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View Details
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TradeTable;
