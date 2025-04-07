import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import TradeForm from './TradeForm';

interface NewTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NewTradeModal: React.FC<NewTradeModalProps> = ({ isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Trade</DialogTitle>
          <DialogDescription>
            Enter your trade details below
          </DialogDescription>
        </DialogHeader>
        <TradeForm 
          onSubmitSuccess={onClose} 
          onCancel={onClose} 
        />
      </DialogContent>
    </Dialog>
  );
};

export default NewTradeModal;
