
import React, { useState, useEffect, useMemo } from 'react';
import { RowType, MasterData, UserRole } from '../types';
import { X, Plus, Trash2, Database, Edit2, Save as SaveIcon, XCircle, ArrowRight, UserCog, User, Shield, Lock, Loader2, Type, CheckCircle, Eye, EyeOff, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import CustomSelect, { Option } from './CustomSelect';
import { api } from '../api';

interface Props {
  masterData: MasterData;
  onAdd: (category: RowType, code: string, desc: string) => void;
  onEdit: (category: RowType, code: string, originalDesc: string, newDesc: string) => void;
  onDelete: (category: RowType, code: string, desc: string) => void;
  onClose: () => void;
  currentUserRole: UserRole;
  isDarkMode: boolean;
}

const TAB_USERS = 'USERS';

const MasterDataModal: React.FC<Props> = ({ masterData, onAdd, onEdit, onDelete, onClose, currentUserRole, isDarkMode }) => {
  const [activeTab, setActiveTab] = useState<RowType | 'USERS'>(RowType.PROGRAM);
  
  // --- MASTER DATA STATES ---
  const [newCode, setNewCode] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [selectedActivityPrefix, setSelectedActivityPrefix] = useState('');
  const [selectedKroPrefix, setSelectedKroPrefix] = useState('');
  
  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: 'code' | 'desc'; direction: 'asc' | 'desc' }>({ key: 'code', direction: 'asc' });

  // State to track the specific item being edited (Code + Desc)
  const [editingItem, setEditingItem] = useState<{code: string, desc: string} | null>(null);
  const [editDesc, setEditDesc] = useState('');
  
  // --- USER MANAGEMENT STATES ---
  const [users, setUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [isSavingUser, setIsSavingUser] = useState(false); // New loading state for confirmation
  const [showPassword, setShowPassword] = useState(false);
  
  // User Form
  const [userForm, setUserForm] = useState({
      username: '',
      fullName: '',
      password: '',
      role: UserRole.OPERATOR
  });
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // --- SHARED STATES ---
  const [confirmConfig, setConfirmConfig] = useState<{
      isOpen: boolean;
      title: string;
      message: string;
      onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Fetch Users when tab changes
  useEffect(() => {
      if (activeTab === TAB_USERS) {
          fetchUsers();
      }
  }, [activeTab]);

  const fetchUsers = async () => {
      setIsLoadingUsers(true);
      try {
          const data = await api.getUsers();
          setUsers(data);
      } catch(e) {
          console.error("Failed to fetch users");
      } finally {
          setIsLoadingUsers(false);
      }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!userForm.username || !userForm.fullName) return;

      const action = isEditingUser ? 'Update' : 'Buat';
      setConfirmConfig({
          isOpen: true,
          title: `Konfirmasi ${action} User`,
          message: `Apakah Anda yakin ingin ${action.toLowerCase()} user ${userForm.username}?`,
          onConfirm: async () => {
            setIsSavingUser(true);
            try {
                // 1. Perform API Operation
                if (isEditingUser) {
                    await api.updateUser(userForm.username, {
                        full_name: userForm.fullName,
                        role: userForm.role,
                        password: userForm.password || undefined // Only send if changed
                    });
                } else {
                    if (!userForm.password) {
                        alert("Password wajib diisi untuk user baru");
                        setIsSavingUser(false);
                        return;
                    }
                    await api.createUser({
                        username: userForm.username,
                        full_name: userForm.fullName,
                        role: userForm.role,
                        password: userForm.password
                    });
                }
                
                // 2. Fetch Latest Data
                const updatedUsers = await api.getUsers();
                setUsers(updatedUsers);

                // 3. Reset UI States in specific order
                setConfirmConfig(prev => ({...prev, isOpen: false})); // Close confirm first
                setIsUserFormOpen(false); // Then close form
                resetUserForm(); // Then reset form data
                
            } catch(e: any) {
                alert(`Gagal: ${e.message}`);
                setIsSavingUser(false); // Stop loading if error
            } finally {
                setIsSavingUser(false);
            }
          }
      });
  };

  const handleDeleteUser = (username: string) => {
      setConfirmConfig({
          isOpen: true,
          title: "Hapus User",
          message: `Yakin ingin menghapus user ${username}? Tindakan ini permanen.`,
          onConfirm: async () => {
              setIsSavingUser(true);
              try {
                  await api.deleteUser(username);
                  const updatedUsers = await api.getUsers();
                  setUsers(updatedUsers);
                  setConfirmConfig(prev => ({...prev, isOpen: false}));
              } catch(e: any) {
                  alert("Gagal hapus: " + e.message);
              } finally {
                  setIsSavingUser(false);
              }
          }
      });
  };

  const startEditUser = (user: any) => {
      setUserForm({
          username: user.username,
          fullName: user.full_name,
          role: user.role,
          password: '' // Don't fill password
      });
      setIsEditingUser(true);
      setIsUserFormOpen(true);
      setShowPassword(false);
  };

  const resetUserForm = () => {
      setUserForm({ username: '', fullName: '', password: '', role: UserRole.OPERATOR });
      setIsEditingUser(false);
      setFocusedField(null);
      setShowPassword(false);
  };

  // --- MASTER DATA LOGIC ---
  const rawList = activeTab !== TAB_USERS ? (masterData[activeTab as RowType] || []) : [];
  
  // SORTING LOGIC
  const currentList = useMemo(() => {
    return [...rawList].sort((a, b) => {
        const valA = a[sortConfig.key].toString().toLowerCase();
        const valB = b[sortConfig.key].toString().toLowerCase();

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });
  }, [rawList, sortConfig]);

  const handleSort = (key: 'code' | 'desc') => {
      setSortConfig(prev => ({
          key,
          direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
      }));
  };

  const renderSortIcon = (key: 'code' | 'desc') => {
      if (sortConfig.key !== key) return <ArrowUpDown size={14} className="opacity-30 ml-1" />;
      return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-1 text-blue-500" /> : <ArrowDown size={14} className="ml-1 text-blue-500" />;
  };

  const activityList = masterData[RowType.ACTIVITY] || [];
  const kroList = masterData[RowType.KRO] || [];

  const handleAddClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === TAB_USERS) return;

    let finalCode = newCode;
    
    // Logic khusus untuk RO: Gabungkan Prefix KRO + Suffix
    if (activeTab === RowType.KRO) {
        if (!selectedActivityPrefix) {
            alert("Harap pilih Program Induk terlebih dahulu.");
            return;
        }
        if (!newCode) {
            alert("Harap isi kode rincian RO.");
            return;
        }
        finalCode = `${selectedActivityPrefix}.${newCode}`;
    }

    // Logic khusus untuk KOMPONEN: Gabungkan Prefix RO + Suffix
    if (activeTab === RowType.RO) {
        if (!selectedKroPrefix) {
            alert("Harap pilih KRO Induk terlebih dahulu.");
            return;
        }
        if (!newCode) {
            alert("Harap isi kode komponen.");
            return;
        }
        finalCode = `${selectedKroPrefix}.${newCode}`;
    }

    if (!finalCode || !newDesc) return;

    setConfirmConfig({
        isOpen: true,
        title: 'Konfirmasi Tambah Data',
        message: `Apakah Anda yakin ingin menambahkan data master: [${finalCode}] ${newDesc}?`,
        onConfirm: () => {
            onAdd(activeTab as RowType, finalCode, newDesc);
            setNewCode('');
            setNewDesc('');
            // Jangan reset prefix agar user bisa input berulang dengan cepat
            setConfirmConfig(prev => ({...prev, isOpen: false}));
        }
    });
  };

  const startEditing = (code: string, currentDesc: string) => {
      setEditingItem({ code, desc: currentDesc });
      setEditDesc(currentDesc);
  };

  const cancelEditing = () => {
      setEditingItem(null);
      setEditDesc('');
  };

  const saveEditing = () => {
      if (!editingItem || !editDesc.trim()) return;
      // Pass both code and original description to identify the item
      onEdit(activeTab as RowType, editingItem.code, editingItem.desc, editDesc);
      setEditingItem(null);
      setEditDesc('');
  };

  const handleDeleteClick = (code: string, desc: string) => {
      setConfirmConfig({
        isOpen: true,
        title: 'Konfirmasi Hapus Data',
        message: `Apakah Anda yakin ingin menghapus data master: [${code}] ${desc}? Tindakan ini tidak dapat dibatalkan.`,
        onConfirm: () => {
            onDelete(activeTab as RowType, code, desc);
            setConfirmConfig(prev => ({...prev, isOpen: false}));
        }
    });
  };

  const handleTabChange = (tabId: RowType | 'USERS') => {
      setActiveTab(tabId);
      cancelEditing();
      setNewCode('');
      setNewDesc('');
      setSelectedKroPrefix('');
      setSelectedKroPrefix('');
      setSortConfig({ key: 'code', direction: 'asc' }); // Reset sort on tab change
      // Reset User states
      setIsUserFormOpen(false);
      resetUserForm();
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
      { id: RowType.UNIT, label: 'Satuan (Unit)' },
  ];

  // Helper variables for complex inputs
  const isKroTab = activeTab === RowType.KRO;
  const isRoTab = activeTab === RowType.RO;
  const isCompoundInput = isKroTab || isRoTab;

  const activityOptions: Option[] = activityList.map(a => ({ value: a.code, label: a.desc, subLabel: a.code }));
  const kroOptions: Option[] = kroList.map(k => ({ value: k.code, label: k.desc, subLabel: k.code }));

  // Style variables for Futuristic User Form (Matching Login.tsx where appropriate)
  const modalBg = isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-300';
  const headerText = isDarkMode ? 'text-white' : 'text-gray-900';
  const subHeaderText = isDarkMode ? 'text-gray-400' : 'text-gray-600';
  
  // Login-like input styles
  const inputBg = isDarkMode ? 'bg-slate-800/50' : 'bg-white';
  const inputBorder = isDarkMode ? 'border-slate-700' : 'border-gray-300';
  const inputText = isDarkMode ? 'text-white placeholder-slate-600' : 'text-gray-900 placeholder-gray-400';
  const labelColor = isDarkMode ? 'text-blue-300' : 'text-blue-700';
  const iconColor = isDarkMode ? 'text-slate-500' : 'text-gray-400';
  
  const cardBg = isDarkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-blue-300';
  const cardActive = isDarkMode ? 'bg-blue-900/30 border-blue-500 ring-1 ring-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-blue-50 border-blue-600 text-blue-700 ring-1 ring-blue-200 shadow-sm';

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className={`bg-white rounded-lg shadow-xl w-full max-w-5xl text-gray-900 h-[85vh] flex flex-col border border-white/20 overflow-hidden`}>
        <div className={`flex justify-between items-center p-5 border-b rounded-t-lg ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                <Database size={20} />
            </div>
            <div>
                <h3 className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Manajemen Master Data</h3>
                <p className="text-xs text-gray-500">Kelola referensi kode dan uraian anggaran</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className={`flex flex-1 overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
            {/* Sidebar Tabs */}
            <div className={`w-56 border-r overflow-y-auto p-3 flex flex-col gap-1 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? (isDarkMode ? 'bg-slate-800 text-blue-400 border border-slate-600' : 'bg-white shadow-sm text-blue-700 border border-blue-100 ring-1 ring-blue-50') : 'text-gray-500 hover:bg-gray-200/50 border border-transparent'}`}
                    >
                        {tab.label}
                    </button>
                ))}
                
                {currentUserRole === UserRole.PPK && (
                    <div className={`mt-4 pt-4 border-t ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
                        <p className="px-3 text-xs font-bold text-gray-400 uppercase mb-2">Admin</p>
                        <button
                            onClick={() => handleTabChange(TAB_USERS)}
                            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === TAB_USERS ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-200/50'}`}
                        >
                            <UserCog size={16}/>
                            Manajemen User
                        </button>
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className={`flex-1 flex flex-col p-6 overflow-hidden relative ${isDarkMode ? 'bg-slate-800 text-gray-100' : 'bg-white text-gray-900'}`}>
                
                {/* --- USER MANAGEMENT VIEW --- */}
                {activeTab === TAB_USERS ? (
                    <div className="flex flex-col h-full animate-in fade-in duration-300">
                        {/* User management content unchanged */}
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h4 className={`font-bold text-2xl tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Daftar Pengguna</h4>
                                <p className="text-gray-500 text-sm mt-1">Kelola akses sistem untuk PPK dan Operator.</p>
                            </div>
                            <button 
                                onClick={() => { resetUserForm(); setIsUserFormOpen(true); }}
                                className={`px-4 py-2 rounded-lg transition-all shadow-lg flex items-center gap-2 text-sm font-medium active:scale-95 ${isDarkMode ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'}`}
                            >
                                <Plus size={16}/> Tambah User
                            </button>
                        </div>

                        {/* User List Grid */}
                        <div className="flex-1 overflow-y-auto pr-2 pb-10 custom-scrollbar">
                            {isLoadingUsers ? (
                                <div className="flex justify-center items-center h-64 text-gray-400">
                                    <Loader2 className="animate-spin" size={32}/>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {users.map((user) => (
                                        <div key={user.username} className={`group relative border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all ${isDarkMode ? 'bg-slate-900 border-slate-700 hover:border-slate-600' : 'bg-white border-gray-100 hover:border-gray-200'}`}>
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-inner ${user.role === UserRole.PPK ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gradient-to-br from-emerald-400 to-teal-500'}`}>
                                                        {user.full_name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <h5 className={`font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{user.full_name}</h5>
                                                        <p className="text-xs text-gray-500 font-mono">@{user.username}</p>
                                                    </div>
                                                </div>
                                                {/* Actions */}
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => startEditUser(user)} className={`p-1.5 rounded transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-gray-400 hover:text-blue-400' : 'hover:bg-gray-100 text-gray-500 hover:text-blue-600'}`}>
                                                        <Edit2 size={16}/>
                                                    </button>
                                                    <button onClick={() => handleDeleteUser(user.username)} className={`p-1.5 rounded transition-colors ${isDarkMode ? 'hover:bg-red-900/30 text-gray-400 hover:text-red-400' : 'hover:bg-red-50 text-gray-500 hover:text-red-600'}`}>
                                                        <Trash2 size={16}/>
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            <div className="mt-4 flex items-center gap-2">
                                                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${user.role === UserRole.PPK ? (isDarkMode ? 'bg-blue-900/30 text-blue-300 border-blue-800' : 'bg-blue-50 text-blue-700 border-blue-100') : (isDarkMode ? 'bg-emerald-900/30 text-emerald-300 border-emerald-800' : 'bg-emerald-50 text-emerald-700 border-emerald-100')}`}>
                                                    {user.role}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* FUTURISTIC USER FORM MODAL */}
                        {isUserFormOpen && (
                            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300">
                                <div className={`relative w-full max-w-lg overflow-hidden rounded-3xl shadow-2xl transition-all border transform scale-100 animate-in zoom-in-95 ${modalBg} flex flex-col max-h-[90vh]`}>
                                    {/* Form Content Unchanged */}
                                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
                                    <div className={`px-8 py-6 border-b flex justify-between items-center shrink-0 backdrop-blur-sm ${isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-gray-50/80 border-gray-100'}`}>
                                        <div>
                                            <h3 className={`font-bold text-xl tracking-tight ${headerText}`}>{isEditingUser ? 'Edit Data Pengguna' : 'Tambah Pengguna Baru'}</h3>
                                            <p className={`text-xs mt-1 ${subHeaderText}`}>Lengkapi informasi kredensial di bawah ini.</p>
                                        </div>
                                        <button onClick={() => setIsUserFormOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10"><X size={20}/></button>
                                    </div>
                                    <div className={`overflow-y-auto p-8 scrollbar-thin ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
                                        <form onSubmit={handleUserSubmit} className="space-y-6">
                                            <div className="group">
                                                <label className={`block text-xs font-bold uppercase mb-2 tracking-wider ml-1 transition-colors ${focusedField === 'username' ? labelColor : 'text-gray-500'}`}>Username</label>
                                                <div className={`relative transition-transform duration-300 focus-within:scale-[1.01]`}>
                                                    <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors ${focusedField === 'username' ? 'text-blue-500' : iconColor}`}>
                                                        <User size={20} />
                                                    </div>
                                                    <input 
                                                        type="text" 
                                                        className={`w-full pl-12 pr-4 py-3.5 rounded-xl border outline-none text-sm transition-all shadow-sm ${inputBg} ${inputText} ${focusedField === 'username' ? 'border-blue-500 ring-2 ring-blue-500/10' : inputBorder} disabled:opacity-50`}
                                                        placeholder="username_unik"
                                                        value={userForm.username}
                                                        onChange={e => setUserForm({...userForm, username: e.target.value})}
                                                        onFocus={() => setFocusedField('username')}
                                                        onBlur={() => setFocusedField(null)}
                                                        disabled={isEditingUser}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div className="group">
                                                <label className={`block text-xs font-bold uppercase mb-2 tracking-wider ml-1 transition-colors ${focusedField === 'fullName' ? labelColor : 'text-gray-500'}`}>Nama Lengkap</label>
                                                <div className={`relative transition-transform duration-300 focus-within:scale-[1.01]`}>
                                                    <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors ${focusedField === 'fullName' ? 'text-blue-500' : iconColor}`}>
                                                        <Type size={20} />
                                                    </div>
                                                    <input 
                                                        type="text" 
                                                        className={`w-full pl-12 pr-4 py-3.5 rounded-xl border outline-none text-sm transition-all shadow-sm ${inputBg} ${inputText} ${focusedField === 'fullName' ? 'border-blue-500 ring-2 ring-blue-500/10' : inputBorder} disabled:opacity-50`}
                                                        placeholder="Nama Pegawai"
                                                        value={userForm.fullName}
                                                        onChange={e => setUserForm({...userForm, fullName: e.target.value})}
                                                        onFocus={() => setFocusedField('fullName')}
                                                        onBlur={() => setFocusedField(null)}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className={`block text-xs font-bold uppercase mb-3 tracking-wider ml-1 ${labelColor}`}>Role / Peran</label>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div 
                                                        onClick={() => setUserForm({...userForm, role: UserRole.OPERATOR})}
                                                        className={`cursor-pointer p-4 rounded-2xl border transition-all duration-300 flex flex-col items-center gap-2 text-center relative overflow-hidden group ${userForm.role === UserRole.OPERATOR ? cardActive : cardBg}`}
                                                    >
                                                        <User size={24} className={userForm.role === UserRole.OPERATOR ? 'text-blue-600' : 'text-gray-400'}/>
                                                        <div>
                                                            <span className={`block font-bold text-sm mb-0.5 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>Operator</span>
                                                            <span className="text-[10px] text-gray-500">Input Data</span>
                                                        </div>
                                                        {userForm.role === UserRole.OPERATOR && <div className="absolute top-3 right-3 text-blue-600"><CheckCircle size={16}/></div>}
                                                    </div>
                                                    <div 
                                                        onClick={() => setUserForm({...userForm, role: UserRole.PPK})}
                                                        className={`cursor-pointer p-4 rounded-2xl border transition-all duration-300 flex flex-col items-center gap-2 text-center relative overflow-hidden group ${userForm.role === UserRole.PPK ? cardActive : cardBg}`}
                                                    >
                                                        <Shield size={24} className={userForm.role === UserRole.PPK ? 'text-blue-600' : 'text-gray-400'}/>
                                                        <div>
                                                            <span className={`block font-bold text-sm mb-0.5 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>PPK</span>
                                                            <span className="text-[10px] text-gray-500">Approval & Revisi</span>
                                                        </div>
                                                        {userForm.role === UserRole.PPK && <div className="absolute top-3 right-3 text-blue-600"><CheckCircle size={16}/></div>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="group">
                                                <label className={`block text-xs font-bold uppercase mb-2 tracking-wider ml-1 transition-colors ${focusedField === 'password' ? labelColor : 'text-gray-500'}`}>Password</label>
                                                <div className={`relative transition-transform duration-300 focus-within:scale-[1.01]`}>
                                                    <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors ${focusedField === 'password' ? 'text-blue-500' : iconColor}`}>
                                                        <Lock size={20} />
                                                    </div>
                                                    <input 
                                                        type={showPassword ? "text" : "password"}
                                                        className={`w-full pl-12 pr-12 py-3.5 rounded-xl border outline-none text-sm transition-all shadow-sm ${inputBg} ${inputText} ${focusedField === 'password' ? 'border-blue-500 ring-2 ring-blue-500/10' : inputBorder}`}
                                                        placeholder={isEditingUser ? "(Biarkan kosong jika tidak berubah)" : "Password baru"}
                                                        value={userForm.password}
                                                        onChange={e => setUserForm({...userForm, password: e.target.value})}
                                                        onFocus={() => setFocusedField('password')}
                                                        onBlur={() => setFocusedField(null)}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className={`absolute inset-y-0 right-0 pr-4 flex items-center cursor-pointer transition-colors ${focusedField === 'password' ? 'text-blue-500' : iconColor} hover:text-blue-600`}
                                                        tabIndex={-1}
                                                    >
                                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                                    </button>
                                                </div>
                                            </div>
                                        </form>
                                    </div>
                                    <div className={`px-8 py-5 border-t flex justify-end gap-3 shrink-0 backdrop-blur-md ${isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-gray-50/80 border-gray-100'}`}>
                                        <button type="button" onClick={() => setIsUserFormOpen(false)} className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-600 hover:bg-gray-200'}`}>Batal</button>
                                        <button onClick={handleUserSubmit} className={`px-6 py-2.5 rounded-xl text-white text-sm font-bold shadow-lg transition-transform active:scale-95 flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/20`}>
                                            <SaveIcon size={18}/> Simpan Data
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    // --- STANDARD MASTER DATA VIEW ---
                    <>
                        <div className="flex justify-between items-center mb-5 border-b pb-2">
                            <h4 className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Daftar {tabs.find(t => t.id === activeTab)?.label}</h4>
                            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-mono">{currentList.length} Item</span>
                        </div>
                        
                        {/* Add Form */}
                        <form onSubmit={handleAddClick} className={`flex gap-4 mb-6 p-5 rounded-xl border items-start flex-wrap md:flex-nowrap shadow-sm ${isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                            
                            {/* INPUT KODE (Complex vs Simple) */}
                            {isCompoundInput ? (
                                <div className="flex-1 flex flex-col gap-1 min-w-[300px]">
                                    <label className="text-xs font-bold text-gray-500 block h-5 uppercase tracking-wide">
                                        {isKroTab ? "Parent (Kegiatan) + Suffix" : "Parent (KRO) + Suffix"}
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3/5">
                                            {isKroTab ? (
                                                <CustomSelect 
                                                    value={selectedActivityPrefix}
                                                    onChange={setSelectedActivityPrefix}
                                                    options={activityOptions}
                                                    placeholder="Pilih Kegiatan..."
                                                    searchable={true}
                                                    className="w-full"
                                                />
                                            ) : (
                                                <CustomSelect 
                                                    value={selectedKroPrefix}
                                                    onChange={setSelectedKroPrefix}
                                                    options={kroOptions}
                                                    placeholder="Pilih KRO..."
                                                    searchable={true}
                                                    className="w-full"
                                                />
                                            )}
                                        </div>
                                        
                                        <span className="text-gray-400 font-bold self-center text-lg">•</span>
                                        
                                        <input 
                                            type="text" 
                                            value={newCode}
                                            onChange={e => setNewCode(e.target.value)}
                                            className="border border-gray-300 rounded-lg p-2.5 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none w-2/5 shadow-sm transition-all h-[42px]"
                                            placeholder="001"
                                        />
                                    </div>
                                    <div className="text-[10px] text-blue-600 mt-1 pl-1 font-mono bg-blue-50 inline-block px-2 py-0.5 rounded border border-blue-100 self-start">
                                        Preview: {isKroTab 
                                            ? (selectedActivityPrefix ? `${selectedActivityPrefix}.${newCode || '...'}` : '...') 
                                            : (selectedKroPrefix ? `${selectedKroPrefix}.${newCode || '...'}` : '...')
                                        }
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 min-w-[150px]">
                                    <label className="text-xs font-bold text-gray-500 block mb-1 h-5 uppercase tracking-wide">Kode Baru</label>
                                    <input 
                                        type="text" 
                                        value={newCode}
                                        onChange={e => setNewCode(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none shadow-sm transition-all h-[42px]"
                                        placeholder={activeTab === RowType.UNIT ? "Contoh: OH" : activeTab === RowType.SATKER ? "Contoh: 689114" : "Kode..."}
                                    />
                                </div>
                            )}

                            <div className="flex-[2] min-w-[200px]">
                                <label className="text-xs font-bold text-gray-500 block mb-1 h-5 uppercase tracking-wide">Uraian Baru</label>
                                <input 
                                    type="text" 
                                    value={newDesc}
                                    onChange={e => setNewDesc(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none shadow-sm transition-all h-[42px]"
                                    placeholder={activeTab === RowType.UNIT ? "Contoh: Orang Hari" : "Deskripsi..."}
                                />
                            </div>
                            
                            <div className="flex-none">
                                <label className="text-xs font-bold text-transparent block mb-1 h-5 select-none">Aksi</label>
                                <button type="submit" className="bg-blue-600 text-white rounded-lg hover:bg-blue-700 h-[42px] w-[42px] flex items-center justify-center shadow-md shadow-blue-200 shrink-0 transition-transform active:scale-95">
                                    <Plus size={22}/>
                                </button>
                            </div>
                        </form>

                        {/* List */}
                        <div className={`flex-1 overflow-y-auto border rounded-xl shadow-sm scrollbar-thin ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white'}`}>
                            <table className="w-full text-sm text-left">
                                <thead className={`sticky top-0 shadow-sm z-10 text-xs uppercase tracking-wider ${isDarkMode ? 'bg-slate-900 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                                    <tr>
                                        <th 
                                            className="p-4 border-b w-40 font-bold cursor-pointer hover:bg-opacity-50 hover:bg-gray-100 transition-colors"
                                            onClick={() => handleSort('code')}
                                        >
                                            <div className="flex items-center">
                                                Kode
                                                {renderSortIcon('code')}
                                            </div>
                                        </th>
                                        <th 
                                            className="p-4 border-b font-bold cursor-pointer hover:bg-opacity-50 hover:bg-gray-100 transition-colors"
                                            onClick={() => handleSort('desc')}
                                        >
                                            <div className="flex items-center">
                                                Uraian
                                                {renderSortIcon('desc')}
                                            </div>
                                        </th>
                                        <th className="p-4 border-b w-28 text-center font-bold">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDarkMode ? 'divide-slate-700' : 'divide-gray-50'}`}>
                                    {currentList.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="p-10 text-center text-gray-400 italic flex flex-col items-center">
                                                <Database size={40} className="mb-2 opacity-20"/>
                                                Belum ada data. Tambahkan melalui form di atas.
                                            </td>
                                        </tr>
                                    ) : (
                                        currentList.map((item, idx) => {
                                            const isEditingThis = editingItem?.code === item.code && editingItem?.desc === item.desc;
                                            return (
                                            <tr key={`${item.code}-${idx}`} className={`transition-colors group ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-blue-50/50'}`}>
                                                <td className={`p-3 pl-4 font-mono font-medium align-middle whitespace-nowrap ${isDarkMode ? 'text-blue-300' : 'text-gray-600'}`}>{item.code}</td>
                                                <td className={`p-3 align-middle ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                                                    {isEditingThis ? (
                                                        <input 
                                                            autoFocus
                                                            type="text"
                                                            value={editDesc}
                                                            onChange={(e) => setEditDesc(e.target.value)}
                                                            className="w-full border border-blue-400 rounded-md px-3 py-1.5 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-200 shadow-sm"
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') saveEditing();
                                                                if (e.key === 'Escape') cancelEditing();
                                                            }}
                                                        />
                                                    ) : (
                                                        item.desc
                                                    )}
                                                </td>
                                                <td className="p-3 pr-4 text-center align-middle">
                                                    <div className="flex items-center justify-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                        {isEditingThis ? (
                                                            <>
                                                                <button onClick={saveEditing} className="text-green-600 bg-green-50 p-1.5 rounded-md hover:bg-green-100 transition-colors border border-green-200" title="Simpan">
                                                                    <SaveIcon size={16}/>
                                                                </button>
                                                                <button onClick={cancelEditing} className="text-gray-500 bg-gray-50 p-1.5 rounded-md hover:bg-gray-100 transition-colors border border-gray-200" title="Batal">
                                                                    <XCircle size={16}/>
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button onClick={() => startEditing(item.code, item.desc)} className={`p-1.5 rounded-md transition-colors border border-transparent ${isDarkMode ? 'text-blue-400 hover:bg-blue-900/30' : 'text-blue-600 hover:text-blue-700 bg-white hover:bg-blue-50 hover:border-blue-100'}`} title="Edit">
                                                                    <Edit2 size={16}/>
                                                                </button>
                                                                <button onClick={() => handleDeleteClick(item.code, item.desc)} className={`p-1.5 rounded-md transition-colors border border-transparent ${isDarkMode ? 'text-red-400 hover:bg-red-900/30' : 'text-red-500 hover:text-red-700 bg-white hover:bg-red-50 hover:border-red-100'}`} title="Hapus">
                                                                    <Trash2 size={16}/>
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>

        {/* Use higher z-index so it appears above the User Form modal */}
        <ConfirmationModal
            isOpen={confirmConfig.isOpen}
            title={confirmConfig.title}
            message={confirmConfig.message}
            onConfirm={confirmConfig.onConfirm}
            onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
            zIndexClass="z-[120]"
            isLoading={isSavingUser}
        />
      </div>
    </div>
  );
};

export default MasterDataModal;
