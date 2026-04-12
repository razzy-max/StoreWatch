import { Button } from './Button';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmTone?: 'primary' | 'danger';
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  confirmTone = 'primary',
  onCancel,
  onConfirm
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={onCancel}>
            Cancel
          </Button>
          <Button variant={confirmTone} fullWidth onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="text-sm text-slate-300">{message}</p>
    </Modal>
  );
}
