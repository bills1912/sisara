import React, { useEffect, useState } from 'react';
import { BudgetRow, MonthlyDetail } from '../types';
import { X, Save, Calendar, FileText, CheckCircle, Hash } from 'lucide-react';
import { MONTH_NAMES, formatCurrency, formatNumberForInput, parseNumberFromInput } from '../utils';

interface CurrencyInputProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  disabled?: boolean;
  icon?: React.ReactNode;
}

const CurrencyInput: React.FC<CurrencyInputProps> = ({ label, value, onChange, disabled = false, icon = null }) => (
  <div className="space-y-1">
    <label className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase">
      {icon} {label}
    </label>
    <div className="relative">
      <span className="absolute left-3 top-2 text-gray-500 font-medium select-none z-10">Rp</span>
      <input
          type="text"
          disabled={disabled}
          className="w-full border border-gray-300 bg-white text-gray-900 pl-10 p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none text-left"
          value={formatNumberForInput(value)}
          onChange={(e) => onChange(parseNumberFromInput(e.target.value))}
          placeholder="0"
      />
    </div>
  </div>
);

interface BottomEditorProps {
  row: BudgetRow | null;
  section: 'SEMULA' | 'MENJADI' | 'MONTHLY' | null;
  monthIndex: number | null;
  onClose: () => void;
  onSave: (rowId: string, updates: Partial<BudgetRow>) => void;
}

