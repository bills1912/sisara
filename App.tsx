import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { BudgetRow, ThemeConfig, ChangeStatus, RowType, MasterData, User, UserRole } from './types';
import BudgetRowItem from './components/BudgetRowItem';
import Legend from './components/Legend';
import Sidebar from './components/Sidebar';
import Settings from './components/Settings';
import BottomEditor from './components/BottomEditor';
import AddRowModal from './components/AddRowModal';
import MasterDataModal from './components/MasterDataModal';
import ConfirmationModal from './components/ConfirmationModal';
import RevisionHistory from './components/RevisionHistory'; 
import Login from './components/Login';
import { Eye, EyeOff, Moon, Sun, Settings2, CheckSquare, Square, ChevronDown, ChevronUp, ArrowDown, ArrowUp, Loader2, AlertCircle, Save, Database, PlusCircle, HelpCircle, Lock, Unlock, Archive, X, Download, FileSpreadsheet, FileText, Bell, Search, BarChart2, Edit3 } from 'lucide-react';
import { MONTH_NAMES, QUARTERS, defaultTheme, formatCurrency, getAccountPrefix, formatPercent, recalculateBudget, overwriteSemulaWithMenjadi } from './utils';
import { api } from './api';
import { initialData } from './data';
import { exportToExcel } from './export';

