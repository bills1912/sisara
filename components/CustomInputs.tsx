
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, Plus, Minus, Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, ChevronDown } from 'lucide-react';
import { formatNumberForInput, parseNumberFromInput, MONTH_NAMES } from '../utils';

// --- 1. CUSTOM SEARCH INPUT ---
interface CustomSearchInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export const CustomSearchInput: React.FC<CustomSearchInputProps> = ({ value, onChange, placeholder = "Search...", className = "" }) => {
  return (
    <div className={`relative group ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search size={16} className="text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl leading-5 bg-gray-50/50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 shadow-sm backdrop-blur-sm sm:text-sm"
        placeholder={placeholder}
      />
      {value && (
        <button 
            onClick={() => onChange('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
        >
            <X size={14} />
        </button>
      )}
    </div>
  );
};

// --- 2. CUSTOM NUMBER INPUT (STEPPER) ---
interface CustomNumberInputProps {
  value: number;
  onChange: (val: number) => void;
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  formatCurrency?: boolean;
  className?: string;
  placeholder?: string;
  icon?: React.ReactNode;
}

export const CustomNumberInput: React.FC<CustomNumberInputProps> = ({ 
  value, onChange, label, min = 0, max, step = 1, formatCurrency = false, className = "", placeholder = "0", icon
}) => {
  const [inputValue, setInputValue] = useState(formatNumberForInput(value));

  useEffect(() => {
    setInputValue(formatNumberForInput(value));
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    // Allow digits and one decimal point
    const cleanVal = rawVal.replace(/[^0-9.,]/g, ''); 
    setInputValue(cleanVal);
    
    const parsed = parseNumberFromInput(cleanVal);
    if (!isNaN(parsed)) {
      onChange(parsed);
    } else if (cleanVal === '') {
      onChange(0);
    }
  };

  const handleBlur = () => {
    setInputValue(formatNumberForInput(value));
  };

  const handleIncrement = () => {
    const newVal = (value || 0) + step;
    if (max !== undefined && newVal > max) return;
    onChange(parseFloat(newVal.toFixed(2)));
  };

  const handleDecrement = () => {
    const newVal = (value || 0) - step;
    if (min !== undefined && newVal < min) return;
    onChange(parseFloat(newVal.toFixed(2)));
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1 tracking-wider flex items-center gap-1">
            {icon} {label}
        </label>
      )}
      <div className="relative flex items-center group">
        {/* Decrement Button */}
        <button 
            type="button"
            onClick={handleDecrement}
            className="absolute left-1 z-20 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors bg-white/50"
            tabIndex={-1}
        >
            <Minus size={16} strokeWidth={2.5} />
        </button>

        {/* Currency Prefix */}
        {formatCurrency && (
            <span className="absolute left-9 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xs pointer-events-none z-10 select-none bg-transparent">
                Rp
            </span>
        )}

        <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            placeholder={placeholder}
            className={`
                block w-full py-2.5 border border-gray-300 rounded-xl
                text-gray-900 placeholder-gray-400 font-bold shadow-sm transition-all
                focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none
                bg-white
                ${formatCurrency ? 'pl-16 pr-9 text-right tracking-tight' : 'px-9 text-center'}
            `}
        />

        {/* Increment Button */}
        <button 
            type="button"
            onClick={handleIncrement}
            className="absolute right-1 z-20 p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors bg-white/50"
            tabIndex={-1}
        >
            <Plus size={16} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};


// --- 3. CUSTOM DATE PICKER (PORTAL VERSION) ---
interface CustomDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (val: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  minDate?: string;
  maxDate?: string;
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ 
  value, onChange, label, placeholder = "Pilih Tanggal", className = "", minDate, maxDate 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; placement: 'top' | 'bottom' | 'bottom-right' | 'top-right' }>({ top: 0, left: 0, placement: 'bottom' });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Parse initial date or default to today
  const initialDate = value ? new Date(value) : new Date();
  const [viewDate, setViewDate] = useState(initialDate); // For navigation
  
  // Update view when value changes externally
  useEffect(() => {
      if (value) {
          setViewDate(new Date(value));
      }
  }, [value]);

  // Handle outside click to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
          isOpen &&
          containerRef.current && 
          !containerRef.current.contains(event.target as Node) &&
          calendarRef.current &&
          !calendarRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    
    // Close on scroll to prevent floating weirdness
    const handleScroll = () => {
        if(isOpen) setIsOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true); 
    window.addEventListener('resize', handleScroll);

    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen]);

  const toggleOpen = () => {
      if (!isOpen && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const calendarWidth = 300; // Fixed width of calendar
          const calendarHeight = 320; // Approx height
          
          // Smart Positioning Logic
          const spaceBelow = window.innerHeight - rect.bottom;
          const spaceRight = window.innerWidth - rect.left;
          
          let top = rect.bottom + 6;
          let left = rect.left;
          let placement: 'bottom' | 'top' | 'bottom-right' | 'top-right' = 'bottom';

          // Vertical decision
          if (spaceBelow < calendarHeight && rect.top > calendarHeight) {
              // Not enough space below, put it above
              top = rect.top - 6; 
              placement = 'top';
          }

          // Horizontal decision
          if (spaceRight < calendarWidth) {
              // Not enough space on right, align to right edge of input
              left = rect.right - calendarWidth; 
              placement = placement === 'top' ? 'top-right' : 'bottom-right';
          }

          // Ensure left is positive
          if (left < 10) left = 10;

          setCoords({ top, left, placement });
          setIsOpen(true);
      } else {
          setIsOpen(false);
      }
  };

  const formatDateDisplay = (isoDate: string) => {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return isoDate;
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const startDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handleDayClick = (day: number) => {
      const selected = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
      // Adjust timezone offset to ensure YYYY-MM-DD matches local day
      const offset = selected.getTimezoneOffset();
      const localSelected = new Date(selected.getTime() - (offset*60*1000));
      
      const isoDate = localSelected.toISOString().split('T')[0];
      onChange(isoDate);
      setIsOpen(false);
  };

  const changeMonth = (offset: number) => {
      const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1);
      setViewDate(newDate);
  };
  
  // Calendar Grid Generation
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const totalDays = daysInMonth(year, month);
  const startDay = startDayOfMonth(year, month); // 0 = Sunday
  
  const daysArray = [];
  for (let i = 0; i < startDay; i++) daysArray.push(null);
  for (let i = 1; i <= totalDays; i++) daysArray.push(i);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
        {label && (
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 tracking-wider flex items-center gap-1">
                {label}
            </label>
        )}
        
        {/* Trigger Input */}
        <div 
            onClick={toggleOpen}
            className={`
                w-full px-3 py-2.5 bg-white border rounded-xl flex items-center justify-between cursor-pointer transition-all duration-200
                ${isOpen ? 'border-blue-500 ring-2 ring-blue-100 shadow-md' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}
            `}
        >
            <div className="flex items-center gap-2 overflow-hidden">
                <CalendarIcon size={16} className={`flex-shrink-0 ${value ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className={`text-sm truncate ${value ? 'font-medium text-gray-900' : 'text-gray-400'}`}>
                    {value ? formatDateDisplay(value) : placeholder}
                </span>
            </div>
            {value && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onChange(''); }}
                    className="p-1 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 mr-1"
                >
                    <X size={12} />
                </button>
            )}
            <ChevronDown size={14} className="text-gray-400" />
        </div>

