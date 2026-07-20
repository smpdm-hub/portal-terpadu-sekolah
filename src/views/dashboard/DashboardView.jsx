import { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';

export default function DashboardView() {
  const { fetchGAS, isLoading } = useAppContext();
  
  // Tanggal standar: Hari ini (Format YYYY-MM-DD)
  const hariIni = new Date().toISOString().split('T')[0];
  const [tanggalPilih, setTanggalPilih] = useState(hariIni);
  const [daftarJurnal, setDaftarJurnal] = useState([]);
  const [isFetching, setIsFetching] = useState(false);

  // FUNGSI AKTIF: Memuat data jurnal harian dari Google Sheets
  const muatDataJurnal = async (tanggal) => {
    setIsFetching(true);
    try {
      const result = await fetchGAS('getJurnalHarian', { tanggal });
      if (result && result.status === 'success' && Array.isArray(result.data)) {
        setDaftarJurnal(result.data);
      } else {
        setDaftarJurnal([]);
      }
    } catch (error) {
      console.error("Gagal memuat data jurnal:", error);
      setDaftarJurnal([]);
    } finally {
      setIsFetching(false);
    }
  };

  // Jalankan penarikan data setiap kali tanggalPilih berubah
  useEffect(() => {
    muatDataJurnal(tanggalPilih);
  }, [tanggalPilih]);

  return (
    <div className="space-y-6">
      
      {/* HEADER & DATE PICKER */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">📌 Rekap Jurnal Mengajar Harian</h2>
          <p className="text-sm text-gray-500 mt-1">
            Pantau keterisian jurnal bersama-sama untuk saling mengingatkan antar-rekan sejawat.
          </p>
        </div>
        
        <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-gray-200 w-full md:w-auto">
          <label htmlFor="filterTanggal" className="text-xs font-bold text-gray-600 uppercase">Pilih Tanggal:</label>
          <input 
            type="date" 
            id="filterTanggal"
            value={tanggalPilih}
            onChange={(e) => setTanggalPilih(e.target.value)}
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* KARTU RINGKASAN */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50/60 border border-blue-100 p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-blue-600 uppercase">Total Jurnal Terisi</p>
            <p className="text-2xl font-black text-blue-900 mt-1">
              {isFetching ? '...' : `${daftarJurnal.length} Kelas`}
            </p>
          </div>
          <span className="text-2xl">📖</span>
        </div>
        <div className="bg-emerald-50/60 border border-emerald-100 p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-600 uppercase">Status Akses</p>
            <p className="text-sm font-bold text-emerald-800 mt-1">Transparansi Kolektif</p>
          </div>
          <span className="text-2xl">🤝</span>
        </div>
        <div className="bg-amber-50/60 border border-amber-100 p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-amber-600 uppercase">Tanggal Terpilih</p>
            <p className="text-sm font-bold text-amber-900 mt-1">{tanggalPilih}</p>
          </div>
          <span className="text-2xl">📅</span>
        </div>
      </div>

      {/* TABEL REKAP JURNAL SINKRON */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 uppercase font-bold text-xs border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Kelas & Jam</th>
                <th className="px-6 py-4">Mata Pelajaran</th>
                <th className="px-6 py-4">Guru Pengampu</th>
                <th className="px-6 py-4">Materi Pembelajaran</th>
                <th className="px-6 py-4">Ket. Absen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isFetching || isLoading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    <p className="text-sm font-semibold animate-pulse">⏳ Memuat data jurnal dari database...</p>
                  </td>
                </tr>
              ) : daftarJurnal.length > 0 ? (
                daftarJurnal.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-bold text-blue-600 block">{item.kelas}</span>
                      <span className="text-xs font-semibold text-gray-500 bg-slate-100 px-2 py-0.5 rounded mt-1 inline-block">Jam: {item.jamKe}</span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-800">{item.mapel}</td>
                    <td className="px-6 py-4 font-medium text-gray-700">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 text-xs font-semibold">
                        👤 {item.guruPengampu || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 max-w-xs truncate" title={item.materi}>
                      {item.materi}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold px-2 py-1 rounded-md ${item.keteranganAbsen === 'Nihil' || !item.keteranganAbsen ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {item.keteranganAbsen || 'Nihil'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                    <p className="text-base font-semibold">Belum ada jurnal yang diinput untuk tanggal ini.</p>
                    <p className="text-xs text-gray-400 mt-1">Mari ingatkan rekan sejawat untuk melengkapi jurnal harian!</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}