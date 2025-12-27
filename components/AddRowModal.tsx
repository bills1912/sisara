
import React, { useState, useEffect } from 'react';
import { BudgetRow, RowType, MasterData } from '../types';
import { X, ArrowRight } from 'lucide-react';

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
  
  // Default values for data
  const [volume, setVolume] = useState('0');
  const [unit, setUnit] = useState('PAKET');
  const [price, setPrice] = useState('0');

  // Helpers
  const currentOptions = masterData[type] || [];

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

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const idx = e.target.selectedIndex;
      if (idx > 0) { // 0 is placeholder
          const opt = currentOptions[idx - 1];
          setSelectedCode(opt.code);
          setSelectedDesc(opt.desc);
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
    
    const vol = parseFloat(volume);
    const prc = parseFloat(price);
    const total = vol * prc;

    const newRow: BudgetRow = {
      id: newId,
      code: selectedCode, // Should be '-' for DETAIL
      description: selectedDesc,
      type: type,
      semula: null,
      menjadi: {
          volume: vol,
          unit: unit,
          price: prc,
          total: total
      },
      monthlyAllocation: {},
      children: [],
      isOpen: true
    };

    onSave(parentRow ? parentRow.id : '', newRow);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md text-gray-900">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="font-bold text-gray-800">
             {parentRow ? "Tambah Data Baru" : "Tambah Satuan Kerja (Root)"}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-blue-50 p-3 rounded text-sm text-blue-800 mb-4 border border-blue-100">
             {parentRow ? (
                <>Menambahkan ke: <span className="font-bold">{parentRow.code} - {parentRow.description}</span></>
             ) : (
                <span className="font-bold">Menambahkan Satuan Kerja Baru (Level Tertinggi)</span>
             )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Tipe Baris</label>
            <select 
                value={type} 
                onChange={e => setType(e.target.value as RowType)}
                // Disable type change if parent is ACCOUNT (must add DETAIL) or DETAIL (must add sibling DETAIL)
                // But allow if user really wants to change it (though structure dictates otherwise) - let's keep it flexible but guided
                className={`w-full border border-gray-300 bg-white text-gray-900 p-2 rounded focus:ring-2 focus:ring-blue-500`}
            >
                {!parentRow && <option value={RowType.SATKER}>Satuan Kerja</option>}
                <option value={RowType.PROGRAM}>Program</option>
                <option value={RowType.ACTIVITY}>Kegiatan</option>
                <option value={RowType.KRO}>KRO (Keluaran)</option>
                <option value={RowType.RO}>RO (Rincian Output)</option>
                <option value={RowType.COMPONENT}>Komponen</option>
                <option value={RowType.SUBCOMPONENT}>Sub Komponen</option>
                <option value={RowType.ACCOUNT}>Akun (6 Digit)</option>
                <option value={RowType.DETAIL}>Detail (Rincian Item)</option>
            </select>
            {isManualMode && <p className="text-[10px] text-gray-500 mt-1">*Detail item ditambahkan secara manual (bukan master data)</p>}
          </div>

          <div className="border border-gray-200 rounded p-3 bg-gray-50">
             <div className="flex justify-between items-center mb-2">
                 <label className="block text-xs font-semibold text-gray-500 uppercase">
                    {isManualMode ? "Input Detail (Manual)" : "Pilih Kode & Uraian (Master Data)"}
                 </label>
             </div>

             {isManualMode ? (
                 // --- MANUAL INPUT FOR DETAIL ---
                 <div className="space-y-3">
                    <div className="flex gap-2">
                        <div className="w-1/4">
                            <label className="text-[10px] text-gray-500 mb-1 block">Kode</label>
                            <input 
                                type="text" 
                                value="-" 
                                disabled 
                                className="w-full border border-gray-300 bg-gray-200 text-gray-600 p-2 rounded text-center font-bold cursor-not-allowed"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] text-gray-500 mb-1 block">Uraian Detail</label>
                            <input 
                                type="text"
                                placeholder="Contoh: Pembelian Kertas A4"
                                autoFocus
                                className="w-full border border-gray-300 bg-white text-gray-900 p-2 rounded focus:ring-2 focus:ring-blue-500"
                                value={selectedDesc}
                                onChange={e => setSelectedDesc(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="text-[10px] text-orange-600 italic">
                        * Kode Detail otomatis diset tanda strip (-). Uraian bebas.
                    </div>
                 </div>
             ) : (
                 // --- MASTER DATA SELECT ---
                 <>
                    <select 
                        className="w-full border border-gray-300 bg-white text-gray-900 p-2 rounded focus:ring-2 focus:ring-blue-500"
                        onChange={handleSelectChange}
                        value={selectedCode ? currentOptions.find(o => o.code === selectedCode)?.desc : ''} 
                    >
                        <option value="">-- Pilih {type} --</option>
                        {currentOptions.length === 0 ? (
                            <option value="" disabled>Data kosong. Tambahkan di menu Master Data.</option>
                        ) : (
                            currentOptions.map((opt, idx) => (
                                <option key={`${opt.code}-${idx}`} value={opt.desc}>
                                    [{opt.code}] {opt.desc}
                                </option>
                            ))
                        )}
                    </select>
                    
                    {selectedCode && (
                        <div className="mt-2 text-xs text-gray-600 bg-white border p-2 rounded">
                            <strong>Terpilih:</strong> [{selectedCode}] {selectedDesc}
                        </div>
                    )}
                 </>
             )}
          </div>

          <div className="border-t pt-4 mt-4">
            <p className="text-sm font-bold mb-3 text-gray-800">Nilai Anggaran (Menjadi)</p>
            <div className="grid grid-cols-3 gap-3">
                <div>
                    <label className="text-xs text-gray-500">Volume</label>
                    <input type="number" className="w-full border border-gray-300 bg-white text-gray-900 p-2 rounded focus:ring-2 focus:ring-blue-500" value={volume} onChange={e => setVolume(e.target.value)} />
                </div>
                <div>
                    <label className="text-xs text-gray-500">Satuan</label>
                    <input type="text" className="w-full border border-gray-300 bg-white text-gray-900 p-2 rounded focus:ring-2 focus:ring-blue-500" value={unit} onChange={e => setUnit(e.target.value)} />
                </div>
                <div>
                    <label className="text-xs text-gray-500">Harga</label>
                    <input type="number" className="w-full border border-gray-300 bg-white text-gray-900 p-2 rounded focus:ring-2 focus:ring-blue-500" value={price} onChange={e => setPrice(e.target.value)} />
                </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded border border-gray-200">Batal</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Simpan</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddRowModal;