        {/* Portal Calendar */}
        {isOpen && createPortal(
            <div 
                ref={calendarRef}
                className={`fixed z-[9999] p-4 bg-white/95 backdrop-blur-md rounded-2xl border border-gray-100 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] w-[300px] animate-in fade-in zoom-in-95 duration-200 ${
                    coords.placement.includes('top') ? 'origin-bottom' : 'origin-top'
                } ${coords.placement.includes('right') ? 'origin-right' : 'origin-left'}`}
                style={{ 
                    top: coords.placement.includes('top') ? 'auto' : coords.top, 
                    bottom: coords.placement.includes('top') ? (window.innerHeight - coords.top - 6) : 'auto', // Adjust for top placement
                    left: coords.left 
                }}
            >
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                    <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-600"><ChevronLeft size={18}/></button>
                    <div className="flex flex-col items-center">
                        <span className="font-bold text-gray-800 text-sm uppercase tracking-wide">{MONTH_NAMES[month]}</span>
                        <div className="text-xs text-gray-500 font-mono font-bold text-blue-600">
                             {year}
                        </div>
                    </div>
                    <button onClick={() => changeMonth(1)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-600"><ChevronRight size={18}/></button>
                </div>

                {/* Weekday Headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(day => (
                        <div key={day} className="text-center text-[10px] font-bold text-gray-400 uppercase">{day}</div>
                    ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1">
                    {daysArray.map((day, idx) => {
                        if (day === null) return <div key={`empty-${idx}`} />;
                        
                        const isSelected = value && new Date(value).getDate() === day && new Date(value).getMonth() === month && new Date(value).getFullYear() === year;
                        const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;

                        return (
                            <button
                                key={day}
                                type="button"
                                onClick={() => handleDayClick(day)}
                                className={`
                                    h-8 w-8 rounded-lg text-xs font-medium flex items-center justify-center transition-all
                                    ${isSelected 
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-105' 
                                        : isToday 
                                            ? 'bg-blue-50 text-blue-600 border border-blue-100 font-bold' 
                                            : 'text-gray-700 hover:bg-gray-100 hover:scale-110'
                                    }
                                `}
                            >
                                {day}
                            </button>
                        );
                    })}
                </div>
            </div>,
            document.body
        )}
    </div>
  );
};
