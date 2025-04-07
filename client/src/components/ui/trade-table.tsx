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
import { Eye } from 'lucide-react';

interface TradeTableProps {
  trades: Trade[];
  onViewTrade?: (trade: Trade) => void;
}

const TradeTable: React.FC<TradeTableProps> = ({ trades, onViewTrade }) => {
  if (!trades || trades.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No trades found. Add your first trade to get started.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
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
            
            return (
              <TableRow key={trade.id}>
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
