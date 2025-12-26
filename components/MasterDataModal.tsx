

import React, { useState } from 'react';
import { RowType, MasterData } from '../types';
import { X, Plus, Trash2, Database, Edit2, Save as SaveIcon, XCircle } from 'lucide-react';
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

  const handleAddClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newDesc) return;

    setConfirmConfig({
        isOpen: true,
        title: 'Konfirmasi Tambah Data',
        message: `Apakah Anda yakin ingin menambahkan data master: [${newCode}] ${newDesc}?`,
        onConfirm: () => {
            onAdd(activeTab, newCode, newDesc);
            setNewCode('');
            setNewDesc('');
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

  const tabs = [
      { id: RowType.SATKER, label: 'Satuan Kerja' },
      { id: RowType.PROGRAM, label: 'Program' },
      { id: RowType.KRO, label: 'KRO' },
      { id: RowType.RO, label: 'RO' },
      { id: RowType.COMPONENT, label: 'Komponen' },
      { id: RowType.SUBCOMPONENT, label: 'Sub Komponen' },
      { id: RowType.HEADER_ACCOUNT, label: 'Header Akun' },
      { id: RowType.ITEM, label: 'Item/Akun' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      {/* Added bg-white and text-gray-900 explicitly to ensure visibility regardless of app theme */}
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
                        onClick={() => { setActiveTab(tab.id); cancelEditing(); }}
                        className={`w-full text-left px-3 py-2 rounded mb-1 text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col p-6 overflow-hidden bg-white">
                <h4 className="font-bold text-gray-700 mb-4 border-b pb-2">Daftar {tabs.find(t => t.id === activeTab)?.label}</h4>
                
                {/* Add Form */}
                <form onSubmit={handleAddClick} className="flex gap-2 mb-4 bg-blue-50 p-3 rounded border border-blue-100 items-end">
                    <div className="flex-1">
                        <label className="text-xs font-bold text-gray-500 block mb-1">Kode Baru</label>
                        {/* Explicit bg-white and text-gray-900 to fix dark input issue */}
                        <input 
                            type="text" 
                            value={newCode}
                            onChange={e => setNewCode(e.target.value)}
                            className="w-full border border-gray-300 rounded p-2 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Contoh: 001"
                        />
                    </div>
                    <div className="flex-[2]">
                        <label className="text-xs font-bold text-gray-500 block mb-1">Uraian Baru</label>
                        <input 
                            type="text" 
                            value={newDesc}
                            onChange={e => setNewDesc(e.target.value)}
                            className="w-full border border-gray-300 rounded p-2 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Deskripsi..."
                        />
                    </div>
                    <button type="submit" className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 h-[38px] w-[38px] flex items-center justify-center shadow-sm">
                        <Plus size={20}/>
                    </button>
                </form>

                {/* List */}
                <div className="flex-1 overflow-y-auto border rounded bg-white">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100 text-gray-600 sticky top-0 shadow-sm z-10">
                            <tr>
                                <th className="p-3 border-b w-32 font-semibold">Kode</th>
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
                                        <td className="p-3 font-mono font-medium text-gray-700 align-middle">{item.code}</td>
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
            onCancel={() => setConfirmConfig(prev => ({...prev, isOpen: false}))}
        />
      </div>
    </div>
  );
};

export default MasterDataModal;
