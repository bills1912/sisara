import React, { useEffect, useState, useMemo, useRef } from 'react';
import { api } from '../api';
import { RevisionMeta, BudgetRow } from '../types';
import { Clock, RotateCcw, Loader2, AlertCircle, Eye, Settings2, ChevronDown, ChevronUp, CheckSquare, Square, EyeOff, Trash2, CalendarRange, ArrowRight, BarChart2 } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import { MONTH_NAMES, QUARTERS, defaultTheme, getAccountPrefix } from '../utils';
import BudgetRowItem from './BudgetRowItem';
import { CustomSearchInput, CustomDatePicker } from './CustomInputs';

interface Props {
    isDarkMode: boolean;
    onRestore: (data: BudgetRow[]) => void;
    onRevisionChange?: () => void;
}

// --- EXTRACTED FULL PREVIEW TABLE COMPONENT ---
// Moved outside to prevent re-mounting on every render which causes issues
const FullPreviewTable = ({ data, isDarkMode }: { data: BudgetRow[], isDarkMode: boolean }) => {
    const [localData, setLocalData] = useState(data);
    
    // Visibility States (Local to Preview)
    const [showSemula, setShowSemula] = useState(true);
    const [showMenjadi, setShowMenjadi] = useState(true);
    const [showSelisih, setShowSelisih] = useState(true);
    const [showEfisiensi, setShowEfisiensi] = useState(true);
    const [visibleQuarterIndices, setVisibleQuarterIndices] = useState<number[]>([0, 1, 2, 3]);
    
    // Analysis Toggle State
    const [expandedAnalysisMonths, setExpandedAnalysisMonths] = useState<number[]>([]);
    const [expandedAnalysisQuarters, setExpandedAnalysisQuarters] = useState<number[]>([]);
    
    const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Update local data if prop changes
    useEffect(() => {
        setLocalData(data);
    }, [data]);

    // Click outside to close menu
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsViewMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Format currency helper
    const formatCurrency = (value: number) => {
        if (value === 0) return 'Rp 0';
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };

    // Calculate Grand Totals and Analysis Data (matching App.tsx)
    const { grandTotalSemula, grandTotalMenjadi, grandTotals, analysisData } = useMemo(() => {
        let semula = 0;
        let menjadi = 0;
        
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
                    const eff = row.efficiency || 0;

                    semula += sem;
                    menjadi += men;
                    totals.semula += sem;
                    totals.menjadi += men;
                    totals.efficiency += eff;

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

                    Object.entries(row.monthlyAllocation || {}).forEach(([mStr, val]) => {
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
        
        traverse(localData);
        totals.selisih = totals.semula - totals.menjadi;
        
        return { 
            grandTotalSemula: semula, 
            grandTotalMenjadi: menjadi,
            grandTotals: totals,
            analysisData: analysis
        };
    }, [localData]);

    // Toggle functions for analysis
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

    // Render Analysis Table (matching App.tsx)
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
                        false
                    )}
                    
                    {/* Table 2: Jumlah akan Direalisasikan */}
                    {renderSingleTable(
                        'Jumlah akan Direalisasikan',
                        (d) => d.realization,
                        isDarkMode ? 'bg-blue-900/50 text-blue-200' : 'bg-blue-100 text-blue-800',
                        false
                    )}
                    
                    {/* Table 3: TOTAL per Bulan (RPD = sp2d + realization) */}
                    {renderSingleTable(
                        'TOTAL per Bulan',
                        (d) => d.rpd,
                        isDarkMode ? 'bg-orange-900/50 text-orange-200' : 'bg-orange-200 text-orange-900',
                        true
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

    const handleToggle = (id: string) => {
        const toggleRecursive = (rows: BudgetRow[]): BudgetRow[] => {
            return rows.map(row => {
                if (row.id === id) {
                    return { ...row, isOpen: !row.isOpen };
                }
                if (row.children) {
                    return { ...row, children: toggleRecursive(row.children) };
                }
                return row;
            });
        };
        setLocalData(prev => toggleRecursive(prev));
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

    const visibleQuarters = useMemo(() => {
        return QUARTERS.filter((_, index) => visibleQuarterIndices.includes(index));
    }, [visibleQuarterIndices]);

    // Constants matching App.tsx for alignment
    const descWidth = 350;
    const volValWidth = 40; 
    const volUnitWidth = 40;
    const priceWidth = 80;
    const totalWidth = 90;
    
    const groupWidth = volValWidth + volUnitWidth + priceWidth + totalWidth; 
    const semulaWidth = groupWidth; 
    const menjadiWidth = groupWidth;
    const selisihWidth = 90; 
    const efisiensiWidth = 100;

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
        efisiensi: efisiensiWidth
    };

    // Header style helpers
    const headerBorderColor = isDarkMode ? '#4b5563' : '#d1d5db';
    const stickyHeaderGapStyle = { boxShadow: `-1px 0 0 0 ${headerBorderColor}` };
    const bgClass = isDarkMode ? 'bg-gray-900' : 'bg-white';
    const textClass = isDarkMode ? 'text-gray-100' : 'text-gray-900';

    return (
        <div className={`flex flex-col h-full w-full relative isolate ${bgClass} ${textClass}`}>
            {/* PREVIEW TOOLBAR */}
            <div className={`flex justify-end p-2 border-b flex-shrink-0 z-[80] ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                <div className="relative" ref={menuRef}>
                    <button 
                        onClick={() => setIsViewMenuOpen(!isViewMenuOpen)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded shadow-sm border text-sm font-medium transition-colors ${isViewMenuOpen ? 'bg-blue-100 border-blue-400 text-blue-800' : (isDarkMode ? 'bg-gray-700 text-gray-200 border-gray-600' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50')}`}
                    >
                        <Settings2 size={14}/> Atur Tampilan
                        {isViewMenuOpen ? <ChevronUp size={14} className="ml-1"/> : <ChevronDown size={14} className="ml-1"/>}
                    </button>
                    {isViewMenuOpen && (
                        <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-[90] p-3 text-gray-800">
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
            </div>

            {/* TABLE CONTAINER */}
            <div className={`flex-1 overflow-auto relative w-full scroll-smooth ${bgClass}`}>
                <div className="inline-block min-w-full align-middle">
                    <table className="min-w-full border-separate border-spacing-0">
                        <thead className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} top-0 sticky z-[60]`}>
                            {/* Headers ROW 1 */}
                            <tr className="h-12">
                                <th className="sticky left-0 z-[70] bg-blue-700 text-white border-r border-b border-blue-600 px-4 w-[350px] min-w-[350px] max-w-[350px]" style={{ width: '350px', minWidth: '350px', maxWidth: '350px' }} rowSpan={3}>
                                    <div className="flex items-center justify-between">
                                        <span>Kode / Uraian</span>
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
                            {/* Headers ROW 2 */}
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
                            {/* Headers ROW 3 */}
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
                                    <th className={`sticky z-[60] border-r border-b border-gray-300 text-xs p-1 ${isDarkMode ? 'bg-emerald-900/50 text-gray-300' : 'bg-emerald-100 text-gray-800'}`} style={{ left: `${getEfisiensiOffset()}px`, width: `${efisiensiWidth}px`, ...stickyHeaderGapStyle }}>Total</th>
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
                        <tbody className={bgClass}>
                            {localData.map(row => (
                                <BudgetRowItem
                                    key={row.id}
                                    row={row}
                                    level={0}
                                    showSemula={showSemula}
                                    showMenjadi={showMenjadi}
                                    showSelisih={showSelisih}
                                    showEfisiensi={showEfisiensi}
                                    visibleQuarters={visibleQuarters}
                                    offsets={offsets}
                                    widths={widths}
                                    theme={defaultTheme}
                                    isRevisionMode={true} // Acts as "Read only" mode effectively (no monthly edit)
                                    isDarkMode={isDarkMode}
                                    onToggle={handleToggle}
                                    onSelect={() => {}} // No-op for selection
                                    onAddChild={() => {}} // No-op
                                    onCopyRow={() => {}} // No-op
                                    onDeleteRow={() => {}} // No-op
                                />
                            ))}
                        </tbody>
                        
                        {/* FOOTER */}
                        <tfoot>
                            {/* Total Row */}
                            <tr className={`${isDarkMode ? 'bg-gray-700 border-gray-500' : 'bg-gray-200 border-gray-400'} border-t-2 font-bold text-[11px] ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                <td className={`border-r border-t border-gray-300 px-2 h-10 align-middle w-[350px] min-w-[350px] max-w-[350px] ${isDarkMode ? 'bg-gray-700 border-gray-500 text-gray-200' : 'bg-gray-200 border-gray-400 text-gray-800'} font-bold sticky left-0 z-[40]`} style={{ width: '350px', minWidth: '350px', maxWidth: '350px' }}>
                                    <div className="flex items-center h-full px-2 w-full">TOTAL KESELURUHAN</div>
                                </td>
                                {showSemula && (
                                    <>
                                        <td className={`border-r border-t border-gray-300 ${isDarkMode ? 'bg-gray-700 border-gray-500 text-gray-200' : 'bg-gray-200 border-gray-400 text-gray-800'} font-bold text-[11px] sticky z-[40]`} style={{ left: `${getSemulaOffset()}px`, width: `${volValWidth}px` }}></td>
                                        <td className={`border-r border-t border-gray-300 ${isDarkMode ? 'bg-gray-700 border-gray-500 text-gray-200' : 'bg-gray-200 border-gray-400 text-gray-800'} font-bold text-[11px] sticky z-[40]`} style={{ left: `${getSemulaOffset() + volValWidth}px`, width: `${volUnitWidth}px` }}></td>
                                        <td className={`border-r border-t border-gray-300 ${isDarkMode ? 'bg-gray-700 border-gray-500 text-gray-200' : 'bg-gray-200 border-gray-400 text-gray-800'} font-bold text-[11px] sticky z-[40]`} style={{ left: `${getSemulaOffset() + volValWidth + volUnitWidth}px`, width: `${priceWidth}px` }}></td>
                                        <td className={`text-right px-1 border-r border-t border-gray-300 ${isDarkMode ? 'bg-gray-700 border-gray-500 text-gray-200' : 'bg-gray-200 border-gray-400 text-gray-800'} font-bold text-[11px] sticky z-[40]`} style={{ left: `${getSemulaOffset() + volValWidth + volUnitWidth + priceWidth}px`, width: `${totalWidth}px` }}>{formatCurrency(grandTotals.semula)}</td>
                                    </>
                                )}
                                {showMenjadi && (
                                    <>
                                        <td className={`border-r border-t border-gray-300 ${isDarkMode ? 'bg-gray-700 border-gray-500 text-gray-200' : 'bg-gray-200 border-gray-400 text-gray-800'} font-bold text-[11px] sticky z-[40]`} style={{ left: `${getMenjadiOffset()}px`, width: `${volValWidth}px` }}></td>
                                        <td className={`border-r border-t border-gray-300 ${isDarkMode ? 'bg-gray-700 border-gray-500 text-gray-200' : 'bg-gray-200 border-gray-400 text-gray-800'} font-bold text-[11px] sticky z-[40]`} style={{ left: `${getMenjadiOffset() + volValWidth}px`, width: `${volUnitWidth}px` }}></td>
                                        <td className={`border-r border-t border-gray-300 ${isDarkMode ? 'bg-gray-700 border-gray-500 text-gray-200' : 'bg-gray-200 border-gray-400 text-gray-800'} font-bold text-[11px] sticky z-[40]`} style={{ left: `${getMenjadiOffset() + volValWidth + volUnitWidth}px`, width: `${priceWidth}px` }}></td>
                                        <td className={`text-right px-1 border-r border-t border-gray-300 ${isDarkMode ? 'bg-gray-700 border-gray-500 text-gray-200' : 'bg-gray-200 border-gray-400 text-gray-800'} font-bold text-[11px] sticky z-[40]`} style={{ left: `${getMenjadiOffset() + volValWidth + volUnitWidth + priceWidth}px`, width: `${totalWidth}px` }}>{formatCurrency(grandTotals.menjadi)}</td>
                                    </>
                                )}
                                {showSelisih && <td className={`text-right px-1 border-r border-t border-gray-300 ${isDarkMode ? 'bg-gray-700 border-gray-500 text-gray-200' : 'bg-gray-200 border-gray-400 text-gray-800'} font-bold text-[11px] sticky z-[40]`} style={{ left: `${getSelisihOffset()}px`, width: `${selisihWidth}px` }}>{formatCurrency(grandTotals.selisih)}</td>}
                                {showEfisiensi && <td className={`text-right px-1 border-r border-t border-gray-300 ${isDarkMode ? 'bg-gray-700 border-gray-500 text-gray-200' : 'bg-gray-200 border-gray-400 text-gray-800'} font-bold text-[11px] sticky z-[40]`} style={{ left: `${getEfisiensiOffset()}px`, width: '90px' }}>{formatCurrency(grandTotals.efficiency)}</td>}
                                {visibleQuarters.map(q => {
                                    let qRpd = 0; let qReal = 0;
                                    return (
                                        <React.Fragment key={`total-q-${q.name}`}>
                                            {q.months.map(m => {
                                                const mData = grandTotals.monthly[m];
                                                const gap = mData.total - mData.sp2d;
                                                qRpd += mData.rpd; 
                                                qReal += mData.realization;
                                                return (
                                                    <React.Fragment key={`total-m-${m}`}>
                                                        <td className={`border-r border-t border-gray-300 ${isDarkMode ? 'bg-gray-700 border-gray-500 text-gray-200' : 'bg-gray-200 border-gray-400 text-gray-800'} font-bold text-[11px] text-right px-1`}>{formatCurrency(mData.rpd)}</td>
                                                        <td className={`border-r border-t border-gray-300 ${isDarkMode ? 'bg-gray-700 border-gray-500 text-gray-200' : 'bg-gray-200 border-gray-400 text-gray-800'} font-bold text-[11px] text-right px-1`}>{formatCurrency(mData.realization)}</td>
                                                        <td className={`border-r border-t border-gray-300 ${isDarkMode ? 'bg-gray-700 border-gray-500 text-gray-200' : 'bg-gray-200 border-gray-400 text-gray-800'} font-bold text-[11px] text-right px-1 ${isDarkMode ? 'bg-pink-900/50' : 'bg-pink-50'}`}>{formatCurrency(mData.total)}</td>
                                                        <td className={`border-r border-t border-gray-300 ${isDarkMode ? 'bg-gray-700 border-gray-500 text-gray-200' : 'bg-gray-200 border-gray-400 text-gray-800'} font-bold text-[11px]`}></td>
                                                        <td className={`border-r border-t border-gray-300 ${isDarkMode ? 'bg-gray-700 border-gray-500 text-gray-200' : 'bg-gray-200 border-gray-400 text-gray-800'} font-bold text-[11px]`}></td>
                                                        <td className={`border-r border-t border-gray-300 ${isDarkMode ? 'bg-gray-700 border-gray-500 text-gray-200' : 'bg-gray-200 border-gray-400 text-gray-800'} font-bold text-[11px]`}></td>
                                                        <td className={`border-r border-t border-gray-300 ${isDarkMode ? 'bg-gray-700 border-gray-500 text-gray-200' : 'bg-gray-200 border-gray-400 text-gray-800'} font-bold text-[11px] text-right px-1`}>{formatCurrency(mData.sp2d)}</td>
                                                        <td className={`border-r border-t border-gray-300 ${isDarkMode ? 'bg-gray-700 border-gray-500 text-gray-200' : 'bg-gray-200 border-gray-400 text-gray-800'} font-bold text-[11px] text-right px-1 ${gap !== 0 ? 'text-red-600' : ''}`}>{formatCurrency(gap)}</td>
                                                    </React.Fragment>
                                                );
                                            })}
                                            <td className={`border-r border-t border-gray-300 ${isDarkMode ? 'bg-gray-700 border-gray-500 text-gray-200' : 'bg-gray-200 border-gray-400 text-gray-800'} font-bold text-[11px] text-right px-1 ${isDarkMode ? 'bg-orange-900/50' : 'bg-orange-200'}`}>{formatCurrency(qRpd)}</td>
                                            <td className={`border-r border-t border-gray-300 ${isDarkMode ? 'bg-gray-700 border-gray-500 text-gray-200' : 'bg-gray-200 border-gray-400 text-gray-800'} font-bold text-[11px] text-right px-1 ${isDarkMode ? 'bg-orange-900/50' : 'bg-orange-200'}`}>{formatCurrency(qReal)}</td>
                                            <td className={`border-r border-t border-gray-300 ${isDarkMode ? 'bg-gray-700 border-gray-500 text-gray-200' : 'bg-gray-200 border-gray-400 text-gray-800'} font-bold text-[11px] text-right px-1 ${isDarkMode ? 'bg-orange-900/50' : 'bg-orange-200'} ${(qRpd - qReal) !== 0 ? 'text-red-600' : 'text-green-700'}`}>{formatCurrency(qRpd - qReal)}</td>
                                        </React.Fragment>
                                    );
                                })}
                            </tr>
                            
                            {/* Collapsible Analysis Row */}
                            <tr className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} border-t border-gray-300`}>
                                <td className={`border-r border-t border-gray-300 px-2 h-10 align-middle w-[350px] min-w-[350px] max-w-[350px] sticky left-0 z-[40] ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50'}`} style={{ width: '350px', minWidth: '350px', maxWidth: '350px' }}>
                                    <span className={`font-bold text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>ANALISIS BULANAN (OM SPAN)</span>
                                </td>
                                {showSemula && <td colSpan={4} className={`border-r border-t border-gray-300 align-top sticky z-[40] ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50'}`} style={{ left: `${getSemulaOffset()}px`, minWidth: `${semulaWidth}px` }}></td>}
                                {showMenjadi && <td colSpan={4} className={`border-r border-t border-gray-300 align-top sticky z-[40] ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50'}`} style={{ left: `${getMenjadiOffset()}px`, minWidth: `${menjadiWidth}px` }}></td>}
                                {showSelisih && <td colSpan={1} className={`border-r border-t border-gray-300 align-top sticky z-[40] ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50'}`} style={{ left: `${getSelisihOffset()}px`, minWidth: `${selisihWidth}px` }}></td>}
                                {showEfisiensi && <td colSpan={1} className={`border-r border-t border-gray-300 align-top sticky z-[40] ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50'}`} style={{ left: `${getEfisiensiOffset()}px`, minWidth: `${efisiensiWidth}px` }}></td>}
                                {visibleQuarters.map((q, qIndex) => (
                                    <React.Fragment key={`analysis-q-${q.name}`}>
                                        {q.months.map(m => (
                                            <td key={`analysis-m-${m}`} colSpan={8} className={`border-r border-t border-gray-300 align-top ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50'}`}>
                                                <div className="w-full relative">
                                                    <button 
                                                        onClick={() => toggleMonthAnalysis(m)} 
                                                        className={`w-full flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase transition-colors ${isDarkMode 
                                                            ? (expandedAnalysisMonths.includes(m) ? 'bg-blue-900/50 text-blue-300' : 'bg-gray-800 text-gray-400 hover:bg-gray-700') 
                                                            : (expandedAnalysisMonths.includes(m) ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}`}
                                                    >
                                                        <span>Analisis {MONTH_NAMES[m]}</span>
                                                        {expandedAnalysisMonths.includes(m) ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                                                    </button>
                                                    {expandedAnalysisMonths.includes(m) && (
                                                        <div className="absolute top-full left-0 right-0 p-1 animate-in fade-in slide-in-from-top-2 duration-200 z-[80] shadow-lg rounded-b-lg bg-transparent min-w-[500px]">
                                                            {renderAnalysisTable(m, 'month')}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        ))}
                                        <td colSpan={3} className={`border-r border-t border-gray-300 align-top ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50'}`}>
                                            <div className="w-full relative">
                                                <button 
                                                    onClick={() => toggleQuarterAnalysis(qIndex)} 
                                                    className={`w-full flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase transition-colors ${isDarkMode 
                                                        ? (expandedAnalysisQuarters.includes(qIndex) ? 'bg-orange-900/50 text-orange-300' : 'bg-gray-800 text-gray-400 hover:bg-gray-700') 
                                                        : (expandedAnalysisQuarters.includes(qIndex) ? 'bg-orange-100 text-orange-800' : 'bg-gray-200 text-gray-700 hover:bg-gray-300')}`}
                                                >
                                                    <span>{q.name}</span>
                                                    {expandedAnalysisQuarters.includes(qIndex) ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                                                </button>
                                                {expandedAnalysisQuarters.includes(qIndex) && (
                                                    <div className="absolute top-full left-0 right-0 p-1 animate-in fade-in slide-in-from-top-2 duration-200 z-[80] shadow-lg rounded-b-lg bg-transparent min-w-[400px]">
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
        </div>
    );
};

const RevisionHistory: React.FC<Props> = ({ isDarkMode, onRestore, onRevisionChange }) => {
    const [revisions, setRevisions] = useState<RevisionMeta[]>([]);
    const [selectedRevisionId, setSelectedRevisionId] = useState<string | null>(null);
    const [selectedRevisionData, setSelectedRevisionData] = useState<BudgetRow[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingDetail, setLoadingDetail] = useState(false);
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');

    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

    useEffect(() => {
        fetchRevisions();
    }, []);

    const fetchRevisions = async () => {
        setIsLoading(true);
        try {
            const data = await api.getRevisions();
            // Sort by timestamp desc
            const sorted = data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setRevisions(sorted);
            if (sorted.length > 0 && !selectedRevisionId) {
                handleSelectRevision(sorted[0].id);
            }
        } catch (e) {
            console.error("Failed to load revisions", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectRevision = async (id: string) => {
        setSelectedRevisionId(id);
        setLoadingDetail(true);
        try {
            const detail = await api.getRevisionDetail(id);
            setSelectedRevisionData(detail.data);
        } catch (e) {
            console.error("Failed to load detail", e);
        } finally {
            setLoadingDetail(false);
        }
    };

    const handleRestoreClick = () => {
        if (!selectedRevisionData) return;
        setConfirmConfig({
            isOpen: true,
            title: "Pulihkan Revisi",
            message: "Apakah Anda yakin ingin memulihkan data anggaran ke versi ini? Data saat ini akan ditimpa.",
            onConfirm: () => {
                onRestore(selectedRevisionData);
                setConfirmConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleDeleteClick = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setConfirmConfig({
            isOpen: true,
            title: "Hapus Revisi",
            message: "Apakah Anda yakin ingin menghapus snapshot revisi ini? Tindakan ini tidak dapat dibatalkan.",
            onConfirm: async () => {
                try {
                    await api.deleteRevision(id);
                    if (selectedRevisionId === id) {
                        setSelectedRevisionId(null);
                        setSelectedRevisionData(null);
                    }
                    fetchRevisions();
                    if (onRevisionChange) onRevisionChange();
                    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                } catch (e: any) {
                    alert("Gagal menghapus: " + e.message);
                }
            }
        });
    };

    // Filter Logic
    const filteredRevisions = useMemo(() => {
        return revisions.filter(rev => {
            const matchesSearch = rev.note.toLowerCase().includes(searchTerm.toLowerCase());
            
            // Date Range Filter
            const revDate = new Date(rev.timestamp);
            // Reset hours for accurate date-only comparison
            revDate.setHours(0, 0, 0, 0);

            let matchesStart = true;
            if (filterStartDate) {
                const startDate = new Date(filterStartDate);
                startDate.setHours(0, 0, 0, 0);
                matchesStart = revDate >= startDate;
            }

            let matchesEnd = true;
            if (filterEndDate) {
                const endDate = new Date(filterEndDate);
                endDate.setHours(0, 0, 0, 0);
                matchesEnd = revDate <= endDate;
            }

            return matchesSearch && matchesStart && matchesEnd;
        });
    }, [revisions, searchTerm, filterStartDate, filterEndDate]);

    const formatDate = (iso: string) => {
        return new Date(iso).toLocaleString('id-ID', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className={`flex h-full w-full overflow-hidden ${isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
            {/* Sidebar List */}
            <div className={`w-80 flex flex-col border-r flex-shrink-0 ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <Clock size={20} className="text-blue-500"/>
                        Riwayat Revisi
                    </h3>
                    
                    <CustomSearchInput 
                        value={searchTerm}
                        onChange={setSearchTerm}
                        placeholder="Cari catatan..."
                    />

                    {/* Date Range Filter */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                            <CalendarRange size={10} /> Filter Tanggal
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <CustomDatePicker 
                                value={filterStartDate}
                                onChange={setFilterStartDate}
                                placeholder="Dari..."
                                className="w-full"
                            />
                            <div className="relative">
                                <CustomDatePicker 
                                    value={filterEndDate}
                                    onChange={setFilterEndDate}
                                    placeholder="Sampai..."
                                    className="w-full"
                                />
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="animate-spin text-gray-400"/>
                        </div>
                    ) : filteredRevisions.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-sm">
                            {(searchTerm || filterStartDate || filterEndDate) ? "Tidak ditemukan." : "Belum ada riwayat revisi."}
                        </div>
                    ) : (
                        <div>
                            {filteredRevisions.map(rev => (
                                <div 
                                    key={rev.id}
                                    onClick={() => handleSelectRevision(rev.id)}
                                    className={`
                                        p-4 border-b cursor-pointer transition-all duration-200 relative group
                                        ${selectedRevisionId === rev.id 
                                            ? (isDarkMode ? 'bg-blue-900/20 border-l-4 border-l-blue-500' : 'bg-blue-50 border-l-4 border-l-blue-500') 
                                            : (isDarkMode ? 'border-gray-700 hover:bg-blue-900/10' : 'border-gray-100 hover:bg-blue-50/50')
                                        }
                                    `}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                                            {formatDate(rev.timestamp)}
                                        </span>
                                        <button 
                                            onClick={(e) => handleDeleteClick(rev.id, e)}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity"
                                            title="Hapus Snapshot"
                                        >
                                            <Trash2 size={14}/>
                                        </button>
                                    </div>
                                    <h4 className={`font-bold text-sm mb-1 line-clamp-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{rev.note}</h4>
                                    <div className="text-[10px] text-gray-400 flex items-center gap-1 font-mono opacity-60">
                                        #{rev.id.substring(0,8)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                {selectedRevisionId ? (
                    <>
                        <div className={`h-14 flex items-center justify-between px-6 border-b shrink-0 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                            <div className="flex items-center gap-4">
                                <div>
                                    <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Preview Snapshot</div>
                                    <div className="font-bold text-sm text-blue-600">
                                        {revisions.find(r => r.id === selectedRevisionId)?.note}
                                    </div>
                                </div>
                                <span className="text-gray-300">|</span>
                                <div className="text-xs text-gray-500">
                                    {selectedRevisionData ? `${selectedRevisionData.length} baris data (Root)` : '...'}
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={handleRestoreClick}
                                    disabled={loadingDetail || !selectedRevisionData}
                                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <RotateCcw size={16}/>
                                    Pulihkan Versi Ini
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-hidden relative">
                            {loadingDetail ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-sm z-10">
                                    <div className="flex flex-col items-center gap-3">
                                        <Loader2 className="animate-spin text-blue-600" size={32}/>
                                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Memuat detail snapshot...</span>
                                    </div>
                                </div>
                            ) : selectedRevisionData ? (
                                <FullPreviewTable data={selectedRevisionData} isDarkMode={isDarkMode} />
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-400 flex-col gap-2">
                                    <AlertCircle size={32}/>
                                    <p>Gagal memuat data revisi.</p>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center flex-col gap-4 text-gray-400 opacity-60">
                        <Clock size={64}/>
                        <p className="text-lg font-medium">Pilih revisi dari daftar untuk melihat detail</p>
                    </div>
                )}
            </div>

            <ConfirmationModal 
                isOpen={confirmConfig.isOpen}
                title={confirmConfig.title}
                message={confirmConfig.message}
                onConfirm={confirmConfig.onConfirm}
                onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
};

export default RevisionHistory;