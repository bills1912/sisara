
import React from 'react';
import { LayoutGrid, Palette, Table, ChevronLeft, ChevronRight, Database } from 'lucide-react';

interface SidebarProps {
  currentView: 'table' | 'settings';
  onChangeView: (view: 'table' | 'settings') => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenMasterData: () => void;
  isDarkMode: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, isCollapsed, onToggleCollapse, onOpenMasterData, isDarkMode }) => {
  // Dynamic styling based on theme
  const bgClass = isDarkMode ? 'bg-slate-900' : 'bg-white';
  const textClass = isDarkMode ? 'text-white' : 'text-slate-800';
  const borderClass = isDarkMode ? 'border-slate-700' : 'border-gray-200';
  
  const hoverClass = isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-blue-50';
  const activeClass = isDarkMode ? 'bg-slate-800 border-blue-500' : 'bg-blue-50 text-blue-700 border-blue-600';
  const inactiveClass = `border-transparent ${hoverClass}`;

  return (
    <div 
        className={`${isCollapsed ? 'w-16' : 'w-64'} ${bgClass} ${textClass} border-r ${borderClass} flex flex-col flex-shrink-0 transition-all duration-300 relative z-[90]`}
    >
      <div className={`h-16 flex items-center ${isCollapsed ? 'justify-center' : 'px-6'} border-b ${borderClass} transition-all overflow-hidden`}>
        <img 
            src="assets/images/logo.png" 
            alt="Logo SISARA" 
            className="h-10 w-auto object-contain flex-shrink-0"
        />
        {!isCollapsed && <span className="ml-3 font-bold text-lg whitespace-nowrap">SISARA</span>}
      </div>
      
      <nav className="flex-1 py-4 overflow-hidden">
        <button 
          onClick={() => onChangeView('table')}
          className={`w-full flex items-center px-4 py-4 transition-colors border-l-4 ${currentView === 'table' ? activeClass : inactiveClass}`}
          title="Tabel Utama"
        >
          <Table size={20} className="flex-shrink-0" />
          {!isCollapsed && <span className="ml-3 whitespace-nowrap">Tabel Utama</span>}
        </button>
        
        <button 
          onClick={() => onChangeView('settings')}
          className={`w-full flex items-center px-4 py-4 transition-colors border-l-4 ${currentView === 'settings' ? activeClass : inactiveClass}`}
          title="Pengaturan Warna"
        >
          <Palette size={20} className="flex-shrink-0" />
          {!isCollapsed && <span className="ml-3 whitespace-nowrap">Pengaturan Warna</span>}
        </button>

        <button 
          onClick={onOpenMasterData}
          className={`w-full flex items-center px-4 py-4 transition-colors border-l-4 border-transparent ${hoverClass} ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-blue-700'}`}
          title="Master Data"
        >
          <Database size={20} className="flex-shrink-0" />
          {!isCollapsed && <span className="ml-3 whitespace-nowrap">Master Data</span>}
        </button>
      </nav>

      <button 
        onClick={onToggleCollapse}
        className={`absolute -right-3 top-20 bg-blue-600 rounded-full p-1 text-white shadow-md hover:bg-blue-500 z-50 border ${isDarkMode ? 'border-slate-900' : 'border-white'}`}
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className={`p-4 border-t ${borderClass} text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-400'} ${isCollapsed ? 'text-center' : ''}`}>
        {!isCollapsed ? 'v1.0.2' : 'v1'}
      </div>
    </div>
  );
};

export default Sidebar;
