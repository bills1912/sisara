import io
from typing import List
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter
from reportlab.lib import colors
from reportlab.lib.pagesizes import A3, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib.styles import getSampleStyleSheet
from app.models.schemas import BudgetRowResponse, RowType, MonthlyDetail

class ExportService:
    def __init__(self):
        # Mapping indentasi visual berdasarkan tipe
        self.indent_map = {
            RowType.SATKER: 0,
            RowType.PROGRAM: 1,
            RowType.ACTIVITY: 2,
            RowType.KRO: 3,
            RowType.RO: 4,
            RowType.COMPONENT: 5,
            RowType.SUBCOMPONENT: 6,
            RowType.ACCOUNT: 7,
            RowType.DETAIL: 8
        }
        
        # Mapping warna background Excel (Hex ARGB)
        self.color_map = {
            RowType.SATKER: "FFEEEEEE",
            RowType.PROGRAM: "FFE0F2FE", # Light Blue
            RowType.ACTIVITY: "FFEEF2FF", # Indigo
            RowType.KRO: "FFECFDF5", # Emerald
            RowType.RO: "FFFFFBEB", # Amber
            RowType.ACCOUNT: "FFF9FAFB", # Gray
        }

    def _flatten_tree(self, nodes: List[BudgetRowResponse], result: List[BudgetRowResponse]):
        """Helper untuk meratakan tree menjadi list baris demi baris"""
        for node in nodes:
            result.append(node)
            if node.children:
                self._flatten_tree(node.children, result)

    def generate_excel(self, data: List[BudgetRowResponse]) -> io.BytesIO:
        wb = Workbook()
        ws = wb.active
        ws.title = "Rincian Kertas Kerja"

        # --- 1. SETUP HEADERS ---
        # Headers Row 1
        headers_1 = [
            ("Kode", 1, 3), ("Uraian", 1, 3), 
            ("Semula", 4, 1), ("Menjadi", 4, 1), 
            ("Rencana Penarikan Dana (RPD) & Realisasi", 13, 1)
        ]
        
        col_idx = 1
        for title, width, height in headers_1:
            cell = ws.cell(row=1, column=col_idx, value=title)
            if width > 1 or height > 1:
                ws.merge_cells(start_row=1, start_column=col_idx, 
                               end_row=1+(height-1), end_column=col_idx+(width-1))
            col_idx += width

        # Headers Row 2 (Sub-headers)
        # Semula & Menjadi sub-headers
        ws.cell(row=2, column=3, value="Vol").alignment = Alignment(horizontal='center')
        ws.cell(row=2, column=4, value="Sat").alignment = Alignment(horizontal='center')
        ws.cell(row=2, column=5, value="Harga").alignment = Alignment(horizontal='center')
        ws.cell(row=2, column=6, value="Jumlah").alignment = Alignment(horizontal='center')
        
        ws.cell(row=2, column=7, value="Vol").alignment = Alignment(horizontal='center')
        ws.cell(row=2, column=8, value="Sat").alignment = Alignment(horizontal='center')
        ws.cell(row=2, column=9, value="Harga").alignment = Alignment(horizontal='center')
        ws.cell(row=2, column=10, value="Jumlah").alignment = Alignment(horizontal='center')

        # Months
        months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des', 'Total']
        for i, m in enumerate(months):
            cell = ws.cell(row=2, column=11+i, value=m)
            cell.alignment = Alignment(horizontal='center')
            # Merge vertical for months to row 3 (if we want consistency with main headers, but let's keep it simple)

        # Styling Headers
        header_font = Font(bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="FF1E3A8A", end_color="FF1E3A8A", fill_type="solid") # Blue 800
        thin_border = Border(left=Side(style='thin'), right=Side(style='thin'), top=Side(style='thin'), bottom=Side(style='thin'))

        for row in ws.iter_rows(min_row=1, max_row=3, max_col=23):
            for cell in row:
                cell.font = header_font
                cell.fill = header_fill
                cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
                cell.border = thin_border

        # Adjust Column Widths
        ws.column_dimensions['A'].width = 15 # Kode
        ws.column_dimensions['B'].width = 50 # Uraian
        for i in range(3, 24):
            ws.column_dimensions[get_column_letter(i)].width = 12

        # --- 2. POPULATE DATA ---
        flat_data = []
        self._flatten_tree(data, flat_data)

        current_row = 4
        for item in flat_data:
            # Basic Info
            ws.cell(row=current_row, column=1, value=item.code).alignment = Alignment(vertical='top')
            
            # Uraian with Indentation
            desc_cell = ws.cell(row=current_row, column=2, value=item.description)
            indent_level = self.indent_map.get(item.type, 0)
            desc_cell.alignment = Alignment(indent=indent_level, vertical='top', wrap_text=True)

            # Style based on Type
            if item.type in self.color_map:
                fill_color = self.color_map[item.type]
                row_fill = PatternFill(start_color=fill_color, end_color=fill_color, fill_type="solid")
                for col in range(1, 24):
                    ws.cell(row=current_row, column=col).fill = row_fill
            
            is_bold = item.type not in [RowType.DETAIL, RowType.SUBCOMPONENT]
            if is_bold:
                for col in range(1, 24):
                    ws.cell(row=current_row, column=col).font = Font(bold=True)

            # Semula
            if item.semula:
                ws.cell(row=current_row, column=3, value=item.semula.volume)
                ws.cell(row=current_row, column=4, value=item.semula.unit)
                ws.cell(row=current_row, column=5, value=item.semula.price).number_format = '#,##0'
                ws.cell(row=current_row, column=6, value=item.semula.total).number_format = '#,##0'

            # Menjadi
            if item.menjadi:
                ws.cell(row=current_row, column=7, value=item.menjadi.volume)
                ws.cell(row=current_row, column=8, value=item.menjadi.unit)
                ws.cell(row=current_row, column=9, value=item.menjadi.price).number_format = '#,##0'
                ws.cell(row=current_row, column=10, value=item.menjadi.total).number_format = '#,##0'

            # Monthly RPD
            total_rpd = 0
            for i in range(12):
                m_key = str(i)
                val = 0
                if item.monthlyAllocation and m_key in item.monthlyAllocation:
                    # monthlyAllocation bisa berupa dict atau object, tergantung pydantic parsing
                    alloc = item.monthlyAllocation[m_key]
                    # Handle jika alloc adalah object MonthlyDetail atau dict
                    val = alloc.rpd if hasattr(alloc, 'rpd') else alloc.get('rpd', 0)
                    # Add realization logic if needed: val = rpd + realization
                    real = alloc.realization if hasattr(alloc, 'realization') else alloc.get('realization', 0)
                    val += real
                
                ws.cell(row=current_row, column=11+i, value=val).number_format = '#,##0'
                total_rpd += val
            
            # Total RPD Row
            ws.cell(row=current_row, column=23, value=total_rpd).number_format = '#,##0'

            # Borders
            for col in range(1, 24):
                ws.cell(row=current_row, column=col).border = thin_border

            current_row += 1

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        return output

    def generate_pdf(self, data: List[BudgetRowResponse]) -> io.BytesIO:
        buffer = io.BytesIO()
        # Landscape A3 karena kolomnya sangat banyak
        doc = SimpleDocTemplate(buffer, pagesize=landscape(A3), rightMargin=20, leftMargin=20, topMargin=20, bottomMargin=20)
        
        elements = []
        styles = getSampleStyleSheet()
        
        # Title
        elements.append(Paragraph("Laporan Rincian Kertas Kerja Anggaran", styles['Title']))
        
        # Flatten Data
        flat_data = []
        self._flatten_tree(data, flat_data)

        # Table Header
        table_data = [
            ['Kode', 'Uraian', 'Pagu Semula', '', 'Pagu Menjadi', '', 'Total Realisasi'],
            ['', '', 'Vol', 'Jml', 'Vol', 'Jml', 'Jan-Des']
        ]

        # Table Content
        for item in flat_data:
            # Indent logic via spaces (PDF specific)
            indent = "&nbsp;" * (self.indent_map.get(item.type, 0) * 4)
            desc = Paragraph(f"{indent}{item.description}", styles['Normal'])
            
            semula_vol = item.semula.volume if item.semula else 0
            semula_total = "{:,.0f}".format(item.semula.total) if item.semula else "0"
            
            menjadi_vol = item.menjadi.volume if item.menjadi else 0
            menjadi_total = "{:,.0f}".format(item.menjadi.total) if item.menjadi else "0"

            # Hitung total realisasi (simplified for PDF readability)
            total_real = 0
            if item.monthlyAllocation:
                for k, v in item.monthlyAllocation.items():
                    val = v.rpd if hasattr(v, 'rpd') else v.get('rpd', 0)
                    real = v.realization if hasattr(v, 'realization') else v.get('realization', 0)
                    total_real += (val + real)
            
            formatted_real = "{:,.0f}".format(total_real)

            row = [
                item.code,
                desc,
                semula_vol,
                semula_total,
                menjadi_vol,
                menjadi_total,
                formatted_real
            ]
            table_data.append(row)

        # Column Widths
        col_widths = [80, 400, 40, 90, 40, 90, 90]

        # Style
        t = Table(table_data, colWidths=col_widths, repeatRows=2)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 1), colors.darkblue),
            ('TEXTCOLOR', (0, 0), (-1, 1), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (2, 0), (-1, -1), 'RIGHT'), # Numbers right aligned
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('SPAN', (0,0), (0,1)), # Merge Kode
            ('SPAN', (1,0), (1,1)), # Merge Uraian
            ('SPAN', (2,0), (3,0)), # Merge Semula
            ('SPAN', (4,0), (5,0)), # Merge Menjadi
        ]))

        elements.append(t)
        doc.build(elements)
        buffer.seek(0)
        return buffer

export_service = ExportService()