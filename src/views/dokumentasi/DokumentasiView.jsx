import { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';

export default function DokumentasiView() {
  const { fetchGAS } = useAppContext();
  
  const [judul, setJudul] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  
  const [galeri, setGaleri] = useState([]);
  const [isFetchingGaleri, setIsFetchingGaleri] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ isUploading: false, current: 0, total: 0 });

  useEffect(() => {
    loadGaleri();
  }, []);

  const loadGaleri = async () => {
    setIsFetchingGaleri(true);
    try {
      // 1. SMART CACHE: Cek memori browser lokal
      const cachedData = sessionStorage.getItem('cache_galeri_sekolah');
      if (cachedData) {
        setGaleri(JSON.parse(cachedData));
        setIsFetchingGaleri(false);
        return; // Menghemat 100% beban GAS!
      }

      // 2. Fetch ke GAS jika cache kosong
      const result = await fetchGAS('getDokumentasi', {});
      if (result && result.status === 'success') {
        setGaleri(result.data || []);
        // 3. Simpan hasil dari GAS ke cache untuk kunjungan berikutnya
        sessionStorage.setItem('cache_galeri_sekolah', JSON.stringify(result.data || []));
      } else {
        console.error("Format data GAS ditolak atau terjadi error:", result);
      }
    } catch (error) {
      console.error("Jaringan gagal memuat galeri:", error);
    } finally {
      setIsFetchingGaleri(false);
    }
  };

  const getDirectImageUrl = (driveUrl) => {
    if (!driveUrl) return '';
    const idMatch = driveUrl.match(/[-\w]{25,}/);
    if (idMatch) return `https://lh3.googleusercontent.com/d/${idMatch[0]}`;
    return driveUrl;
  };

  const formatTanggal = (rawDate) => {
    try {
      const date = new Date(rawDate);
      return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) {
      return rawDate; 
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => {
      if (file.size > 2 * 1024 * 1024) {
        alert(`File ${file.name} terlalu besar. Lewati (Maks 2MB).`);
        return false;
      }
      return file.type.startsWith('image/');
    });
    setSelectedFiles(validFiles);
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!judul || selectedFiles.length === 0) {
      alert('Judul dan minimal 1 Foto wajib diisi/dipilih!');
      return;
    }

    setUploadProgress({ isUploading: true, current: 0, total: selectedFiles.length });
    const tanggalHariIni = new Date().toISOString().split('T')[0];
    const judulAman = judul.replace(/[^a-zA-Z0-9 -]/g, '').trim().replace(/\s+/g, '_');

    for (let i = 0; i < selectedFiles.length; i++) {
      setUploadProgress(prev => ({ ...prev, current: i + 1 }));
      try {
        const base64Data = await fileToBase64(selectedFiles[i]);
        const namaFileOtomatis = `${judulAman}_${i + 1}`;
        const payload = { judul: judul, namaFile: namaFileOtomatis, fotoRaw: base64Data, tanggal: tanggalHariIni };
        await fetchGAS('uploadFoto', payload);
      } catch (err) {
        console.error(`Gagal unggah foto ke-${i+1}`, err);
      }
    }

    alert(`Berhasil mengunggah ${selectedFiles.length} dokumentasi!`);
    
    // Reset Form
    setJudul('');
    setSelectedFiles([]);
    setUploadProgress({ isUploading: false, current: 0, total: 0 });
    
    // HAPUS CACHE LAMA: Agar data yang baru diunggah langsung tampil
    sessionStorage.removeItem('cache_galeri_sekolah');
    
    loadGaleri();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Unggah Dokumentasi Massal</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Judul Kegiatan</label>
            <input 
              type="text" 
              value={judul} 
              onChange={(e) => setJudul(e.target.value)} 
              placeholder="Misal: Rapat Pleno Guru" 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
              disabled={uploadProgress.isUploading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Beberapa Foto</label>
            <input 
              type="file" 
              accept="image/*" 
              multiple 
              onChange={handleFileChange} 
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              disabled={uploadProgress.isUploading}
            />
            {selectedFiles.length > 0 && (
              <p className="text-xs text-green-600 mt-2 font-medium">✅ {selectedFiles.length} foto siap diunggah.</p>
            )}
          </div>
          <button 
            type="submit" 
            disabled={uploadProgress.isUploading || selectedFiles.length === 0} 
            className={`w-full py-2.5 px-4 rounded-lg text-white font-medium transition-colors flex items-center justify-center ${
              uploadProgress.isUploading ? 'bg-orange-500 cursor-wait' : 'bg-blue-600 hover:bg-blue-700 shadow-md'
            }`}
          >
            {uploadProgress.isUploading 
              ? `Mengunggah... (${uploadProgress.current}/${uploadProgress.total})` 
              : 'Mulai Unggah Massal'}
          </button>
        </form>
      </div>

      <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4 font-sans">Galeri Aktivitas Terbaru</h3>
        
        {isFetchingGaleri ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-gray-500 animate-pulse font-medium">Memuat galeri foto...</p>
          </div>
        ) : galeri.length === 0 ? (
          <div className="border border-dashed border-gray-300 rounded-xl bg-gray-50 h-40 flex items-center justify-center">
            <p className="text-gray-500 text-sm">Belum ada foto yang diunggah.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {galeri.map((item, index) => (
              <div key={index} className="border border-gray-100 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                <img 
                  src={getDirectImageUrl(item.url)} 
                  alt={item.judul} 
                  className="w-full h-40 object-cover bg-gray-100"
                  loading="lazy"
                  onError={(e) => {
                    e.target.onerror = null; 
                    e.target.src = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'%3E%3Crect fill='%23f3f4f6' width='600' height='400'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='20' font-weight='bold' x='50%25' y='50%25' text-anchor='middle'%3EGambar Tidak Tersedia%3C/text%3E%3C/svg%3E";
                  }}
                />
                <div className="p-3">
                  <h4 className="text-sm font-bold text-gray-800 truncate" title={item.judul}>{item.judul}</h4>
                  <p className="text-xs text-gray-500 mt-1">📅 {formatTanggal(item.tanggal)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}