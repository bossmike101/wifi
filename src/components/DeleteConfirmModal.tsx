import React from 'react';
import { AlertTriangle, X, Trash2 } from 'lucide-react';
import { Package } from '../types.js';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  packageToDelete: Package | null;
  isDeleting: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  packageToDelete,
  isDeleting
}) => {
  if (!isOpen || !packageToDelete) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs text-[#e0e0e0]">
      <div className="bg-[#141414] rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-[#242424] animate-in fade-in zoom-in-95">
        <div className="flex items-center space-x-3 text-[#c06056] mb-3">
          <div className="w-12 h-12 rounded-2xl bg-[#241414] border border-[#402020] flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold font-serif text-[#f5f5f5] tracking-wide">Delete WiFi Package?</h3>
            <p className="text-xs text-[#8a8a8a]">This action will remove it from the captive portal</p>
          </div>
        </div>

        <div className="p-4 bg-[#1a1a1a] rounded-2xl border border-[#262626] my-4 text-xs space-y-1.5">
          <p className="font-bold text-[#f5f5f5]">Package: {packageToDelete.name} (KSh {packageToDelete.priceKes})</p>
          <p className="text-[#8a8a8a]">
            Note: Existing customer sessions and historical transaction records will remain safely preserved.
          </p>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#222222] text-[#e0e0e0] font-semibold rounded-xl text-xs transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            id="btn-confirm-delete-package"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex items-center space-x-1.5 px-4 py-2 bg-[#8c3530] hover:bg-[#a6403a] text-white font-semibold rounded-xl text-xs shadow-md transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>{isDeleting ? 'Deleting...' : 'Confirm Delete'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
