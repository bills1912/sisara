
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { api } from '../api';
import { RevisionMeta, BudgetRow, ThemeConfig, RowType, ChangeStatus } from '../types';
import { Clock, RotateCcw, Loader2, AlertCircle, Eye, X, Settings2, ChevronDown, ChevronUp, CheckSquare, Square, EyeOff, Trash2 } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import { recalculateBudget, MONTH_NAMES, QUARTERS, defaultTheme, formatCurrency } from '../utils';
import BudgetRowItem from './BudgetRowItem';

interface Props {
    isDarkMode: boolean;
    onRestore: (data: BudgetRow[]) => void;
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
    const efisiensiWidth = 90 + 90; 

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
        efisiensi: 90
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
                            {/* Headers */}
                            <tr className="h-12">
                                <th className="sticky left-0 z-[70] bg-blue-700 text-white border-r border-b border-blue-600 px-4 w-[350px] min-w-[350px] max-w-[350px]" style={{ width: '350px', minWidth: '350px', maxWidth: '350px' }} rowSpan={3}>
                                    <div className="flex items-center justify-between">
                                        <span>Kode / Uraian</span>
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
                                {showSemula && <><th className={`sticky z-[60] border-r border-b border-gray-300 text-xs p-1 ${isDarkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-700'}`} style={{ left: `${getSemulaOffset()}px`, width: `${volValWidth + volUnitWidth}px`, ...stickyHeaderGapStyle }} colSpan={2}>Vol</th><th className={`sticky z-[60] border-r border-b border-gray-300 text-xs p-1 ${isDarkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-700'}`} style={{ left: `${getSemulaOffset() + volValWidth + volUnitWidth}px`, width: `${priceWidth}px` }}>Harga</th><th className={`sticky z-[60] border-r border-b border-gray-300 text-xs p-1 ${isDarkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-700'}`} style={{ left: `${getSemulaOffset() + volValWidth + volUnitWidth + priceWidth}px`, width: `${totalWidth}px` }}>Total</th></>}
                                {showMenjadi && <><th className={`sticky z-[60] border-r border-b border-gray-300 text-xs p-1 ${isDarkMode ? 'bg-yellow-900/50 text-gray-300' : 'bg-yellow-100 text-gray-800'}`} style={{ left: `${getMenjadiOffset()}px`, width: `${volValWidth + volUnitWidth}px`, ...stickyHeaderGapStyle }} colSpan={2}>Vol</th><th className={`sticky z-[60] border-r border-b border-gray-300 text-xs p-1 ${isDarkMode ? 'bg-yellow-900/50 text-gray-300' : 'bg-yellow-100 text-gray-800'}`} style={{ left: `${getMenjadiOffset() + volValWidth + volUnitWidth}px`, width: `${priceWidth}px` }}>Harga</th><th className={`sticky z-[60] border-r border-b border-gray-300 text-xs p-1 ${isDarkMode ? 'bg-yellow-900/50 text-gray-300' : 'bg-yellow-100 text-gray-800'}`} style={{ left: `${getMenjadiOffset() + volValWidth + volUnitWidth + priceWidth}px`, width: `${totalWidth}px` }}>Total</th></>}
                                {showSelisih && <th className={`sticky z-[60] border-r border-b border-gray-300 text-xs p-1 ${isDarkMode ? 'bg-orange-900/50 text-gray-300' : 'bg-orange-100 text-gray-800'}`} style={{ left: `${getSelisihOffset()}px`, width: `${selisihWidth}px`, ...stickyHeaderGapStyle }}>Nilai</th>}
                                {showEfisiensi && <><th className={`sticky z-[60] border-r border-b border-gray-300 text-xs p-1 ${isDarkMode ? 'bg-emerald-900/50 text-gray-300' : 'bg-emerald-100 text-gray-800'}`} style={{ left: `${getEfisiensiOffset()}px`, width: '90px', ...stickyHeaderGapStyle }}>Rincian</th><th className={`sticky z-[60] border-r border-b border-gray-300 text-xs p-1 ${isDarkMode ? 'bg-emerald-900/50 text-gray-300' : 'bg-emerald-100 text-gray-800'}`} style={{ left: `${getEfisiensiOffset() + 90}px`, width: '90px' }}>Total</th></>}
                                {visibleQuarters.map(q => q.months.map(m => (<React.Fragment key={`headers-${m}`}><th className={`border-r border-b border-gray-300 text-[9px] min-w-[80px] font-normal px-1 ${isDarkMode ? 'bg-pink-900/50 text-gray-300' : 'bg-pink-100 text-gray-800'}`}>Jml Realisasi</th><th className={`border-r border-b border-gray-300 text-[9px] min-w-[80px] font-normal px-1 ${isDarkMode ? 'bg-pink-900/50 text-gray-300' : 'bg-pink-100 text-gray-800'}`}>Jml Akan Real</th><th className={`border-r border-b border-gray-300 text-[9px] min-w-[90px] font-bold px-1 ${isDarkMode ? 'bg-pink-800/50 text-gray-300' : 'bg-pink-200 text-gray-800'}`}>TOTAL</th><th className={`border-r border-b border-gray-300 text-[9px] min-w-[70px] font-normal px-1 ${isDarkMode ? 'bg-purple-900/50 text-gray-300' : 'bg-purple-100 text-gray-800'}`}>Tgl</th><th className={`border-r border-b border-gray-300 text-[9px] min-w-[90px] font-normal px-1 ${isDarkMode ? 'bg-purple-900/50 text-gray-300' : 'bg-purple-100 text-gray-800'}`}>No. SPM</th><th className={`border-r border-b border-gray-300 text-[9px] min-w-[30px] font-normal px-1 ${isDarkMode ? 'bg-cyan-900/50 text-gray-300' : 'bg-cyan-100 text-gray-800'}`}>Cek</th><th className={`border-r border-b border-gray-300 text-[9px] min-w-[90px] font-normal px-1 ${isDarkMode ? 'bg-green-900/50 text-gray-300' : 'bg-green-100 text-gray-800'}`}>SP2D</th><th className={`border-r border-b border-gray-300 text-[9px] min-w-[90px] font-normal px-1 ${isDarkMode ? 'bg-red-900/50 text-gray-300' : 'bg-red-100 text-gray-800'}`}>Selisih</th></React.Fragment>)))}
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
                    </table>
                </div>
            </div>
        </div>
    );
};

