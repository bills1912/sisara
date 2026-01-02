
import { BudgetRow, ChangeStatus, MonthlyAllocation, ThemeConfig, RowType } from './types';

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatPercent = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'percent',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

export const formatNumberForInput = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(value) || value === 0) return '';
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

export const parseNumberFromInput = (input: string): number => {
  const clean = input.replace(/\./g, '');
  return parseFloat(clean) || 0;
};

export const parseCurrency = (input: string): number => {
  const clean = input.replace(/[^0-9,-]+/g, "").replace(',', '.');
  return parseFloat(clean) || 0;
};

export const calculateTotal = (volume: number, price: number): number => {
  return volume * price;
};

export const getChangeStatus = (row: BudgetRow): ChangeStatus => {
  if (row.isBlocked) return ChangeStatus.BLOCKED;
  
  const s = row.semula;
  const m = row.menjadi;

  if (s && !m) return ChangeStatus.DELETED;
  if (!s && m) return ChangeStatus.NEW;
  
  if (s && m) {
    if (s.volume !== m.volume || s.price !== m.price || s.total !== m.total) {
      return ChangeStatus.CHANGED;
    }
  }

  return ChangeStatus.UNCHANGED;
};

export const getAccountPrefix = (code: string): '51' | '52' | '53' | 'OTHER' => {
    const cleanCode = code.replace(/\./g, '').trim();
    if (cleanCode.startsWith('51')) return '51';
    if (cleanCode.startsWith('52')) return '52';
    if (cleanCode.startsWith('53')) return '53';
    return 'OTHER';
};

export const defaultTheme: ThemeConfig = {
  [ChangeStatus.UNCHANGED]: '#ffffff',
  [ChangeStatus.CHANGED]: '#fed7aa', 
  [ChangeStatus.NEW]: '#a5f3fc',     
  [ChangeStatus.DELETED]: '#ef4444', 
  [ChangeStatus.BLOCKED]: '#d8b4fe', 
};

export const getRowIndentClass = (type: string): string => {
  switch (type) {
    case 'SATKER': return 'pl-1';
    case 'PROGRAM': return 'pl-2';
    case 'ACTIVITY': return 'pl-6'; 
    case 'KRO': return 'pl-10';
    case 'RO': return 'pl-14';
    case 'COMPONENT': return 'pl-20';
    case 'SUBCOMPONENT': return 'pl-24';
    case 'ACCOUNT': return 'pl-28'; 
    case 'DETAIL': return 'pl-32';  
    default: return 'pl-2';
  }
};

export const getRowBaseColor = (type: string, isDarkMode: boolean): string => {
    if (isDarkMode) return 'transparent'; 
    
    switch (type) {
        case RowType.SATKER: return 'bg-gray-100 font-extrabold text-gray-900 border-gray-300';
        case RowType.PROGRAM: return 'bg-sky-100 font-bold text-gray-900'; 
        case RowType.ACTIVITY: return 'bg-indigo-50 font-bold text-indigo-900'; 
        case RowType.KRO: return 'bg-emerald-50'; 
        case RowType.RO: return 'bg-amber-50'; 
        case RowType.COMPONENT: return 'bg-white';
        case RowType.SUBCOMPONENT: return 'bg-white';
        case RowType.ACCOUNT: return 'bg-gray-50 font-semibold';
        case RowType.DETAIL: return 'bg-white';
        default: return 'bg-white';
    }
};

export const getRowBaseColorHex = (type: string, isDarkMode: boolean): string => {
    if (isDarkMode) return '#1f2937'; 
    
    switch (type) {
        case RowType.SATKER: return '#f3f4f6'; 
        case RowType.PROGRAM: return '#e0f2fe'; 
        case RowType.ACTIVITY: return '#eef2ff'; 
        case RowType.KRO: return '#ecfdf5'; 
        case RowType.RO: return '#fffbeb'; 
        case RowType.ACCOUNT: return '#f9fafb'; 
        default: return '#ffffff'; 
    }
};

