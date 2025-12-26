

import { BudgetRow, RowType } from './types';

export const initialData: BudgetRow[] = [
  {
    id: 'root-satker',
    code: '689114',
    description: 'BADAN PUSAT STATISTIK KOTA GUNUNGSITOLI',
    type: RowType.SATKER,
    semula: { volume: 0, unit: '', price: 0, total: 0 }, // Auto-calculated by recalculateBudget
    menjadi: { volume: 0, unit: '', price: 0, total: 0 }, // Auto-calculated by recalculateBudget
    monthlyAllocation: {},
    isOpen: true,
    children: [
        {
            id: '1',
            code: '054.01.GG',
            description: 'Program Penyediaan dan Pelayanan Informasi Statistik',
            type: RowType.PROGRAM,
            semula: null, // Auto-calculated
            menjadi: null, // Auto-calculated
            monthlyAllocation: {},
            isOpen: true,
            children: [
            {
                id: '1-1',
                code: '2896',
                description: 'Pengembangan dan Analisis Statistik',
                type: RowType.KRO,
                semula: null,
                menjadi: null,
                monthlyAllocation: {},
                isOpen: true,
                children: [
                {
                    id: '1-1-1',
                    code: '2896.BMA',
                    description: 'Data dan Informasi Publik [Base Line]',
                    type: RowType.RO,
                    semula: { volume: 1, unit: 'Layanan', price: 0, total: 0 },
                    menjadi: { volume: 1, unit: 'Layanan', price: 0, total: 0 },
                    monthlyAllocation: {},
                    isOpen: true,
                    children: [
                    {
                        id: '1-1-1-1',
                        code: '2896.BMA.004',
                        description: 'PUBLIKASI/LAPORAN ANALISIS DAN PENGEMBANGAN STATISTIK',
                        type: RowType.COMPONENT,
                        semula: { volume: 1, unit: 'Layanan', price: 0, total: 0 },
                        menjadi: { volume: 1, unit: 'Layanan', price: 0, total: 0 },
                        monthlyAllocation: {
                        0: { rpd: 500000, realization: 0, spm: '', date: '', isVerified: false, sp2d: 0 },
                        5: { rpd: 1500000, realization: 0, spm: '', date: '', isVerified: false, sp2d: 0 }
                        },
                        isOpen: true,
                        children: [
                        {
                            id: '1-1-1-1-1',
                            code: '051',
                            description: 'PERSIAPAN',
                            type: RowType.SUBCOMPONENT,
                            semula: null,
                            menjadi: null,
                            monthlyAllocation: {},
                            isOpen: true,
                            children: [
                            {
                                id: '1-1-1-1-1-1',
                                code: '521811',
                                description: 'Belanja Barang Persediaan Barang Konsumsi',
                                type: RowType.ITEM,
                                semula: { volume: 1, unit: 'PAKET', price: 1490000, total: 1490000 },
                                menjadi: { volume: 1, unit: 'PAKET', price: 1490000, total: 1490000 },
                                monthlyAllocation: {},
                                children: []
                            }
                            ]
                        },
                        {
                            id: '1-1-1-1-2',
                            code: '052',
                            description: 'PENGUMPULAN DATA',
                            type: RowType.SUBCOMPONENT,
                            semula: null,
                            menjadi: null,
                            monthlyAllocation: {},
                            isOpen: true,
                            children: [
                            {
                                id: '1-1-1-1-2-1',
                                code: '524113',
                                description: 'Belanja Perjalanan Dinas Dalam Kota',
                                type: RowType.ITEM,
                                semula: { volume: 5, unit: 'O-K', price: 0, total: 0 },
                                menjadi: { volume: 5, unit: 'O-K', price: 0, total: 0 },
                                monthlyAllocation: {},
                                children: [
                                    {
                                        id: '1-1-1-1-2-1-1',
                                        code: '-',
                                        description: 'Transport lokal pengumpulan data KDA',
                                        type: RowType.ITEM,
                                        semula: { volume: 5, unit: 'O-K', price: 102000, total: 510000 },
                                        menjadi: { volume: 5, unit: 'O-K', price: 102000, total: 510000 },
                                        monthlyAllocation: {},
                                        children: []
                                    }
                                ]
                            }
                            ]
                        }
                        ]
                    }
                    ]
                }
                ]
            }
            ]
        }
    ]
  }
];
