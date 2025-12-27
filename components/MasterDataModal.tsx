
import React, { useState } from 'react';
import { RowType, MasterData } from '../types';
import { X, Plus, Trash2, Database, Edit2, Save as SaveIcon, XCircle, ArrowRight } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

interface Props {
  masterData: MasterData;
  onAdd: (category: RowType, code: string, desc: string) => void;
  onEdit: (category: RowType, code: string, newDesc: string) => void;
  onDelete: (category: RowType, code: string) => void;
  onClose: () => void;
}

const MasterDataModal: React.FC<Props> = ({ masterData, onAdd, onEdit, onDelete, onClose }) => {
  const [activeTab, setActiveTab] = useState<RowType>(RowType.PROGRAM);
  
  // New Item State
  const [newCode, setNewCode] = useState('');
  const [newDesc, setNewDesc] = useState('');
  
  // Specific for RO addition (Prefix from KRO)
  const [selectedKroPrefix, setSelectedKroPrefix] = useState('');
  // Specific for Component addition (Prefix from RO)
  const [selectedRoPrefix, setSelectedRoPrefix] = useState('');

  // Editing State
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState('');
  
  // Confirmation State
  const [confirmConfig, setConfirmConfig] = useState<{
      isOpen: boolean;
      title: string;
      message: string;
      onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const currentList = masterData[activeTab] || [];
  const kroList = masterData[RowType.KRO] || [];
  const roList = masterData[RowType.RO] || [];

  const handleAddClick = (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalCode = newCode;
    
    // Logic khusus untuk RO: Gabungkan Prefix KRO + Suffix
    if (activeTab === RowType.RO) {
        if (!selectedKroPrefix) {
            alert("Harap pilih KRO Induk terlebih dahulu.");
            return;
        }
        if (!newCode) {
            alert("Harap isi kode rincian RO.");
            return;
        }
        finalCode = `${selectedKroPrefix}.${newCode}`;
    }

    // Logic khusus untuk KOMPONEN: Gabungkan Prefix RO + Suffix
    if (activeTab === RowType.COMPONENT) {
        if (!selectedRoPrefix) {
            alert("Harap pilih RO Induk terlebih dahulu.");
            return;
        }
        if (!newCode) {
            alert("Harap isi kode komponen.");
            return;
        }
        finalCode = `${selectedRoPrefix}.${newCode}`;
    }

    if (!finalCode || !newDesc) return;

    setConfirmConfig({
        isOpen: true,
        title: 'Konfirmasi Tambah Data',
        message: `Apakah Anda yakin ingin menambahkan data master: [${finalCode}] ${newDesc}?`,
        onConfirm: () => {
            onAdd(activeTab, finalCode, newDesc);
            setNewCode('');
            setNewDesc('');
            // Jangan reset prefix agar user bisa input berulang dengan cepat
            setConfirmConfig(prev => ({...prev, isOpen: false}));
        }
    });
  };

  const startEditing = (code: string, currentDesc: string) => {
      setEditingCode(code);
      setEditDesc(currentDesc);
  };

  const cancelEditing = () => {
      setEditingCode(null);
      setEditDesc('');
  };

  const saveEditing = (code: string) => {
      if (!editDesc.trim()) return;
      onEdit(activeTab, code, editDesc);
      setEditingCode(null);
      setEditDesc('');
  };

  const handleDeleteClick = (code: string, desc: string) => {
      setConfirmConfig({
        isOpen: true,
        title: 'Konfirmasi Hapus Data',
        message: `Apakah Anda yakin ingin menghapus data master: [${code}] ${desc}? Tindakan ini tidak dapat dibatalkan.`,
        onConfirm: () => {
            onDelete(activeTab, code);
            setConfirmConfig(prev => ({...prev, isOpen: false}));
        }
    });
  };

  const handleTabChange = (tabId: RowType) => {
      setActiveTab(tabId);
      cancelEditing();
      setNewCode('');
      setNewDesc('');
      setSelectedKroPrefix('');
      setSelectedRoPrefix('');
  };

  const tabs = [
      { id: RowType.SATKER, label: 'Satuan Kerja' },
      { id: RowType.PROGRAM, label: 'Program' },
      { id: RowType.ACTIVITY, label: 'Kegiatan' },
      { id: RowType.KRO, label: 'KRO' },
      { id: RowType.RO, label: 'RO' },
      { id: RowType.COMPONENT, label: 'Komponen' },
      { id: RowType.SUBCOMPONENT, label: 'Sub Komponen' },
      { id: RowType.ACCOUNT, label: 'Akun (6 Digit)' },
  ];

  // Helper variables for complex inputs
  const isRoTab = activeTab === RowType.RO;
  const isComponentTab = activeTab === RowType.COMPONENT;
  const isCompoundInput = isRoTab || isComponentTab;

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl text-gray-900 h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b bg-slate-50 rounded-t-lg">
          <div className="flex items-center gap-2">
            <Database size={20} className="text-blue-600"/>
            <h3 className="font-bold text-gray-800 text-lg">Manajemen Master Data</h3>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex flex-1 overflow-hidden bg-white">
            {/* Sidebar Tabs */}
            <div className="w-48 bg-gray-50 border-r overflow-y-auto p-2">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={`w-full text-left px-3 py-2 rounded mb-1 text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col p-6 overflow-hidden bg-white">
                <h4 className="font-bold text-gray-700 mb-4 border-b pb-2">Daftar {tabs.find(t => t.id === activeTab)?.label}</h4>
                
                {/* Add Form - Aligned using invisible label strategy */}
                <form onSubmit={handleAddClick} className="flex gap-4 mb-4 bg-blue-50 p-4 rounded border border-blue-100 items-start flex-wrap md:flex-nowrap">
                    
                    {/* INPUT KODE (Complex vs Simple) */}
                    {isCompoundInput ? (
                         <div className="flex-1 flex flex-col gap-1 min-w-[300px]">
                            <label className="text-xs font-bold text-gray-500 block h-4">
                                {isRoTab ? "Kode RO (Pilih KRO + Input Suffix)" : "Kode Komponen (Pilih RO + Input Suffix)"}
                            </label>
                            <div className="flex items-center gap-1">
                                {isRoTab ? (
                                    <select 
                                        className="border border-gray-300 rounded p-2 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none w-3/5 h-[38px]"
                                        value={selectedKroPrefix}
                                        onChange={e => setSelectedKroPrefix(e.target.value)}
                                    >
                                        <option value="">-- Pilih KRO --</option>
                                        {kroList.map((kro, i) => (
                                            <option key={i} value={kro.code}>{kro.code} - {kro.desc.substring(0, 20)}...</option>
                                        ))}
                                    </select>
                                ) : (
                                    <select 
                                        className="border border-gray-300 rounded p-2 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none w-3/5 h-[38px]"
                                        value={selectedRoPrefix}
                                        onChange={e => setSelectedRoPrefix(e.target.value)}
                                    >
                                        <option value="">-- Pilih RO --</option>
                                        {roList.map((ro, i) => (
                                            <option key={i} value={ro.code}>{ro.code} - {ro.desc.substring(0, 20)}...</option>
                                        ))}
                                    </select>
                                )}
                                
                                <span className="text-gray-500 font-bold px-1 self-center">.</span>
                                
                                <input 
                                    type="text" 
                                    value={newCode}
                                    onChange={e => setNewCode(e.target.value)}
                                    className="border border-gray-300 rounded p-2 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none w-2/5 h-[38px]"
                                    placeholder="001"
                                />
                            </div>
                            <div className="text-[10px] text-blue-600 mt-1 pl-1">
                                Hasil: {isRoTab 
                                    ? (selectedKroPrefix ? `${selectedKroPrefix}.${newCode || '...'}` : '...') 
                                    : (selectedRoPrefix ? `${selectedRoPrefix}.${newCode || '...'}` : '...')
                                }
                            </div>
                         </div>
                    ) : (
                        <div className="flex-1 min-w-[150px]">
                            <label className="text-xs font-bold text-gray-500 block mb-1 h-4">Kode Baru</label>
                            <input 
                                type="text" 
                                value={newCode}
                                onChange={e => setNewCode(e.target.value)}
                                className="w-full border border-gray-300 rounded p-2 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none h-[38px]"
                                placeholder={activeTab === RowType.SATKER ? "Contoh: 689114" : "Kode..."}
                            />
                        </div>
                    )}

                    <div className="flex-[2] min-w-[200px]">
                        <label className="text-xs font-bold text-gray-500 block mb-1 h-4">Uraian Baru</label>
                        <input 
                            type="text" 
                            value={newDesc}
                            onChange={e => setNewDesc(e.target.value)}
                            className="w-full border border-gray-300 rounded p-2 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none h-[38px]"
                            placeholder="Deskripsi..."
                        />
                    </div>
                    
                    {/* Button container with invisible label for alignment */}
                    <div className="flex-none">
                        <label className="text-xs font-bold text-transparent block mb-1 h-4 select-none">Aksi</label>
                        <button type="submit" className="bg-blue-600 text-white rounded hover:bg-blue-700 h-[38px] w-[38px] flex items-center justify-center shadow-sm shrink-0">
                            <Plus size={20}/>
                        </button>
                    </div>
                </form>

                {/* List */}
                <div className="flex-1 overflow-y-auto border rounded bg-white">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100 text-gray-600 sticky top-0 shadow-sm z-10">
                            <tr>
                                <th className="p-3 border-b w-40 font-semibold">Kode</th>
                                <th className="p-3 border-b font-semibold">Uraian</th>
                                <th className="p-3 border-b w-24 text-center font-semibold">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {currentList.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="p-8 text-center text-gray-500 italic">Belum ada data. Tambahkan di atas.</td>
                                </tr>
                            ) : (
                                currentList.map((item, idx) => (
                                    <tr key={`${item.code}-${idx}`} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-3 font-mono font-medium text-gray-700 align-middle whitespace-nowrap">{item.code}</td>
                                        <td className="p-3 text-gray-800 align-middle">
                                            {editingCode === item.code ? (
                                                <input 
                                                    autoFocus
                                                    type="text"
                                                    value={editDesc}
                                                    onChange={(e) => setEditDesc(e.target.value)}
                                                    className="w-full border border-blue-300 rounded px-2 py-1 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') saveEditing(item.code);
                                                        if (e.key === 'Escape') cancelEditing();
                                                    }}
                                                />
                                            ) : (
                                                item.desc
                                            )}
                                        </td>
                                        <td className="p-3 text-center align-middle">
                                            <div className="flex items-center justify-center gap-1">
                                                {editingCode === item.code ? (
                                                    <>
                                                        <button onClick={() => saveEditing(item.code)} className="text-green-600 hover:text-green-800 p-1.5 rounded hover:bg-green-50 transition-colors" title="Simpan">
                                                            <SaveIcon size={16}/>
                                                        </button>
                                                        <button onClick={cancelEditing} className="text-gray-500 hover:text-gray-700 p-1.5 rounded hover:bg-gray-100 transition-colors" title="Batal">
                                                            <XCircle size={16}/>
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button onClick={() => startEditing(item.code, item.desc)} className="text-blue-500 hover:text-blue-700 p-1.5 rounded hover:bg-blue-50 transition-colors" title="Edit">
                                                            <Edit2 size={16}/>
                                                        </button>
                                                        <button onClick={() => handleDeleteClick(item.code, item.desc)} className="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 transition-colors" title="Hapus">
                                                            <Trash2 size={16}/>
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <ConfirmationModal
            isOpen={confirmConfig.isOpen}
            title={confirmConfig.title}
            message={confirmConfig.message}
            onConfirm={confirmConfig.onConfirm}
            onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        />
      </div>
    </div>
  );
};

export default MasterDataModal;
