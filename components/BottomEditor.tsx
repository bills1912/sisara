
import React, { useEffect, useState } from 'react';
import { BudgetRow, MonthlyDetail, RowType, MasterData } from '../types';
import { X, Save, Calendar, FileText, Hash } from 'lucide-react';
import { MONTH_NAMES, formatCurrency, formatNumberForInput, parseNumberFromInput } from '../utils';
import CustomSelect from './CustomSelect';
import { CustomNumberInput, CustomDatePicker } from './CustomInputs';

interface BottomEditorProps {
  row: BudgetRow | null;
  section: 'SEMULA' | 'MENJADI' | 'MONTHLY' | 'EFFICIENCY' | null;
  monthIndex: number | null;
  onClose: () => void;
  onSave: (rowId: string, updates: Partial<BudgetRow>) => void;
  masterData: MasterData;
}

const BottomEditor: React.FC<BottomEditorProps> = ({ row, section, monthIndex, onClose, onSave, masterData }) => {
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (row) {
      if (section === 'MENJADI') {
        setFormData({ 
            ...(row.menjadi ? { ...row.menjadi } : { volume: 0, unit: '', price: 0, total: 0 }),
            efficiency: row.efficiency || 0 
        });
      } else if (section === 'MONTHLY' && monthIndex !== null) {
        const detail = row.monthlyAllocation[monthIndex] || { 
          rpd: 0, realization: 0, spm: '', date: '', isVerified: false, sp2d: 0 
        };
        setFormData({ ...detail });
      } else if (section === 'SEMULA') {
        setFormData({ 
            ...(row.semula ? { ...row.semula } : { volume: 0, unit: '', price: 0, total: 0 }),
            efficiency: row.efficiency || 0
        });
      }
    }
  }, [row, section, monthIndex]);

  if (!row || !section) return null;

  const handleSave = () => {
    if (section === 'MENJADI') {
      const vol = parseFloat(formData.volume) || 0;
      const prc = parseFloat(formData.price) || 0;
      const total = vol * prc;
      const currentMenjadi = row.menjadi || { volume: 0, unit: '', price: 0, total: 0 };
      onSave(row.id, {
        menjadi: {
          ...currentMenjadi,
          volume: vol,
          unit: formData.unit,
          price: prc,
          total: total
        },
        efficiency: parseFloat(formData.efficiency) || 0
      });
    } else if (section === 'SEMULA') {
       const vol = parseFloat(formData.volume) || 0;
       const prc = parseFloat(formData.price) || 0;
       const total = vol * prc;
       const currentSemula = row.semula || { volume: 0, unit: '', price: 0, total: 0 };
       onSave(row.id, {
        semula: {
          ...currentSemula,
          volume: vol,
          unit: formData.unit,
          price: prc,
          total: total
        },
        efficiency: parseFloat(formData.efficiency) || 0
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
    // Section 'EFFICIENCY' removed from save logic as it's now handled in SEMULA/MENJADI
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

  const unitOptions = masterData[RowType.UNIT] || [];
  const customSelectUnitOptions = unitOptions.map(u => ({
      value: u.code,
      label: u.desc,
      subLabel: u.code
  }));
  
  // Add current unit if it's not in the list (fallback)
  if (formData.unit && !customSelectUnitOptions.find(o => o.value === formData.unit)) {
      customSelectUnitOptions.push({ value: formData.unit, label: formData.unit, subLabel: 'Custom' });
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-[90] border-t border-gray-100 animate-in slide-in-from-bottom duration-300 text-gray-900 rounded-t-2xl">
      <div className="max-w-7xl mx-auto flex flex-col h-[400px] md:h-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center px-8 py-4 border-b bg-white rounded-t-2xl">
          <div>
            <h3 className="font-bold text-gray-800 text-lg">
              {section === 'MONTHLY' && monthIndex !== null 
                ? `Edit Rincian ${MONTH_NAMES[monthIndex]}`
                : `Edit Data ${section === 'MENJADI' ? 'Menjadi' : (section === 'SEMULA' ? 'Semula' : 'Efisiensi')}`
              }
            </h3>
            <div className="flex items-center gap-2 mt-1">
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-mono font-bold border border-blue-200">{row.code}</span>
                <p className="text-xs text-gray-500 truncate max-w-md">{row.description}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"><X size={22} /></button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-8 overflow-y-auto max-h-[60vh] bg-white">
          {(section === 'SEMULA' || section === 'MENJADI') && (
            // Form for Semula/Menjadi including Efficiency
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* PREVIEW SEMULA IN MENJADI MODE */}
              {section === 'MENJADI' && row.semula && (
                  <div className="md:col-span-3 bg-gray-50 p-4 rounded-xl border border-gray-200 mb-2 flex justify-between items-center text-sm shadow-sm">
                      <div className="font-semibold text-gray-600 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                          Data Semula (Referensi)
                      </div>
                      <div className="flex gap-6 text-gray-700 font-medium">
                          <span className="bg-white px-2 py-1 rounded border border-gray-100 shadow-sm">Vol: <strong>{row.semula.volume}</strong> {row.semula.unit}</span>
                          <span className="bg-white px-2 py-1 rounded border border-gray-100 shadow-sm">Harga: <strong>{formatCurrency(row.semula.price)}</strong></span>
                          <span className="bg-white px-2 py-1 rounded border border-gray-100 shadow-sm text-blue-700">Total: <strong>{formatCurrency(row.semula.total)}</strong></span>
                      </div>
                  </div>
              )}

              <div>
                <CustomNumberInput
                  label="Volume"
                  value={formData.volume || 0}
                  onChange={(val) => setFormData({...formData, volume: val})}
                />
              </div>
              <div className="space-y-1">
                <div className="mb-1"></div>
                <CustomSelect 
                    label="Satuan"
                    value={formData.unit}
                    onChange={(val) => setFormData({...formData, unit: val})}
                    options={customSelectUnitOptions}
                    searchable={true}
                />
              </div>
              
              <CustomNumberInput 
                label="Harga Satuan" 
                value={formData.price || 0} 
                onChange={(val) => setFormData({...formData, price: val})}
                formatCurrency={true}
              />

              {/* NEW EFFICIENCY INPUT INSIDE SEMULA/MENJADI */}
              <div className="md:col-span-3 grid grid-cols-2 gap-8 pt-4 border-t border-dashed border-gray-200 mt-2">
                  <div>
                    <CustomNumberInput
                        label="Nilai Efisiensi (Manual)"
                        value={formData.efficiency || 0}
                        onChange={(val) => setFormData({...formData, efficiency: val})}
                        formatCurrency={true}
                    />
                    <p className="text-[10px] text-gray-400 mt-1 italic">
                        Input manual nilai efisiensi anggaran jika ada.
                    </p>
                  </div>
                  
                  <div className="flex flex-col justify-end items-end pb-1">
                     {section === 'MENJADI' ? (
                         <>
                            <div className="flex flex-col items-end">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Estimasi Selisih</span>
                                <span className="text-[10px] text-gray-400 mb-1">(Semula - Menjadi)</span>
                            </div>
                            <span className={`font-bold text-2xl tracking-tight ${(row.semula?.total || 0) - ((parseFloat(formData.volume)||0) * (parseFloat(formData.price)||0)) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {formatCurrency((row.semula?.total || 0) - ((parseFloat(formData.volume)||0) * (parseFloat(formData.price)||0)))}
                            </span>
                         </>
                     ) : (
                        <>
                             <div className="flex flex-col items-end">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Biaya Baru</span>
                            </div>
                            <span className="font-bold text-2xl text-blue-700 tracking-tight">
                                {formatCurrency((parseFloat(formData.volume)||0) * (parseFloat(formData.price)||0))}
                            </span>
                        </>
                     )}
                  </div>
              </div>
            </div>
          )}
          
          {section === 'MONTHLY' && (
            // Form for Monthly Details
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              
              <CustomNumberInput 
                label="Jumlah Realisasi"
                icon={<Hash size={12}/>}
                value={formData.rpd || 0}
                onChange={(val) => setFormData({...formData, rpd: val})}
                formatCurrency={true}
              />
              
              <CustomNumberInput 
                label="Jml Akan Direalisasikan"
                icon={<Hash size={12}/>}
                value={formData.realization || 0}
                onChange={(val) => setFormData({...formData, realization: val})}
                formatCurrency={true}
              />

               <div className="space-y-1">
                <label className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide"><FileText size={12}/> No. SPM</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 bg-white text-gray-900 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-left shadow-sm transition-all"
                  placeholder="Nomor SPM..."
                  value={formData.spm || ''}
                  onChange={e => setFormData({...formData, spm: e.target.value})}
                />
              </div>

              <div>
                <CustomDatePicker
                  label="Tgl Pelaksanaan"
                  value={formData.date || ''}
                  onChange={(val) => setFormData({...formData, date: val})}
                />
              </div>

              <CustomNumberInput 
                label="Realisasi SP2D"
                icon={<Hash size={12}/>}
                value={formData.sp2d || 0}
                onChange={(val) => setFormData({...formData, sp2d: val})}
                formatCurrency={true}
              />

              <div>
                 <label className="block text-xs font-bold text-transparent uppercase mb-1 tracking-wider select-none">
                    Verifikasi
                 </label>
                 <label className="flex items-center gap-3 cursor-pointer bg-gray-50 px-4 py-2.5 rounded-xl w-full border border-gray-200 hover:bg-gray-100 transition-colors shadow-sm">
                    <div className="relative flex items-center">
                        <input 
                            type="checkbox" 
                            className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-gray-300 shadow-sm transition-all checked:border-blue-500 checked:bg-blue-500 hover:border-blue-400"
                            checked={formData.isVerified || false}
                            onChange={e => setFormData({...formData, isVerified: e.target.checked})}
                        />
                        <span className="absolute text-white opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        </span>
                    </div>
                    <span className="text-sm font-medium text-gray-700 select-none">Ceklis Realisasi</span>
                 </label>
              </div>

              <div className="col-span-2 bg-gradient-to-br from-blue-50 to-white rounded-xl p-4 flex flex-col justify-center border border-blue-100 gap-2 shadow-sm">
                   <div className="flex justify-between text-sm">
                      <span className="text-gray-600 font-semibold uppercase text-xs tracking-wider pt-1">Total (Real + Akan)</span>
                      <span className="font-bold text-gray-900 text-lg">{formatCurrency(calculateTotal())}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-blue-100 pt-2">
                      <span className="text-gray-500 font-medium">Selisih (Total - SP2D)</span>
                      <span className={`font-bold ${calculateGap() !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(calculateGap())}
                      </span>
                  </div>
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-50">
            <button onClick={onClose} className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-200 font-medium transition-colors">Batal</button>
            <button onClick={handleSave} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium shadow-lg shadow-blue-200 transition-all active:scale-95">
                <Save size={18}/> Simpan Perubahan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BottomEditor;
