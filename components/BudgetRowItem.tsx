import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BudgetRow, ChangeStatus, RowType, ThemeConfig } from '../types';
import { formatCurrency, getChangeStatus, getRowIndentClass } from '../utils';
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
  showEfisiensi: boolean;
  visibleQuarters: QuarterDefinition[];
  offsets: {
      semula: number;
      menjadi: number;
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

const BudgetRowItem: React.FC<Props> = ({ row, level, showSemula, showMenjadi, showEfisiensi, visibleQuarters, offsets, theme, onSelect, onToggle, onAddChild, onCopyRow, onDeleteRow }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  const status = getChangeStatus(row);
  const indentClass = getRowIndentClass(row.type);
  const hasChildren = row.children && row.children.length > 0;
  
  // Dynamic background color from theme
  const bgColor = theme[status];
  
  // Logic Fix: Ensure ITEM type (6 digits) is always editable unless blocked
  const isItemType = row.type === RowType.ITEM;
  const canEdit = (isItemType || row.menjadi !== null) && !row.isBlocked;

  // Handler to open menu and calculate position
  const handleToggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isMenuOpen) {
        setIsMenuOpen(false);
        return;
    }

    if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const menuHeightEstimate = 220; // Estimated height of the dropdown menu
        const spaceBelow = windowHeight - rect.bottom;
        
        let placement: 'top' | 'bottom' = 'bottom';
        let pos: MenuPosition = {
             left: rect.left,
             placement: 'bottom'
        };

        // If not enough space below, flip to top
        if (spaceBelow < menuHeightEstimate) {
            placement = 'top';
            pos = {
                left: rect.left,
                bottom: windowHeight - rect.top + 4, // Position just above the button
                placement: 'top'
            };
        } else {
            // Default: position below
            pos = {
                left: rect.left,
                top: rect.bottom + 4,
                placement: 'bottom'
            };
        }

        setMenuPos(pos);
        setIsMenuOpen(true);
    }
  };

  // Close menu on scroll to prevent detached floating menu
  useEffect(() => {
    const handleScroll = () => {
        if (isMenuOpen) setIsMenuOpen(false);
    };
    
    // Attach to window and potential scrollable containers
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

  // Calculate Efficiency
  const efficiency = (row.semula?.total || 0) - (row.menjadi?.total || 0);

  return (
    <>
      <tr className={`hover:brightness-95 group transition-colors duration-150`}>
        {/* FROZEN COLUMN 1: Code & Desc */}
        <td className={`sticky left-0 z-[30] border-r border-b border-gray-300 bg-white h-10 align-middle ${indentClass}`}>
          <div className="flex items-center h-full w-[340px] px-2 relative group/cell">
            {hasChildren ? (
              <button onClick={() => onToggle(row.id)} className="mr-1 focus:outline-none text-gray-500 hover:text-blue-600 flex-shrink-0">
                {row.isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            ) : (
                <div className="w-[14px] mr-1 flex-shrink-0"></div>
            )}
            
            {/* Text Container */}
            <div className="flex-1 min-w-0 mr-2 flex items-center">
              <span className="font-mono text-[10px] mr-2 text-gray-900 font-bold flex-shrink-0">{row.code}</span>
              <span className="text-xs text-gray-800 truncate block" title={row.description}>{row.description}</span>
            </div>
            
            {/* Grouped Action Button */}
            <div className="relative flex-shrink-0">
                <button 
                    ref={buttonRef}
                    onClick={handleToggleMenu}
                    className={`p-1 rounded-full hover:bg-gray-200 text-gray-500 transition-opacity duration-200 ${isMenuOpen ? 'bg-gray-200 text-blue-600 opacity-100' : 'opacity-0 group-hover/cell:opacity-100'}`}
                    title="Menu Aksi"
                >
                    <MoreVertical size={16}/>
                </button>

                {/* React Portal for Dropdown - Renders outside the table structure to guarantee visibility */}
                {isMenuOpen && menuPos && createPortal(
                    <div className="fixed inset-0 z-[99999] isolate">
                        {/* Transparent Backdrop to handle click outside */}
                        <div 
                            className="absolute inset-0 bg-transparent" 
                            onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); }}
                        />
                        
                        {/* The Menu Box */}
                        <div 
                            className={`absolute bg-white border border-gray-300 shadow-2xl rounded-lg py-1 w-48 text-left animate-in fade-in zoom-in-95 duration-100 ${
                                menuPos.placement === 'top' ? 'origin-bottom-left' : 'origin-top-left'
                            }`}
                            style={{ 
                                left: menuPos.left, 
                                top: menuPos.top,
                                bottom: menuPos.bottom
                            }}
                        >
                            <button 
                                onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onAddChild(row); }}
                                className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center gap-3 transition-colors border-b border-gray-100"
                            >
                                <div className="p-1 bg-green-100 rounded text-green-600"><PlusCircle size={14}/></div>
                                <div><span className="block text-xs font-bold text-gray-800">Tambah</span></div>
                            </button>

                            <button 
                                onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onCopyRow(row); }}
                                className="w-full text-left px-3 py-2 hover:bg-orange-50 flex items-center gap-3 transition-colors border-b border-gray-100"
                            >
                                <div className="p-1 bg-orange-100 rounded text-orange-600"><Copy size={14}/></div>
                                <div><span className="block text-xs font-bold text-gray-800">Duplikasi</span></div>
                            </button>

                            {canEdit && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onSelect(row, 'MENJADI'); }}
                                    className="w-full text-left px-3 py-2 hover:bg-yellow-50 flex items-center gap-3 transition-colors border-b border-gray-100"
                                >
                                    <div className="p-1 bg-blue-100 rounded text-blue-600"><Edit2 size={14}/></div>
                                    <div><span className="block text-xs font-bold text-gray-800">Edit</span></div>
                                </button>
                            )}

                            <button 
                                onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onDeleteRow(row.id); }}
                                className="w-full text-left px-3 py-2 hover:bg-red-50 flex items-center gap-3 transition-colors"
                            >
                                <div className="p-1 bg-red-100 rounded text-red-600"><Trash2 size={14}/></div>
                                <div><span className="block text-xs font-bold text-red-700">Hapus</span></div>
                            </button>
                        </div>
                    </div>,
                    document.body
                )}
            </div>
          </div>
        </td>

        {/* FROZEN SEMULA */}
        {showSemula && (
          <>
            <td className="sticky z-[30] bg-gray-50 border-r border-b border-gray-300 text-right px-1 text-[10px] text-gray-900" style={{ left: `${offsets.semula}px`, width: '80px' }}>
                {row.semula?.volume} {row.semula?.unit}
            </td>
            <td className="sticky z-[30] bg-gray-50 border-r border-b border-gray-300 text-right px-1 text-[10px] text-gray-900" style={{ left: `${offsets.semula + 80}px`, width: '100px' }}>
                {row.semula ? formatCurrency(row.semula.price) : '-'}
            </td>
            <td className="sticky z-[30] bg-gray-50 border-r border-b border-gray-300 text-right px-1 text-[10px] font-semibold text-gray-900" style={{ left: `${offsets.semula + 180}px`, width: '120px' }}>
                {row.semula ? formatCurrency(row.semula.total) : '-'}
            </td>
          </>
        )}

        {/* FROZEN MENJADI */}
        {showMenjadi && (
            <>
            <td 
                onClick={() => handleCellClick('MENJADI')}
                className={`sticky z-[30] border-r border-b border-gray-300 text-right px-1 text-[10px] text-gray-900 ${canEdit ? 'cursor-pointer hover:bg-yellow-100' : ''}`} 
                style={{ left: `${offsets.menjadi}px`, width: '80px', backgroundColor: bgColor }}
            >
                <span>{row.menjadi?.volume} {row.menjadi?.unit}</span>
            </td>
            <td 
                onClick={() => handleCellClick('MENJADI')}
                className={`sticky z-[30] border-r border-b border-gray-300 text-right px-1 text-[10px] text-gray-900 ${canEdit ? 'cursor-pointer hover:bg-yellow-100' : ''}`} 
                style={{ left: `${offsets.menjadi + 80}px`, width: '100px', backgroundColor: bgColor }}
            >
                <span>{row.menjadi ? formatCurrency(row.menjadi.price) : '-'}</span>
            </td>
            <td 
                className={`sticky z-[30] border-r border-b border-gray-300 text-right px-1 text-[10px] font-bold text-gray-900`} 
                style={{ left: `${offsets.menjadi + 180}px`, width: '170px', backgroundColor: bgColor }}
            >
                {row.menjadi ? formatCurrency(row.menjadi.total) : '-'}
            </td>
            </>
        )}

        {/* FROZEN EFISIENSI */}
        {showEfisiensi && (
             <>
             <td className={`sticky z-[30] border-r border-b border-gray-300 text-right px-1 text-[10px] bg-white ${efficiency > 0 ? 'text-green-600' : (efficiency < 0 ? 'text-red-600' : 'text-gray-400')}`} 
                style={{ left: `${offsets.efisiensi}px`, width: '100px' }}
             >
                 {efficiency !== 0 ? formatCurrency(efficiency) : '-'}
             </td>
             <td className={`sticky z-[30] border-r border-b border-gray-300 text-right px-1 text-[10px] font-bold bg-white ${efficiency > 0 ? 'text-green-600' : (efficiency < 0 ? 'text-red-600' : 'text-gray-400')}`} 
                style={{ left: `${offsets.efisiensi + 100}px`, width: '100px' }}
             >
                 {efficiency !== 0 ? formatCurrency(efficiency) : '-'}
             </td>
             </>
        )}

        {/* SCROLLABLE MONTHLY DETAILS & QUARTER SUMMARIES */}
        {visibleQuarters.map(q => {
            // Calculate Quarter Totals
            const qRPD = q.months.reduce((acc, m) => acc + (row.monthlyAllocation[m]?.rpd || 0), 0);
            const qRealization = q.months.reduce((acc, m) => acc + (row.monthlyAllocation[m]?.realization || 0), 0);
            const qSisa = qRPD - qRealization;

            return (
                <React.Fragment key={`${row.id}-q-${q.name}`}>
                    {q.months.map(m => {
                        const detail = row.monthlyAllocation[m] || { rpd: 0, realization: 0, spm: '', date: '', isVerified: false, sp2d: 0 };
                        const gap = detail.rpd - detail.realization;
                        
                        return (
                            <React.Fragment key={`${row.id}-m-${m}`}>
                                {/* RPD */}
                                <td 
                                    onClick={() => handleCellClick('MONTHLY', m)}
                                    className={`border-r border-b border-gray-300 p-1 text-right text-[10px] text-gray-900 ${canEdit ? 'cursor-pointer hover:bg-blue-50' : ''} bg-white`}
                                >
                                    {detail.rpd > 0 ? formatCurrency(detail.rpd) : '-'}
                                </td>
                                {/* Realisasi (Jml Akan Realisasi) */}
                                <td 
                                    onClick={() => handleCellClick('MONTHLY', m)}
                                    className={`border-r border-b border-gray-300 p-1 text-right text-[10px] text-gray-900 ${canEdit ? 'cursor-pointer hover:bg-blue-50' : ''} bg-white`}
                                >
                                    {detail.realization > 0 ? formatCurrency(detail.realization) : '-'}
                                </td>
                                {/* Tanggal */}
                                <td 
                                    onClick={() => handleCellClick('MONTHLY', m)}
                                    className={`border-r border-b border-gray-300 p-1 text-center text-[9px] text-gray-900 ${canEdit ? 'cursor-pointer hover:bg-blue-50' : ''} bg-white`}
                                >
                                    {detail.date || '-'}
                                </td>
                                {/* No. SPM */}
                                <td 
                                    onClick={() => handleCellClick('MONTHLY', m)}
                                    className={`border-r border-b border-gray-300 p-1 text-center text-[9px] text-gray-900 ${canEdit ? 'cursor-pointer hover:bg-blue-50' : ''} bg-white`}
                                >
                                    {detail.spm || '-'}
                                </td>
                                {/* Ceklis */}
                                <td className="border-r border-b border-gray-300 bg-white p-0 text-center align-middle">
                                    <input 
                                        type="checkbox" 
                                        checked={detail.isVerified} 
                                        disabled 
                                        className="w-3 h-3"
                                    />
                                </td>
                                {/* SP2D */}
                                <td 
                                    onClick={() => handleCellClick('MONTHLY', m)}
                                    className={`border-r border-b border-gray-300 p-1 text-right text-[10px] text-gray-900 ${canEdit ? 'cursor-pointer hover:bg-blue-50' : ''} bg-white`}
                                >
                                    {detail.sp2d > 0 ? formatCurrency(detail.sp2d) : '-'}
                                </td>
                                {/* Selisih */}
                                <td className={`border-r border-b border-gray-300 p-1 text-right text-[10px] font-medium bg-white ${gap !== 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                    {gap !== 0 ? formatCurrency(gap) : '-'}
                                </td>
                            </React.Fragment>
                        );
                    })}

                    {/* Quarter Summary Columns */}
                    <td className="bg-orange-50 border-r border-b border-gray-300 p-1 text-right text-[10px] text-gray-900 font-medium">
                        {qRPD > 0 ? formatCurrency(qRPD) : '-'}
                    </td>
                    <td className="bg-orange-50 border-r border-b border-gray-300 p-1 text-right text-[10px] text-gray-900 font-medium">
                        {qRealization > 0 ? formatCurrency(qRealization) : '-'}
                    </td>
                    <td className={`bg-orange-100 border-r border-b border-gray-300 p-1 text-right text-[10px] font-bold ${
                        qSisa !== 0 ? 'text-red-600' : (qRPD > 0 || qRealization > 0 ? 'text-green-600' : 'text-gray-400')
                    }`}>
                        {qSisa !== 0 ? formatCurrency(qSisa) : (qRPD > 0 || qRealization > 0 ? 'Rp 0' : '-')}
                    </td>
                </React.Fragment>
            );
        })}
      </tr>

      {/* Recursive Children */}
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
          showEfisiensi={showEfisiensi}
          visibleQuarters={visibleQuarters}
          offsets={offsets}
          theme={theme}
        />
      ))}
    </>
  );
};

export default BudgetRowItem;