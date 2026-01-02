
import ExcelJS from 'exceljs';
import { BudgetRow, RowType, MonthlyDetail } from './types';
import { getRowBaseColorHex, MONTH_NAMES, QUARTERS } from './utils';

export const exportToExcel = async (data: BudgetRow[]) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Rincian Anggaran');

    // --- SETUP HEADER STRUCTURE ---
    
    // Row 1: High Level Headers
    worksheet.getCell('A1').value = 'Kode';
    worksheet.mergeCells('A1:A3');
    
    worksheet.getCell('B1').value = 'Uraian';
    worksheet.mergeCells('B1:B3');

    worksheet.getCell('C1').value = 'SEMULA';
    worksheet.mergeCells('C1:F2'); 

    worksheet.getCell('G1').value = 'MENJADI';
    worksheet.mergeCells('G1:J2');

    worksheet.getCell('K1').value = 'SELISIH';
    worksheet.mergeCells('K1:K3');

    worksheet.getCell('L1').value = 'EFISIENSI';
    worksheet.mergeCells('L1:L2'); // Merged vertically for title only, 1 col now

    let colIdx = 13; 
    // Quarters Headers (Row 1)
    QUARTERS.forEach(q => {
        const startCol = colIdx;
        const widthPerMonth = 7; // Jml Real, Jml Akan, Total, Tgl, SPM, SP2D, Selisih
        const summaryCols = 3; // Target, Real, Sisa
        const totalQWidth = (q.months.length * widthPerMonth) + summaryCols;
        
        const endCol = colIdx + totalQWidth - 1;
        
        const cell = worksheet.getCell(1, startCol);
        cell.value = q.name.toUpperCase();
        worksheet.mergeCells(1, startCol, 1, endCol);
        
        colIdx = endCol + 1;
    });

    // Row 2: Month Names & Subheaders
    colIdx = 13;
    QUARTERS.forEach(q => {
        q.months.forEach(m => {
            const startCol = colIdx;
            const endCol = colIdx + 6; 
            const cell = worksheet.getCell(2, startCol);
            cell.value = MONTH_NAMES[m].toUpperCase();
            worksheet.mergeCells(2, startCol, 2, endCol);
            colIdx += 7;
        });
        
        // Quarter Summaries
        worksheet.getCell(2, colIdx).value = 'TOTAL TARGET TW';
        worksheet.mergeCells(2, colIdx, 3, colIdx);
        colIdx++;
        
        worksheet.getCell(2, colIdx).value = 'TOTAL REALISASI TW';
        worksheet.mergeCells(2, colIdx, 3, colIdx);
        colIdx++;
        
        worksheet.getCell(2, colIdx).value = 'SISA TW';
        worksheet.mergeCells(2, colIdx, 3, colIdx);
        colIdx++;
    });

    // Row 3: Detail Headers
    const headers3 = [
        { col: 3, val: 'Vol' }, { col: 4, val: 'Sat' }, { col: 5, val: 'Harga' }, { col: 6, val: 'Total' },
        { col: 7, val: 'Vol' }, { col: 8, val: 'Sat' }, { col: 9, val: 'Harga' }, { col: 10, val: 'Total' },
        { col: 12, val: 'Total' }, // Efficiency Total Only
    ];
    headers3.forEach(h => worksheet.getCell(3, h.col).value = h.val);

    colIdx = 13;
    QUARTERS.forEach(q => {
        q.months.forEach(() => {
            const mHeaders = ['Jml Realisasi', 'Jml Akan Real', 'Total', 'Tgl', 'No. SPM', 'SP2D', 'Selisih'];
            mHeaders.forEach((h, i) => {
                worksheet.getCell(3, colIdx + i).value = h;
            });
            colIdx += 7;
        });
        colIdx += 3; // Skip summary cols
    });

    // --- STYLING HEADERS ---
    [1, 2, 3].forEach(r => {
        const row = worksheet.getRow(r);
        row.eachCell((cell) => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }; // Blue 800
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        });
    });

    // --- FREEZE PANES ---
    // Freeze 2 columns (Kode, Uraian) and 3 rows
    worksheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 3 }];

    // --- POPULATE DATA ---
    const flatData: { row: BudgetRow, level: number }[] = [];
    const flatten = (rows: BudgetRow[], level = 0) => {
        rows.forEach(r => {
            flatData.push({ row: r, level });
            if (r.children && r.children.length > 0) {
                 flatten(r.children, level + 1);
            }
        });
    };
    flatten(data);

    let currentRowIdx = 4;
    flatData.forEach(({ row, level }) => {
        const rowObj = worksheet.getRow(currentRowIdx);
        
        // Colors
        let bgHex = getRowBaseColorHex(row.type, false);
        if (bgHex.startsWith('#')) bgHex = bgHex.substring(1);
        // Special case for white to avoid gray looking cells if logic differs
        if (bgHex.toLowerCase() === 'ffffff' || bgHex === 'transparent') bgHex = 'FFFFFF';
        
        const fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + bgHex } } as ExcelJS.Fill;
        
        // 1. Kode
        const cellKode = rowObj.getCell(1);
        cellKode.value = row.code;
        cellKode.alignment = { vertical: 'top', horizontal: 'left' };
        
        // 2. Uraian (Indented)
        const cellDesc = rowObj.getCell(2);
        cellDesc.value = row.description;
        cellDesc.alignment = { vertical: 'top', horizontal: 'left', wrapText: true, indent: level };

        // Helpers
        const setNum = (c: number, val: number | undefined) => {
            rowObj.getCell(c).value = val || 0;
            rowObj.getCell(c).numFmt = '#,##0';
        };
        const setStr = (c: number, val: string | undefined) => {
            rowObj.getCell(c).value = val || '';
        };

        // Data Columns
        setNum(3, row.semula?.volume);
        setStr(4, row.semula?.unit);
        setNum(5, row.semula?.price);
        setNum(6, row.semula?.total);

        setNum(7, row.menjadi?.volume);
        setStr(8, row.menjadi?.unit);
        setNum(9, row.menjadi?.price);
        setNum(10, row.menjadi?.total);

        const selisih = (row.semula?.total || 0) - (row.menjadi?.total || 0);
        setNum(11, selisih);
        
        // Efficiency (Now Col 12 is directly Total)
        setNum(12, row.efficiency || 0);

        // Monthly Data
        let cIdx = 13;
        QUARTERS.forEach(q => {
            let qRpd = 0;
            let qReal = 0;
            q.months.forEach(m => {
                const defaultDetail: MonthlyDetail = {
                    rpd: 0,
                    realization: 0,
                    spm: '',
                    date: '',
                    isVerified: false,
                    sp2d: 0
                };
                const detail = row.monthlyAllocation[m] || defaultDetail;
                const rpd = detail.rpd || 0;
                const real = detail.realization || 0;
                const total = rpd + real;
                const sp2d = detail.sp2d || 0;
                const gap = total - sp2d;

                qRpd += rpd;
                qReal += real;
                
                setNum(cIdx, rpd);
                setNum(cIdx+1, real);
                setNum(cIdx+2, total);
                setStr(cIdx+3, detail.date);
                setStr(cIdx+4, detail.spm);
                setNum(cIdx+5, sp2d);
                setNum(cIdx+6, gap);
                
                cIdx += 7;
            });
            
            // Quarter Summaries
            setNum(cIdx, qRpd);
            setNum(cIdx+1, qReal);
            setNum(cIdx+2, qRpd - qReal);
            
            cIdx += 3;
        });

        // Apply Styles
        for(let i=1; i < cIdx; i++) {
            const cell = rowObj.getCell(i);
            cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            cell.fill = fill;
            if (row.type !== RowType.DETAIL && row.type !== RowType.SUBCOMPONENT) {
                cell.font = { bold: true };
            }
        }

        currentRowIdx++;
    });

    // Adjust Widths
    worksheet.getColumn(1).width = 20; 
    worksheet.getColumn(2).width = 60; 
    for(let i=3; i<=12; i++) worksheet.getColumn(i).width = 15;
    // Monthly columns width
    for(let i=13; i<colIdx; i++) worksheet.getColumn(i).width = 13;

    // Trigger Download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rincian_Anggaran_Lengkap_${new Date().toISOString().slice(0,10)}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
};
