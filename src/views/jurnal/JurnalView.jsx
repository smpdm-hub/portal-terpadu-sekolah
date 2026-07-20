import { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';

export default function JurnalView({ user }) {
  const { fetchGAS, isLoading } = useAppContext();
  const todayDate = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    tanggal: todayDate,
    jamKe: '',
    kelas: '',
    mapel: '',
    materi: ''
  });

  const [initData, setInitData] = useState({
    kelas: [],
    mapel: [],
    riwayat: []
  });

  const [siswaList, setSiswaList] = useState([]);
  const [absenData, setAbsenData] = useState({});
  const [isFetchingInit, setIsFetchingInit] = useState(true);
  const [isFetchingSiswa, setIsFetchingSiswa] = useState(false);

  useEffect(() => {
    loadInitData();
  }, []);

  const loadInitData = async () => {
    setIsFetchingInit(true);
    try {
      const result = await fetchGAS('getInitJurnal', { tanggal: formData.tanggal });
      if (result && result.status === 'success') {
        setInitData({
          kelas: result.kelas || [],
          mapel: result.mapel || [],
          riwayat: result.riwayat || []
        });
      }
    } catch (error) {
      console.error("Gagal memuat data awal:", error);
    } finally {
      setIsFetchingInit(false);
    }
  };

  const handleKelasChange = async (e) => {
    const selectedKelas = e.target.value;
    setFormData({ ...formData, kelas: selectedKelas });
    setAbsenData({});
    setSiswaList([]);

    if (selectedKelas) {
      setIsFetchingSiswa(true);
      try {
        const result = await fetchGAS('getSiswaByKelas', { kelas: selectedKelas });
        if (result && result.status === 'success') {
          setSiswaList(result.data || []);
        }
      } catch (error) {
        console.error("Gagal memuat siswa:", error);
      } finally {
        setIsFetchingSiswa(false);
      }
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleTanggalChange = (e) => {
    setFormData({ ...formData, tanggal: e.target.value });
  };

  const handleAbsenChange = (nama, status) => {
    const updatedAbsen = { ...absenData };
    if (status === 'Hadir' || status === '') {
      delete updatedAbsen[nama];
    } else {
      updatedAbsen[nama] = status;
    }
    setAbsenData(updatedAbsen);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); 

    if (!formData.jamKe || !formData.kelas || !formData.mapel || !formData.materi) {
      alert('Jam Ke, Kelas, Mapel, dan Materi wajib diisi!');
      return;
    }

    const formatNama = (namaLengkap) => {
      const parts = namaLengkap.trim().split(' ');
      return parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0];
    };
    
    const rekapAbsen = Object.keys(absenData).length > 0 
      ? Object.keys(absenData).map(nama => `${formatNama(nama)} (${absenData[nama]})`).join(', ')
      : 'Nihil'; 

    const payload = {
      ...formData,
      jamKe: formData.jamKe, 
      namaGuru: user?.nama || 'Tanpa Nama', 
      keteranganAbsen: rekapAbsen
    };

    const result = await fetchGAS('addJurnal', payload);
    
    if (result && result.status === 'success') {
      alert('Jurnal dan data absen berhasil disimpan!');
      setFormData({ ...formData, materi: '', jamKe: '' }); 
      setAbsenData({}); 
      loadInitData(); 
    } else {
      alert('Gagal menyimpan jurnal. Periksa koneksi Anda.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
      
      {/* KIRI: Formulir Input & Absensi */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Isi Jurnal & Absensi</h2>
        
        {isFetchingInit ? (
          <div className="text-center py-10 text-gray-500 animate-pulse font-medium">Sinkronisasi data...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
                <input type="date" name="tanggal" value={formData.tanggal} onChange={handleTanggalChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jam Ke-</label>
                <input type="text" name="jamKe" value={formData.jamKe} onChange={handleChange} placeholder="Contoh: 1-2" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Kelas</label>
                <select name="kelas" value={formData.kelas} onChange={handleKelasChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">-- Kelas --</option>
                  {initData.kelas.map((kls, i) => (
                    <option key={i} value={kls}>{kls}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Mapel</label>
                <select name="mapel" value={formData.mapel} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">-- Mata Pelajaran --</option>
                  {initData.mapel.map((mpl, i) => (
                    <option key={i} value={mpl}>{mpl}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Materi Pembelajaran</label>
              <textarea name="materi" value={formData.materi} onChange={handleChange} rows="3" placeholder="Ketik ringkasan materi..." className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"></textarea>
            </div>

            {formData.kelas && (
              <div className="border-t border-gray-100 pt-4 mt-4">
                <h3 className="text-sm font-bold text-gray-700 mb-2">Data Absensi Kelas {formData.kelas}</h3>
                <p className="text-xs text-gray-500 mb-3">Abaikan siswa yang hadir. Tandai hanya yang tidak hadir.</p>
                
                {isFetchingSiswa ? (
                  <p className="text-sm text-blue-500 animate-pulse">Memuat daftar siswa...</p>
                ) : siswaList.length === 0 ? (
                  <p className="text-sm text-red-500">Belum ada data siswa untuk kelas ini di Spreadsheet.</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-gray-50 space-y-2">
                    {siswaList.map((siswa, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-white rounded border border-gray-100 shadow-sm">
                        <span className="text-sm font-medium text-gray-700">{siswa}</span>
                        <select 
                          className="text-sm border border-gray-300 rounded p-1 outline-none focus:border-blue-500"
                          value={absenData[siswa] || 'Hadir'}
                          onChange={(e) => handleAbsenChange(siswa, e.target.value)}
                        >
                          <option value="Hadir">Hadir</option>
                          <option value="S">Sakit (S)</option>
                          <option value="I">Izin (I)</option>
                          <option value="A">Alpha (A)</option>
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            <button type="submit" disabled={isLoading} className={`w-full py-3 px-4 rounded-lg text-white font-bold transition-all ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-md'}`}>
              {isLoading ? 'Menyimpan Data...' : 'Kirim Jurnal & Absensi'}
            </button>
          </form>
        )}
      </div>

      {/* KANAN: Tabel Riwayat Web (Tanpa Tombol Cetak) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit flex flex-col">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-1">Riwayat Jurnal</h2>
          <p className="text-sm text-gray-500">Filter tanggal: <span className="font-semibold text-gray-700">{formData.tanggal}</span></p>
        </div>
        
        {isFetchingInit ? (
          <div className="text-center py-10 text-gray-500 flex-1">Memuat riwayat...</div>
        ) : initData.riwayat.length === 0 ? (
          <div className="bg-blue-50 rounded-lg p-6 text-center text-blue-700 text-sm flex-1">Belum ada jurnal untuk tanggal ini.</div>
        ) : (
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 uppercase tracking-wider text-xs">
                  <th className="p-3 border-b border-gray-200">Kelas</th>
                  <th className="p-3 border-b border-gray-200">Mapel</th>
                  <th className="p-3 border-b border-gray-200">Absensi</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                {initData.riwayat.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="p-3 border-b border-gray-100 font-semibold">{item.kelas}</td>
                    <td className="p-3 border-b border-gray-100">{item.mapel}</td>
                    <td className="p-3 border-b border-gray-100 text-xs text-red-600">{item.absen}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}