
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BudgetRow, ChangeStatus, RowType, ThemeConfig } from '../types';
import { formatCurrency, getChangeStatus, getRowIndentClass, getRowBaseColor, getRowTextStyle } from '../utils';
import { ChevronDown, ChevronRight, Edit2, PlusCircle, Copy, MoreVertical, Trash2 } from 'lucide-react';

interface QuarterDefinition {
    name: string;
    months: number[];
}

interface Props {
  row: BudgetRow;
  level: number;
  showSemula: boolean;
  showMenjadi: boolean;
  showSelisih: boolean;
  showEfisiensi: boolean;
  visibleQuarters: QuarterDefinition[];
  offsets: {
      semula: number;
      menjadi: number;
      selisih: number;
      efisiensi: number;
  };
  widths: {
      volVal: number;
      volUnit: number;
      price: number;
      total: number;
      selisih: number;
      efisiensi: number;
  };
  theme: ThemeConfig;
  onSelect: (row: BudgetRow, section: 'SEMULA' | 'MENJADI' | 'MONTHLY', monthIndex?: number) => void;
  onToggle: (id: string) => void;
  onAddChild: (row: BudgetRow) => void;
  onCopyRow: (row: BudgetRow) => void;
  onDeleteRow: (rowId: string) => void;
}

interface MenuPosition {
  left: number;
  top?: number;
  bottom?: number;
  placement: 'top' | 'bottom';
}

