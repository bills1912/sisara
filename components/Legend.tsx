import React from 'react';

const Legend: React.FC = () => {
  return (
    <div className="bg-white p-4 rounded shadow mb-4 border text-sm">
      <h3 className="font-bold mb-2">KETERANGAN WARNA PADA DETAIL REVISI</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-orange-200 border border-gray-300 mr-2 flex-shrink-0"></div>
          <span>Ada perubahan nilai volume atau harga satuan (anggaran <b>dapat</b> digunakan)</span>
        </div>
        <div className="flex items-center">
          <div className="w-8 h-8 bg-cyan-200 border border-gray-300 mr-2 flex-shrink-0"></div>
          <span>Penambahan detail baru (anggaran <b>dapat</b> digunakan)</span>
        </div>
        <div className="flex items-center">
          <div className="w-8 h-8 bg-red-500 border border-gray-300 mr-2 flex-shrink-0"></div>
          <span>Detail dihapus (anggaran <b>tidak dapat</b> digunakan)</span>
        </div>
        <div className="flex items-center">
          <div className="w-8 h-8 bg-purple-300 border border-gray-300 mr-2 flex-shrink-0"></div>
          <span>Detail diblokir (anggaran <b>tidak dapat</b> digunakan)</span>
        </div>
      </div>
    </div>
  );
};

export default Legend;