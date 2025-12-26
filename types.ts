

export enum RowType {
  SATKER = 'SATKER', // New Root Level
  PROGRAM = 'PROGRAM',
  KRO = 'KRO', // Klasifikasi Rincian Output
  RO = 'RO',   // Rincian Output
  COMPONENT = 'COMPONENT',
  SUBCOMPONENT = 'SUBCOMPONENT',
  HEADER_ACCOUNT = 'HEADER_ACCOUNT', // A. TANPA SUB KOMPONEN
  ITEM = 'ITEM'
}

export enum ChangeStatus {
  UNCHANGED = 'UNCHANGED',
  CHANGED = 'CHANGED',
  NEW = 'NEW',
  DELETED = 'DELETED',
  BLOCKED = 'BLOCKED'
}

export interface BudgetDetail {
  volume: number;
  unit: string;
  price: number;
  total: number;
}

export interface MonthlyDetail {
  rpd: number;           // Rencana Penarikan Dana
  realization: number;   // Jumlah akan Realisasi (was Realisasi)
  spm: string;           // No. SPM (New)
  date: string;          // Tanggal Pelaksanaan
  isVerified: boolean;   // Ceklis
  sp2d: number;          // Realisasi SP2D
}

export interface MonthlyAllocation {
  [monthIndex: number]: MonthlyDetail;
}

export interface BudgetRow {
  id: string;
  code: string;
  description: string;
  type: RowType;
  
  // Data Semula (Original)
  semula: BudgetDetail | null;
  
  // Data Menjadi (Revised)
  menjadi: BudgetDetail | null;
  
  // Monthly Plan (Only relevant for 'Menjadi')
  monthlyAllocation: MonthlyAllocation;

  // Manual override for status (e.g., blocking an item)
  isBlocked?: boolean;
  
  // Hierarchy
  children: BudgetRow[];
  isOpen?: boolean; // For UI toggling
}

export interface ThemeConfig {
  [ChangeStatus.CHANGED]: string;
  [ChangeStatus.NEW]: string;
  [ChangeStatus.DELETED]: string;
  [ChangeStatus.BLOCKED]: string;
  [ChangeStatus.UNCHANGED]: string;
}

// Master data type definition
export type MasterData = {
    [key in RowType]?: { code: string; desc: string }[];
};

// Helper to check if a row is a calculation leaf (usually ITEM or RO depending on depth)
export const isLeafCalculation = (type: RowType): boolean => {
  return type === RowType.ITEM || type === RowType.RO; 
};
