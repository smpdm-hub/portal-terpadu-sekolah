import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';

export default function BankSoalView() {
  const { fetchGAS, isLoading } = useAppContext();
  
  const [formData, setFormData] = useState({
    tahunPelajaran: '2025/2026',
    semester: 'Ganjil',
    jenisUjian: 'PTS',
    mapel: '',
    kelas: '',
    linkOnline: '',
    check1: false,
    check2: false,
    check3: false,
  });

  const [fileNaskah, setFileNaskah] = useState(null);
  const [fileBase64, setFileBase64] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ 
      ...formData, 
      [name]: type === 'checkbox' ? checked : value 
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileNaskah(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result.split(',')[1];
        setFileBase64(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const isInputReady = formData.mapel !== '' && formData.kelas !== '';
  const isAllChecked = formData.check1 && formData.check2 && formData.check3;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAllChecked || !fileBase64) {
      alert('Pastikan checklist lengkap dan file naskah sudah dipilih!');
      return;
    }

    const payload = {
      ...formData,
      namaFile: fileNaskah,
      fileRaw: fileBase64,
      tanggal: new Date().toISOString().split('T')[0]
    };

    const result = await fetchGAS('uploadNaskah', payload);

    if (result && result.status === 'success') {
      alert('Naskah berhasil diarsipkan ke Google Drive & Sheets!');
      setFileNaskah(null);
      setFileBase64('');
      setFormData(prev => ({...prev, check1: false, check2: false, check3: false}));
    } else {
      alert('Gagal mengunggah naskah. Periksa koneksi GAS Anda.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center gap-2 mb-6 text-gray-800">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
        </svg>
        <h2 className="text-xl font-bold">Unggah Naskah Ujian & Link Online</h2>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tahun Pelajaran</label>
            <select name="tahunPelajaran" value={formData.tahunPelajaran} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="2024/2025">2024/2025</option>
              <option value="2025/2026">2025/2026</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
            <select name="semester" value={formData.semester} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="Ganjil">Ganjil</option>
              <option value="Genap">Genap</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Ujian</label>
            <select name="jenisUjian" value={formData.jenisUjian} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="PH">PH (Penilaian Harian)</option>
              <option value="PTS">PTS</option>
              <option value="PAS">PAS</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mata Pelajaran</label>
            <select name="mapel" value={formData.mapel} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">-- Pilih Mata Pelajaran --</option>
              <option value="Matematika">Matematika</option>
              <option value="Bahasa Indonesia">Bahasa Indonesia</option>
              <option value="IPA">IPA</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kelas</label>
            <select name="kelas" value={formData.kelas} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">-- Pilih Kelas --</option>
              <option value="7A">7A</option>
              <option value="7B">7B</option>
              <option value="8A">8A</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-purple-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
            Link Ujian Online (Google Form / CBT - Opsional)
          </label>
          <input type="url" name="linkOnline" value={formData.linkOnline} onChange={handleChange} placeholder="https://forms.gle/..." className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>

        {!isInputReady ? (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
            <p className="text-gray-400 font-medium">Lengkapi pilihan Mata Pelajaran dan Kelas untuk memunculkan syarat checklist & area unggah.</p>
          </div>
        ) : (
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-6 transition-all duration-300">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Checklist Kelengkapan (Wajib Dicentang)</h3>
            <div className="space-y-3 mb-6">
              <label className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:border-indigo-300 transition-colors">
                <input type="checkbox" name="check1" checked={formData.check1} onChange={handleChange} className="w-5 h-5 text-indigo-600 rounded" />
                <span className="text-sm font-medium text-gray-700">1. Kisi-kisi Ujian Telah Selesai & Divalidasi Kurikulum</span>
              </label>
              <label className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:border-indigo-300 transition-colors">
                <input type="checkbox" name="check2" checked={formData.check2} onChange={handleChange} className="w-5 h-5 text-indigo-600 rounded" />
                <span className="text-sm font-medium text-gray-700">2. Naskah Soal Sesuai Kaidah Akademik & Bebas SARA</span>
              </label>
              <label className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:border-indigo-300 transition-colors">
                <input type="checkbox" name="check3" checked={formData.check3} onChange={handleChange} className="w-5 h-5 text-indigo-600 rounded" />
                <span className="text-sm font-medium text-gray-700">3. Kunci Jawaban & Panduan Skor Ujian Tersedia</span>
              </label>
            </div>

            {/* Area Unggah Naskah muncul setelah Checklist terpenuhi */}
            {isAllChecked && (
              <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${fileNaskah ? 'border-green-400 bg-green-50' : 'border-indigo-300 bg-white'}`}>
                <input type="file" id="naskah" accept=".pdf,.doc,.docx" onChange={handleFileChange} className="hidden" />
                <label htmlFor="naskah" className="cursor-pointer flex flex-col items-center">
                  {fileNaskah ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-green-500 mb-2">
                        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-bold text-green-700">File Naskah Siap Diunggah!</span>
                      <span className="text-xs text-green-600 font-mono mt-1 bg-green-200 px-2 py-1 rounded">{fileNaskah}</span>
                      <span className="text-xs text-green-500 mt-2 underline">Klik untuk ganti file</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-indigo-400 mb-2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                      </svg>
                      <span className="text-sm font-semibold text-indigo-600">Klik untuk memilih file naskah (PDF/Word)</span>
                    </>
                  )}
                </label>
              </div>
            )}
          </div>
        )}

        <button type="submit" disabled={!isAllChecked || !fileBase64 || isLoading} className={`w-full py-3 px-4 rounded-xl text-white font-bold transition-all shadow-sm ${
          (!isAllChecked || !fileBase64 || isLoading) ? 'bg-gray-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-md'
        }`}>
          {isLoading ? 'Mengunggah Berkas...' : 'Arsipkan Naskah Ujian Sekarang'}
        </button>
      </form>
    </div>
  );
}