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
import RevisionHistory from './components/RevisionHistory'; // Import new component
import { Eye, EyeOff, Moon, Sun, Settings2, CheckSquare, Square, ChevronDown, ChevronUp, ArrowDown, ArrowUp, Loader2, AlertCircle, Save, Database, PlusCircle, HelpCircle, Lock, Unlock, Archive, X, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { MONTH_NAMES, QUARTERS, defaultTheme, formatCurrency, getAccountPrefix, formatPercent, recalculateBudget } from './utils';
import { api } from './api';
import { initialData } from './data';

export const App = () => {
  const [data, setData] = useState<BudgetRow[]>([]);
  // Use ref to track latest data for async callbacks
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
  
  // Visibility States
  const [showSemula, setShowSemula] = useState(true);
  const [showMenjadi, setShowMenjadi] = useState(true);
  const [showSelisih, setShowSelisih] = useState(true);
  const [showEfisiensi, setShowEfisiensi] = useState(true);
  
  // Grouped View Menu State
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  const viewMenuRef = useRef<HTMLDivElement>(null);

  // Export Menu State
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Legend/Hints State
  const [isLegendOpen, setIsLegendOpen] = useState(false);

  // Revision Mode State
  const [isRevisionMode, setIsRevisionMode] = useState(false);

  // Scroll & Ref
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(false);

  // Quarter Visibility State (Default: All visible)
  const [visibleQuarterIndices, setVisibleQuarterIndices] = useState<number[]>([0, 1, 2, 3]);
  
  // Analysis Toggle State
  const [expandedAnalysisMonths, setExpandedAnalysisMonths] = useState<number[]>([]);
  const [expandedAnalysisQuarters, setExpandedAnalysisQuarters] = useState<number[]>([]);

  // Navigation & View State
  const [currentView, setCurrentView] = useState<'table' | 'settings' | 'history'>('table');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showMasterDataModal, setShowMasterDataModal] = useState(false);

  // Snapshot Modal State (New)
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);
  const [snapshotNote, setSnapshotNote] = useState('');

  // Selection State for Bottom Sheet
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<'SEMULA' | 'MENJADI' | 'MONTHLY' | null>(null);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number | null>(null);

  // Add Row State
  const [addingChildTo, setAddingChildTo] = useState<BudgetRow | null>(null);
  const [isAddingRoot, setIsAddingRoot] = useState(false);

  // Confirmation Modal State
  const [confirmConfig, setConfirmConfig] = useState<{
      isOpen: boolean;
      title: string;
      message: string;
      onConfirm: () => void | Promise<void>;
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
        
        // Ensure data is recalculated upon load for consistency
        const processedBudget = recalculateBudget(fetchedBudget);
        setData(processedBudget);
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

  // --- EXPORT HANDLER ---
  const handleExport = async (format: 'excel' | 'pdf') => {
      setIsExportMenuOpen(false);
      setIsExporting(true);
      try {
          // Ensure we save current state first if changed? 
          // For now, backend exports what is in DB. Ideally we save first.
          // But to be safe, just call export.
          await api.exportBudget(format);
      } catch (e: any) {
          alert(e.message);
      } finally {
          setIsExporting(false);
      }
  };

  // --- CONFIRMATION HELPER ---
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

  // --- DATA SAVING WRAPPERS ---
  const handleSaveBudget = async (newData: BudgetRow[]) => {
      // Always recalculate hierarchy totals before saving
      const recalculatedData = recalculateBudget(newData);
      
      setData(recalculatedData); // Optimistic Update with calc
      setIsSaving(true);
      try {
        await api.saveBudget(recalculatedData); // Backend Sync
      } catch (e: any) {
        alert("Gagal menyimpan perubahan ke server: " + e.message);
      } finally {
        setIsSaving(false);
      }
  };

  // --- REVISION SNAPSHOT UI HANDLER ---
  const handleOpenSnapshotModal = () => {
      // Set default note
      setSnapshotNote(`Revisi ${new Date().toLocaleString('id-ID', { 
        day: 'numeric', 
        month: 'long', 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'Asia/Jakarta' 
      })}`);
      setShowSnapshotModal(true);
  };

  // --- ACTUAL SNAPSHOT SAVING LOGIC ---
  const handleConfirmSnapshot = async () => {
      if (!snapshotNote.trim()) {
          alert("Mohon isi catatan revisi.");
          return;
      }

      setIsSaving(true);
      try {
          if (!dataRef.current || dataRef.current.length === 0) {
              throw new Error("Tidak ada data untuk disimpan.");
          }
          
          // Call API
          await api.createRevision(snapshotNote, dataRef.current);
          
          // Close modal immediately
          setShowSnapshotModal(false);
          setIsSaving(false);

          // Show success and offer navigation
          setTimeout(() => {
             if (confirm("Snapshot revisi berhasil disimpan! Apakah Anda ingin melihat riwayat revisi sekarang?")) {
                 setCurrentView('history');
             }
          }, 100);

      } catch(e: any) {
          setIsSaving(false);
          alert("Gagal menyimpan snapshot: " + e.message);
      }
  };

  const handleRestoreRevision = (restoredData: BudgetRow[]) => {
      // 1. Update State
      setData(restoredData);
      // 2. Persist as current data
      handleSaveBudget(restoredData);
      // 3. Switch view back to table
      setCurrentView('table');
      alert("Data berhasil dipulihkan dan diset sebagai kondisi saat ini.");
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

  // --- CLICK OUTSIDE HANDLER FOR MENUS ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (viewMenuRef.current && !viewMenuRef.current.contains(event.target as Node)) {
        setIsViewMenuOpen(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
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
      const isRevisionUpdate = isRevisionMode;
      const title = isRevisionUpdate ? "Konfirmasi Revisi" : "Simpan Perubahan?";
      const message = isRevisionUpdate 
        ? "Anda dalam Mode Revisi. Apakah Anda yakin data Semula/Menjadi sudah benar dan ingin menyimpannya?" 
        : "Apakah Anda yakin ingin menyimpan perubahan pada data ini?";

      requestConfirmation(
          title,
          message,
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
          "Apakah Anda yakin ingin menambahkan data ini?",
          () => {
            let newData: BudgetRow[] = [];
            
            if (!parentId) {
               // Root addition
               newData = [...data, newRowData];
               setIsAddingRoot(false);
            } else {
               // Child addition
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
                setAddingChildTo(null);
            }

            handleSaveBudget(newData);
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

  // Style correction for Sticky Header Gaps (Dynamic based on theme)
  const headerBorderColor = isDarkMode ? '#4b5563' : '#d1d5db';
  const stickyHeaderGapStyle = { boxShadow: `-1px 0 0 0 ${headerBorderColor}` };

  // --- CALCULATE GRAND TOTALS AND ANALYSIS ---
  const { grandTotals, analysisData } = useMemo(() => {
      const totals = {
          semula: 0,
          menjadi: 0,
          selisih: 0,
          efficiency: 0,
          monthly: {} as Record<number, { rpd: number, realization: number, sp2d: number, total: number }>
      };

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
              
              if (row.children && row.children.length > 0) {
                  traverse(row.children);
              } else {
                  const sem = row.semula?.total || 0;
                  const men = row.menjadi?.total || 0;
                  totals.semula += sem;
                  totals.menjadi += men;
                  
                  // Accumulate Pagu for analysis
                  // Fix: Pagu bersih is calculated by excluding BLOCKED items
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
                  });
              }
          });
      };

      traverse(data);
      totals.efficiency = totals.semula - totals.menjadi;
      totals.selisih = totals.semula - totals.menjadi;

      return { grandTotals: totals, analysisData: analysis };
  }, [data]);

  const renderAnalysisTable = (index: number, type: 'month' | 'quarter') => {
      // (Implementation remains same as previous code)
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

    const renderSingleTable = (title: string, valueExtractor: (d: any) => number) => {
        const totalRow = calculateTotals(aggregatedData, valueExtractor);

        const renderRow = (label: string, data: { rpd: number, sp2d: number, realization: number, pagu: number }, isTotal = false) => {
            // Updated Logic based on specs
            const targetValue = valueExtractor(data);
            const pagu = data.pagu;
            const omSpan = data.sp2d;
            
            // % Target = (Target / Pagu) * 100
            const percentTarget = pagu > 0 ? (targetValue / pagu) * 100 : 0;
            
            // Margin 5%
            const marginMin = targetValue * 0.95;
            const marginMax = targetValue * 1.05;

            // Realisasi (SP2D)
            const realisasi = omSpan; 

            // Deviasi = Realisasi (SP2D) - Target
            const deviation = realisasi - targetValue;
            
            const devColor = deviation !== 0 ? 'bg-red-500 text-white' : 'bg-green-100 text-green-800';
            const textColorClass = isDarkMode ? 'text-gray-200' : 'text-gray-900';
            const bgClass = isTotal 
                ? (isDarkMode ? 'bg-gray-700' : 'bg-gray-100') 
                : (isDarkMode ? 'bg-gray-800' : 'bg-white');

            return (
                <tr className={`${isTotal ? 'font-bold' : ''} ${bgClass} border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} ${textColorClass}`}>
                    <td className="p-2 border-r text-left w-32 border-gray-300">{label}</td>
                    <td className="p-2 border-r text-right w-28 border-gray-300">{formatCurrency(targetValue)}</td>
                    <td className={`p-2 border-r text-right w-28 border-gray-300 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>{formatCurrency(omSpan)}</td>
                    <td className="p-2 border-r text-right w-28 border-gray-300">{formatCurrency(pagu)}</td>
                    <td className="p-2 border-r text-center w-16 border-gray-300">{percentTarget.toFixed(2)}%</td>
                    
                    {!isJan && (
                        <>
                            <td className="p-2 border-r text-right text-[10px] text-gray-500 w-24 border-gray-300 bg-gray-50">
                                {formatCurrency(marginMin)}
                            </td>
                            <td className="p-2 border-r text-right text-[10px] text-gray-500 w-24 border-gray-300 bg-gray-50">
                                {formatCurrency(marginMax)}
                            </td>
                            <td className="p-2 border-r text-right font-medium text-blue-700 w-28 border-gray-300">{formatCurrency(realisasi)}</td>
                            <td className={`p-2 text-right font-bold w-28 border-gray-300 ${devColor}`}>{formatCurrency(deviation)}</td>
                        </>
                    )}
                </tr>
            );
        };

        return (
            <div className={`p-2 text-xs border rounded shadow-sm ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'}`}>
                <div className={`font-bold mb-2 text-sm border-b pb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                    {title}
                </div>
                <table className="w-full text-xs border-collapse">
                    <thead className={`${isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-900'} font-bold`}>
                        <tr>
                            <th className="p-2 border border-gray-300 w-32">JENIS BELANJA</th>
                            <th className="p-2 border border-gray-300">TARGET</th>
                            <th className="p-2 border border-gray-300">OM SPAN</th>
                            <th className="p-2 border border-gray-300">PAGU</th>
                            <th className="p-2 border border-gray-300">% TARGET</th>
                            {!isJan && (
                                <>
                                    <th className="p-2 border border-gray-300" colSpan={2}>MARGIN 5% (Min - Max)</th>
                                    <th className="p-2 border border-gray-300">REALISASI</th>
                                    <th className="p-2 border border-gray-300">DEVIASI</th>
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
            </div>
        );
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
  };

  // Style constants for footer cells - NO STICKY (Static positioning)
  const footerCellClass = `border-r border-t border-gray-300 ${isDarkMode ? 'bg-gray-700 border-gray-500 text-gray-200' : 'bg-gray-200 border-gray-400 text-gray-800'} font-bold text-[11px]`;
  const footerStickyCellClass = `${footerCellClass} sticky z-[40]`;
  const footerFirstCellClass = `border-r border-t border-gray-300 px-2 h-10 align-middle w-[350px] min-w-[350px] max-w-[350px] ${isDarkMode ? 'bg-gray-700 border-gray-500 text-gray-200' : 'bg-gray-200 border-gray-400 text-gray-800'} font-bold sticky left-0 z-[40]`;
  
  const analysisCellClass = `border-r border-t border-gray-300 align-top ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50'}`;
  const analysisStickyCellClass = `${analysisCellClass} sticky z-[40]`;
  const analysisFirstCellClass = `border-r border-t border-gray-300 px-2 h-10 align-middle w-[350px] min-w-[350px] max-w-[350px] sticky left-0 z-[40] ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50'}`;

  // RENDER CONTENT SWITCH
  const renderContent = (): React.ReactNode => {
      if (currentView === 'settings') {
          return <div className="flex-1 overflow-auto"><Settings theme={theme} onUpdateTheme={handleSaveTheme} onReset={() => handleSaveTheme(defaultTheme)} /></div>;
      }
      if (currentView === 'history') {
          return <div className="flex-1 overflow-auto"><RevisionHistory isDarkMode={isDarkMode} onRestore={handleRestoreRevision} /></div>;
      }
      
      // TABLE VIEW (SAME AS BEFORE)
      return (
          <div ref={tableContainerRef} className="flex-1 overflow-auto relative w-full pb-20 scroll-smooth">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full border-separate border-spacing-0">
                <thead className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} top-0 sticky z-[60]`}>
                  {/* Headers */}
                  <tr className="h-12">
                    <th className="sticky left-0 z-[70] bg-blue-700 text-white border-r border-b border-blue-600 px-4 w-[350px] min-w-[350px] max-w-[350px]" style={{ width: '350px', minWidth: '350px', maxWidth: '350px' }} rowSpan={3}>
                        <div className="flex items-center justify-between">
                            <span>Kode / Uraian</span>
                            <button 
                                onClick={() => setIsAddingRoot(true)} 
                                className="bg-blue-600 hover:bg-blue-500 text-white rounded-full p-1 transition-colors"
                                title="Tambah Satuan Kerja (Root)"
                            >
                                <PlusCircle size={16} />
                            </button>
                        </div>
                    </th>
                    {showSemula && <th className="sticky z-[60] bg-gray-700 text-white border-r border-b border-gray-600 text-center" style={{ left: `${getSemulaOffset()}px`, minWidth: `${semulaWidth}px`, ...stickyHeaderGapStyle }} colSpan={4} rowSpan={2}>SEMULA</th>}
                    {showMenjadi && <th className="sticky z-[60] bg-yellow-600 text-white border-r border-b border-yellow-500 text-center" style={{ left: `${getMenjadiOffset()}px`, minWidth: `${menjadiWidth}px`, ...stickyHeaderGapStyle }} colSpan={4} rowSpan={2}>MENJADI</th>}
                    {showSelisih && <th className="sticky z-[60] bg-orange-600 text-white border-r border-b border-orange-500 text-center" style={{ left: `${getSelisihOffset()}px`, minWidth: `${selisihWidth}px`, ...stickyHeaderGapStyle }} colSpan={1} rowSpan={2}>SELISIH</th>}
                    {showEfisiensi && <th className="sticky z-[60] bg-emerald-600 text-white border-r border-b border-emerald-500 text-center" style={{ left: `${getEfisiensiOffset()}px`, minWidth: `${efisiensiWidth}px`, ...stickyHeaderGapStyle }} colSpan={2} rowSpan={2}>EFISIENSI ANGGARAN</th>}
                    {visibleQuarters.map((q, idx) => <th key={q.name} colSpan={(q.months.length * 8) + 3} className={`text-center border-r border-b border-gray-300 text-sm font-bold ${isDarkMode ? 'bg-gray-700 text-gray-200' : 'text-gray-900'} ${idx % 2 === 0 ? (isDarkMode ? 'bg-purple-900/50' : 'bg-purple-100') : (isDarkMode ? 'bg-blue-900/50' : 'bg-blue-100')}`}>{q.name}</th>)}
                  </tr>
                  <tr className="h-10">
                    {visibleQuarters.map((q, idx) => (<React.Fragment key={`months-${q.name}`}>{q.months.map(m => (<th key={m} colSpan={8} className={`text-center border-r border-b border-gray-300 text-xs font-semibold p-1 ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-white text-gray-800'}`}>{MONTH_NAMES[m]}</th>))}<th rowSpan={2} className={`border-r border-b border-gray-300 text-[10px] font-bold w-[100px] align-middle px-1 leading-tight ${isDarkMode ? 'bg-orange-900/50 text-gray-300' : 'bg-orange-100 text-gray-800'}`}>TOTAL TARGET TW</th><th rowSpan={2} className={`border-r border-b border-gray-300 text-[10px] font-bold w-[100px] align-middle px-1 leading-tight ${isDarkMode ? 'bg-orange-900/50 text-gray-300' : 'bg-orange-100 text-gray-800'}`}>TOTAL REALISASI TW</th><th rowSpan={2} className={`border-r border-b border-gray-300 text-[10px] font-bold w-[100px] align-middle px-1 leading-tight ${isDarkMode ? 'bg-orange-800/50 text-gray-300' : 'bg-orange-200 text-gray-800'}`}>SISA TW</th></React.Fragment>))}
                  </tr>
                  <tr className="h-8">
                     {/* Subheaders */}
                     {showSemula && <><th className={`sticky z-[60] border-r border-b border-gray-300 text-xs p-1 ${isDarkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-700'}`} style={{ left: `${getSemulaOffset()}px`, width: `${volValWidth + volUnitWidth}px`, ...stickyHeaderGapStyle }} colSpan={2}>Vol</th><th className={`sticky z-[60] border-r border-b border-gray-300 text-xs p-1 ${isDarkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-700'}`} style={{ left: `${getSemulaOffset() + volValWidth + volUnitWidth}px`, width: `${priceWidth}px` }}>Harga</th><th className={`sticky z-[60] border-r border-b border-gray-300 text-xs p-1 ${isDarkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-700'}`} style={{ left: `${getSemulaOffset() + volValWidth + volUnitWidth + priceWidth}px`, width: `${totalWidth}px` }}>Total</th></>}
                     {showMenjadi && <><th className={`sticky z-[60] border-r border-b border-gray-300 text-xs p-1 ${isDarkMode ? 'bg-yellow-900/50 text-gray-300' : 'bg-yellow-100 text-gray-800'}`} style={{ left: `${getMenjadiOffset()}px`, width: `${volValWidth + volUnitWidth}px`, ...stickyHeaderGapStyle }} colSpan={2}>Vol</th><th className={`sticky z-[60] border-r border-b border-gray-300 text-xs p-1 ${isDarkMode ? 'bg-yellow-900/50 text-gray-300' : 'bg-yellow-100 text-gray-800'}`} style={{ left: `${getMenjadiOffset() + volValWidth + volUnitWidth}px`, width: `${priceWidth}px` }}>Harga</th><th className={`sticky z-[60] border-r border-b border-gray-300 text-xs p-1 ${isDarkMode ? 'bg-yellow-900/50 text-gray-300' : 'bg-yellow-100 text-gray-800'}`} style={{ left: `${getMenjadiOffset() + volValWidth + volUnitWidth + priceWidth}px`, width: `${totalWidth}px` }}>Total</th></>}
                     {showSelisih && <th className={`sticky z-[60] border-r border-b border-gray-300 text-xs p-1 ${isDarkMode ? 'bg-orange-900/50 text-gray-300' : 'bg-orange-100 text-gray-800'}`} style={{ left: `${getSelisihOffset()}px`, width: `${selisihWidth}px`, ...stickyHeaderGapStyle }}>Nilai</th>}
                     {showEfisiensi && <><th className={`sticky z-[60] border-r border-b border-gray-300 text-xs p-1 ${isDarkMode ? 'bg-emerald-900/50 text-gray-300' : 'bg-emerald-100 text-gray-800'}`} style={{ left: `${getEfisiensiOffset()}px`, width: '90px', ...stickyHeaderGapStyle }}>Rincian</th><th className={`sticky z-[60] border-r border-b border-gray-300 text-xs p-1 ${isDarkMode ? 'bg-emerald-900/50 text-gray-300' : 'bg-emerald-100 text-gray-800'}`} style={{ left: `${getEfisiensiOffset() + 90}px`, width: '90px' }}>Total</th></>}
                     {visibleQuarters.map(q => q.months.map(m => (<React.Fragment key={`headers-${m}`}><th className={`border-r border-b border-gray-300 text-[9px] min-w-[80px] font-normal px-1 ${isDarkMode ? 'bg-pink-900/50 text-gray-300' : 'bg-pink-100 text-gray-800'}`}>Jml Realisasi</th><th className={`border-r border-b border-gray-300 text-[9px] min-w-[80px] font-normal px-1 ${isDarkMode ? 'bg-pink-900/50 text-gray-300' : 'bg-pink-100 text-gray-800'}`}>Jml Akan Real</th><th className={`border-r border-b border-gray-300 text-[9px] min-w-[90px] font-bold px-1 ${isDarkMode ? 'bg-pink-800/50 text-gray-300' : 'bg-pink-200 text-gray-800'}`}>TOTAL</th><th className={`border-r border-b border-gray-300 text-[9px] min-w-[70px] font-normal px-1 ${isDarkMode ? 'bg-purple-900/50 text-gray-300' : 'bg-purple-100 text-gray-800'}`}>Tgl</th><th className={`border-r border-b border-gray-300 text-[9px] min-w-[90px] font-normal px-1 ${isDarkMode ? 'bg-purple-900/50 text-gray-300' : 'bg-purple-100 text-gray-800'}`}>No. SPM</th><th className={`border-r border-b border-gray-300 text-[9px] min-w-[30px] font-normal px-1 ${isDarkMode ? 'bg-cyan-900/50 text-gray-300' : 'bg-cyan-100 text-gray-800'}`}>Cek</th><th className={`border-r border-b border-gray-300 text-[9px] min-w-[90px] font-normal px-1 ${isDarkMode ? 'bg-green-900/50 text-gray-300' : 'bg-green-100 text-gray-800'}`}>SP2D</th><th className={`border-r border-b border-gray-300 text-[9px] min-w-[90px] font-normal px-1 ${isDarkMode ? 'bg-red-900/50 text-gray-300' : 'bg-red-100 text-gray-800'}`}>Selisih</th></React.Fragment>)))}
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
                      isRevisionMode={isRevisionMode}
                      isDarkMode={isDarkMode}
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

                {/* Footer */}
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
                        {showEfisiensi && (<><td className={`text-right px-1 ${footerStickyCellClass}`} style={{ left: `${getEfisiensiOffset()}px`, width: '90px' }}>{formatCurrency(grandTotals.efficiency)}</td><td className={`text-right px-1 ${footerStickyCellClass}`} style={{ left: `${getEfisiensiOffset() + 90}px`, width: '90px' }}>{formatCurrency(grandTotals.efficiency)}</td></>)}
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
                        {showEfisiensi && <td colSpan={2} className={analysisStickyCellClass} style={{ left: `${getEfisiensiOffset()}px`, minWidth: `${efisiensiWidth}px` }}></td>}
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
          </div>
      );
  };

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
            <div className="flex justify-between items-center mb-0">
                <div>
                <h1 className={`text-xl font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-900'}`}>
                    Sistem Revisi & RPD
                    {isSaving && <span className="ml-3 text-xs font-normal text-green-600 animate-pulse flex inline-flex items-center gap-1"><Loader2 size={10} className="animate-spin"/> Menyimpan...</span>}
                    {isRevisionMode && <span className="ml-3 text-xs font-bold text-white bg-orange-600 px-2 py-0.5 rounded animate-pulse">MODE REVISI AKTIF</span>}
                </h1>
                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-xs mt-1`}>Satuan Kerja: BPS Kota Gunungsitoli</p>
                </div>
                <div className="flex items-center gap-3">

                    {/* UNDUH / EXPORT BUTTON */}
                    {currentView === 'table' && (
                        <div className="relative" ref={exportMenuRef}>
                            <button 
                                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                                disabled={isExporting}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm border ${isDarkMode ? 'bg-green-900 text-green-200 border-green-700 hover:bg-green-800' : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'} ${isExporting ? 'opacity-70 cursor-wait' : ''}`}
                                title="Unduh Data Anggaran"
                            >
                                {isExporting ? <Loader2 size={14} className="animate-spin"/> : <Download size={14} />}
                                {isExporting ? 'Mengunduh...' : 'Unduh'}
                            </button>
                            {isExportMenuOpen && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-[100] p-1 animate-in fade-in zoom-in-95 duration-100 text-gray-800">
                                    <button onClick={() => handleExport('excel')} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-green-50 rounded text-sm group text-left">
                                        <div className="p-1 bg-green-100 rounded text-green-700"><FileSpreadsheet size={16}/></div>
                                        <span className="text-gray-700 group-hover:text-green-800 font-medium">Format Excel</span>
                                    </button>
                                    <button onClick={() => handleExport('pdf')} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-red-50 rounded text-sm group text-left">
                                        <div className="p-1 bg-red-100 rounded text-red-700"><FileText size={16}/></div>
                                        <span className="text-gray-700 group-hover:text-red-800 font-medium">Format PDF</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* SAVE SNAPSHOT BUTTON (Only visible in Revision Mode) */}
                    {isRevisionMode && (
                        <button 
                            onClick={handleOpenSnapshotModal}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm border ${isDarkMode ? 'bg-blue-900 text-blue-200 border-blue-700 hover:bg-blue-800' : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'}`}
                            title="Simpan kondisi saat ini ke riwayat"
                        >
                            <Archive size={14} />
                            Simpan Snapshot
                        </button>
                    )}

                    {/* REVISION MODE TOGGLE */}
                     <button 
                        onClick={() => setIsRevisionMode(!isRevisionMode)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm border ${isRevisionMode 
                            ? 'bg-orange-600 text-white border-orange-700 hover:bg-orange-700' 
                            : (isDarkMode ? 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200')}`}
                        title={isRevisionMode ? "Matikan Mode Revisi" : "Aktifkan Mode Revisi"}
                    >
                        {isRevisionMode ? <Lock size={14} /> : <Unlock size={14} />}
                        {isRevisionMode ? "Mode Revisi ON" : "Mode Revisi OFF"}
                    </button>

                    {/* HINTS POPUP */}
                    <div 
                        className="relative"
                        onMouseEnter={() => setIsLegendOpen(true)}
                        onMouseLeave={() => setIsLegendOpen(false)}
                    >
                        <button 
                            className={`p-2 rounded-full ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'} hover:bg-blue-100 hover:text-blue-600 transition-all`}
                            onClick={() => setIsLegendOpen(!isLegendOpen)}
                            title="Keterangan Warna"
                        >
                            <HelpCircle size={18} />
                        </button>
                        
                        {(isLegendOpen) && (
                            <div className="absolute right-0 top-full pt-2 w-72 z-[100] animate-in fade-in zoom-in-95 duration-200">
                                <div className="bg-white shadow-xl rounded-lg p-3 border border-gray-200 relative">
                                    <Legend />
                                    <div className="absolute -top-1.5 right-4 w-3 h-3 bg-white border-t border-l border-gray-200 transform rotate-45"></div>
                                </div>
                            </div>
                        )}
                    </div>

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
            {/* Legend removed from here */}
        </div>

        {renderContent()}
        
        {/* Pass Confirmation Wrapped Function to Editor */}
        <BottomEditor 
            row={selectedRow} 
            section={selectedSection} 
            monthIndex={selectedMonthIndex} 
            onClose={closeEditor} 
            onSave={handleUpdateRowWithConfirmation}
        />
        {/* Render AddRowModal either for child (addingChildTo) or root (isAddingRoot) */}
        {(addingChildTo || isAddingRoot) && (
            <AddRowModal 
                parentRow={addingChildTo} // Will be null if isAddingRoot is true
                masterData={masterData} 
                onClose={() => {
                    setAddingChildTo(null);
                    setIsAddingRoot(false);
                }} 
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

        {/* --- CUSTOM SNAPSHOT MODAL (Replaces native prompt) --- */}
        {showSnapshotModal && (
            <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className={`rounded-lg shadow-xl w-full max-w-sm overflow-hidden ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
                    <div className={`flex justify-between items-center p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <h3 className={`font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>Simpan Snapshot Revisi</h3>
                        <button onClick={() => setShowSnapshotModal(false)} className={`${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>
                            <X size={20} />
                        </button>
                    </div>
                    <div className="p-6">
                         <p className={`text-sm mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            Masukkan label/catatan untuk snapshot ini agar mudah dikenali di riwayat (Contoh: "Revisi POK 1 - Final").
                         </p>
                         <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Catatan Revisi</label>
                         <input 
                            type="text" 
                            className={`w-full border rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
                            placeholder="Contoh: Revisi POK 1"
                            value={snapshotNote}
                            onChange={(e) => setSnapshotNote(e.target.value)}
                            autoFocus
                         />
                    </div>
                    <div className={`p-4 border-t flex justify-end gap-2 ${isDarkMode ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                        <button 
                            onClick={() => setShowSnapshotModal(false)}
                            disabled={isSaving}
                            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-200'}`}
                        >
                            Batal
                        </button>
                        <button 
                            onClick={handleConfirmSnapshot}
                            disabled={isSaving}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors flex items-center gap-2"
                        >
                            {isSaving ? (
                                <><Loader2 size={16} className="animate-spin" /> Menyimpan...</>
                            ) : (
                                <><Save size={16} /> Simpan Snapshot</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};