const BudgetRowItem: React.FC<Props> = ({ row, level, showSemula, showMenjadi, showSelisih, showEfisiensi, visibleQuarters, offsets, widths, theme, onSelect, onToggle, onAddChild, onCopyRow, onDeleteRow }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  const status = getChangeStatus(row);
  const indentClass = getRowIndentClass(row.type);
  const baseColorClass = getRowBaseColor(row.type, false); 
  const textStyleClass = getRowTextStyle(row.type);

  const hasChildren = row.children && row.children.length > 0;
  
  const changedColor = theme[status];
  const isChanged = status !== ChangeStatus.UNCHANGED;
  
  const isItemType = row.type === RowType.ITEM;
  const canEdit = (isItemType || row.menjadi !== null) && !row.isBlocked;

  // Determination if this is a "Summary" row that should have full pastel color
  const isSummaryRow = [RowType.PROGRAM, RowType.KRO, RowType.RO, RowType.HEADER_ACCOUNT].includes(row.type);
  
  // Helper to get cell background class/style
  const getCellBgStyle = (isDataCell: boolean = false) => {
      if (isSummaryRow) {
          // If summary row, use the base pastel color (via class name logic in rendering, usually no inline style needed unless overriding sticky)
          // But since sticky columns have white/gray bg by default in CSS classes, we need to enforce the pastel color.
          // baseColorClass returns a tailwind class like 'bg-blue-50'.
          // We can't return an object style easily for tailwind class.
          // Strategy: The `td` className will include `baseColorClass`.
          // For data cells that might have `isChanged` color, we need to decide priority.
          // Usually summary rows don't have "changes" highlighted in the same way, so we prioritize the row color.
          return {}; 
      }
      if (isDataCell && isChanged) {
          return { backgroundColor: changedColor };
      }
      return { backgroundColor: '#ffffff' };
  };

  // For sticky columns, we need to explicitly set the background color to match the row color 
  // because sticky elements sit on top of others.
  // We'll use a mapping of tailwind classes to hex for the sticky `style` prop if it's a summary row, 
  // or just rely on the fact that we can apply the class to the TD. 
  // Note: Sticky TDs need an opaque background. `bg-blue-50` is opaque.
  
  const cellClass = isSummaryRow ? baseColorClass : 'bg-white';

  const handleToggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMenuOpen) {
        setIsMenuOpen(false);
        return;
    }
    if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const menuHeightEstimate = 220; 
        const spaceBelow = windowHeight - rect.bottom;
        let placement: 'top' | 'bottom' = 'bottom';
        let pos: MenuPosition = { left: rect.left, placement: 'bottom' };
        if (spaceBelow < menuHeightEstimate) {
            placement = 'top';
            pos = { left: rect.left, bottom: windowHeight - rect.top + 4, placement: 'top' };
        } else {
            pos = { left: rect.left, top: rect.bottom + 4, placement: 'bottom' };
        }
        setMenuPos(pos);
        setIsMenuOpen(true);
    }
  };

  useEffect(() => {
    const handleScroll = () => { if (isMenuOpen) setIsMenuOpen(false); };
    window.addEventListener('scroll', handleScroll, true); 
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [isMenuOpen]);

  const handleCellClick = (section: 'SEMULA' | 'MENJADI' | 'MONTHLY', monthIndex?: number) => {
    if (section === 'SEMULA' && row.semula) {
        onSelect(row, 'SEMULA');
    } else if (section === 'MENJADI' && canEdit) {
        onSelect(row, 'MENJADI');
    } else if (section === 'MONTHLY' && canEdit) {
        onSelect(row, 'MONTHLY', monthIndex);
    }
  };

  const efficiency = (row.semula?.total || 0) - (row.menjadi?.total || 0);
  const selisihRow = (row.semula?.total || 0) - (row.menjadi?.total || 0);

  return (
    <>
      <tr className={`group transition-colors duration-150 ${isSummaryRow ? '' : 'hover:brightness-95'}`}>
        {/* FROZEN COLUMN 1: Code & Desc */}
        <td className={`sticky left-0 z-[30] border-r border-b border-gray-300 h-auto align-top py-2 ${indentClass} ${baseColorClass}`}>
          <div className="flex items-start h-full w-[340px] px-2 relative group/cell">
            {hasChildren ? (
              <button onClick={() => onToggle(row.id)} className="mr-1 mt-0.5 focus:outline-none text-gray-500 hover:text-blue-600 flex-shrink-0">
                {row.isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            ) : (
                <div className="w-[14px] mr-1 flex-shrink-0"></div>
            )}
            <div className="flex-1 min-w-0 mr-2 flex flex-col justify-start">
              {row.code && <span className="font-mono text-[10px] mr-2 text-gray-900 font-bold mb-0.5">{row.code}</span>}
              <span className={`text-xs whitespace-normal break-words leading-tight ${textStyleClass}`}>{row.description}</span>
            </div>
            <div className="relative flex-shrink-0 mt-0.5">
                <button 
                    ref={buttonRef}
                    onClick={handleToggleMenu}
                    className={`p-1 rounded-full hover:bg-gray-200 text-gray-500 transition-opacity duration-200 ${isMenuOpen ? 'bg-gray-200 text-blue-600 opacity-100' : 'opacity-0 group-hover/cell:opacity-100'}`}
                    title="Menu Aksi"
                >
                    <MoreVertical size={16}/>
                </button>
                {isMenuOpen && menuPos && createPortal(
                    <div className="fixed inset-0 z-[99999] isolate">
                        <div className="absolute inset-0 bg-transparent" onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); }}/>
                        <div 
                            className={`absolute bg-white border border-gray-300 shadow-2xl rounded-lg py-1 w-48 text-left animate-in fade-in zoom-in-95 duration-100 ${
                                menuPos.placement === 'top' ? 'origin-bottom-left' : 'origin-top-left'
                            }`}
                            style={{ left: menuPos.left, top: menuPos.top, bottom: menuPos.bottom }}
                        >
                            <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onAddChild(row); }} className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center gap-3 transition-colors border-b border-gray-100">
                                <div className="p-1 bg-green-100 rounded text-green-600"><PlusCircle size={14}/></div>
                                <div><span className="block text-xs font-bold text-gray-800">Tambah</span></div>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onCopyRow(row); }} className="w-full text-left px-3 py-2 hover:bg-orange-50 flex items-center gap-3 transition-colors border-b border-gray-100">
                                <div className="p-1 bg-orange-100 rounded text-orange-600"><Copy size={14}/></div>
                                <div><span className="block text-xs font-bold text-gray-800">Duplikasi</span></div>
                            </button>
                            {canEdit && (
                                <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onSelect(row, 'MENJADI'); }} className="w-full text-left px-3 py-2 hover:bg-yellow-50 flex items-center gap-3 transition-colors border-b border-gray-100">
                                    <div className="p-1 bg-blue-100 rounded text-blue-600"><Edit2 size={14}/></div>
                                    <div><span className="block text-xs font-bold text-gray-800">Edit</span></div>
                                </button>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onDeleteRow(row.id); }} className="w-full text-left px-3 py-2 hover:bg-red-50 flex items-center gap-3 transition-colors">
                                <div className="p-1 bg-red-100 rounded text-red-600"><Trash2 size={14}/></div>
                                <div><span className="block text-xs font-bold text-red-700">Hapus</span></div>
                            </button>
                        </div>
                    </div>, document.body
                )}
            </div>
          </div>
        </td>

        {/* FROZEN SEMULA */}
        {showSemula && (
          <>
            <td className={`sticky z-[30] border-r border-b border-gray-300 text-right px-1 text-[10px] text-gray-900 ${cellClass}`} style={{ left: `${offsets.semula}px`, width: `${widths.volVal}px` }}>{row.semula?.volume}</td>
            <td className={`sticky z-[30] border-r border-b border-gray-300 text-left px-1 text-[10px] text-gray-500 ${cellClass}`} style={{ left: `${offsets.semula + widths.volVal}px`, width: `${widths.volUnit}px` }}>{row.semula?.unit}</td>
            <td className={`sticky z-[30] border-r border-b border-gray-300 text-right px-1 text-[10px] text-gray-900 ${cellClass}`} style={{ left: `${offsets.semula + widths.volVal + widths.volUnit}px`, width: `${widths.price}px` }}>{row.semula ? formatCurrency(row.semula.price) : '-'}</td>
            <td className={`sticky z-[30] border-r border-b border-gray-300 text-right px-1 text-[10px] font-semibold text-gray-900 ${cellClass}`} style={{ left: `${offsets.semula + widths.volVal + widths.volUnit + widths.price}px`, width: `${widths.total}px` }}>{row.semula ? formatCurrency(row.semula.total) : '-'}</td>
          </>
        )}

        {/* FROZEN MENJADI */}
        {showMenjadi && (
            <>
            <td onClick={() => handleCellClick('MENJADI')} className={`sticky z-[30] border-r border-b border-gray-300 text-right px-1 text-[10px] text-gray-900 ${canEdit ? 'cursor-pointer hover:bg-yellow-100' : ''} ${cellClass}`} style={{ left: `${offsets.menjadi}px`, width: `${widths.volVal}px`, ...getCellBgStyle(true) }}><span>{row.menjadi?.volume}</span></td>
            <td onClick={() => handleCellClick('MENJADI')} className={`sticky z-[30] border-r border-b border-gray-300 text-left px-1 text-[10px] text-gray-500 ${canEdit ? 'cursor-pointer hover:bg-yellow-100' : ''} ${cellClass}`} style={{ left: `${offsets.menjadi + widths.volVal}px`, width: `${widths.volUnit}px`, ...getCellBgStyle(true) }}><span>{row.menjadi?.unit}</span></td>
            <td onClick={() => handleCellClick('MENJADI')} className={`sticky z-[30] border-r border-b border-gray-300 text-right px-1 text-[10px] text-gray-900 ${canEdit ? 'cursor-pointer hover:bg-yellow-100' : ''} ${cellClass}`} style={{ left: `${offsets.menjadi + widths.volVal + widths.volUnit}px`, width: `${widths.price}px`, ...getCellBgStyle(true) }}><span>{row.menjadi ? formatCurrency(row.menjadi.price) : '-'}</span></td>
            <td className={`sticky z-[30] border-r border-b border-gray-300 text-right px-1 text-[10px] font-bold text-gray-900 ${cellClass}`} style={{ left: `${offsets.menjadi + widths.volVal + widths.volUnit + widths.price}px`, width: `${widths.total}px`, ...getCellBgStyle(true) }}>{row.menjadi ? formatCurrency(row.menjadi.total) : '-'}</td>
            </>
        )}

        {/* FROZEN SELISIH */}
        {showSelisih && (
            <td className={`sticky z-[30] border-r border-b border-gray-300 text-right px-1 text-[10px] font-bold ${cellClass} ${!isSummaryRow && selisihRow > 0 ? 'text-green-600' : (!isSummaryRow && selisihRow < 0 ? 'text-red-600' : 'text-gray-400')}`} style={{ left: `${offsets.selisih}px`, width: `${widths.selisih}px` }}>
                {selisihRow !== 0 ? formatCurrency(selisihRow) : '-'}
            </td>
        )}

        {/* FROZEN EFISIENSI */}
        {showEfisiensi && (
             <>
             <td className={`sticky z-[30] border-r border-b border-gray-300 text-right px-1 text-[10px] ${cellClass} ${!isSummaryRow && efficiency > 0 ? 'text-green-600' : (!isSummaryRow && efficiency < 0 ? 'text-red-600' : 'text-gray-400')}`} style={{ left: `${offsets.efisiensi}px`, width: `${widths.efisiensi}px` }}>{efficiency !== 0 ? formatCurrency(efficiency) : '-'}</td>
             <td className={`sticky z-[30] border-r border-b border-gray-300 text-right px-1 text-[10px] font-bold ${cellClass} ${!isSummaryRow && efficiency > 0 ? 'text-green-600' : (!isSummaryRow && efficiency < 0 ? 'text-red-600' : 'text-gray-400')}`} style={{ left: `${offsets.efisiensi + widths.efisiensi}px`, width: `${widths.efisiensi}px` }}>{efficiency !== 0 ? formatCurrency(efficiency) : '-'}</td>
             </>
        )}

        {/* SCROLLABLE MONTHLY DETAILS */}
        {visibleQuarters.map(q => {
            const qRPD = q.months.reduce((acc, m) => acc + (row.monthlyAllocation[m]?.rpd || 0), 0);
            const qRealization = q.months.reduce((acc, m) => acc + (row.monthlyAllocation[m]?.realization || 0), 0);
            const qSisa = qRPD - qRealization;

            return (
                <React.Fragment key={`${row.id}-q-${q.name}`}>
                    {q.months.map(m => {
                        const detail = row.monthlyAllocation[m] || { rpd: 0, realization: 0, spm: '', date: '', isVerified: false, sp2d: 0 };
                        const jmlReal = detail.rpd || 0;
                        const jmlAkan = detail.realization || 0;
                        const total = jmlReal + jmlAkan;
                        const sp2d = detail.sp2d || 0;
                        const gap = total - sp2d;
                        
                        return (
                            <React.Fragment key={`${row.id}-m-${m}`}>
                                <td onClick={() => handleCellClick('MONTHLY', m)} className={`border-r border-b border-gray-300 p-1 text-right text-[10px] text-gray-900 ${canEdit ? 'cursor-pointer hover:bg-blue-50' : ''} ${cellClass}`}>{jmlReal > 0 ? formatCurrency(jmlReal) : '-'}</td>
                                <td onClick={() => handleCellClick('MONTHLY', m)} className={`border-r border-b border-gray-300 p-1 text-right text-[10px] text-gray-900 ${canEdit ? 'cursor-pointer hover:bg-blue-50' : ''} ${cellClass}`}>{jmlAkan > 0 ? formatCurrency(jmlAkan) : '-'}</td>
                                <td className={`border-r border-b border-gray-300 p-1 text-right text-[10px] font-bold text-gray-900 ${isSummaryRow ? cellClass : 'bg-pink-50'}`}>{total > 0 ? formatCurrency(total) : '-'}</td>
                                <td onClick={() => handleCellClick('MONTHLY', m)} className={`border-r border-b border-gray-300 p-1 text-center text-[9px] text-gray-900 ${canEdit ? 'cursor-pointer hover:bg-blue-50' : ''} ${cellClass}`}>{detail.date || '-'}</td>
                                <td onClick={() => handleCellClick('MONTHLY', m)} className={`border-r border-b border-gray-300 p-1 text-center text-[9px] text-gray-900 ${canEdit ? 'cursor-pointer hover:bg-blue-50' : ''} ${cellClass}`}>{detail.spm || '-'}</td>
                                <td className={`border-r border-b border-gray-300 p-0 text-center align-middle ${cellClass}`}><input type="checkbox" checked={detail.isVerified} disabled className="w-3 h-3"/></td>
                                <td onClick={() => handleCellClick('MONTHLY', m)} className={`border-r border-b border-gray-300 p-1 text-right text-[10px] text-gray-900 ${canEdit ? 'cursor-pointer hover:bg-blue-50' : ''} ${cellClass}`}>{sp2d > 0 ? formatCurrency(sp2d) : '-'}</td>
                                <td className={`border-r border-b border-gray-300 p-1 text-right text-[10px] font-medium ${cellClass} ${gap !== 0 ? 'text-red-600' : 'text-gray-400'}`}>{gap !== 0 ? formatCurrency(gap) : '-'}</td>
                            </React.Fragment>
                        );
                    })}
                    <td className={`border-r border-b border-gray-300 p-1 text-right text-[10px] text-gray-900 font-medium ${isSummaryRow ? cellClass : 'bg-orange-50'}`}>{qRPD > 0 ? formatCurrency(qRPD) : '-'}</td>
                    <td className={`border-r border-b border-gray-300 p-1 text-right text-[10px] text-gray-900 font-medium ${isSummaryRow ? cellClass : 'bg-orange-50'}`}>{qRealization > 0 ? formatCurrency(qRealization) : '-'}</td>
                    <td className={`border-r border-b border-gray-300 p-1 text-right text-[10px] font-bold ${isSummaryRow ? cellClass : 'bg-orange-100'} ${qSisa !== 0 ? 'text-red-600' : (qRPD > 0 || qRealization > 0 ? 'text-green-600' : 'text-gray-400')}`}>{qSisa !== 0 ? formatCurrency(qSisa) : (qRPD > 0 || qRealization > 0 ? 'Rp 0' : '-')}</td>
                </React.Fragment>
            );
        })}
      </tr>

      {row.isOpen && row.children && row.children.map(child => (
        <BudgetRowItem 
          key={child.id} 
          row={child} 
          onToggle={onToggle} 
          onSelect={onSelect} 
          onAddChild={onAddChild} 
          onCopyRow={onCopyRow} 
          onDeleteRow={onDeleteRow} 
          level={level + 1} 
          showSemula={showSemula} 
          showMenjadi={showMenjadi} 
          showSelisih={showSelisih} 
          showEfisiensi={showEfisiensi} 
          visibleQuarters={visibleQuarters} 
          offsets={offsets} 
          widths={widths} 
          theme={theme}
        />
      ))}
    </>
  );
};

export default BudgetRowItem;
