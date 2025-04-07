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
    <div className="overflow-x-auto">
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
                  {format(new Date(trade.date), 'yyyy-MM-dd')}
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
                <TableCell className={`font-medium ${profitLossClass}`}>
                  {isProfitable ? '+' : ''}{trade.pnlPoints}
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
  );
};

export default TradeTable;
