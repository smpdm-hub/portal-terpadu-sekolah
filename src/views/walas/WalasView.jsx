import { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; 

export default function WalasView({ user }) {
  const { fetchGAS } = useAppContext();
  
  const isAdmin = user.role?.toLowerCase() === 'admin';
  const myKelas = user.kelasWali || ''; 

  const [selectedKelas, setSelectedKelas] = useState(isAdmin ? '' : myKelas);
  const [selectedBulan, setSelectedBulan] = useState(''); 
  const [rawJurnal, setRawJurnal] = useState([]); 
  const [classList, setClassList] = useState([]); 
  const [siswaList, setSiswaList] = useState([]); 
  
  const [ttdImage, setTtdImage] = useState(null);

  const [isFetching, setIsFetching] = useState(false);
  const [isFetchingSiswa, setIsFetchingSiswa] = useState(false);

  useEffect(() => {
    loadRekapData();
  }, []);

  useEffect(() => {
    if (selectedKelas) {
      loadSiswaByKelas(selectedKelas);
    } else {
      setSiswaList([]);
    }
  }, [selectedKelas]);

  const loadRekapData = async () => {
    setIsFetching(true);
    try {
      const result = await fetchGAS('getRekapJurnal', {});
      if (result && result.status === 'success') {
        setRawJurnal(result.data || []);
        if (isAdmin) {
          const unikKelas = [...new Set(result.data.map(item => item.kelas))].filter(Boolean);
          setClassList(unikKelas);
        }
      }
    } catch (error) {
      console.error("Gagal memuat rekap:", error);
    } finally {
      setIsFetching(false);
    }
  };

  const loadSiswaByKelas = async (kelas) => {
    setIsFetchingSiswa(true);
    try {
      const result = await fetchGAS('getSiswaByKelas', { kelas });
      if (result && result.status === 'success') {
        setSiswaList(result.data || []);
      }
    } catch (error) {
      console.error("Gagal memuat daftar siswa:", error);
    } finally {
      setIsFetchingSiswa(false);
    }
  };

  const formatNama = (namaLengkap) => {
    if (!namaLengkap) return '';
    const parts = namaLengkap.trim().split(' ');
    return parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0];
  };

  // SOLUSI KUNCI: Penyaringan sekaligus Pengurutan Multi-level
  const filteredData = rawJurnal.filter(item => {
    const cocokKelas = item.kelas === selectedKelas;
    const cocokBulan = selectedBulan ? item.tanggal.startsWith(selectedBulan) : true;
    return cocokKelas && cocokBulan;
  }).sort((a, b) => {
    // Tingkat 1: Ekstrak dan bandingkan Tanggal
    const tglA = new Date(a.tanggal).getTime();
    const tglB = new Date(b.tanggal).getTime();

    // Tingkat 2: Jika tanggalnya sama persis, bandingkan Jam Pelajarannya
    if (tglA === tglB) {
      // Mengambil angka depan dari string jam (misal: "3-4" menjadi angka 3)
      const jamA = parseInt(a.jamKe?.split('-')[0]) || 0;
      const jamB = parseInt(b.jamKe?.split('-')[0]) || 0;
      return jamA - jamB; 
    }
    
    // Urutan naik (Ascending) dari tanggal tertua ke termuda
    return tglA - tglB;
  });

  const analisisSiswa = siswaList.map(siswa => {
    const namaPendek = formatNama(siswa);
    
    const sDates = new Set();
    const iDates = new Set();
    const aDates = new Set();

    filteredData.forEach(jurnal => {
      if (jurnal.absen) {
        if (jurnal.absen.includes(`${namaPendek} (S)`)) sDates.add(jurnal.tanggal);
        if (jurnal.absen.includes(`${namaPendek} (I)`)) iDates.add(jurnal.tanggal);
        if (jurnal.absen.includes(`${namaPendek} (A)`)) aDates.add(jurnal.tanggal);
      }
    });

    return { 
      nama: siswa, 
      s: sDates.size, 
      i: iDates.size, 
      a: aDates.size 
    };
  });

  const getNamaBulanIndo = (yearMonth) => {
    if (!yearMonth) return 'Sepanjang Waktu';
    const [tahun, bulan] = yearMonth.split('-');
    const namaBulan = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${namaBulan[parseInt(bulan) - 1]} ${tahun}`;
  };

  const handleTtdUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Format tidak didukung! Harap unggah file gambar.');
      e.target.value = ''; 
      return;
    }

    if (file.size > 500 * 1024) {
      alert('Ukuran gambar terlalu besar! Maksimal 500 KB.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          if (r > 220 && g > 220 && b > 220) {
            data[i + 3] = 0; 
          }
        }

        ctx.putImageData(imageData, 0, 0);
        setTtdImage(canvas.toDataURL('image/png'));
      };
      img.src = uploadEvent.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleCetakPDF = () => {
    try {
      if (!selectedKelas) return alert('Pilih kelas terlebih dahulu!');
      if (filteredData.length === 0) return alert('Tidak ada data untuk dicetak.');
      if (!ttdImage) return alert('Silakan unggah gambar tanda tangan Anda terlebih dahulu!');

      const doc = new jsPDF();
      const periodeCetak = getNamaBulanIndo(selectedBulan);

      // Header PDF
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("REKAPITULASI JURNAL KELAS", 105, 20, { align: "center" });
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Portal Administrasi Sekolah Digital", 105, 26, { align: "center" });
      
      doc.setFont("helvetica", "bold");
      doc.text(`Kelas: ${selectedKelas}   |   Periode: ${periodeCetak}`, 105, 33, { align: "center" });
      
      doc.setLineWidth(0.5);
      doc.line(14, 38, 196, 38);

      const tableColumn = ["No", "Tanggal", "Jam", "Mata Pelajaran", "Materi", "Absensi"];
      const tableRows = filteredData.map((item, index) => [
        index + 1,
        item.tanggal,
        item.jamKe || '-',
        item.mapel,
        item.materi,
        item.absen || 'Nihil'
      ]);

      autoTable(doc, {
        startY: 45,
        head: [tableColumn],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], lineWidth: 0.1, fontStyle: 'bold', halign: 'center' },
        bodyStyles: { textColor: [0, 0, 0], lineWidth: 0.1 },
        styles: { font: 'helvetica', fontSize: 9 },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          1: { halign: 'center', cellWidth: 25 },
          2: { halign: 'center', cellWidth: 15 },
          3: { cellWidth: 35 },
          4: { cellWidth: 'auto' },
          5: { cellWidth: 45 }
        }
      });

      const finalY = doc.lastAutoTable.finalY || 45;

      // Area Tanda Tangan
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Disetujui secara digital oleh,", 140, finalY + 20);
      doc.setFont("helvetica", "bold");
      doc.text("Wali Kelas", 140, finalY + 26);
      
      doc.addImage(ttdImage, 'PNG', 142, finalY + 28, 35, 18);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(user?.nama || "Nama Wali Kelas", 140, finalY + 52);
      doc.setLineWidth(0.2);
      doc.line(140, finalY + 54, 190, finalY + 54);

      doc.save(`Jurnal_Kelas_${selectedKelas}_${selectedBulan || 'Semua'}.pdf`);

    } catch (err) {
      console.error("Gagal cetak berkas:", err);
      alert(`Terjadi kesalahan sistem: ${err.message}`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between gap-6">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Pantau Kelas</label>
            {isAdmin ? (
              <select 
                value={selectedKelas} 
                onChange={(e) => setSelectedKelas(e.target.value)}
                className="w-full px-3.5 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">-- Pilih Kelas --</option>
                {classList.map((kls, i) => (
                  <option key={i} value={kls}>{kls}</option>
                ))}
              </select>
            ) : (
              <input 
                type="text" 
                value={myKelas} 
                readOnly 
                className="w-full px-3.5 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 font-semibold outline-none"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Pilih Bulan</label>
            <input 
              type="month" 
              value={selectedBulan} 
              onChange={(e) => setSelectedBulan(e.target.value)}
              className="w-full px-3.5 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="flex-1 max-w-sm">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Otorisasi Wali Kelas</label>
          <div className="border border-gray-200 rounded-lg bg-gray-50 p-3 mb-3">
            <p className="text-xs text-gray-500 mb-2">
              Unggah file gambar tanda tangan. Latar belakang putih akan dihapus otomatis.
            </p>
            <div className="flex items-center gap-3">
              <input 
                type="file" 
                accept="image/*"
                onChange={handleTtdUpload}
                className="text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer w-full"
              />
            </div>
            {ttdImage && (
              <div className="mt-2 p-2 bg-white border border-gray-200 rounded flex justify-center bg-checkered-pattern">
                <img src={ttdImage} alt="Preview TTD" className="h-10 object-contain" />
              </div>
            )}
          </div>
          
          <button 
            onClick={handleCetakPDF}
            disabled={filteredData.length === 0}
            className={`w-full px-4 py-2 rounded-lg text-white font-bold text-sm transition-all ${
              filteredData.length === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-md'
            }`}
          >
            🖨️ Cetak & Sahkan Jurnal
          </button>
        </div>
      </div>

      {(!selectedKelas || filteredData.length === 0) && (
        <div className="bg-white p-10 rounded-xl shadow-sm border border-gray-100 text-center">
          {isFetching ? (
            <p className="text-gray-500 animate-pulse font-medium">Menarik data dari Cloud...</p>
          ) : !selectedKelas ? (
            <p className="text-blue-600 font-medium">💡 Silakan tentukan kelas untuk melihat analisis & jurnal.</p>
          ) : (
            <p className="text-red-500 font-medium">❌ Tidak ada rekaman data untuk kelas {selectedKelas} di periode ini.</p>
          )}
        </div>
      )}

      {selectedKelas && filteredData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit lg:col-span-1">
            <h2 className="text-lg font-bold text-gray-800 border-b pb-3 mb-4">Statistik Siswa (Harian)</h2>
            
            {isFetchingSiswa ? (
              <p className="text-sm text-gray-500 animate-pulse">Menyiapkan nama siswa...</p>
            ) : siswaList.length === 0 ? (
              <p className="text-sm text-red-500">Data roster siswa tidak ditemukan.</p>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead className="sticky top-0 bg-white shadow-sm">
                    <tr className="text-gray-600 border-b">
                      <th className="py-2 pr-2 font-semibold">Nama Siswa</th>
                      <th className="py-2 px-1 text-center font-bold text-yellow-600">S</th>
                      <th className="py-2 px-1 text-center font-bold text-blue-600">I</th>
                      <th className="py-2 pl-1 text-center font-bold text-red-600">A</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analisisSiswa.map((siswa, idx) => (
                      <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2 pr-2 text-gray-700 truncate max-w-[120px]">{siswa.nama}</td>
                        <td className="py-2 px-1 text-center text-gray-600 font-medium">{siswa.s > 0 ? siswa.s : '-'}</td>
                        <td className="py-2 px-1 text-center text-gray-600 font-medium">{siswa.i > 0 ? siswa.i : '-'}</td>
                        <td className="py-2 pl-1 text-center text-gray-600 font-medium">{siswa.a > 0 ? siswa.a : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2 overflow-x-auto">
            <h2 className="text-lg font-bold text-gray-800 border-b pb-3 mb-4">Riwayat Jurnal Kelas</h2>
            <table className="w-full text-left border-collapse text-sm min-w-[600px]">
              <thead>
                <tr className="bg-gray-50 text-gray-700 font-bold">
                  <th className="p-3 border-b w-24">Tanggal</th>
                  <th className="p-3 border-b w-16 text-center">Jam</th>
                  <th className="p-3 border-b w-40">Mata Pelajaran</th>
                  <th className="p-3 border-b">Materi Pembelajaran</th>
                  <th className="p-3 border-b w-48 text-red-600">Absensi</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                {filteredData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="p-3 border-b border-gray-100 whitespace-nowrap">{item.tanggal}</td>
                    <td className="p-3 border-b border-gray-100 text-center">{item.jamKe || '-'}</td>
                    <td className="p-3 border-b border-gray-100 font-medium">{item.mapel}</td>
                    <td className="p-3 border-b border-gray-100">{item.materi}</td>
                    <td className="p-3 border-b border-gray-100 text-xs font-semibold text-red-600 leading-tight">
                      {item.absen || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

    </div>
  );
}
