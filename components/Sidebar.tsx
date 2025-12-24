import React from 'react';
import { LayoutGrid, Palette, Table, ChevronLeft, ChevronRight } from 'lucide-react';

interface SidebarProps {
  currentView: 'table' | 'settings';
  onChangeView: (view: 'table' | 'settings') => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, isCollapsed, onToggleCollapse }) => {
  return (
    <div 
        className={`${isCollapsed ? 'w-16' : 'w-64'} bg-slate-900 text-white flex flex-col flex-shrink-0 transition-all duration-300 relative`}
    >
      <div className={`h-16 flex items-center ${isCollapsed ? 'justify-center' : 'px-6'} border-b border-slate-700 transition-all overflow-hidden`}>
        <LayoutGrid className="text-blue-400 flex-shrink-0" size={24} />
        {!isCollapsed && <span className="ml-3 font-bold text-lg whitespace-nowrap">SISARA</span>}
      </div>
      
      <nav className="flex-1 py-4 overflow-hidden">
        <button 
          onClick={() => onChangeView('table')}
          className={`w-full flex items-center px-4 py-4 hover:bg-slate-800 transition-colors ${currentView === 'table' ? 'bg-slate-800 border-l-4 border-blue-500' : 'border-l-4 border-transparent'}`}
          title="Tabel Utama"
        >
          <Table size={20} className="flex-shrink-0" />
          {!isCollapsed && <span className="ml-3 whitespace-nowrap">Tabel Utama</span>}
        </button>
        
        <button 
          onClick={() => onChangeView('settings')}
          className={`w-full flex items-center px-4 py-4 hover:bg-slate-800 transition-colors ${currentView === 'settings' ? 'bg-slate-800 border-l-4 border-blue-500' : 'border-l-4 border-transparent'}`}
          title="Pengaturan Warna"
        >
          <Palette size={20} className="flex-shrink-0" />
          {!isCollapsed && <span className="ml-3 whitespace-nowrap">Pengaturan Warna</span>}
        </button>
      </nav>

      {/* Collapse Toggle */}
      <button 
        onClick={onToggleCollapse}
        className="absolute -right-3 top-20 bg-blue-600 rounded-full p-1 text-white shadow-md hover:bg-blue-500 z-50 border border-slate-900"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className={`p-4 border-t border-slate-700 text-xs text-slate-400 ${isCollapsed ? 'text-center' : ''}`}>
        {!isCollapsed ? 'v1.0.0' : 'v1'}
      </div>
    </div>
  );
};

export default Sidebar;