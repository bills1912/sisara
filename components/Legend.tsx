
import React from 'react';

const Legend: React.FC = () => {
  return (
    <div className="text-xs text-gray-800">
      <h3 className="font-bold mb-2 pb-1 border-b border-gray-200 text-gray-900">KETERANGAN WARNA</h3>
      <div className="flex flex-col gap-2">
        <div className="flex items-start">
          <div className="w-4 h-4 bg-orange-200 border border-gray-300 mr-2 flex-shrink-0 rounded-sm mt-0.5"></div>
          <span className="leading-tight">Ada perubahan nilai volume/harga <span className="text-gray-500 text-[10px] block">(Anggaran dapat digunakan)</span></span>
        </div>
        <div className="flex items-start">
          <div className="w-4 h-4 bg-cyan-200 border border-gray-300 mr-2 flex-shrink-0 rounded-sm mt-0.5"></div>
          <span className="leading-tight">Penambahan detail baru <span className="text-gray-500 text-[10px] block">(Anggaran dapat digunakan)</span></span>
        </div>
        <div className="flex items-start">
          <div className="w-4 h-4 bg-red-500 border border-gray-300 mr-2 flex-shrink-0 rounded-sm mt-0.5"></div>
          <span className="leading-tight">Detail dihapus <span className="text-red-600 font-bold text-[10px] block">(Anggaran TIDAK dapat digunakan)</span></span>
        </div>
        <div className="flex items-start">
          <div className="w-4 h-4 bg-purple-300 border border-gray-300 mr-2 flex-shrink-0 rounded-sm mt-0.5"></div>
          <span className="leading-tight">Detail diblokir <span className="text-red-600 font-bold text-[10px] block">(Anggaran TIDAK dapat digunakan)</span></span>
        </div>
      </div>
    </div>
  );
};

export default Legend;
