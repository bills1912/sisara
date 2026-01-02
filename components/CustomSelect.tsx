
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

export interface Option {
  value: string;
  label: string;
  subLabel?: string; // Optional code or secondary info
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  searchable?: boolean; // Enable internal search
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "Pilih...",
  label,
  disabled = false,
  className = "",
  searchable = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
    if (!isOpen) {
        setSearchTerm(""); // Reset search on close
    }
  }, [isOpen, searchable]);

  const selectedOption = options.find(opt => opt.value === value);

  const filteredOptions = searchable 
    ? options.filter(opt => 
        opt.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (opt.subLabel && opt.subLabel.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : options;

  const handleSelect = (val: string) => {
    if (!disabled) {
        onChange(val);
        setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1 tracking-wider">
          {label}
        </label>
      )}
      
      {/* Trigger Button */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          w-full px-3 py-2.5 rounded-lg border cursor-pointer flex items-center justify-between transition-all duration-200
          ${disabled 
            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' 
            : isOpen 
                ? 'bg-white border-blue-500 ring-2 ring-blue-100 shadow-md' 
                : 'bg-white border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }
        `}
      >
        <div className="flex flex-col truncate pr-2">
            {selectedOption ? (
                <span className="text-sm font-medium text-gray-900 truncate flex items-center gap-2">
                    {selectedOption.subLabel && (
                        <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px] font-mono border border-gray-200">
                            {selectedOption.subLabel}
                        </span>
                    )}
                    {selectedOption.label}
                </span>
            ) : (
                <span className="text-sm text-gray-400 italic">{placeholder}</span>
            )}
        </div>
        <ChevronDown 
            size={16} 
            className={`text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-500' : ''}`} 
        />
      </div>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div className="absolute z-[100] mt-2 w-full bg-white rounded-lg border border-gray-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 origin-top">
          
          {searchable && (
            <div className="p-2 border-b border-gray-100 bg-gray-50/50">
                <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400"/>
                    <input 
                        ref={searchInputRef}
                        type="text" 
                        className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 bg-white"
                        placeholder="Cari..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            </div>
          )}

          <div className="max-h-60 overflow-y-auto overflow-x-hidden scrollbar-thin">
            {filteredOptions.length === 0 ? (
                <div className="p-3 text-center text-sm text-gray-400 italic">Tidak ada data ditemukan.</div>
            ) : (
                filteredOptions.map((opt) => {
                    const isSelected = opt.value === value;
                    return (
                        <div
                            key={opt.value}
                            onClick={() => handleSelect(opt.value)}
                            className={`
                                px-3 py-2.5 cursor-pointer flex items-center justify-between text-sm transition-colors group
                                ${isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}
                            `}
                        >
                            <div className="flex flex-col gap-0.5">
                                <span className={`font-medium ${isSelected ? 'font-bold' : ''}`}>
                                    {opt.label}
                                </span>
                                {opt.subLabel && (
                                    <span className={`text-[10px] font-mono ${isSelected ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}`}>
                                        Kode: {opt.subLabel}
                                    </span>
                                )}
                            </div>
                            {isSelected && <Check size={16} className="text-blue-600 flex-shrink-0 ml-2" />}
                        </div>
                    );
                })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
