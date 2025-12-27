
import { BudgetRow, RowType } from './types';

export const initialData: BudgetRow[] = [
  {
    id: 'root-satker',
    code: '689114',
    description: 'BADAN PUSAT STATISTIK KOTA GUNUNGSITOLI',
    type: RowType.SATKER,
    semula: { volume: 0, unit: '', price: 0, total: 0 },
    menjadi: { volume: 0, unit: '', price: 0, total: 0 },
    monthlyAllocation: {},
    isOpen: true,
    children: [
        {
            id: '1',
            code: '054.01.GG',
            description: 'Program Penyediaan dan Pelayanan Informasi Statistik',
            type: RowType.PROGRAM,
            semula: null,
            menjadi: null,
            monthlyAllocation: {},
            isOpen: true,
            children: [
                {
                    id: '1-A',
                    code: '2896',
                    description: 'Kegiatan Pengembangan dan Analisis Statistik',
                    type: RowType.ACTIVITY,
                    semula: null,
                    menjadi: null,
                    monthlyAllocation: {},
                    isOpen: true,
                    children: [
                        {
                            id: '1-1',
                            code: '2896.BMA',
                            description: 'Data dan Informasi Publik [Base Line]',
                            type: RowType.KRO,
                            semula: null,
                            menjadi: null,
                            monthlyAllocation: {},
                            isOpen: true,
                            children: [
                            {
                                id: '1-1-1',
                                code: '2896.BMA.004',
                                description: 'PUBLIKASI/LAPORAN ANALISIS DAN PENGEMBANGAN STATISTIK',
                                type: RowType.RO,
                                semula: { volume: 1, unit: 'Layanan', price: 0, total: 0 },
                                menjadi: { volume: 1, unit: 'Layanan', price: 0, total: 0 },
                                monthlyAllocation: {},
                                isOpen: true,
                                children: [
                                {
                                    id: '1-1-1-1',
                                    code: '051',
                                    description: 'PERSIAPAN',
                                    type: RowType.COMPONENT,
                                    semula: { volume: 1, unit: 'Layanan', price: 0, total: 0 },
                                    menjadi: { volume: 1, unit: 'Layanan', price: 0, total: 0 },
                                    monthlyAllocation: {},
                                    isOpen: true,
                                    children: [
                                    {
                                        id: '1-1-1-1-1',
                                        code: 'A',
                                        description: 'Tanpa Sub Komponen',
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
                                            type: RowType.ACCOUNT,
                                            semula: { volume: 1, unit: 'PAKET', price: 1490000, total: 1490000 },
                                            menjadi: { volume: 1, unit: 'PAKET', price: 1490000, total: 1490000 },
                                            monthlyAllocation: {},
                                            isOpen: true,
                                            children: [
                                                {
                                                    id: '1-1-1-1-1-1-1',
                                                    code: '-',
                                                    description: 'ATK Kegiatan Analisis',
                                                    type: RowType.DETAIL,
                                                    semula: { volume: 1, unit: 'PAKET', price: 1490000, total: 1490000 },
                                                    menjadi: { volume: 1, unit: 'PAKET', price: 1490000, total: 1490000 },
                                                    monthlyAllocation: {
                                                        0: { rpd: 500000, realization: 0, spm: '', date: '', isVerified: false, sp2d: 0 },
                                                        5: { rpd: 990000, realization: 0, spm: '', date: '', isVerified: false, sp2d: 0 }
                                                    },
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
    ]
  }
];
