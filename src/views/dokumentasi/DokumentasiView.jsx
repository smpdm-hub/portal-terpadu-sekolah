import { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';

export default function DokumentasiView() {
  const { fetchGAS } = useAppContext();
  
  // State Form
  const hariIni = new Date().toISOString().split('T')[0];
  const [judul, setJudul] = useState('');
  const [tanggal, setTanggal] = useState(hariIni);
  const [fileQueue, setFileQueue] = useState([]); 
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  
  // State Galeri & Pencarian
  const [galeri, setGaleri] = useState([]);
  const [isFetchingGaleri, setIsFetchingGaleri] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

  // Endpoint API Thumbnail Google Drive anti blokir
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

  // Kompresi HTML5 Canvas (Target ~1.5MB)
  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          
          // Resolusi Full HD
          const MAX_WIDTH = 1920; 
          const MAX_HEIGHT = 1920;
          
          let width = img.width;
          let height = img.height;

          // Menjaga proporsi rasio asli gambar
          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height *= MAX_WIDTH / width));
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width *= MAX_HEIGHT / height));
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Kualitas render JPEG di 90% untuk ketajaman optimal
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
          resolve(compressedDataUrl.split(',')[1]); 
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.reduce((acc, file) => {
      if (!file.type.startsWith('image/')) {
        alert(`File ${file.name} bukan gambar.`);
      } else {
        acc.push({
          file: file,
          name: file.name,
          id: Math.random().toString(36).substr(2, 9),
          status: 'pending'
        });
      }
      return acc;
    }, []);

    setFileQueue(prev => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeQueueItem = (id) => {
    setFileQueue(prev => prev.filter(item => item.id !== id));
  };

  const startUpload = async () => {
    if (!judul || !tanggal || fileQueue.length === 0) {
      alert('Judul, Tanggal, dan minimal 1 Foto wajib diisi!');
      return;
    }

    setIsUploading(true);
    
    for (let i = 0; i < fileQueue.length; i++) {
      const item = fileQueue[i];
      if (item.status === 'completed') continue; 

      setFileQueue(prev => prev.map(f => f.id === item.id ? { ...f, status: 'uploading' } : f));

      try {
        const compressedBase64 = await compressImage(item.file);
        
        const payload = { 
          judul: judul, 
          fotoRaw: compressedBase64, 
          tanggal: tanggal 
        };
        
        await fetchGAS('uploadFoto', payload);
        
        setFileQueue(prev => prev.map(f => f.id === item.id ? { ...f, status: 'completed' } : f));
      } catch (err) {
        console.error(`Gagal unggah ${item.name}`, err);
        setFileQueue(prev => prev.map(f => f.id === item.id ? { ...f, status: 'error' } : f));
      }
    }

    setIsUploading(false);
    
    const semuaBerhasil = fileQueue.every(f => f.status === 'completed');
    if (semuaBerhasil) {
      alert('Semua dokumentasi berhasil dikompresi dan diunggah!');
      setJudul('');
      setFileQueue([]);
      sessionStorage.removeItem('cache_galeri_sekolah'); 
      loadGaleri();
    } else {
      alert('Proses selesai, tapi ada file gagal. Periksa antrean.');
    }
  };

  const filteredGaleri = galeri.filter(item => 
    item.judul?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>☁️</span> Unggah Dokumentasi
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1">Judul Kegiatan</label>
              <input 
                type="text" value={judul} onChange={(e) => setJudul(e.target.value)} 
                placeholder="Misal: Rapat Pleno Guru" 
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors" 
                disabled={isUploading}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1">Tanggal Kegiatan</label>
              <input 
                type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} 
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors" 
                disabled={isUploading}
              />
            </div>
            
            <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${judul ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200 bg-gray-50'}`}>
              <p className="text-sm text-gray-500 mb-3">Pilih file foto (Otomatis kompresi HQ)</p>
              <button 
                onClick={() => fileInputRef.current.click()} 
                disabled={isUploading || !judul}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-50 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Jelajahi File
              </button>
              <input 
                type="file" accept="image/*" multiple 
                onChange={handleFileChange} ref={fileInputRef} className="hidden"
              />
            </div>
          </div>
        </div>

        {fileQueue.length > 0 && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-gray-800">Antrean Unggah ({fileQueue.length})</h3>
              <button 
                onClick={startUpload} disabled={isUploading}
                className="px-4 py-1.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {isUploading ? <span className="animate-pulse">Memproses...</span> : 'Mulai Unggah'}
              </button>
            </div>
            
            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
              {fileQueue.map((item) => (
                <div key={item.id} className={`p-3 rounded-lg border text-sm flex justify-between items-center ${
                  item.status === 'completed' ? 'bg-green-50 border-green-200' : 
                  item.status === 'error' ? 'bg-red-50 border-red-200' : 
                  item.status === 'uploading' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                }`}>
                  <span className="truncate font-medium text-gray-700 pr-2 max-w-[150px]" title={item.name}>{item.name}</span>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {item.status === 'pending' && (
                      <>
                        <span className="text-xs font-bold text-gray-500">Menunggu</span>
                        <button onClick={() => removeQueueItem(item.id)} disabled={isUploading} className="text-red-500 hover:text-red-700 text-lg font-bold px-1">×</button>
                      </>
                    )}
                    {item.status === 'uploading' && <span className="text-xs font-bold text-blue-600 animate-pulse">Memproses...</span>}
                    {item.status === 'completed' && <span className="text-xs font-bold text-green-600">✅ Selesai</span>}
                    {item.status === 'error' && <span className="text-xs font-bold text-red-600">❌ Gagal</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h3 className="text-xl font-bold text-gray-800">🖼️ Galeri Sekolah</h3>
          
          <div className="flex w-full sm:w-auto gap-2">
            <input 
              type="text" 
              placeholder="Cari judul kegiatan..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 px-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={() => {sessionStorage.removeItem('cache_galeri_sekolah'); loadGaleri();}} className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 border border-gray-200" title="Muat ulang dari server">
              🔄
            </button>
          </div>
        </div>
        
        {isFetchingGaleri ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
            <p className="text-gray-500 font-medium animate-pulse">Menyelaraskan data galeri...</p>
          </div>
        ) : filteredGaleri.length === 0 ? (
          <div className="flex-1 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 flex flex-col items-center justify-center min-h-[300px] text-gray-400">
            <span className="text-4xl mb-2">📭</span>
            <p className="text-sm font-medium">Belum ada dokumentasi atau pencarian tidak ditemukan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 overflow-y-auto pb-4">
            {filteredGaleri.map((item, index) => (
              <div key={index} className="group relative border border-gray-100 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-all">
                
                <div className="absolute inset-0 bg-gray-900/40 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center">
                  <a href={item.url} target="_blank" rel="noreferrer" className="px-4 py-2 bg-white text-gray-800 text-sm font-bold rounded-lg shadow-lg hover:bg-blue-50 transform scale-95 group-hover:scale-100 transition-transform">
                    Buka Penuh ↗
                  </a>
                </div>

                <img 
                  src={getDirectImageUrl(item.url)} 
                  alt={item.judul} 
                  className="w-full h-40 object-cover bg-gray-100"
                  loading="lazy"
                />
                <div className="p-4 border-t border-gray-50">
                  <h4 className="text-sm font-bold text-gray-800 truncate" title={item.judul}>{item.judul}</h4>
                  <p className="text-xs font-semibold text-gray-500 mt-1.5 flex items-center gap-1.5">
                    <span className="bg-gray-100 px-2 py-0.5 rounded text-[10px]">📅 {formatTanggal(item.tanggal)}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
    </div>
  );
}