export const App = () => {
  // --- AUTH STATE ---
  const [user, setUser] = useState<User | null>(null);
  
  // --- DATA STATE ---
  const [data, setData] = useState<BudgetRow[]>([]);
  const dataRef = useRef<BudgetRow[]>([]);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const [masterData, setMasterData] = useState<MasterData>({});
  const [theme, setTheme] = useState<ThemeConfig>(defaultTheme);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // --- VIEW STATE ---
  const [showSemula, setShowSemula] = useState(true);
  const [showMenjadi, setShowMenjadi] = useState(true);
  
  const [showSelisih, setShowSelisih] = useState(true);
  const [showEfisiensi, setShowEfisiensi] = useState(true);
  
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  const viewMenuRef = useRef<HTMLDivElement>(null);

  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const legendRef = useRef<HTMLDivElement>(null);
  
  // Revision Mode State (Local)
  const [isRevisionMode, setIsRevisionMode] = useState(false);
  // System Wide Revision Mode (Fetched from server for Operator Notification)
  const [systemRevisionActive, setSystemRevisionActive] = useState(false);

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(false);

    // Analysis Toggle State
  const [expandedAnalysisMonths, setExpandedAnalysisMonths] = useState<number[]>([]);
  const [expandedAnalysisQuarters, setExpandedAnalysisQuarters] = useState<number[]>([]);

  const [visibleQuarterIndices, setVisibleQuarterIndices] = useState<number[]>([0, 1, 2, 3]);

  const [currentView, setCurrentView] = useState<'table' | 'settings' | 'history'>('table');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showMasterDataModal, setShowMasterDataModal] = useState(false);

  const [showSnapshotModal, setShowSnapshotModal] = useState(false);
  const [snapshotNote, setSnapshotNote] = useState('');

  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<'SEMULA' | 'MENJADI' | 'MONTHLY' | 'EFFICIENCY' | null>(null);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number | null>(null);

  const [addingChildTo, setAddingChildTo] = useState<BudgetRow | null>(null);
  const [isAddingRoot, setIsAddingRoot] = useState(false);

  const inputBgClass = isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-300';
  const inputBorderClass = isDarkMode ? 'border-slate-700' : 'border-gray-300';
  const inputTextClass = isDarkMode ? 'text-white' : 'text-gray-900';

  const [confirmConfig, setConfirmConfig] = useState<{
      isOpen: boolean;
      title: string;
      message: string;
      onConfirm: () => void | Promise<void>;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // --- INITIAL LOAD CHECK ---
  useEffect(() => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');
      if (token && savedUser) {
          try {
              setUser(JSON.parse(savedUser));
          } catch(e) {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
          }
      }
      setIsLoading(false); // Done checking auth
  }, []);

  const handleLoginSuccess = (userData: any) => {
      localStorage.setItem('token', userData.token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      loadData(); // Load data after login
  };

  const handleLogout = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setData([]); // Clear data
  };

  // --- POLLING FOR NOTIFICATION (Operator Only) ---
  useEffect(() => {
      if (user && user.role === UserRole.OPERATOR) {
          const checkSystemStatus = async () => {
              const status = await api.getSystemStatus();
              setSystemRevisionActive(status.is_revision_active);
          };
          
          checkSystemStatus(); // Initial check
          const intervalId = setInterval(checkSystemStatus, 10000); // Poll every 10 seconds
          return () => clearInterval(intervalId);
      }
  }, [user]);

  // Function to check revisions and update visibility logic
  const checkRevisions = async () => {
    try {
        const revisions = await api.getRevisions();
        const hasHistory = revisions && revisions.length > 0;
        
        // Logic: Jika ada history, Menjadi tetap muncul. Jika kosong, tidak terlihat.
        if (hasHistory) {
            setShowMenjadi(true);
        } else {
            // Jika sedang mode revisi, biarkan visible agar user bisa input. Jika tidak, sembunyikan.
            if (!isRevisionMode) {
                setShowMenjadi(false);
            }
        }
    } catch (e: any) {
        if (e.message === "Unauthorized") {
            handleLogout();
            return;
        }
        console.error("Gagal memeriksa status revisi:", e);
    }
  };

  const loadData = async () => {
    if (!user) return; // Don't load if not logged in

    setIsLoading(true);
    setError(null);
    try {
        const [fetchedBudget, fetchedMaster, fetchedTheme] = await Promise.all([
            api.getBudget(),
            api.getMasterData(),
            api.getTheme()
        ]);
        const processedBudget = recalculateBudget(fetchedBudget);
        setData(processedBudget);
        setMasterData(fetchedMaster);
        setTheme(fetchedTheme);
        
        // Check revisions for UI state logic
        await checkRevisions();

    } catch (e: any) {
        if (e.message === "Unauthorized") {
            handleLogout();
            return;
        }
        console.error("Failed to load data", e);
        setError(e.message || "Gagal memuat data dari server.");
    } finally {
        setIsLoading(false);
    }
  };

  // Load data when user becomes available (login)
  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const handleExport = async (format: 'excel' | 'pdf') => {
      setIsExportMenuOpen(false);
      setIsExporting(true);
      try {
          if (format === 'excel') {
             await exportToExcel(data);
          } else {
             await api.exportBudget(format);
          }
      } catch (e: any) {
          alert("Gagal export: " + e.message);
      } finally {
          setIsExporting(false);
      }
  };

  const requestConfirmation = (title: string, message: string, action: () => Promise<void> | void) => {
      setConfirmConfig({
          isOpen: true,
          title,
          message,
          onConfirm: async () => {
              try {
                  await action();
              } finally {
                  setConfirmConfig(prev => ({ ...prev, isOpen: false }));
              }
          }
      });
  };

  const handleSaveBudget = async (newData: BudgetRow[]) => {
      const recalculatedData = recalculateBudget(newData);
      setData(recalculatedData); 
      setIsSaving(true);
      try {
        await api.saveBudget(recalculatedData);
      } catch (e: any) {
        if (e.message === "Unauthorized") {
            handleLogout();
            alert("Sesi Anda telah berakhir. Silakan login kembali.");
            return;
        }
        alert("Gagal menyimpan perubahan ke server: " + e.message);
      } finally {
        setIsSaving(false);
      }
  };

  const handleOpenSnapshotModal = () => {
      setSnapshotNote(`Revisi ${new Date().toLocaleString('id-ID', { 
        day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' 
      })}`);
      setShowSnapshotModal(true);
  };

  const handleConfirmSnapshot = async () => {
      if (!snapshotNote.trim()) {
          alert("Mohon isi catatan revisi.");
          return;
      }
      setIsSaving(true);
      try {
          if (!dataRef.current || dataRef.current.length === 0) throw new Error("Tidak ada data.");
          
          await api.createRevision(snapshotNote, dataRef.current);
          const newData = overwriteSemulaWithMenjadi(dataRef.current);
          await handleSaveBudget(newData);
          
          // Setelah snapshot sukses, history bertambah, maka Menjadi harus muncul
          setShowMenjadi(true);

          setShowSnapshotModal(false);
          setIsSaving(false);
          setTimeout(() => {
             alert("Snapshot revisi berhasil disimpan! Kolom Semula telah diperbarui dengan data Menjadi. Selisih telah direset.");
          }, 100);
      } catch(e: any) {
          setIsSaving(false);
          alert("Gagal menyimpan snapshot: " + e.message);
      }
  };

  const handleRestoreRevision = (restoredData: BudgetRow[]) => {
      setData(restoredData);
      handleSaveBudget(restoredData);
      setCurrentView('table');
      // Restore means history exists (since we restored from it), so show Menjadi
      setShowMenjadi(true); 
      alert("Data berhasil dipulihkan.");
  };

  const handleInitializeData = async () => {
      requestConfirmation(
          "Inisialisasi Database",
          "Database kosong. Isi dengan template awal?",
          async () => await handleSaveBudget(initialData)
      );
  };

  const handleAddMasterData = async (category: RowType, code: string, desc: string) => {
      const newList = [...(masterData[category] || []), { code, desc }];
      setMasterData(prev => ({ ...prev, [category]: newList }));
      try { await api.saveMasterData({ type: category, code, desc }); } 
      catch (e: any) { alert("Gagal: " + e.message); loadData(); }
  };

  const handleEditMasterData = async (category: RowType, code: string, originalDesc: string, newDesc: string) => {
      const currentList = masterData[category] || [];
      // Identifikasi item berdasarkan kode AND deskripsi lama
      const updatedList = currentList.map(item => 
          (item.code === code && item.desc === originalDesc) ? { ...item, desc: newDesc } : item
      );
      setMasterData(prev => ({ ...prev, [category]: updatedList }));
      try { await api.updateMasterData(category, code, originalDesc, newDesc); } 
      catch (e: any) { alert("Gagal: " + e.message); loadData(); }
  };

  const handleDeleteMasterData = async (category: RowType, code: string, desc: string) => {
      // Hapus hanya item yang cocok dengan kode AND deskripsi
      const newList = (masterData[category] || []).filter(item => !(item.code === code && item.desc === desc));
      setMasterData(prev => ({ ...prev, [category]: newList }));
      try { await api.deleteMasterData(category, code, desc); } 
      catch(e: any) { alert("Gagal: " + e.message); loadData(); }
  };

  const handleSaveTheme = async (newTheme: ThemeConfig) => {
      setTheme(newTheme);
      try { await api.saveTheme(newTheme); } 
      catch (e: any) { alert("Gagal: " + e.message); }
  };

  // --- REVISION MODE TOGGLE (With System State Update) ---
  const toggleRevisionMode = async () => {
      if (user?.role !== UserRole.PPK) return;

      if (!isRevisionMode) {
          // Entering Revision Mode
          if (!showMenjadi) setShowMenjadi(true);
          setIsRevisionMode(true);
          await api.setSystemRevisionStatus(true, user.fullName);
      } else {
          // Exiting Revision Mode
          setIsRevisionMode(false);
          await api.setSystemRevisionStatus(false, user.fullName);
      }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (viewMenuRef.current && !viewMenuRef.current.contains(event.target as Node)) setIsViewMenuOpen(false);
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) setIsExportMenuOpen(false);
      if (legendRef.current && !legendRef.current.contains(event.target as Node)) setIsLegendOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const performUpdateRow = useCallback((id: string, updatedFields: Partial<BudgetRow>) => {
    let newData: BudgetRow[] = [];
    const updateRecursive = (rows: BudgetRow[]): BudgetRow[] => {
        return rows.map(row => {
          if (row.id === id) return { ...row, ...updatedFields };
          if (row.children && row.children.length > 0) return { ...row, children: updateRecursive(row.children) };
          return row;
        });
    };
    newData = updateRecursive(data);
    handleSaveBudget(newData);
  }, [data]);

  const handleUpdateRowWithConfirmation = (id: string, updatedFields: Partial<BudgetRow>) => {
      performUpdateRow(id, updatedFields);
  };

  const handleToggle = (id: string) => {
    performUpdateRow(id, { isOpen: !findRowById(data, id)?.isOpen });
  };

  const handleAddRow = (parentId: string, newRowData: BudgetRow) => {
      requestConfirmation(
          "Tambah Data Baru", "Tambahkan data ini?",
          () => {
            let newData: BudgetRow[] = [];
            if (!parentId) {
               newData = [...data, newRowData];
               setIsAddingRoot(false);
            } else {
               const addRecursive = (rows: BudgetRow[]): BudgetRow[] => {
                    return rows.map(row => {
                    if (row.id === parentId) return { ...row, isOpen: true, children: [...row.children, newRowData] };
                    if (row.children && row.children.length > 0) return { ...row, children: addRecursive(row.children) };
                    return row;
                    });
                };
                newData = addRecursive(data);
                setAddingChildTo(null);
            }
            handleSaveBudget(newData);
          }
      );
  };

  const handleCopyRow = useCallback((rowToCopy: BudgetRow) => {
    const generateNewId = (oid: string) => `${oid}-copy-${Date.now()}`;
    const deepCopy = (row: BudgetRow): BudgetRow => ({ ...row, id: generateNewId(row.id), children: row.children ? row.children.map(deepCopy) : [] });
    requestConfirmation("Duplikasi", "Duplikasi baris ini?", () => {
        const newRow = deepCopy(rowToCopy);
        const insertRecursive = (rows: BudgetRow[]): BudgetRow[] => {
            const index = rows.findIndex(r => r.id === rowToCopy.id);
            if (index !== -1) { const newRows = [...rows]; newRows.splice(index + 1, 0, newRow); return newRows; }
            return rows.map(r => r.children ? { ...r, children: insertRecursive(r.children) } : r);
        };
        handleSaveBudget(insertRecursive(data));
    });
  }, [data]);

  const handleDeleteRow = useCallback((rowId: string) => {
    requestConfirmation("Hapus", "Hapus baris ini?", () => {
        const deleteRecursive = (rows: BudgetRow[]): BudgetRow[] => {
            return rows.filter(r => r.id !== rowId).map(r => r.children ? { ...r, children: deleteRecursive(r.children) } : r);
        };
        handleSaveBudget(deleteRecursive(data));
        if (selectedRowId === rowId) closeEditor();
    });
  }, [data, selectedRowId]);

  const handleRowSelect = (row: BudgetRow, section: 'SEMULA' | 'MENJADI' | 'MONTHLY' | 'EFFICIENCY', monthIndex?: number) => {
    setSelectedRowId(row.id);
    setSelectedSection(section);
    setSelectedMonthIndex(monthIndex !== undefined ? monthIndex : null);
  };

  const closeEditor = () => { setSelectedRowId(null); setSelectedSection(null); setSelectedMonthIndex(null); };

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

  // --- CALCULATION FOR FOOTER (ANALISIS KINERJA) ---
   const { grandTotals, analysisData, aggregates } = useMemo(() => {
      const totals = {
          semula: 0,
          menjadi: 0,
          selisih: 0,
          efficiency: 0,
          monthly: {} as Record<number, { rpd: number, realization: number, sp2d: number, total: number }>
      };

      // Aggregates for Analysis Footer Rows (51, 52, 53)
      const agg = {
        '51': { semula: 0, menjadi: 0, efficiency: 0, monthly: {} as any },
        '52': { semula: 0, menjadi: 0, efficiency: 0, monthly: {} as any },
        '53': { semula: 0, menjadi: 0, efficiency: 0, monthly: {} as any },
        'total': { semula: 0, menjadi: 0, efficiency: 0, monthly: {} as any }
      };

      // Initialize monthly structure in aggregates
      for(let i=0; i<12; i++) {
        agg['51'].monthly[i] = { rpd: 0, realization: 0, sp2d: 0 };
        agg['52'].monthly[i] = { rpd: 0, realization: 0, sp2d: 0 };
        agg['53'].monthly[i] = { rpd: 0, realization: 0, sp2d: 0 };
        agg['total'].monthly[i] = { rpd: 0, realization: 0, sp2d: 0 };
      }

      // Analysis breakdown storage
      const analysis = {
        months: {} as Record<number, Record<string, { rpd: number, sp2d: number, realization: number, pagu: number }>>,
      };

      for(let i=0; i<12; i++) {
          totals.monthly[i] = { rpd: 0, realization: 0, sp2d: 0, total: 0 };
          analysis.months[i] = {
              '51': { rpd: 0, sp2d: 0, realization: 0, pagu: 0 },
              '52': { rpd: 0, sp2d: 0, realization: 0, pagu: 0 },
              '53': { rpd: 0, sp2d: 0, realization: 0, pagu: 0 },
              'OTHER': { rpd: 0, sp2d: 0, realization: 0, pagu: 0 }
          };
      }

      const traverse = (rows: BudgetRow[]) => {
          rows.forEach(row => {
              const prefix = getAccountPrefix(row.code);
              const aggKey = (prefix === '51' || prefix === '52' || prefix === '53') ? prefix : null;

              if (row.children && row.children.length > 0) {
                  traverse(row.children);
              } else {
                  const sem = row.semula?.total || 0;
                  const men = row.menjadi?.total || 0;
                  const eff = row.efficiency || 0;

                  totals.semula += sem;
                  totals.menjadi += men;
                  totals.efficiency += eff; // Sum efficiency from manual inputs
                  
                  // Aggregate logic for specific rows
                  if (aggKey) {
                      agg[aggKey].semula += sem;
                      agg[aggKey].menjadi += men;
                      agg[aggKey].efficiency += eff;
                      
                      agg['total'].semula += sem;
                      agg['total'].menjadi += men;
                      agg['total'].efficiency += eff;
                  }

                  // Accumulate Pagu for analysis
                  if (!row.isBlocked) {
                      for (let m = 0; m < 12; m++) {
                          if (analysis.months[m][prefix]) {
                            analysis.months[m][prefix].pagu += men;
                          } else if (analysis.months[m]['OTHER']) {
                            analysis.months[m]['OTHER'].pagu += men;
                          }
                      }
                  }

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

                      // Add to Analysis Breakdown
                      const targetBucket = analysis.months[m][prefix] || analysis.months[m]['OTHER'];
                      if (targetBucket) {
                          targetBucket.rpd += jmlReal;
                          targetBucket.sp2d += sp2d;
                          targetBucket.realization += jmlAkan;
                      }

                      // Add to Aggregates Monthly
                      if (aggKey) {
                          agg[aggKey].monthly[m].rpd += jmlReal;
                          agg[aggKey].monthly[m].realization += jmlAkan;
                          agg[aggKey].monthly[m].sp2d += sp2d;

                          agg['total'].monthly[m].rpd += jmlReal;
                          agg['total'].monthly[m].realization += jmlAkan;
                          agg['total'].monthly[m].sp2d += sp2d;
                      }
                  });
              }
          });
      };

      traverse(data);
      totals.selisih = totals.semula - totals.menjadi;

      return { grandTotals: totals, analysisData: analysis, aggregates: agg };
  }, [data]);

  const renderAnalysisTable = (index: number, type: 'month' | 'quarter') => {
      let aggregatedData = {
        '51': { rpd: 0, sp2d: 0, realization: 0, pagu: 0 },
        '52': { rpd: 0, sp2d: 0, realization: 0, pagu: 0 },
        '53': { rpd: 0, sp2d: 0, realization: 0, pagu: 0 },
        'OTHER': { rpd: 0, sp2d: 0, realization: 0, pagu: 0 }
      };

      let monthsToProcess: number[] = [];
      if (type === 'month') {
          monthsToProcess = [index];
      } else {
          monthsToProcess = QUARTERS[index].months;
      }

      monthsToProcess.forEach(m => {
          const mData = analysisData.months[m];
          if (!mData) return;
          ['51', '52', '53', 'OTHER'].forEach(key => {
              aggregatedData[key as keyof typeof aggregatedData].rpd += mData[key].rpd;
              aggregatedData[key as keyof typeof aggregatedData].sp2d += mData[key].sp2d;
              aggregatedData[key as keyof typeof aggregatedData].realization += mData[key].realization;
          });
      });

      ['51', '52', '53', 'OTHER'].forEach(key => {
          const firstMonth = monthsToProcess[0];
          aggregatedData[key as keyof typeof aggregatedData].pagu = analysisData.months[firstMonth][key].pagu;
      });

      const isJan = type === 'month' && index === 0;

      const calculateTotals = (data: typeof aggregatedData, valueExtractor: (d: any) => number) => {
          const total = { rpd: 0, sp2d: 0, realization: 0, pagu: 0, targetValue: 0 };
          Object.values(data).forEach(val => {
              total.rpd += val.rpd;
              total.sp2d += val.sp2d;
              total.realization += val.realization;
              total.pagu += val.pagu;
              total.targetValue += valueExtractor(val);
          });
          return total;
      };

      // Render single table section
      const renderSingleTable = (
          sectionTitle: string, 
          valueExtractor: (d: any) => number, 
          titleBgColor: string,
          showDeviationColumns: boolean = true
      ) => {
          const totalRow = calculateTotals(aggregatedData, valueExtractor);

          const renderRow = (label: string, data: { rpd: number, sp2d: number, realization: number, pagu: number }, isTotal = false) => {
              const targetValue = valueExtractor(data);
              const pagu = data.pagu;
              const omSpan = data.sp2d;
              const percentTarget = pagu > 0 ? (targetValue / pagu) * 100 : 0;
              const marginMin = targetValue * 0.95;
              const marginMax = targetValue * 1.05;
              const realisasi = omSpan; 
              const deviation = realisasi - targetValue;
              
              const getDeviationColor = () => {
                  if (deviation === 0) return isDarkMode ? 'bg-green-800 text-green-200' : 'bg-green-100 text-green-800';
                  if (deviation > 0) return isDarkMode ? 'bg-blue-800 text-blue-200' : 'bg-blue-100 text-blue-800';
                  return isDarkMode ? 'bg-red-800 text-red-200' : 'bg-red-500 text-white';
              };

              const textColorClass = isDarkMode ? 'text-gray-200' : 'text-gray-900';
              const bgClass = isTotal 
                  ? (isDarkMode ? 'bg-yellow-900/30' : 'bg-yellow-50') 
                  : (isDarkMode ? 'bg-gray-800' : 'bg-white');
              const totalHighlight = isTotal ? (isDarkMode ? 'bg-cyan-900/50 text-cyan-200' : 'bg-cyan-100 text-cyan-800') : '';

              return (
                  <tr key={label} className={`${isTotal ? 'font-bold' : ''} ${bgClass} border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} ${textColorClass}`}>
                      <td className="p-2 border-r text-left border-gray-300">{label}</td>
                      <td className={`p-2 border-r text-right border-gray-300 ${isTotal ? totalHighlight : ''}`}>
                          {formatCurrency(targetValue)}
                      </td>
                      <td className={`p-2 border-r text-right border-gray-300 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                          {formatCurrency(omSpan)}
                      </td>
                      <td className="p-2 border-r text-right border-gray-300">{formatCurrency(pagu)}</td>
                      <td className="p-2 border-r text-center border-gray-300">{percentTarget.toFixed(2)}%</td>
                      
                      {showDeviationColumns && !isJan && (
                          <>
                              <td className={`p-2 border-r text-right text-[10px] border-gray-300 ${isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                                  {formatCurrency(marginMin)}
                              </td>
                              <td className={`p-2 border-r text-right text-[10px] border-gray-300 ${isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                                  {formatCurrency(marginMax)}
                              </td>
                              <td className={`p-2 border-r text-right font-medium border-gray-300 ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                                  {formatCurrency(realisasi)}
                              </td>
                              <td className={`p-2 text-right font-bold border-gray-300 ${getDeviationColor()}`}>
                                  {formatCurrency(deviation)}
                              </td>
                          </>
                      )}
                  </tr>
              );
          };

          return (
              <table className="w-full text-xs border-collapse mb-3">
                  <thead>
                      <tr>
                          <th colSpan={showDeviationColumns && !isJan ? 9 : 5} className={`p-2 text-left font-bold border border-gray-300 ${titleBgColor}`}>
                              {sectionTitle}
                          </th>
                      </tr>
                      <tr className={`${isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-900'} font-bold`}>
                          <th className="p-2 border border-gray-300 w-28">JENIS BELANJA</th>
                          <th className="p-2 border border-gray-300 w-28">TARGET</th>
                          <th className="p-2 border border-gray-300 w-28">OM SPAN</th>
                          <th className="p-2 border border-gray-300 w-28">PAGU</th>
                          <th className="p-2 border border-gray-300 w-20">% TARGET</th>
                          {showDeviationColumns && !isJan && (
                              <>
                                  <th className="p-2 border border-gray-300 w-24" colSpan={2}>MARGIN 5%</th>
                                  <th className="p-2 border border-gray-300 w-28">REALISASI</th>
                                  <th className="p-2 border border-gray-300 w-28">DEVIASI</th>
                              </>
                          )}
                      </tr>
                  </thead>
                  <tbody>
                      {renderRow('JUMLAH 51', aggregatedData['51'])}
                      {renderRow('JUMLAH 52', aggregatedData['52'])}
                      {renderRow('JUMLAH 53', aggregatedData['53'])}
                      {renderRow('TOTAL', totalRow, true)}
                  </tbody>
              </table>
          );
      };

      const periodTitle = type === 'month' 
          ? `Analisis Kinerja ${MONTH_NAMES[index]}`
          : `Analisis Kinerja ${QUARTERS[index].name}`;

      // For monthly analysis, show 3 tables; for quarterly, show single combined table
      if (type === 'month') {
          return (
              <div className={`p-3 text-xs border rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'}`}>
                  <div className={`font-bold mb-3 text-sm border-b pb-2 flex items-center gap-2 ${isDarkMode ? 'text-gray-200 border-gray-600' : 'text-gray-800 border-gray-300'}`}>
                      <BarChart2 size={16} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
                      {periodTitle}
                  </div>
                  
                  {/* Table 1: Jumlah Realisasi (SP2D) */}
                  {renderSingleTable(
                      'Jumlah Realisasi',
                      (d) => d.sp2d,
                      isDarkMode ? 'bg-green-900/50 text-green-200' : 'bg-green-100 text-green-800',
                      false // No deviation columns for this table
                  )}
                  
                  {/* Table 2: Jumlah akan Direalisasikan */}
                  {renderSingleTable(
                      'Jumlah akan Direalisasikan',
                      (d) => d.realization,
                      isDarkMode ? 'bg-blue-900/50 text-blue-200' : 'bg-blue-100 text-blue-800',
                      false // No deviation columns for this table
                  )}
                  
                  {/* Table 3: TOTAL per Bulan (RPD = sp2d + realization) */}
                  {renderSingleTable(
                      'TOTAL per Bulan',
                      (d) => d.rpd,
                      isDarkMode ? 'bg-orange-900/50 text-orange-200' : 'bg-orange-200 text-orange-900',
                      true // Show deviation columns for total
                  )}
              </div>
          );
      } else {
          // Quarterly: single combined table
          return (
              <div className={`p-3 text-xs border rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'}`}>
                  <div className={`font-bold mb-3 text-sm border-b pb-2 flex items-center gap-2 ${isDarkMode ? 'text-gray-200 border-gray-600' : 'text-gray-800 border-gray-300'}`}>
                      <BarChart2 size={16} className={isDarkMode ? 'text-orange-400' : 'text-orange-600'} />
                      {periodTitle}
                  </div>
                  {renderSingleTable(
                      'Total Triwulan',
                      (d) => d.rpd,
                      isDarkMode ? 'bg-orange-900/50 text-orange-200' : 'bg-orange-200 text-orange-900',
                      true
                  )}
              </div>
          );
      }
  };
    // Style constants for footer cells - NO STICKY (Static positioning)
  const footerCellClass = `border-r border-t border-gray-300 ${isDarkMode ? 'bg-gray-700 border-gray-500 text-gray-200' : 'bg-gray-200 border-gray-400 text-gray-800'} font-bold text-[11px]`;
  const footerStickyCellClass = `${footerCellClass} sticky z-[40]`;
  const footerFirstCellClass = `border-r border-t border-gray-300 px-2 h-10 align-middle w-[350px] min-w-[350px] max-w-[350px] ${isDarkMode ? 'bg-gray-700 border-gray-500 text-gray-200' : 'bg-gray-200 border-gray-400 text-gray-800'} font-bold sticky left-0 z-[40]`;
  
  const analysisCellClass = `border-r border-t border-gray-300 align-top ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50'}`;
  const analysisStickyCellClass = `${analysisCellClass} sticky z-[40]`;
  const analysisFirstCellClass = `border-r border-t border-gray-300 px-2 h-10 align-middle w-[350px] min-w-[350px] max-w-[350px] sticky left-0 z-[40] ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50'}`;

  // --- RENDER CONDITION: LOGIN ---
  if (!user) {
      // Pass isDarkMode prop to Login
      return <Login onLoginSuccess={handleLoginSuccess} isDarkMode={isDarkMode} />;
  }

  // Calculate Grand Totals (Header Bubbles)
  const grandTotalSemula = data.reduce((acc, row) => acc + (row.semula?.total || 0), 0);
  const grandTotalMenjadi = data.reduce((acc, row) => acc + (row.menjadi?.total || 0), 0);

  const isOperatorLocked = user.role === UserRole.OPERATOR && systemRevisionActive;

  const renderContent = () => {
        if (currentView === 'settings') {
            return (
                <div className="flex-1 overflow-auto bg-gray-50">
                    <Settings theme={theme} onUpdateTheme={handleSaveTheme} onReset={() => handleSaveTheme(defaultTheme)} />
                </div>
            );
        }

        if (currentView === 'history') {
             return (
                 <RevisionHistory 
                    isDarkMode={isDarkMode} 
                    onRestore={handleRestoreRevision}
                    onRevisionChange={checkRevisions}
                 />
            );
        }

        // TABLE VIEW LOGIC
        const descWidth = 350;
        const volValWidth = 40; 
        const volUnitWidth = 40;
        const priceWidth = 80;
        const totalWidth = 90;
        
        const groupWidth = volValWidth + volUnitWidth + priceWidth + totalWidth; 
        const semulaWidth = groupWidth; 
        const menjadiWidth = groupWidth;
        const selisihWidth = 90; 
        const efisiensiWidth = 100; // REDUCED TO SINGLE COLUMN WIDTH + PADDING

        const getSemulaOffset = () => descWidth;
        const getMenjadiOffset = () => descWidth + (showSemula ? semulaWidth : 0);
        const getSelisihOffset = () => descWidth + (showSemula ? semulaWidth : 0) + (showMenjadi ? menjadiWidth : 0);
        const getEfisiensiOffset = () => descWidth + (showSemula ? semulaWidth : 0) + (showMenjadi ? menjadiWidth : 0) + (showSelisih ? selisihWidth : 0);

        const offsets = {
            semula: getSemulaOffset(),
            menjadi: getMenjadiOffset(),
            selisih: getSelisihOffset(),
            efisiensi: getEfisiensiOffset()
        };

        const widths = {
            volVal: volValWidth,
            volUnit: volUnitWidth,
            price: priceWidth,
            total: totalWidth,
            selisih: selisihWidth,
            efisiensi: efisiensiWidth // Use single width
        };

        const visibleQuarters = QUARTERS.filter((_, index) => visibleQuarterIndices.includes(index));
        const headerBorderColor = isDarkMode ? '#4b5563' : '#d1d5db';
        const stickyHeaderGapStyle = { boxShadow: `-1px 0 0 0 ${headerBorderColor}` };

        return (
            <div className="flex-1 relative w-full h-full overflow-hidden flex flex-col">
              {/* Operator Lock Overlay */}
              {isOperatorLocked && (
                  <div className="absolute inset-0 z-[80] bg-white/50 backdrop-blur-[2px] flex items-center justify-center select-none">
                      <div className="bg-white p-6 rounded-xl shadow-2xl border border-yellow-200 max-w-md text-center mx-4">
                          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                              <Lock size={32} className="text-yellow-600"/>
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 mb-2">Akses Terkunci Sementara</h3>
                          <p className="text-gray-600 mb-4">
                              PPK sedang melakukan revisi anggaran. Untuk mencegah konflik data, akses edit ditutup sementara hingga revisi selesai.
                          </p>
                          <div className="text-xs text-gray-400 font-mono bg-gray-50 p-2 rounded">
                              Status: REVISION_MODE_ACTIVE
                          </div>
                      </div>
                  </div>
              )}

              {/* Scrollable Container */}
              <div className="flex-1 w-full overflow-auto scroll-smooth" ref={tableContainerRef}>
                {isLoading ? (
                    <div className="flex h-full items-center justify-center flex-col gap-4">
                        <Loader2 className={`animate-spin ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} size={48} />
                        <p className={`text-lg font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Memuat data anggaran...</p>
                    </div>
                ) : error ? (
                    <div className="flex h-full items-center justify-center flex-col gap-4 text-red-500">
                        <AlertCircle size={48} />
                        <p className="text-lg font-bold">Terjadi Kesalahan</p>
                        <p className="text-sm text-gray-500">{error}</p>
                        <button onClick={loadData} className="px-4 py-2 bg-red-100 rounded-md hover:bg-red-200 transition-colors text-sm font-medium">Coba Lagi</button>
                    </div>
                ) : data.length === 0 ? (
                    <div className="flex h-full items-center justify-center flex-col gap-6">
                        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center">
                            <Database size={40} className="text-gray-400" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-gray-800">Database Kosong</h3>
                            <p className="text-gray-500 mt-2 max-w-sm">Belum ada data anggaran yang tersedia. Anda dapat memulai dengan template awal atau menambahkan data manual.</p>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => setIsAddingRoot(true)} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95 font-medium">
                                <PlusCircle size={18} /> Tambah Manual
                            </button>
                            <button onClick={handleInitializeData} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium">
                                <Database size={18} /> Inisialisasi Template
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="inline-block min-w-full align-middle pb-20">
                    <table className="min-w-full border-separate border-spacing-0">
                        <thead className={`sticky top-0 z-[60] shadow-sm ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                        {/* HEADERS ROW 1 */}
                        <tr className="h-12">
                            <th className="sticky left-0 z-[70] bg-blue-700 text-white border-r border-b border-blue-600 px-4 w-[350px] min-w-[350px] max-w-[350px]" style={{ width: '350px', minWidth: '350px', maxWidth: '350px' }} rowSpan={3}>
                                <div className="flex items-center justify-between">
                                    <span>Kode / Uraian</span>
                                    <div className="flex gap-1">
                                        <button onClick={() => setIsAddingRoot(true)} className="p-1 hover:bg-blue-600 rounded text-blue-100 hover:text-white" title="Tambah Satker (Root)">
                                            <PlusCircle size={14}/>
                                        </button>
                                    </div>
                                </div>
                            </th>
                            {showSemula && (
                                <th 
                                    className="sticky z-[60] bg-gray-700 text-white border-r border-b border-gray-600 text-center" 
                                    style={{ left: `${getSemulaOffset()}px`, minWidth: `${semulaWidth}px`, ...stickyHeaderGapStyle }} 
                                    colSpan={4} 
                                    rowSpan={2}
                                >
                                    <div className="flex flex-col items-center justify-center gap-1 py-1">
                                        <span className="text-xs font-bold tracking-wider">SEMULA</span>
                                        <div className="bg-white/20 px-3 py-0.5 rounded-full backdrop-blur-sm border border-white/10 shadow-sm flex items-center justify-center min-w-[120px]">
                                            <span className="text-sm font-extrabold">{formatCurrency(grandTotalSemula)}</span>
                                        </div>
                                    </div>
                                </th>
                            )}
                            {showMenjadi && (
                                <th 
                                    className="sticky z-[60] bg-yellow-600 text-white border-r border-b border-yellow-500 text-center" 
                                    style={{ left: `${getMenjadiOffset()}px`, minWidth: `${menjadiWidth}px`, ...stickyHeaderGapStyle }} 
                                    colSpan={4} 
                                    rowSpan={2}
                                >
                                    <div className="flex flex-col items-center justify-center gap-1 py-1">
                                        <span className="text-xs font-bold tracking-wider">MENJADI</span>
                                        <div className="bg-white/20 px-3 py-0.5 rounded-full backdrop-blur-sm border border-white/10 shadow-sm flex items-center justify-center min-w-[120px]">
                                            <span className="text-sm font-extrabold">{formatCurrency(grandTotalMenjadi)}</span>
                                        </div>
                                    </div>
                                </th>
                            )}
                            {showSelisih && <th className="sticky z-[60] bg-orange-600 text-white border-r border-b border-orange-500 text-center text-xs font-bold tracking-wider" style={{ left: `${getSelisihOffset()}px`, minWidth: `${selisihWidth}px`, ...stickyHeaderGapStyle }} colSpan={1} rowSpan={2}>SELISIH</th>}
                            {showEfisiensi && <th className="sticky z-[60] bg-emerald-600 text-white border-r border-b border-emerald-500 text-center text-xs font-bold tracking-wider" style={{ left: `${getEfisiensiOffset()}px`, minWidth: `${efisiensiWidth}px`, ...stickyHeaderGapStyle }} colSpan={1} rowSpan={2}>EFISIENSI ANGGARAN</th>}
                            
                            {visibleQuarters.map((q, idx) => (
                                <th key={q.name} colSpan={(q.months.length * 8) + 3} className={`text-center border-r border-b border-gray-300 text-sm font-bold ${isDarkMode ? 'bg-gray-700 text-gray-200' : 'text-gray-900'} ${idx % 2 === 0 ? (isDarkMode ? 'bg-purple-900/50' : 'bg-purple-100') : (isDarkMode ? 'bg-blue-900/50' : 'bg-blue-100')}`}>
                                    <div className="flex items-center justify-center gap-2">
                                        {q.name}
                                    </div>
                                </th>
                            ))}
                        </tr>
                        {/* HEADERS ROW 2 */}
                        <tr className="h-10">
                            {visibleQuarters.map((q, idx) => (
                                <React.Fragment key={`months-${q.name}`}>
                                    {q.months.map(m => {
                                        return (
                                        <th key={m} colSpan={8} className={`text-center border-r border-b border-gray-300 text-xs font-semibold p-1 ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-white text-gray-800'}`}>
                                            <div className="flex items-center justify-center gap-1">
                                                {MONTH_NAMES[m]}
                                            </div>
                                        </th>
                                        )
                                    })}
                                    <th rowSpan={2} className={`border-r border-b border-gray-300 text-[10px] font-bold w-[100px] align-middle px-1 leading-tight ${isDarkMode ? 'bg-orange-900/50 text-gray-300' : 'bg-orange-100 text-gray-800'}`}>TOTAL TARGET TW</th>
                                    <th rowSpan={2} className={`border-r border-b border-gray-300 text-[10px] font-bold w-[100px] align-middle px-1 leading-tight ${isDarkMode ? 'bg-orange-900/50 text-gray-300' : 'bg-orange-100 text-gray-800'}`}>TOTAL REALISASI TW</th>
                                    <th rowSpan={2} className={`border-r border-b border-gray-300 text-[10px] font-bold w-[100px] align-middle px-1 leading-tight ${isDarkMode ? 'bg-orange-800/50 text-gray-300' : 'bg-orange-200 text-gray-800'}`}>SISA TW</th>
                                </React.Fragment>
                            ))}
                        </tr>
                        {/* HEADERS ROW 3 */}
                        <tr className="h-8">
                            {showSemula && (
                                <>
                                    <th className={`sticky z-[60] border-r border-b border-gray-300 text-xs p-1 ${isDarkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-700'}`} style={{ left: `${getSemulaOffset()}px`, width: `${volValWidth + volUnitWidth}px`, ...stickyHeaderGapStyle }} colSpan={2}>Vol</th>
                                    <th className={`sticky z-[60] border-r border-b border-gray-300 text-xs p-1 ${isDarkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-700'}`} style={{ left: `${getSemulaOffset() + volValWidth + volUnitWidth}px`, width: `${priceWidth}px` }}>Harga</th>
                                    <th className={`sticky z-[60] border-r border-b border-gray-300 text-xs p-1 ${isDarkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-700'}`} style={{ left: `${getSemulaOffset() + volValWidth + volUnitWidth + priceWidth}px`, width: `${totalWidth}px` }}>Total</th>
                                </>
                            )}
                            {showMenjadi && (
                                <>
                                    <th className={`sticky z-[60] border-r border-b border-gray-300 text-xs p-1 ${isDarkMode ? 'bg-yellow-900/50 text-gray-300' : 'bg-yellow-100 text-gray-800'}`} style={{ left: `${getMenjadiOffset()}px`, width: `${volValWidth + volUnitWidth}px`, ...stickyHeaderGapStyle }} colSpan={2}>Vol</th>
                                    <th className={`sticky z-[60] border-r border-b border-gray-300 text-xs p-1 ${isDarkMode ? 'bg-yellow-900/50 text-gray-300' : 'bg-yellow-100 text-gray-800'}`} style={{ left: `${getMenjadiOffset() + volValWidth + volUnitWidth}px`, width: `${priceWidth}px` }}>Harga</th>
                                    <th className={`sticky z-[60] border-r border-b border-gray-300 text-xs p-1 ${isDarkMode ? 'bg-yellow-900/50 text-gray-300' : 'bg-yellow-100 text-gray-800'}`} style={{ left: `${getMenjadiOffset() + volValWidth + volUnitWidth + priceWidth}px`, width: `${totalWidth}px` }}>Total</th>
                                </>
                            )}
                            {showSelisih && (
                                <th className={`sticky z-[60] border-r border-b border-gray-300 text-xs p-1 ${isDarkMode ? 'bg-orange-900/50 text-gray-300' : 'bg-orange-100 text-gray-800'}`} style={{ left: `${getSelisihOffset()}px`, width: `${selisihWidth}px`, ...stickyHeaderGapStyle }}>Nilai</th>
                            )}
                            {showEfisiensi && (
                                <>
                                    <th className={`sticky z-[60] border-r border-b border-gray-300 text-xs p-1 ${isDarkMode ? 'bg-emerald-900/50 text-gray-300' : 'bg-emerald-100 text-gray-800'}`} style={{ left: `${getEfisiensiOffset()}px`, width: `${efisiensiWidth}px`, ...stickyHeaderGapStyle }}>Total</th>
                                </>
                            )}
                            
                            {visibleQuarters.map(q => q.months.map(m => {
                                return (
                                <React.Fragment key={`headers-${m}`}>
                                    <th className={`border-r border-b border-gray-300 text-[9px] min-w-[80px] font-normal px-1 ${isDarkMode ? 'bg-pink-900/50 text-gray-300' : 'bg-pink-100 text-gray-800'}`}>Jml Realisasi</th>
                                    <th className={`border-r border-b border-gray-300 text-[9px] min-w-[80px] font-normal px-1 ${isDarkMode ? 'bg-pink-900/50 text-gray-300' : 'bg-pink-100 text-gray-800'}`}>Jml Akan Real</th>
                                    <th className={`border-r border-b border-gray-300 text-[9px] min-w-[90px] font-bold px-1 ${isDarkMode ? 'bg-pink-800/50 text-gray-300' : 'bg-pink-200 text-gray-800'}`}>TOTAL</th>
                                    <th className={`border-r border-b border-gray-300 text-[9px] min-w-[70px] font-normal px-1 ${isDarkMode ? 'bg-purple-900/50 text-gray-300' : 'bg-purple-100 text-gray-800'}`}>Tgl</th>
                                    <th className={`border-r border-b border-gray-300 text-[9px] min-w-[90px] font-normal px-1 ${isDarkMode ? 'bg-purple-900/50 text-gray-300' : 'bg-purple-100 text-gray-800'}`}>No. SPM</th>
                                    <th className={`border-r border-b border-gray-300 text-[9px] min-w-[30px] font-normal px-1 ${isDarkMode ? 'bg-cyan-900/50 text-gray-300' : 'bg-cyan-100 text-gray-800'}`}>Cek</th>
                                    <th className={`border-r border-b border-gray-300 text-[9px] min-w-[90px] font-normal px-1 ${isDarkMode ? 'bg-green-900/50 text-gray-300' : 'bg-green-100 text-gray-800'}`}>SP2D</th>
                                    <th className={`border-r border-b border-gray-300 text-[9px] min-w-[90px] font-normal px-1 ${isDarkMode ? 'bg-red-900/50 text-gray-300' : 'bg-red-100 text-gray-800'}`}>Selisih</th>
                                </React.Fragment>
                            )}))}
                        </tr>
                        </thead>
                        <tbody className={`${isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900'}`}>
                            {data.map(row => (
                                <BudgetRowItem 
                                key={row.id} 
                                row={row} 
                                onToggle={handleToggle} 
                                onSelect={handleRowSelect} 
                                onAddChild={(parent) => {
                                    setAddingChildTo(parent);
                                    setIsAddingRoot(false);
                                }}
                                onCopyRow={handleCopyRow}
                                onDeleteRow={handleDeleteRow}
                                level={0} 
                                showSemula={showSemula} 
                                showMenjadi={showMenjadi} 
                                showSelisih={showSelisih} 
                                showEfisiensi={showEfisiensi} 
                                visibleQuarters={visibleQuarters} 
                                offsets={offsets} 
                                widths={widths} 
                                theme={theme}
                                isRevisionMode={isRevisionMode}
                                isReadOnly={isOperatorLocked}
                                isDarkMode={isDarkMode}
                                />
                            ))}
                        </tbody>
                        
                        {/* FOOTER */}
                        <tfoot>
                            {/* ... (Footer content identical to previous version) ... */}
                            <tr className={`${isDarkMode ? 'bg-gray-700 border-gray-500' : 'bg-gray-200 border-gray-400'} border-t-2 font-bold text-[11px] ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                {/* Footer Content - STATIC POSITION (No Sticky) */}
                                <td className={footerFirstCellClass} style={{ width: '350px', minWidth: '350px', maxWidth: '350px' }}>
                                <div className="flex items-center h-full px-2 w-full">TOTAL KESELURUHAN</div>
                                </td>
                                {showSemula && (<><td className={footerStickyCellClass} style={{ left: `${getSemulaOffset()}px`, width: `${volValWidth}px` }}></td><td className={footerStickyCellClass} style={{ left: `${getSemulaOffset() + volValWidth}px`, width: `${volUnitWidth}px` }}></td><td className={footerStickyCellClass} style={{ left: `${getSemulaOffset() + volValWidth + volUnitWidth}px`, width: `${priceWidth}px` }}></td><td className={`text-right px-1 ${footerStickyCellClass}`} style={{ left: `${getSemulaOffset() + volValWidth + volUnitWidth + priceWidth}px`, width: `${totalWidth}px` }}>{formatCurrency(grandTotals.semula)}</td></>)}
                                {showMenjadi && (<><td className={footerStickyCellClass} style={{ left: `${getMenjadiOffset()}px`, width: `${volValWidth}px` }}></td><td className={footerStickyCellClass} style={{ left: `${getMenjadiOffset() + volValWidth}px`, width: `${volUnitWidth}px` }}></td><td className={footerStickyCellClass} style={{ left: `${getMenjadiOffset() + volValWidth + volUnitWidth}px`, width: `${priceWidth}px` }}></td><td className={`text-right px-1 ${footerStickyCellClass}`} style={{ left: `${getMenjadiOffset() + volValWidth + volUnitWidth + priceWidth}px`, width: `${totalWidth}px` }}>{formatCurrency(grandTotals.menjadi)}</td></>)}
                                {showSelisih && <td className={`text-right px-1 ${footerStickyCellClass}`} style={{ left: `${getSelisihOffset()}px`, width: `${selisihWidth}px` }}>{formatCurrency(grandTotals.selisih)}</td>}
                                {showEfisiensi && <td className={`text-right px-1 ${footerStickyCellClass}`} style={{ left: `${getEfisiensiOffset()}px`, width: '90px' }}>{formatCurrency(grandTotals.efficiency)}</td>}
                                {visibleQuarters.map(q => {
                                    let qRpd = 0; let qReal = 0;
                                    return (<React.Fragment key={`total-q-${q.name}`}>{q.months.map(m => {const mData = grandTotals.monthly[m];const gap = mData.total - mData.sp2d;qRpd += mData.rpd; qReal += mData.realization;return (<React.Fragment key={`total-m-${m}`}><td className={footerCellClass + " text-right px-1"}>{formatCurrency(mData.rpd)}</td><td className={footerCellClass + " text-right px-1"}>{formatCurrency(mData.realization)}</td><td className={footerCellClass + ` text-right px-1 font-bold ${isDarkMode ? 'bg-pink-900/50' : 'bg-pink-50'}`}>{formatCurrency(mData.total)}</td><td className={footerCellClass}></td><td className={footerCellClass}></td><td className={footerCellClass}></td><td className={footerCellClass + " text-right px-1"}>{formatCurrency(mData.sp2d)}</td><td className={footerCellClass + ` text-right px-1 ${gap !== 0 ? 'text-red-600' : ''}`}>{formatCurrency(gap)}</td></React.Fragment>)})}<td className={footerCellClass + ` text-right px-1 font-bold ${isDarkMode ? 'bg-orange-900/50' : 'bg-orange-200'}`}>{formatCurrency(qRpd)}</td><td className={footerCellClass + ` text-right px-1 font-bold ${isDarkMode ? 'bg-orange-900/50' : 'bg-orange-200'}`}>{formatCurrency(qReal)}</td><td className={footerCellClass + ` text-right px-1 font-bold ${isDarkMode ? 'bg-orange-900/50' : 'bg-orange-200'} ${(qRpd - qReal) !== 0 ? 'text-red-600' : 'text-green-700'}`}>{formatCurrency(qRpd - qReal)}</td></React.Fragment>)
                                })}
                            </tr>
                            
                            {/* Collapsible Analysis Row (NOT Sticky) */}
                            <tr className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} border-t border-gray-300`}>
                                <td className={analysisFirstCellClass} style={{ width: '350px', minWidth: '350px', maxWidth: '350px' }}>
                                <span className={`font-bold text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>ANALISIS BULANAN (OM SPAN)</span>
                                </td>
                                {showSemula && <td colSpan={4} className={analysisStickyCellClass} style={{ left: `${getSemulaOffset()}px`, minWidth: `${semulaWidth}px` }}></td>}
                                {showMenjadi && <td colSpan={4} className={analysisStickyCellClass} style={{ left: `${getMenjadiOffset()}px`, minWidth: `${menjadiWidth}px` }}></td>}
                                {showSelisih && <td colSpan={1} className={analysisStickyCellClass} style={{ left: `${getSelisihOffset()}px`, minWidth: `${selisihWidth}px` }}></td>}
                                {showEfisiensi && <td colSpan={1} className={analysisStickyCellClass} style={{ left: `${getEfisiensiOffset()}px`, minWidth: `${efisiensiWidth}px` }}></td>}
                                {visibleQuarters.map((q, qIndex) => (
                                    <React.Fragment key={`analysis-q-${q.name}`}>
                                        {q.months.map(m => (
                                            <td key={`analysis-m-${m}`} colSpan={8} className={analysisCellClass}>
                                                <div className="w-full relative">
                                                    <button onClick={() => toggleMonthAnalysis(m)} className={`w-full flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase transition-colors ${isDarkMode ? (expandedAnalysisMonths.includes(m) ? 'bg-blue-900/50 text-blue-300' : 'bg-gray-800 text-gray-400 hover:bg-gray-700') : (expandedAnalysisMonths.includes(m) ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}`}>
                                                        <span>Analisis {MONTH_NAMES[m]}</span>{expandedAnalysisMonths.includes(m) ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                                                    </button>
                                                    {expandedAnalysisMonths.includes(m) && (
                                                        <div className="absolute top-full left-0 right-0 p-1 animate-in fade-in slide-in-from-top-2 duration-200 z-[80] shadow-lg rounded-b-lg bg-transparent min-w-[500px]">
                                                            {renderAnalysisTable(m, 'month')}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        ))}
                                        <td colSpan={3} className={analysisCellClass}>
                                            <div className="w-full relative">
                                                <button onClick={() => toggleQuarterAnalysis(qIndex)} className={`w-full flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase transition-colors ${isDarkMode ? (expandedAnalysisQuarters.includes(qIndex) ? 'bg-orange-900/50 text-orange-300' : 'bg-gray-800 text-gray-400 hover:bg-gray-700') : (expandedAnalysisQuarters.includes(qIndex) ? 'bg-orange-100 text-orange-800' : 'bg-gray-200 text-gray-700 hover:bg-gray-300')}`}>
                                                    <span>Analisis {q.name}</span>{expandedAnalysisQuarters.includes(qIndex) ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                                                </button>
                                                {expandedAnalysisQuarters.includes(qIndex) && (
                                                    <div className="absolute top-full right-0 p-1 animate-in fade-in slide-in-from-top-2 duration-200 z-[80] shadow-lg bg-white border border-gray-300 min-w-[500px] rounded-b-lg">
                                                        {renderAnalysisTable(qIndex, 'quarter')}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </React.Fragment>
                                ))}
                            </tr>
                        </tfoot>
                    </table>
                    </div>
                )}
                </div>
            </div>
        );
    };

  return (
    <div className={`flex h-screen w-full overflow-hidden font-sans text-sm ${isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900'}`}>
      <Sidebar 
        currentView={currentView} 
        onChangeView={setCurrentView} 
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onOpenMasterData={() => setShowMasterDataModal(true)}
        isDarkMode={isDarkMode}
        userRole={user.role}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* OPERATOR NOTIFICATION BANNER */}
        {user.role === UserRole.OPERATOR && systemRevisionActive && (
            <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center justify-between animate-in slide-in-from-top duration-300 relative z-[90]">
                <div className="flex items-center gap-2 text-yellow-800">
                    <Bell className="animate-bounce text-yellow-600" size={18} />
                    <span className="font-bold">Perhatian:</span>
                    <span>Mode Revisi sedang aktif. PPK sedang melakukan perubahan anggaran. Data tampilan mungkin berubah sewaktu-waktu.</span>
                </div>
            </div>
        )}

        {/* ... Header and Content ... */}
        
        {/* Header Bar */}
        <header className={`h-16 border-b flex items-center justify-between px-6 flex-shrink-0 z-[90] ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
           {/* ... Header Content ... */}
           <div className="flex items-center gap-4">
              <h1 className="font-bold text-xl tracking-tight hidden md:block">Sistem Revisi & RPD</h1>
              {/* ... Rest of Header ... */}
              <div className="hidden md:flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full text-blue-700 text-xs font-semibold border border-blue-100">
                  <span>{user.role === UserRole.PPK ? "Pejabat Pembuat Komitmen" : "Operator Keuangan"}</span>
                  <span className="w-1 h-1 rounded-full bg-blue-400"></span>
                  <span>{user.fullName}</span>
              </div>
              <div className="h-6 w-px bg-gray-300 mx-2 hidden md:block"></div>
              
              <div className="relative" ref={viewMenuRef}>
                  <button 
                    onClick={() => setIsViewMenuOpen(!isViewMenuOpen)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md shadow-sm border transition-colors ${isViewMenuOpen ? 'bg-blue-50 border-blue-200 text-blue-700' : (isDarkMode ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' : 'bg-white border-gray-300 hover:bg-gray-50 text-gray-700')}`}
                  >
                    <Settings2 size={16}/>
                    <span className="font-medium">Tampilan</span>
                    {isViewMenuOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                  </button>
                  {/* ... View Menu Dropdown ... */}
                  {isViewMenuOpen && (
                      <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-[100] p-4 text-gray-800 animate-in fade-in zoom-in-95 duration-100">
                          {/* ... Content ... */}
                          <div className="flex items-center justify-between mb-4 pb-2 border-b">
                             <span className="font-bold text-sm">Kolom Data</span>
                          </div>
                          <div className="space-y-2">
                              <button onClick={() => setShowSemula(!showSemula)} className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-gray-50 rounded text-sm group"><span className="flex items-center gap-2"><div className={`w-3 h-3 rounded-full ${showSemula ? 'bg-gray-600' : 'bg-gray-300'}`}></div>Semula</span>{showSemula ? <Eye size={16} className="text-blue-600"/> : <EyeOff size={16} className="text-gray-400 group-hover:text-gray-600"/>}</button>
                              <button onClick={() => setShowMenjadi(!showMenjadi)} className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-gray-50 rounded text-sm group"><span className="flex items-center gap-2"><div className={`w-3 h-3 rounded-full ${showMenjadi ? 'bg-yellow-500' : 'bg-gray-300'}`}></div>Menjadi</span>{showMenjadi ? <Eye size={16} className="text-blue-600"/> : <EyeOff size={16} className="text-gray-400 group-hover:text-gray-600"/>}</button>
                              <button onClick={() => setShowSelisih(!showSelisih)} className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-gray-50 rounded text-sm group"><span className="flex items-center gap-2"><div className={`w-3 h-3 rounded-full ${showSelisih ? 'bg-orange-500' : 'bg-gray-300'}`}></div>Selisih</span>{showSelisih ? <Eye size={16} className="text-blue-600"/> : <EyeOff size={16} className="text-gray-400 group-hover:text-gray-600"/>}</button>
                              <button onClick={() => setShowEfisiensi(!showEfisiensi)} className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-gray-50 rounded text-sm group"><span className="flex items-center gap-2"><div className={`w-3 h-3 rounded-full ${showEfisiensi ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>Efisiensi</span>{showEfisiensi ? <Eye size={16} className="text-blue-600"/> : <EyeOff size={16} className="text-gray-400 group-hover:text-gray-600"/>}</button>
                          </div>
                          <div className="mt-4 pt-2 border-t">
                              <span className="font-bold text-sm block mb-2">Periode Triwulan</span>
                              <div className="grid grid-cols-2 gap-2">
                                  {QUARTERS.map((q, idx) => (
                                      <button key={q.name} onClick={() => toggleQuarterVisibility(idx)} className={`text-xs px-2 py-1 rounded border ${visibleQuarterIndices.includes(idx) ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-gray-50 text-gray-500'}`}>
                                          {q.name}
                                      </button>
                                  ))}
                              </div>
                          </div>
                      </div>
                  )}
              </div>
           </div>

           <div className="flex items-center gap-3">
               <button 
                  onClick={() => setIsDarkMode(!isDarkMode)} 
                  className={`p-2 rounded-full transition-colors ${isDarkMode ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  title={isDarkMode ? "Mode Terang" : "Mode Gelap"}
               >
                  {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
               </button>
               
               {/* ... Legend and Revision Button ... */}
               <div className="relative" ref={legendRef}>
                   <button 
                      onClick={() => setIsLegendOpen(!isLegendOpen)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm font-medium transition-colors ${isLegendOpen ? 'bg-blue-50 border-blue-200 text-blue-700' : (isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-gray-300 text-gray-700')}`}
                   >
                      <HelpCircle size={16}/>
                      <span className="hidden sm:inline">Legenda</span>
                   </button>
                    {/* ... Legend Content ... */}
                   {isLegendOpen && (
                        <div className="absolute top-full right-0 mt-1 z-[100] bg-white shadow-xl border border-gray-200 rounded-lg p-4 w-72 animate-in fade-in zoom-in-95 duration-100">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-bold text-gray-700">Legenda Status</span>
                                <button onClick={() => setIsLegendOpen(false)}><X size={14} className="text-gray-400 hover:text-gray-600"/></button>
                            </div>
                            <Legend />
                        </div>
                   )}
               </div>

               {/* REVISION MODE: ONLY FOR PPK */}
               {user.role === UserRole.PPK && (
                   isRevisionMode ? (
                       <div className="flex items-center gap-2 bg-yellow-50 px-3 py-1 rounded border border-yellow-200 animate-in fade-in slide-in-from-top-2">
                            <span className="text-yellow-700 text-xs font-bold uppercase tracking-wide flex items-center gap-1">
                                <Unlock size={14}/> Mode Revisi Aktif
                            </span>
                            <button 
                                onClick={handleOpenSnapshotModal}
                                className="ml-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-bold shadow-sm flex items-center gap-1"
                            >
                                <Archive size={14}/> Simpan Snapshot
                            </button>
                            <button 
                                onClick={toggleRevisionMode}
                                className="ml-1 text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-yellow-200"
                                title="Keluar Mode Revisi"
                            >
                                <X size={14}/>
                            </button>
                       </div>
                   ) : (
                       <button 
                            onClick={toggleRevisionMode}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm font-medium transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' : 'bg-white border-gray-300 hover:bg-gray-50 text-gray-700'}`}
                       >
                            <Lock size={16}/>
                            <span>Mode Revisi</span>
                       </button>
                   )
               )}

               <div className="h-6 w-px bg-gray-300 mx-2"></div>
               
               {/* Export Menu */}
               <div className="relative" ref={exportMenuRef}>
                    <button 
                        onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-md shadow-sm transition-colors text-sm font-medium"
                    >
                        {isExporting ? <Loader2 size={16} className="animate-spin"/> : <Download size={16}/>}
                        <span className="hidden sm:inline">Export</span>
                        <ChevronDown size={14}/>
                    </button>
                    {isExportMenuOpen && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-[100] p-1 text-gray-800">
                            <button onClick={() => handleExport('excel')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center gap-2">
                                <FileSpreadsheet size={16} className="text-green-600"/> Excel (.xlsx)
                            </button>
                            <button onClick={() => handleExport('pdf')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center gap-2">
                                <FileText size={16} className="text-red-600"/> PDF (.pdf)
                            </button>
                        </div>
                    )}
               </div>
           </div>
        </header>

        {/* MAIN CONTENT RENDER - Pass renderContent result */}
        {renderContent && renderContent()}

        {/* Modals & Overlays */}
        <BottomEditor 
            row={selectedRow} 
            section={selectedSection}
            monthIndex={selectedMonthIndex}
            onClose={closeEditor}
            onSave={handleUpdateRowWithConfirmation}
            masterData={masterData}
        />

        {(addingChildTo || isAddingRoot) && (
            <AddRowModal 
                parentRow={addingChildTo} 
                masterData={masterData}
                onClose={() => { setAddingChildTo(null); setIsAddingRoot(false); }}
                onSave={handleAddRow}
            />
        )}

        {showMasterDataModal && (
            <MasterDataModal 
                masterData={masterData}
                onAdd={handleAddMasterData}
                onEdit={handleEditMasterData}
                onDelete={handleDeleteMasterData}
                onClose={() => setShowMasterDataModal(false)}
                currentUserRole={user.role} // Pass current user role
                isDarkMode={isDarkMode}
            />
        )}

        {/* Snapshot Modal */}
        {showSnapshotModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className={`rounded-2xl shadow-2xl w-full max-w-md p-0 overflow-hidden border transform scale-100 animate-in zoom-in-95 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-100 text-gray-900'}`}>
                    
                    {/* Modal Header */}
                    <div className={`px-6 py-5 border-b flex items-center gap-4 ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-gray-50/80 border-gray-100'}`}>
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-xl shadow-sm">
                            <Archive size={24} />
                        </div>
                        <div>
                                <h3 className="font-bold text-lg leading-tight">Simpan Snapshot</h3>
                                <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Konfirmasi penyimpanan revisi anggaran</p>
                        </div>
                    </div>

                    {/* Modal Body */}
                    <div className="p-6">
                        <p className={`text-sm leading-relaxed mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            Tindakan ini akan menyimpan kondisi anggaran saat ini ke dalam riwayat revisi. 
                            Data <strong className="text-blue-500">"Menjadi"</strong> akan dijadikan data dasar <strong className="text-gray-500">"Semula"</strong> untuk revisi berikutnya.
                        </p>
                        
                        <div className="mb-2">
                            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ml-1 ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                                Catatan Revisi
                            </label>
                            <div className="relative group">
                                <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors ${isDarkMode ? 'text-slate-400 group-focus-within:text-blue-400' : 'text-gray-400 group-focus-within:text-blue-600'}`}>
                                    <Edit3 size={16} />
                                </div>
                                <input 
                                    type="text" 
                                    className={`w-full pl-10 pr-4 py-3 rounded-xl border outline-none text-sm font-medium transition-all shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${inputBgClass} ${inputBorderClass} ${inputTextClass} placeholder-gray-400`}
                                    placeholder="Contoh: Revisi POK Tahap 1..."
                                    value={snapshotNote}
                                    onChange={(e) => setSnapshotNote(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>
                    </div>

                    {/* Modal Footer */}
                    <div className={`px-6 py-4 flex justify-end gap-3 ${isDarkMode ? 'bg-slate-800/50 border-t border-slate-700' : 'bg-gray-50 border-t border-gray-100'}`}>
                        <button 
                            onClick={() => setShowSnapshotModal(false)} 
                            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-600 hover:bg-gray-200'}`}
                        >
                            Batal
                        </button>
                        <button 
                            onClick={handleConfirmSnapshot} 
                            disabled={isSaving} 
                            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center gap-2 font-bold shadow-lg shadow-blue-500/20 transition-transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                            Simpan Permanen
                        </button>
                    </div>
                </div>
            </div>
        )}

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
};