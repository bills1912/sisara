import React, { useState, useCallback, useMemo } from 'react';
import { initialData } from './data';
import { BudgetRow, ThemeConfig, ChangeStatus, RowType } from './types';
import BudgetRowItem from './components/BudgetRowItem';
import Legend from './components/Legend';
import Sidebar from './components/Sidebar';
import Settings from './components/Settings';
import BottomEditor from './components/BottomEditor';
import AddRowModal from './components/AddRowModal';
import { Eye, EyeOff, Moon, Sun, TrendingUp, Calendar, CheckSquare, Square, ChevronDown, ChevronUp } from 'lucide-react';
import { MONTH_NAMES, QUARTERS, defaultTheme, formatCurrency, getAccountPrefix, formatPercent } from './utils';

function App() {
  const [data, setData] = useState<BudgetRow[]>(initialData);
  const [showSemula, setShowSemula] = useState(true);
  const [showMenjadi, setShowMenjadi] = useState(true);
  const [showEfisiensi, setShowEfisiensi] = useState(true);
  
  // Quarter Visibility State (Default: All visible)
  const [visibleQuarterIndices, setVisibleQuarterIndices] = useState<number[]>([0, 1, 2, 3]);
  const [isQuarterMenuOpen, setIsQuarterMenuOpen] = useState(false);
  
  // Analysis Toggle State
  const [expandedAnalysisMonths, setExpandedAnalysisMonths] = useState<number[]>([]);
  const [expandedAnalysisQuarters, setExpandedAnalysisQuarters] = useState<number[]>([]);

  // Navigation & View State
  const [currentView, setCurrentView] = useState<'table' | 'settings'>('table');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<ThemeConfig>(defaultTheme);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Selection State for Bottom Sheet
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<'SEMULA' | 'MENJADI' | 'MONTHLY' | null>(null);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number | null>(null);

  // Add Row State
  const [addingChildTo, setAddingChildTo] = useState<BudgetRow | null>(null);

  // Helper to find row by ID recursively
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

  // Deep update function
  const updateRow = useCallback((id: string, updatedFields: Partial<BudgetRow>) => {
    setData(prevData => {
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
      return updateRecursive(prevData);
    });
  }, []);

  const handleAddRow = (parentId: string, newRowData: BudgetRow) => {
    setData(prevData => {
      const addRecursive = (rows: BudgetRow[]): BudgetRow[] => {
        return rows.map(row => {
          if (row.id === parentId) {
            return {
              ...row,
              isOpen: true, // Auto open parent
              children: [...row.children, newRowData]
            };
          }
          if (row.children && row.children.length > 0) {
            return { ...row, children: addRecursive(row.children) };
          }
          return row;
        });
      };
      return addRecursive(prevData);
    });
    setAddingChildTo(null);
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
    const newRow = deepCopy(rowToCopy);
    setData(prevData => {
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
      return insertRecursive(prevData);
    });
  }, []);

  const handleDeleteRow = useCallback((rowId: string) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus baris ini beserta seluruh rincian di bawahnya?")) {
      return;
    }
    setData(prevData => {
      const deleteRecursive = (rows: BudgetRow[]): BudgetRow[] => {
        const filtered = rows.filter(r => r.id !== rowId);
        return filtered.map(r => {
          if (r.children && r.children.length > 0) {
            return { ...r, children: deleteRecursive(r.children) };
          }
          return r;
        });
      };
      return deleteRecursive(prevData);
    });
    if (selectedRowId === rowId) {
        closeEditor();
    }
  }, [selectedRowId]);

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

  const handleToggle = (id: string) => {
    const row = findRowById(data, id);
    if (row) {
        updateRow(id, { isOpen: !row.isOpen });
    }
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

  // Filter actual quarter objects based on indices
  const visibleQuarters = useMemo(() => {
    return QUARTERS.filter((_, index) => visibleQuarterIndices.includes(index));
  }, [visibleQuarterIndices]);

  // Calculate sticky offsets
  const descWidth = 350;
  const semulaWidth = 300; 
  const menjadiWidth = 350;
  const efisiensiWidth = 200;

  const getSemulaOffset = () => descWidth;
  const getMenjadiOffset = () => descWidth + (showSemula ? semulaWidth : 0);
  const getEfisiensiOffset = () => descWidth + (showSemula ? semulaWidth : 0) + (showMenjadi ? menjadiWidth : 0);

  // --- CALCULATE GRAND TOTALS AND ANALYSIS ---
  const { grandTotals, analysisTotals, analysisQuarterTotals } = useMemo(() => {
      const totals = {
          semula: 0,
          menjadi: 0,
          efficiency: 0,
          monthly: {} as Record<number, { rpd: number, realization: number, sp2d: number }>
      };

      // Aggregates for 51, 52, 53 per month
      const analysis: Record<string, Record<number, { rpd: number, realization: number, pagu: number }>> = {
          '51': {}, '52': {}, '53': {}
      };

      // Aggregates for 51, 52, 53 per Quarter
      const analysisQuarter: Record<string, Record<number, { rpd: number, realization: number, pagu: number }>> = {
          '51': {}, '52': {}, '53': {}
      };

      // Initialize slots
      ['51', '52', '53'].forEach(prefix => {
          // Months
          for(let i=0; i<12; i++) {
              analysis[prefix][i] = { rpd: 0, realization: 0, pagu: 0 };
          }
          // Quarters
          for(let i=0; i<4; i++) {
              analysisQuarter[prefix][i] = { rpd: 0, realization: 0, pagu: 0 };
          }
      });

      // Init monthly totals for simple footer
      for(let i=0; i<12; i++) {
          totals.monthly[i] = { rpd: 0, realization: 0, sp2d: 0 };
      }

      // Recursively sum up LEAF nodes
      const traverse = (rows: BudgetRow[]) => {
          rows.forEach(row => {
              if (row.children && row.children.length > 0) {
                  traverse(row.children);
              } else {
                  // Leaf node logic for GRAND TOTAL
                  if (row.semula) totals.semula += (row.semula.total || 0);
                  if (row.menjadi) totals.menjadi += (row.menjadi.total || 0);
                  
                  // Get Prefix for Analysis
                  const prefix = getAccountPrefix(row.code);
                  
                  // Total Pagu for this row (yearly)
                  const rowPagu = row.menjadi?.total || 0;

                  // Add Pagu to Quarter Analysis (Constant per row)
                  if (['51', '52', '53'].includes(prefix)) {
                      for(let q=0; q<4; q++) {
                          analysisQuarter[prefix][q].pagu += rowPagu;
                      }
                  }

                  // Monthly & Calculation for Quarter Aggregates
                  Object.entries(row.monthlyAllocation).forEach(([mStr, val]) => {
                      const m = parseInt(mStr);
                      // Simple Footer
                      if (totals.monthly[m]) {
                          totals.monthly[m].rpd += (val.rpd || 0);
                          totals.monthly[m].realization += (val.realization || 0);
                          totals.monthly[m].sp2d += (val.sp2d || 0);
                      }

                      // Analysis Accumulation (only if 51, 52, 53)
                      if (['51', '52', '53'].includes(prefix)) {
                          // Monthly Analysis
                          analysis[prefix][m].rpd += (val.rpd || 0);
                          analysis[prefix][m].realization += (val.realization || 0);
                          analysis[prefix][m].pagu += rowPagu; // Note: Existing logic kept

                          // Quarter Analysis
                          const qIdx = QUARTERS.findIndex(q => q.months.includes(m));
                          if (qIdx !== -1) {
                              analysisQuarter[prefix][qIdx].rpd += (val.rpd || 0);
                              analysisQuarter[prefix][qIdx].realization += (val.realization || 0);
                              // Pagu added earlier outside loop
                          }
                      }
                  });
              }
          });
      };

      traverse(data);
      totals.efficiency = totals.semula - totals.menjadi;

      return { grandTotals: totals, analysisTotals: analysis, analysisQuarterTotals: analysisQuarter };
  }, [data]);

  const renderAnalysisTable = (index: number, type: 'month' | 'quarter') => {
    const prefixes = ['51', '52', '53'];
    const isJanuary = type === 'month' && index === 0;

    // Helper to calculate row data
    const getRowData = (prefix: string) => {
        if (type === 'month') {
            return analysisTotals[prefix][index];
        } else {
            return analysisQuarterTotals[prefix][index];
        }
    };

    const total51 = getRowData('51');
    const total52 = getRowData('52');
    const total53 = getRowData('53');
    
    const sumAll = {
        rpd: total51.rpd + total52.rpd + total53.rpd,
        realization: total51.realization + total52.realization + total53.realization,
        pagu: total51.pagu + total52.pagu + total53.pagu,
    };

    const renderSectionRows = (sectionTitle: string) => {
        const rows = [
            { label: 'JUMLAH 51', data: total51, prefix: '51' },
            { label: 'JUMLAH 52', data: total52, prefix: '52' },
            { label: 'JUMLAH 53', data: total53, prefix: '53' },
            { label: 'TOTAL', data: sumAll, prefix: 'TOTAL' }
        ];

        return rows.map((r, idx) => {
            const valueToDisplay = sectionTitle === 'Jumlah Realisasi' ? r.data.realization : r.data.rpd;
            const omSpan = 0; // Placeholder
            const pagu = r.data.pagu;
            const pct = pagu > 0 ? valueToDisplay / pagu : 0;
            const marginMin = valueToDisplay * 0.95;
            const marginMax = valueToDisplay * 1.05;
            const realVal = r.data.realization;
            // Deviation logic: Realization - Target. Only valid if we are comparing RPD (target) vs Real
            const deviation = realVal - valueToDisplay; 

            // FORCE text-gray-900 for general cells to be visible on light background
            const borderClass = "border border-black px-1 text-right text-gray-900"; 

            return (
                <tr key={r.label} className="text-[10px]">
                    <td className="bg-orange-100 border border-black px-2 font-semibold text-left whitespace-nowrap text-gray-900">{r.label}</td>
                    
                    {/* TARGET */}
                    <td className={`${borderClass} ${sectionTitle === 'TOTAL per Bulan' ? 'bg-green-400 font-bold text-gray-900' : 'bg-white'}`}>
                        {formatCurrency(valueToDisplay)}
                    </td>
                    
                    {/* OM SPAN (Dark BG) */}
                    <td className="border border-black px-1 text-right bg-gray-600 text-white">{formatCurrency(omSpan)}</td>
                    
                    {/* PAGU (Dark BG, White Text - matching screenshot) */}
                    <td className="border border-black px-1 text-right bg-slate-700 text-white">{formatCurrency(pagu)}</td>
                    
                    {/* % TARGET */}
                    <td className={`${borderClass} text-center bg-white`}>{formatPercent(pct)}</td>

                    {/* MARGIN & REALISASI & DEVIASI (Hidden in Jan) */}
                    {!isJanuary && (
                        <>
                            <td className={`${borderClass} bg-white`}>{formatCurrency(marginMin)}</td>
                            <td className={`${borderClass} bg-white`}>{formatCurrency(marginMax)}</td>
                            
                            {/* REALISASI */}
                            <td className={`border border-black px-1 text-right ${sectionTitle === 'TOTAL per Bulan' ? 'bg-teal-500 text-white font-bold' : 'bg-white text-gray-900'}`}>
                                {sectionTitle === 'TOTAL per Bulan' ? formatCurrency(realVal) : ''}
                            </td>

                            {/* DEVIASI */}
                            <td className={`border border-black px-1 text-right ${deviation > 0 ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                                {sectionTitle === 'TOTAL per Bulan' ? formatCurrency(deviation) : ''}
                            </td>
                        </>
                    )}
                </tr>
            );
        });
    };

    return (
        <div className="p-2 bg-gray-100 overflow-x-auto text-gray-900 min-w-[500px]">
            <div className="inline-block min-w-full">
            
            {/* Table 1: Jumlah Realisasi */}
            <div className="flex gap-4 mb-2">
                <div className="w-[120px] pt-6 font-bold text-[10px] text-gray-800">Jumlah Realisasi</div>
                <table className="border-collapse border border-black text-[10px] text-gray-900 flex-1">
                   <thead>
                       <tr className="font-bold text-center bg-gray-50">
                           <th className="border border-black px-1 min-w-[100px]">TARGET</th>
                           <th className="border border-black px-1 min-w-[80px]">OM SPAN</th>
                           <th className="border border-black px-1 min-w-[100px]">PAGU</th>
                           <th className="border border-black px-1 min-w-[60px]">% TARGET</th>
                           {!isJanuary && (
                               <>
                                <th className="border border-black px-1 min-w-[100px]" colSpan={2}>MARGIN 5%</th>
                                <th className="border border-black px-1 min-w-[100px]">REALISASI</th>
                                <th className="border border-black px-1 min-w-[100px]">DEVIASI</th>
                               </>
                           )}
                       </tr>
                   </thead>
                   <tbody>
                       {renderSectionRows('Jumlah Realisasi')}
                   </tbody>
                </table>
            </div>

            {/* Table 2: Jumlah akan Direalisasikan */}
            <div className="flex gap-4 mb-2">
                <div className="w-[120px] pt-6 font-bold text-[10px] text-gray-800">Jumlah akan Direalisasikan</div>
                <table className="border-collapse border border-black text-[10px] text-gray-900 flex-1">
                   <thead>
                       <tr className="font-bold text-center bg-gray-50">
                           <th className="border border-black px-1 min-w-[100px] bg-yellow-300 text-gray-900">TARGET</th>
                           <th className="border border-black px-1 min-w-[80px]">OM SPAN</th>
                           <th className="border border-black px-1 min-w-[100px]">PAGU</th>
                           <th className="border border-black px-1 min-w-[60px]">% TARGET</th>
                           {!isJanuary && (
                               <>
                                <th className="border border-black px-1 min-w-[100px]" colSpan={2}>MARGIN 5%</th>
                                <th className="border border-black px-1 min-w-[100px]">REALISASI</th>
                                <th className="border border-black px-1 min-w-[100px]">DEVIASI</th>
                               </>
                           )}
                       </tr>
                   </thead>
                   <tbody>
                       {renderSectionRows('Jumlah akan Direalisasikan')}
                   </tbody>
                </table>
            </div>

            {/* Table 3: TOTAL per Bulan */}
            <div className="flex gap-4">
                <div className="w-[120px] pt-6 font-bold text-[10px] text-gray-800">TOTAL per {type === 'month' ? 'Bulan' : 'Triwulan'}</div>
                <table className="border-collapse border border-black text-[10px] text-gray-900 flex-1">
                   <thead>
                       <tr className="font-bold text-center bg-gray-50">
                           <th className="border border-black px-1 min-w-[100px] bg-green-400 text-gray-900">TARGET</th>
                           <th className="border border-black px-1 min-w-[80px]">OM SPAN</th>
                           <th className="border border-black px-1 min-w-[100px]">PAGU</th>
                           <th className="border border-black px-1 min-w-[60px]">% TARGET</th>
                           {!isJanuary && (
                               <>
                                <th className="border border-black px-1 min-w-[100px]" colSpan={2}>MARGIN 5%</th>
                                <th className="border border-black px-1 min-w-[100px]">REALISASI</th>
                                <th className="border border-black px-1 min-w-[100px]">DEVIASI</th>
                               </>
                           )}
                       </tr>
                   </thead>
                   <tbody>
                       {renderSectionRows('TOTAL per Bulan')}
                   </tbody>
                </table>
            </div>

            </div>
        </div>
    );
  };

  return (
    <div className={`h-screen flex ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'} font-sans overflow-hidden transition-colors duration-300`}>
      
      {/* Sidebar Navigation */}
      <Sidebar 
        currentView={currentView} 
        onChangeView={setCurrentView} 
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        
        {/* Top Header Panel */}
        <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-4 shadow-sm border-b z-[45] flex-shrink-0 transition-colors`}>
            {/* Header Content Omitted for brevity, unchanged */}
            <div className="flex justify-between items-center mb-2">
                <div>
                <h1 className={`text-xl font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-900'}`}>
                    Sistem Revisi & RPD
                </h1>
                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-xs mt-1`}>
                    Satuan Kerja: BPS Kota Gunungsitoli
                </p>
                </div>
                
                <div className="flex items-center gap-3">
                    {/* Dark Mode Toggle */}
                    <button 
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        className={`p-2 rounded-full ${isDarkMode ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-200 text-gray-600'} hover:opacity-80 transition-all`}
                        title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    >
                        {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                    </button>

                    {currentView === 'table' && (
                    <div className="flex gap-2 items-center">
                    <button 
                        onClick={() => setShowSemula(!showSemula)}
                        className={`flex items-center gap-2 px-3 py-1 rounded text-sm border ${showSemula ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-gray-50 border-gray-300 text-gray-500'}`}
                    >
                        {showSemula ? <Eye size={14}/> : <EyeOff size={14}/>} Semula
                    </button>
                    <button 
                        onClick={() => setShowMenjadi(!showMenjadi)}
                        className={`flex items-center gap-2 px-3 py-1 rounded text-sm border ${showMenjadi ? 'bg-green-100 border-green-300 text-green-800' : 'bg-gray-50 border-gray-300 text-gray-500'}`}
                    >
                        {showMenjadi ? <Eye size={14}/> : <EyeOff size={14}/>} Menjadi
                    </button>
                    <button 
                        onClick={() => setShowEfisiensi(!showEfisiensi)}
                        className={`flex items-center gap-2 px-3 py-1 rounded text-sm border ${showEfisiensi ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-gray-50 border-gray-300 text-gray-500'}`}
                    >
                        {showEfisiensi ? <TrendingUp size={14}/> : <EyeOff size={14}/>} Efisiensi
                    </button>

                    {/* Quarter Selection Dropdown */}
                    <div className="relative">
                        <button 
                            onClick={() => setIsQuarterMenuOpen(!isQuarterMenuOpen)}
                            className={`flex items-center gap-2 px-3 py-1 rounded text-sm border ${isQuarterMenuOpen ? 'bg-purple-100 border-purple-300 text-purple-800' : 'bg-gray-50 border-gray-300 text-gray-500'}`}
                        >
                            <Calendar size={14}/> Pilih Triwulan
                        </button>
                        
                        {isQuarterMenuOpen && (
                            <>
                            <div className="fixed inset-0 z-[60]" onClick={() => setIsQuarterMenuOpen(false)}></div>
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded shadow-lg z-[70] p-2 animate-in fade-in zoom-in-95 duration-100">
                                <div className="text-xs font-bold text-gray-500 px-2 py-1 mb-1">TAMPILKAN TRIWULAN</div>
                                {QUARTERS.map((q, idx) => (
                                    <button 
                                        key={q.name}
                                        onClick={() => toggleQuarterVisibility(idx)}
                                        className="w-full flex items-center justify-between px-2 py-2 hover:bg-gray-50 rounded text-sm text-gray-700"
                                    >
                                        <span>{q.name}</span>
                                        {visibleQuarterIndices.includes(idx) 
                                            ? <CheckSquare size={16} className="text-blue-600"/> 
                                            : <Square size={16} className="text-gray-300"/>
                                        }
                                    </button>
                                ))}
                            </div>
                            </>
                        )}
                    </div>

                    </div>
                    )}
                </div>
            </div>
            {currentView === 'table' && <Legend />}
        </div>

        {/* View Content */}
        {currentView === 'settings' ? (
          <div className="flex-1 overflow-auto">
             <Settings 
                theme={theme} 
                onUpdateTheme={setTheme} 
                onReset={() => setTheme(defaultTheme)} 
             />
          </div>
        ) : (
          <div className="flex-1 overflow-auto relative w-full pb-20">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full border-separate border-spacing-0">
                <thead className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} top-0 sticky z-[40]`}>
                  {/* Headers Logic (Unchanged) */}
                  <tr className="h-12">
                    <th className="sticky left-0 z-[50] bg-blue-700 text-white border-r border-b border-blue-600 px-4 min-w-[350px]" rowSpan={3}>
                      Kode / Uraian
                    </th>
                    {showSemula && (
                      <th 
                        className="sticky z-[50] bg-gray-700 text-white border-r border-b border-gray-600 text-center" 
                        style={{ left: `${getSemulaOffset()}px`, minWidth: `${semulaWidth}px` }}
                        colSpan={3}
                        rowSpan={2}
                      >
                        SEMULA
                      </th>
                    )}
                    {showMenjadi && (
                      <th 
                        className="sticky z-[50] bg-yellow-600 text-white border-r border-b border-yellow-500 text-center" 
                        style={{ left: `${getMenjadiOffset()}px`, minWidth: `${menjadiWidth}px` }}
                        colSpan={3}
                        rowSpan={2}
                      >
                        MENJADI
                      </th>
                    )}
                    {showEfisiensi && (
                      <th 
                        className="sticky z-[50] bg-emerald-600 text-white border-r border-b border-emerald-500 text-center" 
                        style={{ left: `${getEfisiensiOffset()}px`, minWidth: `${efisiensiWidth}px` }}
                        colSpan={2}
                        rowSpan={2}
                      >
                        EFISIENSI ANGGARAN
                      </th>
                    )}
                    {visibleQuarters.map((q, idx) => (
                        <th key={q.name} colSpan={(q.months.length * 7) + 3} className={`text-center border-r border-b border-gray-300 text-sm font-bold text-gray-900 ${idx % 2 === 0 ? 'bg-purple-100' : 'bg-blue-100'}`}>
                            {q.name}
                        </th>
                    ))}
                  </tr>

                  {/* Row 2 & 3 Headers (Unchanged) */}
                  <tr className="h-10">
                    {visibleQuarters.map((q, idx) => (
                        <React.Fragment key={`months-${q.name}`}>
                            {q.months.map(m => (
                                <th key={m} colSpan={7} className="text-center border-r border-b border-gray-300 text-xs font-semibold bg-white p-1 text-gray-800">
                                    {MONTH_NAMES[m]}
                                </th>
                            ))}
                            <th rowSpan={2} className="bg-orange-100 border-r border-b border-gray-300 text-[10px] font-bold text-gray-800 w-[100px] align-middle px-1 leading-tight">TOTAL TARGET TW</th>
                            <th rowSpan={2} className="bg-orange-100 border-r border-b border-gray-300 text-[10px] font-bold text-gray-800 w-[100px] align-middle px-1 leading-tight">TOTAL REALISASI TW</th>
                            <th rowSpan={2} className="bg-orange-200 border-r border-b border-gray-300 text-[10px] font-bold text-gray-800 w-[100px] align-middle px-1 leading-tight">SISA TW</th>
                        </React.Fragment>
                    ))}
                  </tr>
                  <tr className="h-8">
                    {showSemula && (
                      <>
                        <th className="sticky z-[50] bg-gray-200 text-gray-700 border-r border-b border-gray-300 text-xs p-1 w-[80px]" style={{ left: `${getSemulaOffset()}px` }}>Vol</th>
                        <th className="sticky z-[50] bg-gray-200 text-gray-700 border-r border-b border-gray-300 text-xs p-1 w-[100px]" style={{ left: `${getSemulaOffset() + 80}px` }}>Harga</th>
                        <th className="sticky z-[50] bg-gray-200 text-gray-700 border-r border-b border-gray-300 text-xs p-1 w-[120px]" style={{ left: `${getSemulaOffset() + 180}px` }}>Total</th>
                      </>
                    )}
                    {showMenjadi && (
                      <>
                        <th className="sticky z-[50] bg-yellow-100 text-gray-800 border-r border-b border-gray-300 text-xs p-1 w-[80px]" style={{ left: `${getMenjadiOffset()}px` }}>Vol</th>
                        <th className="sticky z-[50] bg-yellow-100 text-gray-800 border-r border-b border-gray-300 text-xs p-1 w-[100px]" style={{ left: `${getMenjadiOffset() + 80}px` }}>Harga</th>
                        <th className="sticky z-[50] bg-yellow-100 text-gray-800 border-r border-b border-gray-300 text-xs p-1 w-[170px]" style={{ left: `${getMenjadiOffset() + 180}px` }}>Total</th>
                      </>
                    )}
                    {showEfisiensi && (
                      <>
                        <th className="sticky z-[50] bg-emerald-100 text-gray-800 border-r border-b border-gray-300 text-xs p-1 w-[100px]" style={{ left: `${getEfisiensiOffset()}px` }}>Rincian</th>
                        <th className="sticky z-[50] bg-emerald-100 text-gray-800 border-r border-b border-gray-300 text-xs p-1 w-[100px]" style={{ left: `${getEfisiensiOffset() + 100}px` }}>Total</th>
                      </>
                    )}
                    {visibleQuarters.map(q => q.months.map(m => (
                        <React.Fragment key={`headers-${m}`}>
                            <th className="bg-pink-100 border-r border-b border-gray-300 text-[10px] min-w-[100px] font-normal px-1 text-gray-800">RPD</th>
                            <th className="bg-pink-200 border-r border-b border-gray-300 text-[10px] min-w-[100px] font-normal px-1 text-gray-800">Jml Akan Real</th>
                            <th className="bg-purple-100 border-r border-b border-gray-300 text-[10px] min-w-[80px] font-normal px-1 text-gray-800">Tgl</th>
                            <th className="bg-purple-100 border-r border-b border-gray-300 text-[10px] min-w-[100px] font-normal px-1 text-gray-800">No. SPM</th>
                            <th className="bg-cyan-100 border-r border-b border-gray-300 text-[10px] min-w-[30px] font-normal px-1 text-gray-800">Cek</th>
                            <th className="bg-green-100 border-r border-b border-gray-300 text-[10px] min-w-[100px] font-normal px-1 text-gray-800">SP2D</th>
                            <th className="bg-red-100 border-r border-b border-gray-300 text-[10px] min-w-[120px] font-normal px-1 text-gray-800">Selisih</th>
                        </React.Fragment>
                    )))}
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
                      showEfisiensi={showEfisiensi}
                      visibleQuarters={visibleQuarters}
                      theme={theme}
                      offsets={{
                          semula: getSemulaOffset(),
                          menjadi: getMenjadiOffset(),
                          efisiensi: getEfisiensiOffset()
                      }}
                    />
                  ))}
                </tbody>

                <tfoot>
                    <tr className="bg-gray-200 border-t-2 border-gray-400 font-bold text-[11px] text-gray-800">
                        <td className="sticky left-0 z-[50] bg-gray-200 border-r border-b border-gray-400 px-2 h-10 flex items-center min-w-[350px]">
                           TOTAL KESELURUHAN
                        </td>
                        {/* TOTAL COLUMNS (Unchanged) */}
                        {showSemula && (
                          <>
                            <td className="sticky z-[50] bg-gray-300 border-r border-b border-gray-400" style={{ left: `${getSemulaOffset()}px`, width: '80px' }}></td>
                            <td className="sticky z-[50] bg-gray-300 border-r border-b border-gray-400" style={{ left: `${getSemulaOffset() + 80}px`, width: '100px' }}></td>
                            <td className="sticky z-[50] bg-gray-200 border-r border-b border-gray-400 text-right px-1" style={{ left: `${getSemulaOffset() + 180}px`, width: '120px' }}>
                                {formatCurrency(grandTotals.semula)}
                            </td>
                          </>
                        )}
                        {showMenjadi && (
                          <>
                            <td className="sticky z-[50] bg-gray-300 border-r border-b border-gray-400" style={{ left: `${getMenjadiOffset()}px`, width: '80px' }}></td>
                            <td className="sticky z-[50] bg-gray-300 border-r border-b border-gray-400" style={{ left: `${getMenjadiOffset() + 80}px`, width: '100px' }}></td>
                            <td className="sticky z-[50] bg-gray-200 border-r border-b border-gray-400 text-right px-1" style={{ left: `${getMenjadiOffset() + 180}px`, width: '170px' }}>
                                {formatCurrency(grandTotals.menjadi)}
                            </td>
                          </>
                        )}
                        {showEfisiensi && (
                          <>
                            <td className="sticky z-[50] bg-gray-200 border-r border-b border-gray-400 text-right px-1" style={{ left: `${getEfisiensiOffset()}px`, width: '100px' }}>
                                {formatCurrency(grandTotals.efficiency)}
                            </td>
                            <td className="sticky z-[50] bg-gray-200 border-r border-b border-gray-400 text-right px-1" style={{ left: `${getEfisiensiOffset() + 100}px`, width: '100px' }}>
                                {formatCurrency(grandTotals.efficiency)}
                            </td>
                          </>
                        )}
                        {visibleQuarters.map(q => {
                             let qRpd = 0;
                             let qReal = 0;
                             return (
                                <React.Fragment key={`total-q-${q.name}`}>
                                    {q.months.map(m => {
                                        const mData = grandTotals.monthly[m];
                                        const gap = mData.rpd - mData.realization;
                                        qRpd += mData.rpd;
                                        qReal += mData.realization;
                                        return (
                                            <React.Fragment key={`total-m-${m}`}>
                                                <td className="border-r border-b border-gray-400 text-right px-1">{formatCurrency(mData.rpd)}</td>
                                                <td className="border-r border-b border-gray-400 text-right px-1">{formatCurrency(mData.realization)}</td>
                                                <td className="border-r border-b border-gray-400 bg-gray-300"></td>
                                                <td className="border-r border-b border-gray-400 bg-gray-300"></td>
                                                <td className="border-r border-b border-gray-400 bg-gray-300"></td>
                                                <td className="border-r border-b border-gray-400 text-right px-1">{formatCurrency(mData.sp2d)}</td>
                                                <td className={`border-r border-b border-gray-400 text-right px-1 ${gap !== 0 ? 'text-red-600' : ''}`}>{formatCurrency(gap)}</td>
                                            </React.Fragment>
                                        )
                                    })}
                                    <td className="bg-orange-200 border-r border-b border-gray-400 text-right px-1 font-bold">{formatCurrency(qRpd)}</td>
                                    <td className="bg-orange-200 border-r border-b border-gray-400 text-right px-1 font-bold">{formatCurrency(qReal)}</td>
                                    <td className={`bg-orange-200 border-r border-b border-gray-400 text-right px-1 font-bold ${(qRpd - qReal) !== 0 ? 'text-red-600' : 'text-green-700'}`}>
                                        {formatCurrency(qRpd - qReal)}
                                    </td>
                                </React.Fragment>
                             )
                        })}
                    </tr>

                    {/* NEW ROW: COLLAPSIBLE ANALYSIS ROW */}
                    <tr className="bg-gray-100 border-t border-gray-300">
                        <td className="sticky left-0 z-[50] bg-gray-100 border-r border-b border-gray-300 px-2 h-10 align-middle min-w-[350px]">
                           <span className="font-bold text-gray-700 text-xs">ANALISIS BULANAN (OM SPAN)</span>
                        </td>
                        
                        {/* Sticky Spacers for Semula/Menjadi/Efisiensi */}
                        {showSemula && (
                          <td 
                            colSpan={3} 
                            className="sticky z-[50] border-r border-b border-gray-300 bg-gray-100"
                            style={{ left: `${getSemulaOffset()}px`, minWidth: `${semulaWidth}px` }}
                          ></td>
                        )}
                        {showMenjadi && (
                          <td 
                            colSpan={3} 
                            className="sticky z-[50] border-r border-b border-gray-300 bg-gray-100"
                            style={{ left: `${getMenjadiOffset()}px`, minWidth: `${menjadiWidth}px` }}
                          ></td>
                        )}
                        {showEfisiensi && (
                          <td 
                            colSpan={2} 
                            className="sticky z-[50] border-r border-b border-gray-300 bg-gray-100"
                            style={{ left: `${getEfisiensiOffset()}px`, minWidth: `${efisiensiWidth}px` }}
                          ></td>
                        )}
                        
                        {visibleQuarters.map((q, qIndex) => (
                             <React.Fragment key={`analysis-q-${q.name}`}>
                                 {q.months.map(m => (
                                     <td key={`analysis-m-${m}`} colSpan={7} className="border-r border-b border-gray-300 bg-gray-50 align-top p-0 relative">
                                         {/* Toggle Button */}
                                         <div className="w-full">
                                            <button 
                                                onClick={() => toggleMonthAnalysis(m)}
                                                className={`w-full flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase transition-colors ${
                                                    expandedAnalysisMonths.includes(m) ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                            >
                                                <span>Analisis {MONTH_NAMES[m]}</span>
                                                {expandedAnalysisMonths.includes(m) ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                                            </button>
                                            
                                            {/* Expandable Content */}
                                            {expandedAnalysisMonths.includes(m) && (
                                                <div className="p-1 animate-in fade-in slide-in-from-top-2 duration-200">
                                                    {renderAnalysisTable(m, 'month')}
                                                </div>
                                            )}
                                         </div>
                                     </td>
                                 ))}
                                 
                                 {/* Quarter Analysis Summary */}
                                 <td colSpan={3} className="border-r border-b border-gray-300 bg-gray-100 align-top p-0 relative">
                                    <div className="w-full">
                                        <button 
                                            onClick={() => toggleQuarterAnalysis(qIndex)}
                                            className={`w-full flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase transition-colors ${
                                                expandedAnalysisQuarters.includes(qIndex) ? 'bg-orange-100 text-orange-800' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                            }`}
                                        >
                                            <span>Analisis {q.name}</span>
                                            {expandedAnalysisQuarters.includes(qIndex) ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                                        </button>
                                        
                                        {/* Expandable Quarter Content */}
                                        {expandedAnalysisQuarters.includes(qIndex) && (
                                            <div className="p-1 animate-in fade-in slide-in-from-top-2 duration-200 absolute right-0 z-[60] shadow-lg bg-white border border-gray-300 min-w-[500px]">
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
        )}
        
        {/* Bottom Sheet Form (Unchanged) */}
        <BottomEditor 
          row={selectedRow}
          section={selectedSection}
          monthIndex={selectedMonthIndex}
          onClose={closeEditor}
          onSave={updateRow}
        />

        {/* Add Row Modal (Unchanged) */}
        {addingChildTo && (
            <AddRowModal 
                parentRow={addingChildTo}
                onClose={() => setAddingChildTo(null)}
                onSave={handleAddRow}
            />
        )}
        
      </div>
    </div>
  );
}

export default App;