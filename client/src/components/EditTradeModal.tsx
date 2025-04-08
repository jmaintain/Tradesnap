import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Trade } from '@shared/schema';
import EditTradeForm from './EditTradeForm';

interface EditTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  trade?: Trade;
}

const EditTradeModal: React.FC<EditTradeModalProps> = ({
  isOpen,
  onClose,
  trade,
}) => {
  if (!trade) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Edit Trade</DialogTitle>
        </DialogHeader>
        <EditTradeForm
          trade={trade}
          onSubmitSuccess={onClose}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
};

export default EditTradeModal;