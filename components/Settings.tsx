import React from 'react';
import { ThemeConfig, ChangeStatus } from '../types';

interface SettingsProps {
  theme: ThemeConfig;
  onUpdateTheme: (newTheme: ThemeConfig) => void;
  onReset: () => void;
}

const Settings: React.FC<SettingsProps> = ({ theme, onUpdateTheme, onReset }) => {
  
  const handleChange = (status: ChangeStatus, color: string) => {
    onUpdateTheme({
      ...theme,
      [status]: color
    });
  };

  const statusLabels: Record<ChangeStatus, string> = {
    [ChangeStatus.UNCHANGED]: 'Tidak Berubah',
    [ChangeStatus.CHANGED]: 'Ada Perubahan (Revisi)',
    [ChangeStatus.NEW]: 'Data Baru',
    [ChangeStatus.DELETED]: 'Data Dihapus',
    [ChangeStatus.BLOCKED]: 'Diblokir',
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-slate-800">Pengaturan Tema Warna</h2>
      
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600 mb-6">Sesuaikan warna latar belakang untuk setiap status perubahan data dalam tabel.</p>
        
        <div className="space-y-4">
          {Object.values(ChangeStatus).map((status) => (
            <div key={status} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
              <div className="flex items-center">
                 <div 
                    className="w-10 h-10 rounded border shadow-sm mr-4" 
                    style={{ backgroundColor: theme[status] }}
                 ></div>
                 <span className="font-medium text-gray-700">{statusLabels[status]}</span>
              </div>
              <input 
                type="color" 
                value={theme[status]} 
                onChange={(e) => handleChange(status, e.target.value)}
                className="h-10 w-20 cursor-pointer"
              />
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-end">
            <button 
                onClick={onReset}
                className="px-4 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors"
            >
                Reset ke Default
            </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;