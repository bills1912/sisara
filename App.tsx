

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { BudgetRow, ThemeConfig, ChangeStatus, RowType, MasterData } from './types';
import BudgetRowItem from './components/BudgetRowItem';
import Legend from './components/Legend';
import Sidebar from './components/Sidebar';
import Settings from './components/Settings';
import BottomEditor from './components/BottomEditor';
import AddRowModal from './components/AddRowModal';
import MasterDataModal from './components/MasterDataModal';
import ConfirmationModal from './components/ConfirmationModal';
import { Eye, EyeOff, Moon, Sun, Settings2, CheckSquare, Square, ChevronDown, ChevronUp, ArrowDown, ArrowUp, Loader2, AlertCircle, Save, Database } from 'lucide-react';
import { MONTH_NAMES, QUARTERS, defaultTheme, formatCurrency, getAccountPrefix, formatPercent } from './utils';
import { api } from './api';
import { initialData } from './data';

function App() {
  const [data, setData] = useState<BudgetRow[]>([]);
  const [masterData, setMasterData] = useState<MasterData>({});
  const [theme, setTheme] = useState<ThemeConfig>(defaultTheme);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Visibility States
  const [showSemula, setShowSemula] = useState(true);
  const [showMenjadi, setShowMenjadi] = useState(true);
  const [showSelisih, setShowSelisih] = useState(true);
  const [showEfisiensi, setShowEfisiensi] = useState(true);
  
  // Grouped View Menu State
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  const viewMenuRef = useRef<HTMLDivElement>(null);

  // Scroll & Ref
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(false);

  // Quarter Visibility State (Default: All visible)
  const [visibleQuarterIndices, setVisibleQuarterIndices] = useState<number[]>([0, 1, 2, 3]);
  
  // Analysis Toggle State
  const [expandedAnalysisMonths, setExpandedAnalysisMonths] = useState<number[]>([]);
  const [expandedAnalysisQuarters, setExpandedAnalysisQuarters] = useState<number[]>([]);

  // Navigation & View State
  const [currentView, setCurrentView] = useState<'table' | 'settings'>('table');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showMasterDataModal, setShowMasterDataModal] = useState(false);

  // Selection State for Bottom Sheet
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<'SEMULA' | 'MENJADI' | 'MONTHLY' | null>(null);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number | null>(null);

  // Add Row State
  const [addingChildTo, setAddingChildTo] = useState<BudgetRow | null>(null);

  // Confirmation Modal State
  const [confirmConfig, setConfirmConfig] = useState<{
      isOpen: boolean;
      title: string;
      message: string;
      onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });


  // --- DATA LOADING ---
  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
        const [fetchedBudget, fetchedMaster, fetchedTheme] = await Promise.all([
            api.getBudget(),
            api.getMasterData(),
            api.getTheme()
        ]);
        
        setData(fetchedBudget);
        setMasterData(fetchedMaster);
        setTheme(fetchedTheme);
    } catch (e: any) {
        console.error("Failed to load data", e);
        setError(e.message || "Gagal memuat data dari server.");
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- CONFIRMATION HELPER ---
  const requestConfirmation = (title: string, message: string, action: () => void) => {
      setConfirmConfig({
          isOpen: true,
          title,
          message,
          onConfirm: () => {
              action();
              setConfirmConfig(prev => ({ ...prev, isOpen: false }));
          }
      });
  };

  // --- DATA SAVING WRAPPERS ---
  const handleSaveBudget = async (newData: BudgetRow[]) => {
      setData(newData); // Optimistic Update
      setIsSaving(true);
      try {
        await api.saveBudget(newData); // Backend Sync
      } catch (e: any) {
        alert("Gagal menyimpan perubahan ke server: " + e.message);
      } finally {
        setIsSaving(false);
      }
  };

  const handleInitializeData = async () => {
      requestConfirmation(
          "Inisialisasi Database",
          "Database kosong. Apakah Anda yakin ingin mengisi dengan data template awal?",
          async () => await handleSaveBudget(initialData)
      );
  };

  const handleAddMasterData = async (category: RowType, code: string, desc: string) => {
      const newList = [...(masterData[category] || []), { code, desc }];
      setMasterData(prev => ({ ...prev, [category]: newList }));

      try {
        await api.saveMasterData({ type: category, code, desc });
      } catch (e: any) {
          alert("Gagal menyimpan master data: " + e.message);
          // Revert if failed (optional, but good practice)
          loadData();
      }
  };

  const handleEditMasterData = async (category: RowType, code: string, newDesc: string) => {
      const currentList = masterData[category] || [];
      const updatedList = currentList.map(item => 
          item.code === code ? { ...item, desc: newDesc } : item
      );
      
      setMasterData(prev => ({ ...prev, [category]: updatedList }));

      try {
          await api.updateMasterData(category, code, newDesc);
      } catch (e: any) {
          alert("Gagal mengupdate master data: " + e.message);
          loadData(); // Revert
      }
  };

  const handleDeleteMasterData = async (category: RowType, code: string) => {
      const newList = (masterData[category] || []).filter(item => item.code !== code);
      setMasterData(prev => ({ ...prev, [category]: newList }));
      
      try {
          await api.deleteMasterData(category, code);
      } catch(e: any) {
          alert("Gagal menghapus master data: " + e.message);
          loadData(); // Revert
      }
  };

  const handleSaveTheme = async (newTheme: ThemeConfig) => {
      setTheme(newTheme);
      try {
          await api.saveTheme(newTheme);
      } catch (e: any) {
          alert("Gagal menyimpan tema: " + e.message);
      }
  };

  // --- CLICK OUTSIDE HANDLER FOR MENU ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (viewMenuRef.current && !viewMenuRef.current.contains(event.target as Node)) {
        setIsViewMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- SCROLL LOGIC ---
  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
        const { scrollTop, scrollHeight, clientHeight } = container;
        const isBottom = scrollTop + clientHeight >= scrollHeight - 100;
        setIsAtBottom(isBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [currentView]);

  const toggleScrollPosition = () => {
    const container = tableContainerRef.current;
    if (!container) return;
    if (isAtBottom) {
        container.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
  };

  const findRowById = (rows: BudgetRow[], id: string): BudgetRow | null => {
    for (const row of rows) {
      if (row.id === id) return row;
      if (row.children) {
        const found = findRowById(row.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const selectedRow = selectedRowId ? findRowById(data, selectedRowId) : null;

  // Generic update function (no confirmation, used for toggle)
  const performUpdateRow = useCallback((id: string, updatedFields: Partial<BudgetRow>) => {
    let newData: BudgetRow[] = [];
    
    const updateRecursive = (rows: BudgetRow[]): BudgetRow[] => {
        return rows.map(row => {
          if (row.id === id) {
            return { ...row, ...updatedFields };
          }
          if (row.children && row.children.length > 0) {
            return { ...row, children: updateRecursive(row.children) };
          }
          return row;
        });
    };
    newData = updateRecursive(data);
    handleSaveBudget(newData);
  }, [data]);

  // Wrapper for updates that require confirmation (Editing values)
  const handleUpdateRowWithConfirmation = (id: string, updatedFields: Partial<BudgetRow>) => {
      requestConfirmation(
          "Simpan Perubahan?",
          "Apakah Anda yakin ingin menyimpan perubahan pada data ini?",
          () => performUpdateRow(id, updatedFields)
      );
  };

  // Only used for toggle, so direct call
  const handleToggle = (id: string) => {
    performUpdateRow(id, { isOpen: !findRowById(data, id)?.isOpen });
  };

  const handleAddRow = (parentId: string, newRowData: BudgetRow) => {
      requestConfirmation(
          "Tambah Data Baru",
          "Apakah Anda yakin ingin menambahkan baris data baru ini?",
          () => {
            let newData: BudgetRow[] = [];
            const addRecursive = (rows: BudgetRow[]): BudgetRow[] => {
                return rows.map(row => {
                if (row.id === parentId) {
                    return {
                    ...row,
                    isOpen: true,
                    children: [...row.children, newRowData]
                    };
                }
                if (row.children && row.children.length > 0) {
                    return { ...row, children: addRecursive(row.children) };
                }
                return row;
                });
            };
            newData = addRecursive(data);
            handleSaveBudget(newData);
            setAddingChildTo(null);
          }
      );
  };

  const handleCopyRow = useCallback((rowToCopy: BudgetRow) => {
    const generateNewId = (originalId: string) => `${originalId}-copy-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    const deepCopy = (row: BudgetRow): BudgetRow => {
      return {
        ...row,
        id: generateNewId(row.id),
        children: row.children ? row.children.map(deepCopy) : []
      };
    };
    
    requestConfirmation(
        "Duplikasi Data",
        "Apakah Anda yakin ingin menduplikasi baris ini?",
        () => {
            const newRow = deepCopy(rowToCopy);
            let newData: BudgetRow[] = [];
            const insertRecursive = (rows: BudgetRow[]): BudgetRow[] => {
                const index = rows.findIndex(r => r.id === rowToCopy.id);
                if (index !== -1) {
                const newRows = [...rows];
                newRows.splice(index + 1, 0, newRow);
                return newRows;
                }
                return rows.map(r => {
                if (r.children && r.children.length > 0) {
                    return { ...r, children: insertRecursive(r.children) };
                }
                return r;
                });
            };
            newData = insertRecursive(data);
            handleSaveBudget(newData);
        }
    );
  }, [data]);

  const handleDeleteRow = useCallback((rowId: string) => {
    requestConfirmation(
        "Hapus Data",
        "Apakah Anda yakin ingin menghapus baris ini beserta seluruh rincian di bawahnya? Tindakan ini tidak dapat dibatalkan.",
        () => {
            let newData: BudgetRow[] = [];
            const deleteRecursive = (rows: BudgetRow[]): BudgetRow[] => {
                const filtered = rows.filter(r => r.id !== rowId);
                return filtered.map(r => {
                if (r.children && r.children.length > 0) {
                    return { ...r, children: deleteRecursive(r.children) };
                }
                return r;
                });
            };
            newData = deleteRecursive(data);
            handleSaveBudget(newData);

            if (selectedRowId === rowId) {
                closeEditor();
            }
        }
    );
  }, [data, selectedRowId]);

  const handleRowSelect = (row: BudgetRow, section: 'SEMULA' | 'MENJADI' | 'MONTHLY', monthIndex?: number) => {
    setSelectedRowId(row.id);
    setSelectedSection(section);
    setSelectedMonthIndex(monthIndex !== undefined ? monthIndex : null);
  };

  const closeEditor = () => {
    setSelectedRowId(null);
    setSelectedSection(null);
    setSelectedMonthIndex(null);
  };

  const toggleQuarterVisibility = (index: number) => {
    setVisibleQuarterIndices(prev => {
        if (prev.includes(index)) {
            return prev.filter(i => i !== index);
        } else {
            return [...prev, index].sort();
        }
    });
  };

  const toggleMonthAnalysis = (monthIndex: number) => {
      setExpandedAnalysisMonths(prev => 
         prev.includes(monthIndex) ? prev.filter(m => m !== monthIndex) : [...prev, monthIndex]
      );
  };

  const toggleQuarterAnalysis = (quarterIndex: number) => {
      setExpandedAnalysisQuarters(prev => 
         prev.includes(quarterIndex) ? prev.filter(q => q !== quarterIndex) : [...prev, quarterIndex]
      );
  };

  const visibleQuarters = useMemo(() => {
    return QUARTERS.filter((_, index) => visibleQuarterIndices.includes(index));
  }, [visibleQuarterIndices]);

  // --- UPDATED COLUMN WIDTH CALCULATIONS ---
  const descWidth = 350;
  const volValWidth = 40; 
  const volUnitWidth = 40;
  const priceWidth = 80;
  const totalWidth = 90;
  
  const groupWidth = volValWidth + volUnitWidth + priceWidth + totalWidth; 
  const semulaWidth = groupWidth; 
  const menjadiWidth = groupWidth;
  const selisihWidth = 90; 
  const efisiensiWidth = 90 + 90; 

  const getSemulaOffset = () => descWidth;
  const getMenjadiOffset = () => descWidth + (showSemula ? semulaWidth : 0);
  const getSelisihOffset = () => descWidth + (showSemula ? semulaWidth : 0) + (showMenjadi ? menjadiWidth : 0);
  const getEfisiensiOffset = () => descWidth + (showSemula ? semulaWidth : 0) + (showMenjadi ? menjadiWidth : 0) + (showSelisih ? selisihWidth : 0);

  // --- CALCULATE GRAND TOTALS ---
  const { grandTotals } = useMemo(() => {
      const totals = {
          semula: 0,
          menjadi: 0,
          selisih: 0,
          efficiency: 0,
          monthly: {} as Record<number, { rpd: number, realization: number, sp2d: number, total: number }>
      };

      for(let i=0; i<12; i++) {
          totals.monthly[i] = { rpd: 0, realization: 0, sp2d: 0, total: 0 };
      }

      const traverse = (rows: BudgetRow[]) => {
          rows.forEach(row => {
              if (row.children && row.children.length > 0) {
                  traverse(row.children);
              } else {
                  const sem = row.semula?.total || 0;
                  const men = row.menjadi?.total || 0;
                  totals.semula += sem;
                  totals.menjadi += men;
                  
                  Object.entries(row.monthlyAllocation).forEach(([mStr, val]) => {
                      const m = parseInt(mStr);
                      const jmlReal = val.rpd || 0;
                      const jmlAkan = val.realization || 0;
                      const monthTotal = jmlReal + jmlAkan;
                      const sp2d = val.sp2d || 0;

                      if (totals.monthly[m]) {
                          totals.monthly[m].rpd += jmlReal;
                          totals.monthly[m].realization += jmlAkan;
                          totals.monthly[m].total += monthTotal;
                          totals.monthly[m].sp2d += sp2d;
                      }
                  });
              }
          });
      };

      traverse(data);
      totals.efficiency = totals.semula - totals.menjadi;
      totals.selisih = totals.semula - totals.menjadi;

      return { grandTotals: totals };
  }, [data]);

  const renderAnalysisTable = (index: number, type: 'month' | 'quarter') => {
    return <div className="p-2 text-xs">Analisis Data (Lihat Kode Lengkap)</div>;
  };

  if (isLoading) {
      return (
          <div className="h-screen flex items-center justify-center bg-gray-50 flex-col gap-4">
              <Loader2 className="animate-spin text-blue-600" size={48} />
              <p className="text-gray-600 font-medium">Menghubungkan ke Server SISARA...</p>
          </div>
      );
  }

  if (error) {
      return (
          <div className="h-screen flex items-center justify-center bg-red-50 flex-col gap-4 p-8 text-center">
              <AlertCircle className="text-red-600" size={48} />
              <h2 className="text-xl font-bold text-red-800">Gagal Terhubung ke Backend</h2>
              <p className="text-red-600 max-w-md">{error}</p>
              <button onClick={loadData} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition">
                  Coba Lagi
              </button>
          </div>
      );
  }

  // --- Empty State & Init ---
  if (!data || data.length === 0) {
      return (
          <div className="h-screen flex items-center justify-center bg-gray-50 flex-col gap-4 p-8 text-center">
              <Database className="text-gray-400" size={64} />
              <h2 className="text-xl font-bold text-gray-800">Database Kosong</h2>
              <p className="text-gray-600 max-w-md">Belum ada data anggaran yang tersimpan di server.</p>
              <button 
                  onClick={handleInitializeData}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-lg flex items-center gap-2"
              >
                  <Save size={20}/>
                  Inisialisasi Template Data
              </button>
              <ConfirmationModal
                isOpen={confirmConfig.isOpen}
                title={confirmConfig.title}
                message={confirmConfig.message}
                onConfirm={confirmConfig.onConfirm}
                onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                isLoading={isSaving}
              />
          </div>
      );
  }

  return (
    <div className={`h-screen flex ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'} font-sans overflow-hidden transition-colors duration-300`}>
      <Sidebar 
        currentView={currentView} 
        onChangeView={setCurrentView} 
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onOpenMasterData={() => setShowMasterDataModal(true)}
        isDarkMode={isDarkMode}
      />

      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 relative">
        <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-4 shadow-sm border-b z-[80] flex-shrink-0 transition-colors`}>
            <div className="flex justify-between items-center mb-2">
                <div>
                <h1 className={`text-xl font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-900'}`}>
                    Sistem Revisi & RPD
                    {isSaving && <span className="ml-3 text-xs font-normal text-green-600 animate-pulse flex inline-flex items-center gap-1"><Loader2 size={10} className="animate-spin"/> Menyimpan...</span>}
                </h1>
                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-xs mt-1`}>Satuan Kerja: BPS Kota Gunungsitoli</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2 rounded-full ${isDarkMode ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-200 text-gray-600'} hover:opacity-80 transition-all`}>
                        {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                    {currentView === 'table' && (
                    <div className="relative" ref={viewMenuRef}>
                        <button 
                            onClick={() => setIsViewMenuOpen(!isViewMenuOpen)}
                            className={`flex items-center gap-2 px-4 py-2 rounded shadow-sm border text-sm font-medium transition-colors ${isViewMenuOpen ? 'bg-blue-100 border-blue-400 text-blue-800' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                        >
                            <Settings2 size={16}/> Atur Tampilan
                            {isViewMenuOpen ? <ChevronUp size={14} className="ml-1"/> : <ChevronDown size={14} className="ml-1"/>}
                        </button>
                        {isViewMenuOpen && (
                            <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-[70] p-3 animate-in fade-in zoom-in-95 duration-100 text-gray-800">
                                {/* View Options */}
                                <div className="text-[10px] font-bold text-gray-500 px-2 mb-2 uppercase tracking-wide">Kolom Data</div>
                                <button onClick={() => setShowSemula(!showSemula)} className="w-full flex items-center justify-between px-2 py-2 hover:bg-gray-50 rounded text-sm mb-1 group"><span className="text-gray-700 font-medium">Semula</span>{showSemula ? <Eye size={16} className="text-blue-600"/> : <EyeOff size={16} className="text-gray-400 group-hover:text-gray-600"/>}</button>
                                <button onClick={() => setShowMenjadi(!showMenjadi)} className="w-full flex items-center justify-between px-2 py-2 hover:bg-gray-50 rounded text-sm mb-1 group"><span className="text-gray-700 font-medium">Menjadi</span>{showMenjadi ? <Eye size={16} className="text-yellow-600"/> : <EyeOff size={16} className="text-gray-400 group-hover:text-gray-600"/>}</button>
                                <button onClick={() => setShowSelisih(!showSelisih)} className="w-full flex items-center justify-between px-2 py-2 hover:bg-gray-50 rounded text-sm mb-1 group"><span className="text-gray-700 font-medium">Selisih</span>{showSelisih ? <Eye size={16} className="text-orange-600"/> : <EyeOff size={16} className="text-gray-400 group-hover:text-gray-600"/>}</button>
                                <button onClick={() => setShowEfisiensi(!showEfisiensi)} className="w-full flex items-center justify-between px-2 py-2 hover:bg-gray-50 rounded text-sm mb-2 group"><span className="text-gray-700 font-medium">Efisiensi</span>{showEfisiensi ? <Eye size={16} className="text-emerald-600"/> : <EyeOff size={16} className="text-gray-400 group-hover:text-gray-600"/>}</button>
                                <div className="border-t my-2"></div>
                                <div className="text-[10px] font-bold text-gray-500 px-2 mb-2 uppercase tracking-wide">Periode Triwulan</div>
                                {QUARTERS.map((q, idx) => (
                                    <button key={q.name} onClick={() => toggleQuarterVisibility(idx)} className="w-full flex items-center justify-between px-2 py-2 hover:bg-gray-50 rounded text-sm"><span className="text-gray-700">{q.name}</span>{visibleQuarterIndices.includes(idx) ? <CheckSquare size={16} className="text-purple-600"/> : <Square size={16} className="text-gray-300"/>}</button>
                                ))}
                            </div>
                        )}
                    </div>
                    )}
                </div>
            </div>
            {currentView === 'table' && <Legend />}
        </div>

        {currentView === 'settings' ? (
          <div className="flex-1 overflow-auto">
             <Settings theme={theme} onUpdateTheme={handleSaveTheme} onReset={() => handleSaveTheme(defaultTheme)} />
          </div>
        ) : (
          <div ref={tableContainerRef} className="flex-1 overflow-auto relative w-full pb-20 scroll-smooth">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full border-separate border-spacing-0">
                <thead className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} top-0 sticky z-[60]`}>
                  {/* Headers */}
                  <tr className="h-12">
                    <th className="sticky left-0 z-[70] bg-blue-700 text-white border-r border-b border-blue-600 px-4 w-[350px] min-w-[350px] max-w-[350px]" style={{ width: '350px', minWidth: '350px', maxWidth: '350px' }} rowSpan={3}>Kode / Uraian</th>
                    {showSemula && <th className="sticky z-[60] bg-gray-700 text-white border-r border-b border-gray-600 text-center" style={{ left: `${getSemulaOffset()}px`, minWidth: `${semulaWidth}px` }} colSpan={4} rowSpan={2}>SEMULA</th>}
                    {showMenjadi && <th className="sticky z-[60] bg-yellow-600 text-white border-r border-b border-yellow-500 text-center" style={{ left: `${getMenjadiOffset()}px`, minWidth: `${menjadiWidth}px` }} colSpan={4} rowSpan={2}>MENJADI</th>}
                    {showSelisih && <th className="sticky z-[60] bg-orange-600 text-white border-r border-b border-orange-500 text-center" style={{ left: `${getSelisihOffset()}px`, minWidth: `${selisihWidth}px` }} colSpan={1} rowSpan={2}>SELISIH</th>}
                    {showEfisiensi && <th className="sticky z-[60] bg-emerald-600 text-white border-r border-b border-emerald-500 text-center" style={{ left: `${getEfisiensiOffset()}px`, minWidth: `${efisiensiWidth}px` }} colSpan={2} rowSpan={2}>EFISIENSI ANGGARAN</th>}
                    {visibleQuarters.map((q, idx) => <th key={q.name} colSpan={(q.months.length * 8) + 3} className={`text-center border-r border-b border-gray-300 text-sm font-bold text-gray-900 ${idx % 2 === 0 ? 'bg-purple-100' : 'bg-blue-100'}`}>{q.name}</th>)}
                  </tr>
                  <tr className="h-10">
                    {visibleQuarters.map((q, idx) => (<React.Fragment key={`months-${q.name}`}>{q.months.map(m => (<th key={m} colSpan={8} className="text-center border-r border-b border-gray-300 text-xs font-semibold bg-white p-1 text-gray-800">{MONTH_NAMES[m]}</th>))}<th rowSpan={2} className="bg-orange-100 border-r border-b border-gray-300 text-[10px] font-bold text-gray-800 w-[100px] align-middle px-1 leading-tight">TOTAL TARGET TW</th><th rowSpan={2} className="bg-orange-100 border-r border-b border-gray-300 text-[10px] font-bold text-gray-800 w-[100px] align-middle px-1 leading-tight">TOTAL REALISASI TW</th><th rowSpan={2} className="bg-orange-200 border-r border-b border-gray-300 text-[10px] font-bold text-gray-800 w-[100px] align-middle px-1 leading-tight">SISA TW</th></React.Fragment>))}
                  </tr>
                  <tr className="h-8">
                     {/* Subheaders */}
                     {showSemula && <><th className="sticky z-[60] bg-gray-200 text-gray-700 border-r border-b border-gray-300 text-xs p-1" style={{ left: `${getSemulaOffset()}px`, width: `${volValWidth + volUnitWidth}px` }} colSpan={2}>Vol</th><th className="sticky z-[60] bg-gray-200 text-gray-700 border-r border-b border-gray-300 text-xs p-1" style={{ left: `${getSemulaOffset() + volValWidth + volUnitWidth}px`, width: `${priceWidth}px` }}>Harga</th><th className="sticky z-[60] bg-gray-200 text-gray-700 border-r border-b border-gray-300 text-xs p-1" style={{ left: `${getSemulaOffset() + volValWidth + volUnitWidth + priceWidth}px`, width: `${totalWidth}px` }}>Total</th></>}
                     {showMenjadi && <><th className="sticky z-[60] bg-yellow-100 text-gray-800 border-r border-b border-gray-300 text-xs p-1" style={{ left: `${getMenjadiOffset()}px`, width: `${volValWidth + volUnitWidth}px` }} colSpan={2}>Vol</th><th className="sticky z-[60] bg-yellow-100 text-gray-800 border-r border-b border-gray-300 text-xs p-1" style={{ left: `${getMenjadiOffset() + volValWidth + volUnitWidth}px`, width: `${priceWidth}px` }}>Harga</th><th className="sticky z-[60] bg-yellow-100 text-gray-800 border-r border-b border-gray-300 text-xs p-1" style={{ left: `${getMenjadiOffset() + volValWidth + volUnitWidth + priceWidth}px`, width: `${totalWidth}px` }}>Total</th></>}
                     {showSelisih && <th className="sticky z-[60] bg-orange-100 text-gray-800 border-r border-b border-gray-300 text-xs p-1" style={{ left: `${getSelisihOffset()}px`, width: `${selisihWidth}px` }}>Nilai</th>}
                     {showEfisiensi && <><th className="sticky z-[60] bg-emerald-100 text-gray-800 border-r border-b border-gray-300 text-xs p-1" style={{ left: `${getEfisiensiOffset()}px`, width: '90px' }}>Rincian</th><th className="sticky z-[60] bg-emerald-100 text-gray-800 border-r border-b border-gray-300 text-xs p-1" style={{ left: `${getEfisiensiOffset() + 90}px`, width: '90px' }}>Total</th></>}
                     {visibleQuarters.map(q => q.months.map(m => (<React.Fragment key={`headers-${m}`}><th className="bg-pink-100 border-r border-b border-gray-300 text-[9px] min-w-[80px] font-normal px-1 text-gray-800">Jml Realisasi</th><th className="bg-pink-100 border-r border-b border-gray-300 text-[9px] min-w-[80px] font-normal px-1 text-gray-800">Jml Akan Real</th><th className="bg-pink-200 border-r border-b border-gray-300 text-[9px] min-w-[90px] font-bold px-1 text-gray-800">TOTAL</th><th className="bg-purple-100 border-r border-b border-gray-300 text-[9px] min-w-[70px] font-normal px-1 text-gray-800">Tgl</th><th className="bg-purple-100 border-r border-b border-gray-300 text-[9px] min-w-[90px] font-normal px-1 text-gray-800">No. SPM</th><th className="bg-cyan-100 border-r border-b border-gray-300 text-[9px] min-w-[30px] font-normal px-1 text-gray-800">Cek</th><th className="bg-green-100 border-r border-b border-gray-300 text-[9px] min-w-[90px] font-normal px-1 text-gray-800">SP2D</th><th className="bg-red-100 border-r border-b border-gray-300 text-[9px] min-w-[90px] font-normal px-1 text-gray-800">Selisih</th></React.Fragment>)))}
                  </tr>
                </thead>

                <tbody className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  {data.map(row => (
                    <BudgetRowItem 
                      key={row.id} 
                      row={row} 
                      onToggle={handleToggle}
                      onSelect={handleRowSelect} 
                      onAddChild={(row) => setAddingChildTo(row)}
                      onCopyRow={handleCopyRow}
                      onDeleteRow={handleDeleteRow}
                      level={0}
                      showSemula={showSemula}
                      showMenjadi={showMenjadi}
                      showSelisih={showSelisih}
                      showEfisiensi={showEfisiensi}
                      visibleQuarters={visibleQuarters}
                      theme={theme}
                      offsets={{
                          semula: getSemulaOffset(),
                          menjadi: getMenjadiOffset(),
                          selisih: getSelisihOffset(),
                          efisiensi: getEfisiensiOffset()
                      }}
                      widths={{
                          volVal: volValWidth,
                          volUnit: volUnitWidth,
                          price: priceWidth,
                          total: totalWidth,
                          selisih: selisihWidth,
                          efisiensi: 90
                      }}
                    />
                  ))}
                </tbody>

                {/* Footer and Analysis Row */}
                <tfoot>
                    <tr className="bg-gray-200 border-t-2 border-gray-400 font-bold text-[11px] text-gray-800">
                        {/* Footer Content */}
                        <td className="sticky left-0 z-[60] bg-gray-200 border-r border-b border-gray-400 p-0 h-10 w-[350px] min-w-[350px] max-w-[350px]" style={{ width: '350px', minWidth: '350px', maxWidth: '350px' }}>
                           <div className="flex items-center h-full px-2 w-full">TOTAL KESELURUHAN</div>
                        </td>
                        {showSemula && (<><td className="sticky z-[60] bg-gray-300 border-r border-b border-gray-400" style={{ left: `${getSemulaOffset()}px`, width: `${volValWidth}px` }}></td><td className="sticky z-[60] bg-gray-300 border-r border-b border-gray-400" style={{ left: `${getSemulaOffset() + volValWidth}px`, width: `${volUnitWidth}px` }}></td><td className="sticky z-[60] bg-gray-300 border-r border-b border-gray-400" style={{ left: `${getSemulaOffset() + volValWidth + volUnitWidth + priceWidth}px`, width: `${priceWidth}px` }}></td><td className="sticky z-[60] bg-gray-200 border-r border-b border-gray-400 text-right px-1" style={{ left: `${getSemulaOffset() + volValWidth + volUnitWidth + priceWidth}px`, width: `${totalWidth}px` }}>{formatCurrency(grandTotals.semula)}</td></>)}
                        {showMenjadi && (<><td className="sticky z-[60] bg-gray-300 border-r border-b border-gray-400" style={{ left: `${getMenjadiOffset()}px`, width: `${volValWidth}px` }}></td><td className="sticky z-[60] bg-gray-300 border-r border-b border-gray-400" style={{ left: `${getMenjadiOffset() + volValWidth}px`, width: `${volUnitWidth}px` }}></td><td className="sticky z-[60] bg-gray-300 border-r border-b border-gray-400" style={{ left: `${getMenjadiOffset() + volValWidth + volUnitWidth + priceWidth}px`, width: `${priceWidth}px` }}></td><td className="sticky z-[60] bg-gray-200 border-r border-b border-gray-400 text-right px-1" style={{ left: `${getMenjadiOffset() + volValWidth + volUnitWidth + priceWidth}px`, width: `${totalWidth}px` }}>{formatCurrency(grandTotals.menjadi)}</td></>)}
                        {showSelisih && <td className="sticky z-[60] bg-gray-200 border-r border-b border-gray-400 text-right px-1" style={{ left: `${getSelisihOffset()}px`, width: `${selisihWidth}px` }}>{formatCurrency(grandTotals.selisih)}</td>}
                        {showEfisiensi && (<><td className="sticky z-[60] bg-gray-200 border-r border-b border-gray-400 text-right px-1" style={{ left: `${getEfisiensiOffset()}px`, width: '90px' }}>{formatCurrency(grandTotals.efficiency)}</td><td className="sticky z-[60] bg-gray-200 border-r border-b border-gray-400 text-right px-1" style={{ left: `${getEfisiensiOffset() + 90}px`, width: '90px' }}>{formatCurrency(grandTotals.efficiency)}</td></>)}
                        {visibleQuarters.map(q => {
                             let qRpd = 0; let qReal = 0;
                             return (<React.Fragment key={`total-q-${q.name}`}>{q.months.map(m => {const mData = grandTotals.monthly[m];const gap = mData.total - mData.sp2d;qRpd += mData.rpd; qReal += mData.realization;return (<React.Fragment key={`total-m-${m}`}><td className="border-r border-b border-gray-400 text-right px-1">{formatCurrency(mData.rpd)}</td><td className="border-r border-b border-gray-400 text-right px-1">{formatCurrency(mData.realization)}</td><td className="border-r border-b border-gray-400 text-right px-1 font-bold bg-pink-50">{formatCurrency(mData.total)}</td><td className="border-r border-b border-gray-400 bg-gray-300"></td><td className="border-r border-b border-gray-400 bg-gray-300"></td><td className="border-r border-b border-gray-400 bg-gray-300"></td><td className="border-r border-b border-gray-400 text-right px-1">{formatCurrency(mData.sp2d)}</td><td className={`border-r border-b border-gray-400 text-right px-1 ${gap !== 0 ? 'text-red-600' : ''}`}>{formatCurrency(gap)}</td></React.Fragment>)})}<td className="bg-orange-200 border-r border-b border-gray-400 text-right px-1 font-bold">{formatCurrency(qRpd)}</td><td className="bg-orange-200 border-r border-b border-gray-400 text-right px-1 font-bold">{formatCurrency(qReal)}</td><td className={`bg-orange-200 border-r border-b border-gray-400 text-right px-1 font-bold ${(qRpd - qReal) !== 0 ? 'text-red-600' : 'text-green-700'}`}>{formatCurrency(qRpd - qReal)}</td></React.Fragment>)
                        })}
                    </tr>
                    
                    {/* Collapsible Analysis Row */}
                    <tr className="bg-gray-100 border-t border-gray-300">
                        <td className="sticky left-0 z-[60] bg-gray-100 border-r border-b border-gray-300 px-2 h-10 align-middle w-[350px] min-w-[350px] max-w-[350px]" style={{ width: '350px', minWidth: '350px', maxWidth: '350px' }}>
                           <span className="font-bold text-gray-700 text-xs">ANALISIS BULANAN (OM SPAN)</span>
                        </td>
                        {showSemula && <td colSpan={4} className="sticky z-[60] border-r border-b border-gray-300 bg-gray-100" style={{ left: `${getSemulaOffset()}px`, minWidth: `${semulaWidth}px` }}></td>}
                        {showMenjadi && <td colSpan={4} className="sticky z-[60] border-r border-b border-gray-300 bg-gray-100" style={{ left: `${getMenjadiOffset()}px`, minWidth: `${menjadiWidth}px` }}></td>}
                        {showSelisih && <td colSpan={1} className="sticky z-[60] border-r border-b border-gray-300 bg-gray-100" style={{ left: `${getSelisihOffset()}px`, minWidth: `${selisihWidth}px` }}></td>}
                        {showEfisiensi && <td colSpan={2} className="sticky z-[60] border-r border-b border-gray-300 bg-gray-100" style={{ left: `${getEfisiensiOffset()}px`, minWidth: `${efisiensiWidth}px` }}></td>}
                         {visibleQuarters.map((q, qIndex) => (
                             <React.Fragment key={`analysis-q-${q.name}`}>
                                 {q.months.map(m => (
                                     <td key={`analysis-m-${m}`} colSpan={8} className="border-r border-b border-gray-300 bg-gray-50 align-top p-0 relative">
                                        <div className="w-full">
                                            <button onClick={() => toggleMonthAnalysis(m)} className={`w-full flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase transition-colors ${expandedAnalysisMonths.includes(m) ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                                                <span>Analisis {MONTH_NAMES[m]}</span>{expandedAnalysisMonths.includes(m) ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                                            </button>
                                            {expandedAnalysisMonths.includes(m) && <div className="p-1 animate-in fade-in slide-in-from-top-2 duration-200">{renderAnalysisTable(m, 'month')}</div>}
                                         </div>
                                     </td>
                                 ))}
                                 <td colSpan={3} className="border-r border-b border-gray-300 bg-gray-100 align-top p-0 relative">
                                    <div className="w-full">
                                        <button onClick={() => toggleQuarterAnalysis(qIndex)} className={`w-full flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase transition-colors ${expandedAnalysisQuarters.includes(qIndex) ? 'bg-orange-100 text-orange-800' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                                            <span>Analisis {q.name}</span>{expandedAnalysisQuarters.includes(qIndex) ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                                        </button>
                                        {expandedAnalysisQuarters.includes(qIndex) && <div className="p-1 animate-in fade-in slide-in-from-top-2 duration-200 absolute right-0 z-[60] shadow-lg bg-white border border-gray-300 min-w-[500px]">{renderAnalysisTable(qIndex, 'quarter')}</div>}
                                     </div>
                                 </td>
                             </React.Fragment>
                        ))}
                    </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
        
        {/* Pass Confirmation Wrapped Function to Editor */}
        <BottomEditor 
            row={selectedRow} 
            section={selectedSection} 
            monthIndex={selectedMonthIndex} 
            onClose={closeEditor} 
            onSave={handleUpdateRowWithConfirmation}
        />
        {addingChildTo && <AddRowModal parentRow={addingChildTo} masterData={masterData} onClose={() => setAddingChildTo(null)} onSave={handleAddRow}/>}
        {showMasterDataModal && (
            <MasterDataModal 
                masterData={masterData} 
                onAdd={handleAddMasterData} 
                onEdit={handleEditMasterData}
                onDelete={handleDeleteMasterData} 
                onClose={() => setShowMasterDataModal(false)} 
            />
        )}
        
        {/* Confirmation Modal */}
        <ConfirmationModal
            isOpen={confirmConfig.isOpen}
            title={confirmConfig.title}
            message={confirmConfig.message}
            onConfirm={confirmConfig.onConfirm}
            onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
            isLoading={isSaving}
        />

      </div>
    </div>
  );
}

export default App;
