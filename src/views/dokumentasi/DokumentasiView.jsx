import { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';

export default function DokumentasiView({ user }) {
  const { fetchGAS } = useAppContext(); 
  
  const hariIni = new Date().toISOString().split('T')[0];
  const [judul, setJudul] = useState('');
  const [tanggal, setTanggal] = useState(hariIni);
  const [fileQueue, setFileQueue] = useState([]); 
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  
  const [galeri, setGaleri] = useState([]);
  const [isFetchingGaleri, setIsFetchingGaleri] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [kategoriAktif, setKategoriAktif] = useState('Semua');
  
  const [modeHapus, setModeHapus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadGaleri();
  }, []);

  const loadGaleri = async () => {
    setIsFetchingGaleri(true);
    try {
      const cachedData = sessionStorage.getItem('cache_galeri_sekolah');
      if (cachedData) {
        setGaleri(JSON.parse(cachedData));
        setIsFetchingGaleri(false);
        return;
      }
      const result = await fetchGAS('getDokumentasi', {});
      if (result && result.status === 'success') {
        setGaleri(result.data || []);
        sessionStorage.setItem('cache_galeri_sekolah', JSON.stringify(result.data || []));
      }
    } catch (error) {
      console.error("Gagal memuat galeri:", error);
    } finally {
      setIsFetchingGaleri(false);
    }
  };

  const getDirectImageUrl = (driveUrl) => {
    if (!driveUrl) return '';
    const idMatch = driveUrl.match(/[-\w]{25,}/);
    if (idMatch) return `https://drive.google.com/thumbnail?id=${idMatch[0]}&sz=w800`;
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

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1920; 
          const MAX_HEIGHT = 1920;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) { height = Math.round((height *= MAX_WIDTH / width)); width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width = Math.round((width *= MAX_HEIGHT / height)); height = MAX_HEIGHT; }
          }

          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.9).split(',')[1]); 
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.reduce((acc, file) => {
      if (!file.type.startsWith('image/')) alert(`File ${file.name} bukan gambar.`);
      else acc.push({ file: file, name: file.name, id: Math.random().toString(36).substr(2, 9), status: 'pending' });
      return acc;
    }, []);
    setFileQueue(prev => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeQueueItem = (id) => setFileQueue(prev => prev.filter(item => item.id !== id));

  const startUpload = async () => {
    if (!judul || !tanggal || fileQueue.length === 0) return alert('Judul, Tanggal, dan minimal 1 Foto wajib diisi!');
    setIsUploading(true);
    
    for (let i = 0; i < fileQueue.length; i++) {
      const item = fileQueue[i];
      if (item.status === 'completed') continue; 
      setFileQueue(prev => prev.map(f => f.id === item.id ? { ...f, status: 'uploading' } : f));

      try {
        const compressedBase64 = await compressImage(item.file);
        await fetchGAS('uploadFoto', { judul, fotoRaw: compressedBase64, tanggal });
        setFileQueue(prev => prev.map(f => f.id === item.id ? { ...f, status: 'completed' } : f));
      } catch (err) {
        setFileQueue(prev => prev.map(f => f.id === item.id ? { ...f, status: 'error' } : f));
      }
    }
    setIsUploading(false);
    
    if (fileQueue.every(f => f.status === 'completed' || f.status === 'pending')) {
      alert('Unggah berhasil!');
      setJudul(''); setFileQueue([]); sessionStorage.removeItem('cache_galeri_sekolah'); loadGaleri();
    }
  };

  const hapusDokumentasi = async (itemTarget) => {
    if (!window.confirm(`Yakin ingin menghapus dokumen "${itemTarget.judul}"?`)) return;
    setIsDeleting(true);
    try {
      const payloadHapus = { 
        url: itemTarget.url, 
        role: user?.role 
      };
      
      const res = await fetchGAS('deleteDokumentasi', payloadHapus);
      
      if (res.status === 'success') {
        const galeriBaru = galeri.filter(g => g.url !== itemTarget.url);
        setGaleri(galeriBaru);
        sessionStorage.setItem('cache_galeri_sekolah', JSON.stringify(galeriBaru));
      } else {
        alert(`Gagal: ${res.message}`); 
      }
    } catch (error) {
      alert('Terjadi kesalahan jaringan.');
    } finally {
      setIsDeleting(false);
    }
  };

  const daftarKategori = ['Semua', ...new Set(galeri.map(item => item.judul.split(' ')[0]))];

  const filteredGaleri = galeri.filter(item => {
    const matchSearch = item.judul?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchKategori = kategoriAktif === 'Semua' || item.judul.split(' ')[0] === kategoriAktif;
    return matchSearch && matchKategori;
  });

  const isAdmin = user?.role === 'SuperAdmin'; 

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">☁️ Unggah Dokumentasi</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1">Judul Kegiatan</label>
              <input type="text" value={judul} onChange={(e) => setJudul(e.target.value)} placeholder="Misal: Rapat Pleno Guru" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500" disabled={isUploading}/>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1">Tanggal Kegiatan</label>
              <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500" disabled={isUploading}/>
            </div>
            <div className={`border-2 border-dashed rounded-xl p-6 text-center ${judul ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200 bg-gray-50'}`}>
              <button onClick={() => fileInputRef.current.click()} disabled={isUploading || !judul} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-50 disabled:opacity-50">Jelajahi File</button>
              <input type="file" accept="image/*" multiple onChange={handleFileChange} ref={fileInputRef} className="hidden"/>
            </div>
          </div>
        </div>

        {fileQueue.length > 0 && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-gray-800">Antrean ({fileQueue.length})</h3>
              <button onClick={startUpload} disabled={isUploading} className="px-4 py-1.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {isUploading ? 'Memproses...' : 'Mulai Unggah'}
              </button>
            </div>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
              {fileQueue.map((item) => (
                <div key={item.id} className="p-3 rounded-lg border text-sm flex justify-between bg-gray-50">
                  <span className="truncate pr-2">{item.name}</span>
                  {item.status === 'pending' && <button onClick={() => removeQueueItem(item.id)} className="text-red-500 font-bold">×</button>}
                  {item.status === 'completed' && <span className="text-green-600">✅</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-full">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h3 className="text-xl font-bold text-gray-800">🖼️ Galeri Sekolah</h3>
          <div className="flex flex-wrap gap-2 items-center">
            <input type="text" placeholder="Cari judul..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full sm:w-48 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"/>
            {isAdmin && (
               <button onClick={() => setModeHapus(!modeHapus)} className={`px-3 py-2 text-sm font-bold rounded-lg border transition-colors ${modeHapus ? 'bg-red-500 text-white border-red-500' : 'bg-white text-red-500 border-red-200 hover:bg-red-50'}`}>
                 {modeHapus ? 'Tutup Kelola' : 'Hapus Foto'}
               </button>
            )}
            <button onClick={() => {sessionStorage.removeItem('cache_galeri_sekolah'); loadGaleri();}} className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200" title="Muat ulang">🔄</button>
          </div>
        </div>

        {daftarKategori.length > 1 && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
            {daftarKategori.map(kat => (
              <button 
                key={kat} 
                onClick={() => setKategoriAktif(kat)}
                className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${kategoriAktif === kat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {kat}
              </button>
            ))}
          </div>
        )}
        
        {isFetchingGaleri ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
             <p className="text-gray-500 font-medium animate-pulse">Menyelaraskan data...</p>
          </div>
        ) : filteredGaleri.length === 0 ? (
          <div className="flex-1 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 flex flex-col items-center justify-center min-h-[300px]">
            <p className="text-sm text-gray-500 font-medium">Belum ada dokumentasi.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 overflow-y-auto pb-4">
            {filteredGaleri.map((item, index) => (
              <div key={index} className={`group relative border rounded-xl overflow-hidden shadow-sm transition-all ${modeHapus ? 'border-red-300 ring-2 ring-red-100' : 'border-gray-100'}`}>
                
                <div className={`absolute inset-0 z-10 flex items-center justify-center transition-opacity ${modeHapus ? 'bg-red-900/60 opacity-100' : 'bg-gray-900/40 opacity-0 group-hover:opacity-100'}`}>
                  {modeHapus ? (
                    <button 
                      onClick={() => hapusDokumentasi(item)} disabled={isDeleting}
                      className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-lg shadow-lg hover:bg-red-700"
                    >
                      {isDeleting ? 'Menghapus...' : '🗑️ Hapus'}
                    </button>
                  ) : (
                    <a href={item.url} target="_blank" rel="noreferrer" className="px-4 py-2 bg-white text-gray-800 text-sm font-bold rounded-lg shadow-lg hover:bg-blue-50">
                      Buka Penuh ↗
                    </a>
                  )}
                </div>

                <img src={getDirectImageUrl(item.url)} alt={item.judul} className="w-full h-40 object-cover bg-gray-100" loading="lazy" />
                <div className="p-3 border-t border-gray-50">
                  <h4 className="text-sm font-bold text-gray-800 truncate">{item.judul}</h4>
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
