
import React, { useState, useEffect } from 'react';
import { BudgetRow, RowType, MasterData } from '../types';
import { X } from 'lucide-react';
import CustomSelect, { Option } from './CustomSelect';
import { CustomNumberInput } from './CustomInputs';

interface Props {
  parentRow: BudgetRow | null; // Nullable for Root level (Satker)
  masterData: MasterData;
  onClose: () => void;
  onSave: (parentId: string, newRow: BudgetRow) => void;
}

const AddRowModal: React.FC<Props> = ({ parentRow, masterData, onClose, onSave }) => {
  // Logic for default type based on parent
  const getDefaultType = (): RowType => {
      if (!parentRow) return RowType.SATKER;
      switch (parentRow.type) {
          case RowType.SATKER: return RowType.PROGRAM;
          case RowType.PROGRAM: return RowType.ACTIVITY; // Program -> Kegiatan
          case RowType.ACTIVITY: return RowType.KRO;     // Kegiatan -> KRO
          case RowType.KRO: return RowType.RO;
          case RowType.RO: return RowType.COMPONENT;
          case RowType.COMPONENT: return RowType.SUBCOMPONENT;
          case RowType.SUBCOMPONENT: return RowType.ACCOUNT; // SubKomponen -> Akun
          case RowType.ACCOUNT: return RowType.DETAIL;      // Akun -> Detail
          case RowType.DETAIL: return RowType.DETAIL;       // Detail -> Detail (Sibling/Child)
          default: return RowType.DETAIL;
      }
  };

  const [type, setType] = useState<RowType>(getDefaultType());
  
  // Determine if we are in Manual Input Mode (For Detail)
  // This depends on the *selected type*, not just the parent.
  const isManualMode = type === RowType.DETAIL;

  // Selection State
  const [selectedCode, setSelectedCode] = useState('');
  const [selectedDesc, setSelectedDesc] = useState('');
  
  // Default values for data (Defaults to 0/Empty as UI is removed)
  const [volume, setVolume] = useState<number>(0);
  const [unit, setUnit] = useState('PAKET');
  const [price, setPrice] = useState<number>(0);

  // Helpers
  const currentOptions = masterData[type] || [];
  
  // Transform master data options for CustomSelect
  const typeOptions: Option[] = [
      !parentRow && { value: RowType.SATKER, label: 'Satuan Kerja' },
      { value: RowType.PROGRAM, label: 'Program' },
      { value: RowType.ACTIVITY, label: 'Kegiatan' },
      { value: RowType.KRO, label: 'KRO (Keluaran)' },
      { value: RowType.RO, label: 'RO (Rincian Output)' },
      { value: RowType.COMPONENT, label: 'Komponen' },
      { value: RowType.SUBCOMPONENT, label: 'Sub Komponen' },
      { value: RowType.ACCOUNT, label: 'Akun (6 Digit)' },
      { value: RowType.DETAIL, label: 'Detail (Rincian Item)' },
  ].filter(Boolean) as Option[];

  const masterDataOptions: Option[] = currentOptions.map(opt => ({
      value: opt.desc, // We use Desc as value in this specific logic because code is secondary in selection state for now
      label: opt.desc,
      subLabel: opt.code
  }));

  // Reset fields when type changes
  useEffect(() => {
      if (type === RowType.DETAIL) {
          setSelectedCode('-'); // Force dash for Detail
          setSelectedDesc('');
      } else {
          setSelectedCode('');
          setSelectedDesc('');
      }
  }, [type]);

  // Handle Custom Select Change for Master Data
  const handleMasterDataChange = (val: string) => {
      // Find the original option to get the code back
      const originalOpt = currentOptions.find(o => o.desc === val);
      if (originalOpt) {
          setSelectedCode(originalOpt.code);
          setSelectedDesc(originalOpt.desc);
      } else {
          setSelectedCode('');
          setSelectedDesc('');
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCode || !selectedDesc) {
        alert("Mohon lengkapi Kode dan Uraian");
        return;
    }

    // If parentRow exists use its ID, otherwise use 'root' prefix
    const parentIdPrefix = parentRow ? parentRow.id : 'root';
    const newId = `${parentIdPrefix}-${Math.floor(Math.random() * 10000)}`;
    
    // Default values (0) since input UI is removed
    const vol = 0;
    const prc = 0;
    const total = 0;

    const newRow: BudgetRow = {
      id: newId,
      code: selectedCode, // Should be '-' for DETAIL
      description: selectedDesc,
      type: type,
      // Initialize Semula with 0 (same as Menjadi) so users can edit it immediately without it being null
      semula: {
          volume: vol,
          unit: unit,
          price: prc,
          total: total
      },
      menjadi: {
          volume: vol,
          unit: unit,
          price: prc,
          total: total
      },
      efficiency: 0,
      monthlyAllocation: {},
      children: [], // Always empty initially as per instructions
      isOpen: true
    };

    onSave(parentRow ? parentRow.id : '', newRow);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md text-gray-900 border border-white/20">
        <div className="flex justify-between items-center p-5 border-b bg-gray-50/50 rounded-t-xl backdrop-blur-sm">
          <h3 className="font-bold text-gray-800 text-lg">
             {parentRow ? "Tambah Data Baru" : "Tambah Satuan Kerja"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="bg-blue-50/80 p-3 rounded-lg text-sm text-blue-800 border border-blue-100/50 shadow-sm">
             {parentRow ? (
                <>Menambahkan ke: <span className="font-bold">{parentRow.code} - {parentRow.description}</span></>
             ) : (
                <span className="font-bold">Menambahkan Root Level (Satuan Kerja)</span>
             )}
          </div>

          <div>
             <CustomSelect
                label="Tipe Baris"
                value={type}
                onChange={(val) => setType(val as RowType)}
                options={typeOptions}
             />
            {isManualMode && <p className="text-[10px] text-gray-500 mt-1.5 ml-1">*Detail item ditambahkan secara manual (bukan master data)</p>}
          </div>

          <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/30 shadow-inner">
             <div className="flex justify-between items-center mb-3">
                 <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {isManualMode ? "Input Detail (Manual)" : "Pilih Kode & Uraian"}
                 </label>
             </div>

             {isManualMode ? (
                 // --- MANUAL INPUT FOR DETAIL ---
                 <div className="space-y-3">
                    <div className="flex gap-3">
                        <div className="w-1/4">
                            <label className="text-[10px] text-gray-500 mb-1 block font-semibold">Kode</label>
                            <input 
                                type="text" 
                                value="-" 
                                disabled 
                                className="w-full border border-gray-200 bg-gray-100/50 text-gray-500 p-2.5 rounded-lg text-center font-bold cursor-not-allowed shadow-inner"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] text-gray-500 mb-1 block font-semibold">Uraian Detail</label>
                            <input 
                                type="text"
                                placeholder="Contoh: Pembelian Kertas A4"
                                autoFocus
                                className="w-full border border-gray-300 bg-white text-gray-900 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                                value={selectedDesc}
                                onChange={e => setSelectedDesc(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="text-[10px] text-orange-600 italic bg-orange-50 px-2 py-1 rounded inline-block border border-orange-100">
                        * Kode Detail otomatis diset tanda strip (-). Uraian bebas.
                    </div>
                 </div>
             ) : (
                 // --- MASTER DATA SELECT (CUSTOM) ---
                 <div className="space-y-2">
                    {currentOptions.length === 0 ? (
                        <div className="p-3 text-sm text-gray-500 bg-gray-100 rounded-lg text-center border border-dashed border-gray-300">
                            Data master kosong. Tambahkan di menu utama.
                        </div>
                    ) : (
                        <CustomSelect 
                            value={selectedDesc} // Using Desc as value key for simple mapping
                            onChange={handleMasterDataChange}
                            options={masterDataOptions}
                            placeholder={`Pilih ${type}...`}
                            searchable={true}
                        />
                    )}
                 </div>
             )}
          </div>

          {/* Form input Nilai Anggaran removed as requested */}

          <div className="flex justify-end gap-3 mt-6 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">Batal</button>
            <button type="submit" className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md shadow-blue-200 transition-all active:scale-95">Simpan</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddRowModal;
