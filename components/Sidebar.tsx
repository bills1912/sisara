
import React from 'react';
import { LayoutGrid, Palette, Table, ChevronLeft, ChevronRight, Database } from 'lucide-react';

interface SidebarProps {
  currentView: 'table' | 'settings';
  onChangeView: (view: 'table' | 'settings') => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenMasterData: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, isCollapsed, onToggleCollapse, onOpenMasterData }) => {
  return (
    <div 
        className={`${isCollapsed ? 'w-16' : 'w-64'} bg-slate-900 text-white flex flex-col flex-shrink-0 transition-all duration-300 relative`}
    >
      <div className={`h-16 flex items-center ${isCollapsed ? 'justify-center' : 'px-6'} border-b border-slate-700 transition-all overflow-hidden`}>
        <img 
            src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiid729XCN4McOXC1qUo4EU9g_375Xlq33M3_a3c1Zg26o_F4rI9pQ6r5qC-rX5_b8qZ1oP7rK3sT5uV9wX8yA4bB2cD3eF4gH5iJ6kL7mN8oO9pQ0rS1tU2vW3x/s1600/logo-s-gold.png" 
            alt="Logo SISARA" 
            className="h-10 w-auto object-contain flex-shrink-0"
        />
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

        <button 
          onClick={onOpenMasterData}
          className={`w-full flex items-center px-4 py-4 hover:bg-slate-800 transition-colors border-l-4 border-transparent text-gray-300 hover:text-white`}
          title="Master Data"
        >
          <Database size={20} className="flex-shrink-0" />
          {!isCollapsed && <span className="ml-3 whitespace-nowrap">Master Data</span>}
        </button>
      </nav>

      <button 
        onClick={onToggleCollapse}
        className="absolute -right-3 top-20 bg-blue-600 rounded-full p-1 text-white shadow-md hover:bg-blue-500 z-50 border border-slate-900"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className={`p-4 border-t border-slate-700 text-xs text-slate-400 ${isCollapsed ? 'text-center' : ''}`}>
        {!isCollapsed ? 'v1.0.2' : 'v1'}
      </div>
    </div>
  );
};

export default Sidebar;
