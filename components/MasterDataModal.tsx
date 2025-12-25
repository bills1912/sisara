
import React, { useState } from 'react';
import { RowType, MasterData } from '../types';
import { X, Plus, Trash2, Database } from 'lucide-react';

interface Props {
  masterData: MasterData;
  onUpdate: (newData: MasterData) => void;
  onClose: () => void;
}

const MasterDataModal: React.FC<Props> = ({ masterData, onUpdate, onClose }) => {
  const [activeTab, setActiveTab] = useState<RowType>(RowType.KRO);
  const [newCode, setNewCode] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const currentList = masterData[activeTab] || [];

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newDesc) return;

    const newList = [...currentList, { code: newCode, desc: newDesc }];
    onUpdate({
        ...masterData,
        [activeTab]: newList
    });
    setNewCode('');
    setNewDesc('');
  };

  const handleDelete = (index: number) => {
      if(!window.confirm('Hapus data ini?')) return;
      const newList = [...currentList];
      newList.splice(index, 1);
      onUpdate({
        ...masterData,
        [activeTab]: newList
    });
  };

  const tabs = [
      { id: RowType.KRO, label: 'KRO' },
      { id: RowType.RO, label: 'RO' },
      { id: RowType.COMPONENT, label: 'Komponen' },
      { id: RowType.SUBCOMPONENT, label: 'Sub Komponen' },
      { id: RowType.HEADER_ACCOUNT, label: 'Header Akun' },
      { id: RowType.ITEM, label: 'Item/Akun' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl text-gray-900 h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b bg-slate-50">
          <div className="flex items-center gap-2">
            <Database size={20} className="text-blue-600"/>
            <h3 className="font-bold text-gray-800 text-lg">Manajemen Master Data</h3>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex flex-1 overflow-hidden">
            {/* Sidebar Tabs */}
            <div className="w-48 bg-gray-50 border-r overflow-y-auto p-2">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full text-left px-3 py-2 rounded mb-1 text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col p-6 overflow-hidden">
                <h4 className="font-bold text-gray-700 mb-4 border-b pb-2">Daftar {tabs.find(t => t.id === activeTab)?.label}</h4>
                
                {/* Add Form */}
                <form onSubmit={handleAdd} className="flex gap-2 mb-4 bg-blue-50 p-3 rounded border border-blue-100 items-end">
                    <div className="flex-1">
                        <label className="text-xs font-bold text-gray-500 block mb-1">Kode Baru</label>
                        <input 
                            type="text" 
                            value={newCode}
                            onChange={e => setNewCode(e.target.value)}
                            className="w-full border border-gray-300 rounded p-2 text-sm"
                            placeholder="Contoh: 001"
                        />
                    </div>
                    <div className="flex-[2]">
                        <label className="text-xs font-bold text-gray-500 block mb-1">Uraian Baru</label>
                        <input 
                            type="text" 
                            value={newDesc}
                            onChange={e => setNewDesc(e.target.value)}
                            className="w-full border border-gray-300 rounded p-2 text-sm"
                            placeholder="Deskripsi..."
                        />
                    </div>
                    <button type="submit" className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 h-[38px] w-[38px] flex items-center justify-center">
                        <Plus size={20}/>
                    </button>
                </form>

                {/* List */}
                <div className="flex-1 overflow-y-auto border rounded">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100 text-gray-600 sticky top-0">
                            <tr>
                                <th className="p-2 border-b w-32">Kode</th>
                                <th className="p-2 border-b">Uraian</th>
                                <th className="p-2 border-b w-16 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentList.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="p-4 text-center text-gray-500 italic">Belum ada data. Tambahkan di atas.</td>
                                </tr>
                            ) : (
                                currentList.map((item, idx) => (
                                    <tr key={`${item.code}-${idx}`} className="hover:bg-gray-50 border-b last:border-0">
                                        <td className="p-2 font-mono font-medium text-gray-700">{item.code}</td>
                                        <td className="p-2 text-gray-800">{item.desc}</td>
                                        <td className="p-2 text-center">
                                            <button onClick={() => handleDelete(idx)} className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50">
                                                <Trash2 size={16}/>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default MasterDataModal;
