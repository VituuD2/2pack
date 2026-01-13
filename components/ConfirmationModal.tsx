import React from 'react';
import { GlassPanel } from './GlassPanel';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <GlassPanel className="w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in duration-200">
        <div>
          <h3 className="text-xl font-bold mb-2">{title}</h3>
          <p className="text-[var(--text-secondary)] text-sm">{message}</p>
        </div>
        
        <div className="flex justify-end gap-3 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/5 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isDestructive
                ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20'
                : 'bg-[var(--button-primary-bg)] text-white hover:bg-[var(--button-primary-hover)]'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </GlassPanel>
    </div>
  );
};