export const getRowTextStyle = (type: string): string => {
    switch (type) {
        case RowType.SATKER: return 'font-extrabold text-gray-900 uppercase tracking-wide text-sm';
        case RowType.PROGRAM: return 'font-bold text-blue-900 uppercase tracking-normal';
        case RowType.ACTIVITY: return 'font-bold text-indigo-900 uppercase';
        case RowType.KRO: return 'font-bold text-emerald-900';
        case RowType.RO: return 'font-bold text-amber-900';
        case RowType.COMPONENT: return 'font-semibold text-gray-800';
        case RowType.SUBCOMPONENT: return 'font-medium italic text-gray-600';
        case RowType.ACCOUNT: return 'font-bold text-gray-700';
        case RowType.DETAIL: return 'text-gray-700'; 
        default: return 'text-gray-900';
    }
};

export const QUARTERS = [
  { name: 'Triwulan I', months: [0, 1, 2] },
  { name: 'Triwulan II', months: [3, 4, 5] },
  { name: 'Triwulan III', months: [6, 7, 8] },
  { name: 'Triwulan IV', months: [9, 10, 11] },
];

export const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const calculateAllocatedTotal = (allocation: MonthlyAllocation): number => {
  return Object.values(allocation).reduce((acc, curr) => acc + (curr.rpd || 0), 0);
};

// --- HIERARCHICAL CALCULATION LOGIC ---
export const recalculateBudget = (rows: BudgetRow[]): BudgetRow[] => {
    return rows.map(row => {
        // Base case: If no children, return row as is (Leaf node - User input)
        if (!row.children || row.children.length === 0) {
            return row;
        }

        // Recursive step: Process children first (Bottom-Up)
        const updatedChildren = recalculateBudget(row.children);

        // Calculate Sums from direct children
        const sumSemula = updatedChildren.reduce((acc, child) => acc + (child.semula?.total || 0), 0);
        const sumMenjadi = updatedChildren.reduce((acc, child) => acc + (child.menjadi?.total || 0), 0);
        const sumEfficiency = updatedChildren.reduce((acc, child) => acc + (child.efficiency || 0), 0);
        
        // Construct updated row with calculated totals
        return {
            ...row,
            children: updatedChildren,
            efficiency: sumEfficiency,
            semula: row.semula 
                ? { ...row.semula, total: sumSemula } 
                : (sumSemula > 0 ? { volume: 0, unit: '', price: 0, total: sumSemula } : null),
            menjadi: row.menjadi 
                ? { ...row.menjadi, total: sumMenjadi } 
                : (sumMenjadi > 0 ? { volume: 0, unit: '', price: 0, total: sumMenjadi } : null)
        };
    });
};

export const overwriteSemulaWithMenjadi = (rows: BudgetRow[]): BudgetRow[] => {
    return rows.map(row => {
        // 1. Recursive Step: Process children first
        if (row.children && row.children.length > 0) {
            const updatedChildren = overwriteSemulaWithMenjadi(row.children);
            
            // For Parent nodes, we preserve structure but reset manual efficiency.
            // RecalculateBudget will handle the summing up of Semula/Menjadi later.
            return {
                ...row,
                children: updatedChildren,
                efficiency: 0, 
            };
        }

        // 2. Base Case: Leaf Nodes
        // Logic Perbaikan:
        // Cek total nilai Menjadi dan Semula
        const totalMenjadi = row.menjadi?.total || 0;
        const totalSemula = row.semula?.total || 0;
        
        let sourceForBaseline = row.menjadi; // Default ambil dari Menjadi

        // KASUS PENTING: Jika Menjadi 0 (kosong) TAPI Semula ada isinya > 0,
        // Asumsikan user baru saja input data awal di Semula dan belum mengisi Menjadi.
        // Maka, pertahankan data Semula tersebut sebagai baseline baru.
        if (totalMenjadi === 0 && totalSemula > 0) {
            sourceForBaseline = row.semula;
        }

        // Deep copy untuk menghindari referensi
        const newDetail = sourceForBaseline 
            ? { ...sourceForBaseline } 
            : { volume: 0, unit: '', price: 0, total: 0 };

        return {
            ...row,
            efficiency: 0, // Reset efficiency
            semula: { ...newDetail }, // Semula Baru = Menjadi (atau Semula jika Menjadi kosong)
            menjadi: { ...newDetail }, // Menjadi Baru = Disamakan dengan Semula agar selisih 0
        };
    });
};
