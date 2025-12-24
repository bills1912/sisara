import { BudgetRow, ChangeStatus, MonthlyAllocation, ThemeConfig } from './types';

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

// New helper for input display (10000 -> "10.000")
export const formatNumberForInput = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(value) || value === 0) return '';
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// New helper to parse input back to number ("10.000" -> 10000)
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
    // Remove dots and trim
    const cleanCode = code.replace(/\./g, '').trim();
    if (cleanCode.startsWith('51')) return '51';
    if (cleanCode.startsWith('52')) return '52';
    if (cleanCode.startsWith('53')) return '53';
    return 'OTHER';
};

export const defaultTheme: ThemeConfig = {
  [ChangeStatus.UNCHANGED]: '#ffffff',
  [ChangeStatus.CHANGED]: '#fed7aa', // orange-200
  [ChangeStatus.NEW]: '#a5f3fc',     // cyan-200
  [ChangeStatus.DELETED]: '#ef4444', // red-500
  [ChangeStatus.BLOCKED]: '#d8b4fe', // purple-300
};

export const getRowIndentClass = (type: string): string => {
  switch (type) {
    case 'PROGRAM': return 'pl-2 font-bold bg-gray-100';
    case 'KRO': return 'pl-6 font-semibold text-blue-800';
    case 'RO': return 'pl-10 font-medium text-red-800';
    case 'COMPONENT': return 'pl-14 font-medium';
    case 'SUBCOMPONENT': return 'pl-20 italic text-gray-600';
    case 'ITEM': return 'pl-24';
    default: return 'pl-2';
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