const RevisionHistory: React.FC<Props> = ({ isDarkMode, onRestore }) => {
    const [revisions, setRevisions] = useState<RevisionMeta[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [restoringId, setRestoringId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    
    // Preview State
    const [previewData, setPreviewData] = useState<BudgetRow[] | null>(null);
    const [previewNote, setPreviewNote] = useState('');
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);

    // Confirmation Modal Config
    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

    const fetchHistory = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await api.getRevisions();
            setRevisions(data);
        } catch (e) {
            console.error("Failed to load history", e);
            setError("Gagal memuat riwayat revisi. Pastikan server backend berjalan.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Jakarta' // Force Jakarta Timezone UTC+7
        });
    };

    const handleRestoreClick = (rev: RevisionMeta) => {
        setConfirmConfig({
            isOpen: true,
            title: "Pulihkan Versi Revisi",
            message: `Apakah Anda yakin ingin memulihkan kondisi anggaran ke versi "${rev.note}" (${formatDate(rev.timestamp)})? Data saat ini akan ditimpa (namun history tetap tersimpan).`,
            onConfirm: () => performRestore(rev.id)
        });
    };

    const handleDeleteClick = (rev: RevisionMeta) => {
        setConfirmConfig({
            isOpen: true,
            title: "Hapus Riwayat Revisi",
            message: `Apakah Anda yakin ingin menghapus riwayat revisi "${rev.note}" secara permanen? Tindakan ini tidak dapat dibatalkan.`,
            onConfirm: () => performDelete(rev.id)
        });
    };

    const handlePreviewClick = async (rev: RevisionMeta) => {
        setIsLoadingPreview(true);
        try {
            const detail = await api.getRevisionDetail(rev.id);
            if (detail && detail.data) {
                // Ensure calculations are correct for display
                const processed = recalculateBudget(detail.data);
                setPreviewData(processed);
                setPreviewNote(rev.note);
                setIsPreviewOpen(true);
            }
        } catch (e) {
            alert("Gagal memuat preview snapshot.");
        } finally {
            setIsLoadingPreview(false);
        }
    };

    const performRestore = async (id: string) => {
        setRestoringId(id);
        try {
            const detail = await api.getRevisionDetail(id);
            if (detail && detail.data) {
                const processed = recalculateBudget(detail.data);
                onRestore(processed);
            }
        } catch (e) {
            alert("Gagal memulihkan revisi");
        } finally {
            setRestoringId(null);
            setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        }
    };

    const performDelete = async (id: string) => {
        setDeletingId(id);
        try {
            await api.deleteRevision(id);
            // Remove from local state immediately
            setRevisions(prev => prev.filter(r => r.id !== id));
        } catch (e) {
            alert("Gagal menghapus riwayat revisi.");
        } finally {
            setDeletingId(null);
            setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        }
    };

    return (
        <div className={`p-6 w-full h-full flex flex-col ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <div>
                    <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Riwayat Revisi</h2>
                    <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Daftar snapshot revisi anggaran yang telah disimpan. Anda dapat memulihkan ke kondisi sebelumnya kapan saja.
                    </p>
                </div>
                <button onClick={fetchHistory} className="px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm font-medium transition-colors">
                    Segarkan Data
                </button>
            </div>

            <div className={`flex-1 bg-white rounded-lg shadow overflow-hidden border flex flex-col ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                {isLoading ? (
                    <div className="flex-1 flex justify-center flex-col items-center text-gray-400">
                        <Loader2 className="animate-spin mb-2" size={32}/>
                        <p>Memuat riwayat...</p>
                    </div>
                ) : error ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center text-red-500">
                        <AlertCircle size={48} className="mb-4" />
                        <h3 className="text-lg font-bold">Terjadi Kesalahan</h3>
                        <p className="mt-2 text-sm text-gray-500">{error}</p>
                        <button onClick={fetchHistory} className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors">
                            Coba Lagi
                        </button>
                    </div>
                ) : revisions.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500 italic p-12">
                        <Clock size={48} className="mb-4 opacity-20"/>
                        <p>Belum ada riwayat revisi yang disimpan.</p> 
                        <p className="text-sm mt-2">Aktifkan "Mode Revisi" dan simpan snapshot untuk memulai.</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left">
                            <thead className={`sticky top-0 z-10 ${isDarkMode ? 'bg-gray-900 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
                                <tr>
                                    <th className="p-4 border-b font-semibold w-1/2">Keterangan Revisi</th>
                                    <th className="p-4 border-b font-semibold w-1/4">Waktu Disimpan</th>
                                    <th className="p-4 border-b font-semibold text-center w-1/4">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                                {revisions.map((rev) => (
                                    <tr key={rev.id} className={`${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} transition-colors`}>
                                        <td className={`p-4 align-middle ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                            <div className="font-bold text-lg">{rev.note}</div>
                                            <div className={`text-xs font-mono mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>ID: {rev.id}</div>
                                        </td>
                                        <td className={`p-4 align-middle ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                            <div className="flex items-center gap-2">
                                                <Clock size={16} className="text-gray-400"/>
                                                <span>{formatDate(rev.timestamp)}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-center align-middle">
                                            <div className="flex justify-center gap-2">
                                                <button 
                                                    onClick={() => handlePreviewClick(rev)}
                                                    className={`px-3 py-2 border rounded transition-colors text-sm font-medium inline-flex items-center gap-2 ${isDarkMode ? 'border-gray-500 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}
                                                    disabled={isLoadingPreview}
                                                    title="Lihat isi revisi"
                                                >
                                                    {isLoadingPreview ? <Loader2 size={16} className="animate-spin"/> : <Eye size={16}/>}
                                                    <span className="hidden sm:inline">Preview</span>
                                                </button>
                                                <button 
                                                    onClick={() => handleRestoreClick(rev)}
                                                    disabled={restoringId !== null || deletingId !== null}
                                                    className="px-3 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50 transition-colors text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50"
                                                    title="Pulihkan data"
                                                >
                                                    {restoringId === rev.id ? <Loader2 size={16} className="animate-spin"/> : <RotateCcw size={16}/>}
                                                    <span className="hidden sm:inline">{restoringId === rev.id ? '...' : 'Pulihkan'}</span>
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteClick(rev)}
                                                    disabled={restoringId !== null || deletingId !== null}
                                                    className="px-3 py-2 border border-red-500 text-red-600 rounded hover:bg-red-50 transition-colors text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50"
                                                    title="Hapus permanen"
                                                >
                                                    {deletingId === rev.id ? <Loader2 size={16} className="animate-spin"/> : <Trash2 size={16}/>}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <ConfirmationModal 
                isOpen={confirmConfig.isOpen}
                title={confirmConfig.title}
                message={confirmConfig.message}
                onConfirm={confirmConfig.onConfirm}
                onCancel={() => setConfirmConfig({...confirmConfig, isOpen: false})}
                isLoading={restoringId !== null || deletingId !== null}
            />

            {/* PREVIEW MODAL */}
            {isPreviewOpen && previewData && (
                <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4 animate-in fade-in duration-200 isolate">
                    <div className={`w-full max-w-[95vw] h-[95vh] rounded-lg shadow-2xl flex flex-col overflow-hidden ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
                        <div className={`flex justify-between items-center p-4 border-b ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                             <div>
                                <h3 className="font-bold text-lg">Preview Snapshot</h3>
                                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{previewNote}</p>
                             </div>
                             <button onClick={() => setIsPreviewOpen(false)} className="p-2 hover:bg-black/10 rounded-full transition-colors">
                                <X size={24} />
                             </button>
                        </div>
                        <div className="flex-1 overflow-hidden p-0 relative isolate">
                             {/* Render FULL table for preview */}
                             <FullPreviewTable data={previewData} isDarkMode={isDarkMode} />
                        </div>
                        <div className={`p-4 border-t flex justify-end gap-3 ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                             <button 
                                onClick={() => setIsPreviewOpen(false)}
                                className={`px-4 py-2 rounded text-sm font-medium ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
                             >
                                Tutup
                             </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RevisionHistory;
