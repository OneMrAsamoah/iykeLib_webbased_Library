import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Trash2, AlertCircle, Info } from 'lucide-react';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'destructive' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel?: () => void;
  loading?: boolean;
}

const variantConfig = {
  destructive: {
    icon: Trash2,
    confirmVariant: 'destructive' as const,
    iconColor: 'text-destructive',
    bgColor: 'bg-destructive/10',
  },
  warning: {
    icon: AlertTriangle,
    confirmVariant: 'default' as const,
    iconColor: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  info: {
    icon: Info,
    confirmVariant: 'default' as const,
    iconColor: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'destructive',
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  const config = variantConfig[variant];
  const IconComponent = config.icon;

  const handleConfirm = () => {
    if (!loading) {
      onConfirm();
    }
  };

  const handleCancel = () => {
    if (!loading) {
      onCancel?.();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${config.bgColor}`}>
              <IconComponent className={`h-5 w-5 ${config.iconColor}`} />
            </div>
            <DialogTitle className="text-left">{title}</DialogTitle>
          </div>
          <DialogDescription className="text-left text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="flex gap-2 sm:justify-end">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            variant={config.confirmVariant}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'Processing...' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Convenience components for common use cases
export function DeleteConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  loading = false,
}: Omit<ConfirmDialogProps, 'variant' | 'confirmText' | 'cancelText'>) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      confirmText="Delete"
      cancelText="Cancel"
      variant="destructive"
      onConfirm={onConfirm}
      loading={loading}
    />
  );
}

export function WarningConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Continue',
  onConfirm,
  loading = false,
}: Omit<ConfirmDialogProps, 'variant' | 'cancelText'>) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      confirmText={confirmText}
      cancelText="Cancel"
      variant="warning"
      onConfirm={onConfirm}
      loading={loading}
    />
  );
}
