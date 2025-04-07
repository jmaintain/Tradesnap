import React from 'react';
import { Instrument } from '@shared/schema';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface InstrumentTableProps {
  instruments: Instrument[];
}

const InstrumentTable: React.FC<InstrumentTableProps> = ({ instruments }) => {
  if (!instruments || instruments.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No instruments found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="whitespace-nowrap">Symbol</TableHead>
            <TableHead className="whitespace-nowrap">Description</TableHead>
            <TableHead className="whitespace-nowrap">Tick Size</TableHead>
            <TableHead className="whitespace-nowrap">Tick Value</TableHead>
            <TableHead className="whitespace-nowrap">Point Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {instruments.map((instrument) => (
            <TableRow key={instrument.id}>
              <TableCell className="font-medium whitespace-nowrap">
                {instrument.symbol}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {instrument.description}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {instrument.tickSize}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                ${instrument.tickValue}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                ${instrument.pointValue}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default InstrumentTable;
