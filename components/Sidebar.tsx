
import React from 'react';
import { LayoutGrid, Palette, Table, ChevronLeft, ChevronRight, Database, History, LogOut } from 'lucide-react';
import { UserRole } from '../types';

interface SidebarProps {
  currentView: 'table' | 'settings' | 'history';
  onChangeView: (view: 'table' | 'settings' | 'history') => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenMasterData: () => void;
  isDarkMode: boolean;
  userRole: UserRole;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, isCollapsed, onToggleCollapse, onOpenMasterData, isDarkMode, userRole, onLogout }) => {
  // Dynamic styling based on theme
  const bgClass = isDarkMode ? 'bg-slate-900' : 'bg-white';
  const textClass = isDarkMode ? 'text-white' : 'text-slate-800';
  const borderClass = isDarkMode ? 'border-slate-700' : 'border-gray-200';
  
  const hoverClass = isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-blue-50';
  const activeClass = isDarkMode ? 'bg-slate-800 border-blue-500' : 'bg-blue-50 text-blue-700 border-blue-600';
  const inactiveClass = `border-transparent ${hoverClass}`;

  return (
    <div 
        className={`${isCollapsed ? 'w-16' : 'w-64'} ${bgClass} ${textClass} border-r ${borderClass} flex flex-col flex-shrink-0 transition-all duration-300 relative z-[100]`}
    >
      <div className={`flex items-start ${isCollapsed ? 'justify-center h-16 items-center' : 'px-5 py-4'} border-b ${borderClass} transition-all overflow-hidden`}>
        <img 
            src="assets/images/logo-nifili.png" 
            alt="Logo NIFILI" 
            className={`${isCollapsed ? 'h-10' : 'h-10 mt-1'} w-auto object-contain flex-shrink-0`}
        />
        {!isCollapsed && (
            <div className="ml-3 overflow-hidden animate-in fade-in duration-300">
                <span className="block font-bold text-xl leading-tight tracking-tight">NIFILI</span>
                <span className={`block text-[9px] font-medium leading-tight mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Sistem Informasi Finalisasi & Integrasi Anggaran dan Penarikan Dana
                </span>
            </div>
        )}
      </div>
      
      <nav className="flex-1 py-4 overflow-hidden flex flex-col">
        <button 
          onClick={() => onChangeView('table')}
          className={`w-full flex items-center px-4 py-4 transition-colors border-l-4 ${currentView === 'table' ? activeClass : inactiveClass}`}
          title="Tabel Utama"
        >
          <Table size={20} className="flex-shrink-0" />
          {!isCollapsed && <span className="ml-3 whitespace-nowrap">Tabel Utama</span>}
        </button>

        {/* REVISION HISTORY: ONLY FOR PPK */}
        {userRole === UserRole.PPK && (
            <button 
            onClick={() => onChangeView('history')}
            className={`w-full flex items-center px-4 py-4 transition-colors border-l-4 ${currentView === 'history' ? activeClass : inactiveClass}`}
            title="Riwayat Revisi"
            >
            <History size={20} className="flex-shrink-0" />
            {!isCollapsed && <span className="ml-3 whitespace-nowrap">Riwayat Revisi</span>}
            </button>
        )}
        
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

        <div className="mt-auto mb-4 border-t pt-4 border-gray-200">
            <button 
                onClick={onLogout}
                className={`w-full flex items-center px-4 py-2 transition-colors text-red-600 hover:bg-red-50`}
                title="Logout"
            >
                <LogOut size={20} className="flex-shrink-0" />
                {!isCollapsed && <span className="ml-3 whitespace-nowrap font-medium">Keluar</span>}
            </button>
        </div>
      </nav>

      <button 
        onClick={onToggleCollapse}
        className={`absolute -right-3 top-24 bg-blue-600 rounded-full p-1 text-white shadow-md hover:bg-blue-500 z-[110] border ${isDarkMode ? 'border-slate-900' : 'border-white'}`}
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className={`p-4 border-t ${borderClass} text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-400'} ${isCollapsed ? 'text-center' : ''}`}>
        {!isCollapsed ? 'v1.0.4' : 'v1'}
      </div>
    </div>
  );
};

export default Sidebar;