const BottomEditor: React.FC<BottomEditorProps> = ({ row, section, monthIndex, onClose, onSave }) => {
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (row) {
      if (section === 'MENJADI' && row.menjadi) {
        setFormData({ ...row.menjadi });
      } else if (section === 'MONTHLY' && monthIndex !== null) {
        const detail = row.monthlyAllocation[monthIndex] || { 
          rpd: 0, realization: 0, spm: '', date: '', isVerified: false, sp2d: 0 
        };
        setFormData({ ...detail });
      } else if (section === 'SEMULA' && row.semula) {
        setFormData({ ...row.semula });
      }
    }
  }, [row, section, monthIndex]);

  if (!row || !section) return null;

  const handleSave = () => {
    if (section === 'MENJADI') {
      const total = (parseFloat(formData.volume) || 0) * (parseFloat(formData.price) || 0);
      onSave(row.id, {
        menjadi: {
          ...row.menjadi!,
          volume: parseFloat(formData.volume) || 0,
          unit: formData.unit,
          price: parseFloat(formData.price) || 0,
          total: total
        }
      });
    } else if (section === 'MONTHLY' && monthIndex !== null) {
       onSave(row.id, {
        monthlyAllocation: {
            ...row.monthlyAllocation,
            [monthIndex]: {
                ...formData,
                rpd: parseFloat(formData.rpd) || 0,
                realization: parseFloat(formData.realization) || 0,
                sp2d: parseFloat(formData.sp2d) || 0
            }
        }
       });
    }
    onClose();
  };

  const calculateTotal = () => {
      const jmlReal = parseFloat(formData.rpd) || 0;
      const jmlAkan = parseFloat(formData.realization) || 0;
      return jmlReal + jmlAkan;
  };

  const calculateGap = () => {
      const total = calculateTotal();
      const sp2d = parseFloat(formData.sp2d) || 0;
      return total - sp2d;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white shadow-[0_-5px_20px_rgba(0,0,0,0.15)] z-[60] border-t border-gray-200 animate-in slide-in-from-bottom duration-300 text-gray-900">
      <div className="max-w-7xl mx-auto flex flex-col h-[350px] md:h-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-3 border-b bg-gray-50">
          <div>
            <h3 className="font-bold text-gray-800">
              {section === 'MONTHLY' && monthIndex !== null 
                ? `Edit Rincian ${MONTH_NAMES[monthIndex]}`
                : `Edit Data ${section === 'MENJADI' ? 'Menjadi' : 'Semula'}`
              }
            </h3>
            <p className="text-xs text-gray-500 truncate max-w-md">{row.code} - {row.description}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-200 rounded-full"><X size={20} /></button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto max-h-[60vh] bg-white">
          {section !== 'MONTHLY' ? (
            // Form for Semula/Menjadi
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase">Volume</label>
                <input
                  type="number"
                  disabled={section === 'SEMULA'}
                  className="w-full border border-gray-300 bg-white text-gray-900 p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none text-left"
                  value={formData.volume || ''}
                  onChange={e => setFormData({...formData, volume: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase">Satuan</label>
                <input
                  type="text"
                  disabled={section === 'SEMULA'}
                  className="w-full border border-gray-300 bg-white text-gray-900 p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none text-left"
                  value={formData.unit || ''}
                  onChange={e => setFormData({...formData, unit: e.target.value})}
                />
              </div>
              
              <CurrencyInput 
                label="Harga Satuan" 
                value={formData.price} 
                disabled={section === 'SEMULA'}
                onChange={(val: number) => setFormData({...formData, price: val})}
              />

              <div className="md:col-span-3 pt-2 border-t flex justify-between items-center bg-gray-50 p-3 rounded">
                 <span className="font-bold text-gray-600">Total Biaya:</span>
                 <span className="font-bold text-xl text-blue-700">
                    {formatCurrency((parseFloat(formData.volume)||0) * (parseFloat(formData.price)||0))}
                 </span>
              </div>
            </div>
          ) : (
            // Form for Monthly Details
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              
              <CurrencyInput 
                label="Jumlah Realisasi"
                icon={<Hash size={12}/>}
                value={formData.rpd}
                onChange={(val: number) => setFormData({...formData, rpd: val})}
              />
              
              <CurrencyInput 
                label="Jml Akan Direalisasikan"
                icon={<Hash size={12}/>}
                value={formData.realization}
                onChange={(val: number) => setFormData({...formData, realization: val})}
              />

               <div className="space-y-1">
                <label className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase"><FileText size={12}/> No. SPM</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 bg-white text-gray-900 p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none text-left"
                  placeholder="Nomor SPM..."
                  value={formData.spm || ''}
                  onChange={e => setFormData({...formData, spm: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <label className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase"><Calendar size={12}/> Tgl Pelaksanaan</label>
                <input
                  type="date"
                  className="w-full border border-gray-300 bg-white text-gray-900 p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.date || ''}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                />
              </div>

              <CurrencyInput 
                label="Realisasi SP2D"
                icon={<Hash size={12}/>}
                value={formData.sp2d}
                onChange={(val: number) => setFormData({...formData, sp2d: val})}
              />

              <div className="space-y-1 flex items-end">
                 <label className="flex items-center gap-2 cursor-pointer bg-gray-100 px-4 py-2 rounded w-full border border-gray-300 hover:bg-gray-200 h-[42px]">
                    <input 
                        type="checkbox" 
                        className="w-4 h-4 text-blue-600 rounded bg-white border-gray-300"
                        checked={formData.isVerified || false}
                        onChange={e => setFormData({...formData, isVerified: e.target.checked})}
                    />
                    <span className="text-sm font-medium text-gray-800">Ceklis Realisasi</span>
                 </label>
              </div>

              <div className="col-span-2 bg-blue-50 rounded p-3 flex flex-col justify-center border border-blue-100 gap-1">
                   <div className="flex justify-between text-sm">
                      <span className="text-gray-600 font-semibold">TOTAL (Real + Akan):</span>
                      <span className="font-bold text-gray-900">{formatCurrency(calculateTotal())}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-blue-200 pt-1 mt-1">
                      <span className="text-gray-700">Selisih (Total - SP2D):</span>
                      <span className={`font-bold ${calculateGap() !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(calculateGap())}
                      </span>
                  </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded border border-gray-200">Batal</button>
            <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2">
                <Save size={16}/> Simpan Perubahan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BottomEditor;