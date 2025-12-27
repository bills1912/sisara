import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BudgetRow, ChangeStatus, RowType, ThemeConfig } from '../types';
import { formatCurrency, getChangeStatus, getRowIndentClass, getRowBaseColor, getRowTextStyle, getRowBaseColorHex } from '../utils';
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
  isRevisionMode: boolean;
  isDarkMode: boolean;
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

const BudgetRowItem: React.FC<Props> = ({ row, level, showSemula, showMenjadi, showSelisih, showEfisiensi, visibleQuarters, offsets, widths, theme, isRevisionMode, isDarkMode, onSelect, onToggle, onAddChild, onCopyRow, onDeleteRow }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  const status = getChangeStatus(row);
  
  const indentClass = getRowIndentClass(row.type);
  const textStyleClass = getRowTextStyle(row.type);

  // Background colors
  const baseColorHex = getRowBaseColorHex(row.type, isDarkMode); 
  const changedColor = theme[status];
  const isChanged = status !== ChangeStatus.UNCHANGED;
  
  // Only apply 'changed' color to data cells if it's not a summary row
  const isSummaryRow = [RowType.PROGRAM, RowType.ACTIVITY, RowType.KRO, RowType.RO].includes(row.type);
  
  // Editable if it is a DETAIL type or if it has user-input 'menjadi' values and is not blocked
  const isEditableType = row.type === RowType.DETAIL || row.type === RowType.ACCOUNT;
  const canEdit = (isEditableType || row.menjadi !== null) && !row.isBlocked;

  // REVISION MODE LOGIC:
  const canEditMonthly = canEdit && !isRevisionMode; 
  const canEditRevisi = canEdit;

  const scrollableCellClass = isSummaryRow 
      ? (isDarkMode ? 'bg-transparent' : getRowBaseColor(row.type, false))
      : `group-hover:bg-gray-50 transition-colors ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`;

  const getStickyCellStyle = (isDataCell: boolean = false) => {
      const style: React.CSSProperties = {
          backgroundColor: baseColorHex
      };
      if (isDataCell && isChanged && !isSummaryRow) {
          style.backgroundColor = changedColor;
      }
      return style;
  };
  
  const borderColor = isDarkMode ? '#4b5563' : '#d1d5db'; 
  const separatorShadowStyle: React.CSSProperties = {
      boxShadow: `-1px 0 0 0 ${borderColor}`
  };

  const codeColumnStyle: React.CSSProperties = {
      backgroundColor: baseColorHex,
      width: '350px', 
      minWidth: '350px', 
      maxWidth: '350px',
      left: 0
  };

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
    if (section === 'SEMULA' && canEditRevisi) {
        onSelect(row, 'SEMULA');
    } else if (section === 'MENJADI' && canEditRevisi) {
        onSelect(row, 'MENJADI');
    } else if (section === 'MONTHLY') {
        if (!canEditMonthly) return; 
        onSelect(row, 'MONTHLY', monthIndex);
    }
  };

  const efficiency = (row.semula?.total || 0) - (row.menjadi?.total || 0);
  const selisihRow = (row.semula?.total || 0) - (row.menjadi?.total || 0);
  const borderClass = isDarkMode ? 'border-gray-600' : 'border-gray-300';
  const textPrimary = isDarkMode ? 'text-gray-200' : 'text-gray-900';
  const textSecondary = isDarkMode ? 'text-gray-400' : 'text-gray-500';

  return (
    <>
      <tr className="group">
        <td className={`sticky z-[51] border-r border-b ${borderClass} h-auto align-top p-0`} style={codeColumnStyle}>
          <div className={`flex items-start h-full w-full px-2 py-2 relative group/cell ${indentClass}`}>
            {row.children && row.children.length > 0 ? (
              <button onClick={() => onToggle(row.id)} className={`mr-1 mt-0.5 focus:outline-none flex-shrink-0 ${isDarkMode ? 'text-gray-400 hover:text-blue-400' : 'text-gray-500 hover:text-blue-600'}`}>
                {row.isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            ) : (
                <div className="w-[14px] mr-1 flex-shrink-0"></div>
            )}
            <div className="flex-1 min-w-0 mr-2 flex items-start">
              {row.code && <span className={`font-mono text-[10px] mr-2 font-bold flex-shrink-0 mt-0.5 ${textPrimary}`}>{row.code}</span>}
              
              <div className="flex flex-col">
                <span className={`text-xs whitespace-normal break-words leading-tight ${textStyleClass} ${isDarkMode && row.type !== RowType.SATKER ? 'text-gray-300' : ''}`} title={row.description}>
                  {row.description}
                </span>
                {row.type === RowType.ACCOUNT && (
                   <span className={`text-[10px] whitespace-normal break-words leading-tight mt-0.5 italic ${textSecondary}`}>
                      (KPPN.007-Gunung Sitoli)
                   </span>
                )}
              </div>
            </div>
            <div className="relative flex-shrink-0 mt-0.5">
                <button 
                    ref={buttonRef}
                    onClick={handleToggleMenu}
                    className={`p-1 rounded-full transition-opacity duration-200 ${isMenuOpen ? 'bg-gray-200 text-blue-600 opacity-100' : 'opacity-0 group-hover/cell:opacity-100'} ${isDarkMode ? 'hover:bg-gray-600 text-gray-300' : 'hover:bg-gray-200 text-gray-500'}`}
                    title="Menu Aksi"
                >
                    <MoreVertical size={16}/>
                </button>
                {isMenuOpen && menuPos && createPortal(
                    <div className="fixed inset-0 z-[99999] isolate">
                        <div className="absolute inset-0 bg-transparent" onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); }}/>
                        <div 
                            className={`absolute shadow-2xl rounded-lg py-1 w-48 text-left animate-in fade-in zoom-in-95 duration-100 ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'} ${
                                menuPos.placement === 'top' ? 'origin-bottom-left' : 'origin-top-left'
                            }`}
                            style={{ left: menuPos.left, top: menuPos.top, bottom: menuPos.bottom }}
                        >
                            <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onAddChild(row); }} className={`w-full text-left px-3 py-2 flex items-center gap-3 transition-colors border-b ${isDarkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-100 hover:bg-blue-50'}`}>
                                <div className="p-1 bg-green-100 rounded text-green-600"><PlusCircle size={14}/></div>
                                <div><span className={`block text-xs font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>Tambah</span></div>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onCopyRow(row); }} className={`w-full text-left px-3 py-2 flex items-center gap-3 transition-colors border-b ${isDarkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-100 hover:bg-orange-50'}`}>
                                <div className="p-1 bg-orange-100 rounded text-orange-600"><Copy size={14}/></div>
                                <div><span className={`block text-xs font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>Duplikasi</span></div>
                            </button>
                            {canEdit && (
                                <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onSelect(row, 'MENJADI'); }} className={`w-full text-left px-3 py-2 flex items-center gap-3 transition-colors border-b ${isDarkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-100 hover:bg-yellow-50'}`}>
                                    <div className="p-1 bg-blue-100 rounded text-blue-600"><Edit2 size={14}/></div>
                                    <div><span className={`block text-xs font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>Edit</span></div>
                                </button>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onDeleteRow(row.id); }} className={`w-full text-left px-3 py-2 flex items-center gap-3 transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-red-50'}`}>
                                <div className="p-1 bg-red-100 rounded text-red-600"><Trash2 size={14}/></div>
                                <div><span className="block text-xs font-bold text-red-600">Hapus</span></div>
                            </button>
                        </div>
                    </div>, document.body
                )}
            </div>
          </div>
        </td>

        {showSemula && (
          <>
            <td onClick={() => handleCellClick('SEMULA')} className={`sticky z-[50] border-r border-b ${borderClass} text-right px-1 text-[10px] ${textPrimary} overflow-hidden text-ellipsis whitespace-nowrap ${canEditRevisi ? 'cursor-pointer hover:opacity-80' : ''}`} style={{ left: `${offsets.semula}px`, width: `${widths.volVal}px`, ...getStickyCellStyle(), ...separatorShadowStyle }}>{row.semula?.volume}</td>
            <td onClick={() => handleCellClick('SEMULA')} className={`sticky z-[50] border-r border-b ${borderClass} text-left px-1 text-[10px] ${textSecondary} overflow-hidden text-ellipsis whitespace-nowrap ${canEditRevisi ? 'cursor-pointer hover:opacity-80' : ''}`} style={{ left: `${offsets.semula + widths.volVal}px`, width: `${widths.volUnit}px`, ...getStickyCellStyle() }}>{row.semula?.unit}</td>
            <td onClick={() => handleCellClick('SEMULA')} className={`sticky z-[50] border-r border-b ${borderClass} text-right px-1 text-[10px] ${textPrimary} overflow-hidden text-ellipsis whitespace-nowrap ${canEditRevisi ? 'cursor-pointer hover:opacity-80' : ''}`} style={{ left: `${offsets.semula + widths.volVal + widths.volUnit}px`, width: `${widths.price}px`, ...getStickyCellStyle() }}>{row.semula ? formatCurrency(row.semula.price) : '-'}</td>
            <td onClick={() => handleCellClick('SEMULA')} className={`sticky z-[50] border-r border-b ${borderClass} text-right px-1 text-[10px] font-semibold ${textPrimary} overflow-hidden text-ellipsis whitespace-nowrap ${canEditRevisi ? 'cursor-pointer hover:opacity-80' : ''}`} style={{ left: `${offsets.semula + widths.volVal + widths.volUnit + widths.price}px`, width: `${widths.total}px`, ...getStickyCellStyle() }}>{row.semula ? formatCurrency(row.semula.total) : '-'}</td>
          </>
        )}

        {showMenjadi && (
            <>
            <td onClick={() => handleCellClick('MENJADI')} className={`sticky z-[50] border-r border-b ${borderClass} text-right px-1 text-[10px] ${textPrimary} overflow-hidden text-ellipsis whitespace-nowrap ${canEditRevisi ? 'cursor-pointer hover:opacity-80' : ''}`} style={{ left: `${offsets.menjadi}px`, width: `${widths.volVal}px`, ...getStickyCellStyle(true), ...separatorShadowStyle }}><span>{row.menjadi?.volume}</span></td>
            <td onClick={() => handleCellClick('MENJADI')} className={`sticky z-[50] border-r border-b ${borderClass} text-left px-1 text-[10px] ${textSecondary} overflow-hidden text-ellipsis whitespace-nowrap ${canEditRevisi ? 'cursor-pointer hover:opacity-80' : ''}`} style={{ left: `${offsets.menjadi + widths.volVal}px`, width: `${widths.volUnit}px`, ...getStickyCellStyle(true) }}><span>{row.menjadi?.unit}</span></td>
            <td onClick={() => handleCellClick('MENJADI')} className={`sticky z-[50] border-r border-b ${borderClass} text-right px-1 text-[10px] ${textPrimary} overflow-hidden text-ellipsis whitespace-nowrap ${canEditRevisi ? 'cursor-pointer hover:opacity-80' : ''}`} style={{ left: `${offsets.menjadi + widths.volVal + widths.volUnit}px`, width: `${widths.price}px`, ...getStickyCellStyle(true) }}><span>{row.menjadi ? formatCurrency(row.menjadi.price) : '-'}</span></td>
            <td onClick={() => handleCellClick('MENJADI')} className={`sticky z-[50] border-r border-b ${borderClass} text-right px-1 text-[10px] font-bold ${textPrimary} overflow-hidden text-ellipsis whitespace-nowrap ${canEditRevisi ? 'cursor-pointer hover:opacity-80' : ''}`} style={{ left: `${offsets.menjadi + widths.volVal + widths.volUnit + widths.price}px`, width: `${widths.total}px`, ...getStickyCellStyle(true) }}>{row.menjadi ? formatCurrency(row.menjadi.total) : '-'}</td>
            </>
        )}

        {showSelisih && (
            <td className={`sticky z-[50] border-r border-b ${borderClass} text-right px-1 text-[10px] font-bold overflow-hidden text-ellipsis whitespace-nowrap ${!isSummaryRow && selisihRow > 0 ? 'text-green-600' : (!isSummaryRow && selisihRow < 0 ? 'text-red-600' : (isDarkMode ? 'text-gray-500' : 'text-gray-400'))}`} style={{ left: `${offsets.selisih}px`, width: `${widths.selisih}px`, ...getStickyCellStyle(), ...separatorShadowStyle }}>
                {selisihRow !== 0 ? formatCurrency(selisihRow) : '-'}
            </td>
        )}

        {showEfisiensi && (
             <>
             <td className={`sticky z-[50] border-r border-b ${borderClass} text-right px-1 text-[10px] overflow-hidden text-ellipsis whitespace-nowrap ${!isSummaryRow && efficiency > 0 ? 'text-green-600' : (!isSummaryRow && efficiency < 0 ? 'text-red-600' : (isDarkMode ? 'text-gray-500' : 'text-gray-400'))}`} style={{ left: `${offsets.efisiensi}px`, width: `${widths.efisiensi}px`, ...getStickyCellStyle(), ...separatorShadowStyle }}>{efficiency !== 0 ? formatCurrency(efficiency) : '-'}</td>
             <td className={`sticky z-[50] border-r border-b ${borderClass} text-right px-1 text-[10px] font-bold overflow-hidden text-ellipsis whitespace-nowrap ${!isSummaryRow && efficiency > 0 ? 'text-green-600' : (!isSummaryRow && efficiency < 0 ? 'text-red-600' : (isDarkMode ? 'text-gray-500' : 'text-gray-400'))}`} style={{ left: `${offsets.efisiensi + widths.efisiensi}px`, width: `${widths.efisiensi}px`, ...getStickyCellStyle() }}>{efficiency !== 0 ? formatCurrency(efficiency) : '-'}</td>
             </>
        )}

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
                                <td onClick={() => handleCellClick('MONTHLY', m)} className={`border-r border-b ${borderClass} p-1 text-right text-[10px] ${textPrimary} ${canEditMonthly ? 'cursor-pointer hover:bg-blue-50' : 'cursor-not-allowed'} ${scrollableCellClass}`}>{jmlReal > 0 ? formatCurrency(jmlReal) : '-'}</td>
                                <td onClick={() => handleCellClick('MONTHLY', m)} className={`border-r border-b ${borderClass} p-1 text-right text-[10px] ${textPrimary} ${canEditMonthly ? 'cursor-pointer hover:bg-blue-50' : 'cursor-not-allowed'} ${scrollableCellClass}`}>{jmlAkan > 0 ? formatCurrency(jmlAkan) : '-'}</td>
                                <td className={`border-r border-b ${borderClass} p-1 text-right text-[10px] font-bold ${textPrimary} ${isSummaryRow ? scrollableCellClass : (isDarkMode ? 'bg-pink-900/20' : 'bg-pink-50')}`}>{total > 0 ? formatCurrency(total) : '-'}</td>
                                <td onClick={() => handleCellClick('MONTHLY', m)} className={`border-r border-b ${borderClass} p-1 text-center text-[9px] ${textPrimary} ${canEditMonthly ? 'cursor-pointer hover:bg-blue-50' : 'cursor-not-allowed'} ${scrollableCellClass}`}>{detail.date || '-'}</td>
                                <td onClick={() => handleCellClick('MONTHLY', m)} className={`border-r border-b ${borderClass} p-1 text-center text-[9px] ${textPrimary} ${canEditMonthly ? 'cursor-pointer hover:bg-blue-50' : 'cursor-not-allowed'} ${scrollableCellClass}`}>{detail.spm || '-'}</td>
                                <td className={`border-r border-b ${borderClass} p-0 text-center align-middle ${scrollableCellClass}`}><input type="checkbox" checked={detail.isVerified} disabled className="w-3 h-3"/></td>
                                <td onClick={() => handleCellClick('MONTHLY', m)} className={`border-r border-b ${borderClass} p-1 text-right text-[10px] ${textPrimary} ${canEditMonthly ? 'cursor-pointer hover:bg-blue-50' : 'cursor-not-allowed'} ${scrollableCellClass}`}>{sp2d > 0 ? formatCurrency(sp2d) : '-'}</td>
                                <td className={`border-r border-b ${borderClass} p-1 text-right text-[10px] font-medium ${scrollableCellClass} ${gap !== 0 ? 'text-red-600' : (isDarkMode ? 'text-gray-500' : 'text-gray-400')}`}>{gap !== 0 ? formatCurrency(gap) : '-'}</td>
                            </React.Fragment>
                        );
                    })}
                    <td className={`border-r border-b ${borderClass} p-1 text-right text-[10px] ${textPrimary} font-medium ${isSummaryRow ? scrollableCellClass : (isDarkMode ? 'bg-orange-900/20' : 'bg-orange-50')}`}>{qRPD > 0 ? formatCurrency(qRPD) : '-'}</td>
                    <td className={`border-r border-b ${borderClass} p-1 text-right text-[10px] ${textPrimary} font-medium ${isSummaryRow ? scrollableCellClass : (isDarkMode ? 'bg-orange-900/20' : 'bg-orange-50')}`}>{qRealization > 0 ? formatCurrency(qRealization) : '-'}</td>
                    <td className={`border-r border-b ${borderClass} p-1 text-right text-[10px] font-bold ${isSummaryRow ? scrollableCellClass : (isDarkMode ? 'bg-orange-800/20' : 'bg-orange-100')} ${qSisa !== 0 ? 'text-red-600' : (qRPD > 0 || qRealization > 0 ? 'text-green-600' : (isDarkMode ? 'text-gray-500' : 'text-gray-400'))}`}>{qSisa !== 0 ? formatCurrency(qSisa) : (qRPD > 0 || qRealization > 0 ? 'Rp 0' : '-')}</td>
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
          isRevisionMode={isRevisionMode}
          isDarkMode={isDarkMode}
        />
      ))}
    </>
  );
};

export default BudgetRowItem;