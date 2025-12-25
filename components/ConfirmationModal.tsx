
import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const ConfirmationModal: React.FC<Props> = ({ isOpen, title, message, onConfirm, onCancel, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-3 text-amber-600 mb-4">
            <AlertTriangle size={24} />
            <h3 className="font-bold text-lg text-gray-900">{title}</h3>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed mb-6">
            {message}
          </p>
          <div className="flex justify-end gap-3">
            <button 
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium transition-colors"
            >
              Batal
            </button>
            <button 
              onClick={onConfirm}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors flex items-center gap-2"
            >
              {isLoading ? 'Menyimpan...' : 'Ya, Simpan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
