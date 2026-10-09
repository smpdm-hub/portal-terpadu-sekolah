import { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import SignaturePad from 'signature_pad';
import { jsPDF } from 'jspdf';
import autoTable from "jspdf-autotable"; // Wajib ditambahkan agar tabel dikenali

// 💡 MASUKKAN URL GOOGLE APPS SCRIPT PENGAWAS LAMA ANDA DI SINI
const PENGAWAS_GAS_URL = "https://script.google.com/macros/s/AKfycbxgJoY_6Vav3KOU9D-Feye5IehoYZjkeTKUygOJEEb-TDFLVrJX3xB1Zs-jIbxEoRgd/exec";

export default function PengawasView({ user }) {
  const { fetchGAS, isLoading } = useAppContext();

  // State Utama
  const [jadwalList, setJadwalList] = useState([]);
  const [activeModal, setActiveModal] = useState(null); // 'presensi' | 'signature' | 'detail'
  const [dataSesiAktif, setDataSesiAktif] = useState({});
  const [listSiswa, setListSiswa] = useState([]);
  const [detailDataCache, setDetailDataCache] = useState(null);

  // State Tanda Tangan & Form Berita Acara
  const [modeTtd, setModeTtd] = useState(''); // 'pengawas' | 'siswa_manual'
  const [dataTtdSiswa, setDataTtdSiswa] = useState({ nis: '', nama: '' });
  const [formBA, setFormBA] = useState({ jmlSeharusnya: '', catatan: '' });

  // Refs Canvas TTD
  const canvasRef = useRef(null);
  const signaturePadRef = useRef(null);

  // Load Jadwal Pengawas saat Pertama Kali Dimuat
  useEffect(() => {
    if (user?.nama) {
      loadJadwal();
    }
  }, [user]);

  // Inisialisasi Signature Pad saat Modal TTD Terbuka
  useEffect(() => {
    if (activeModal === 'signature' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext("2d").scale(ratio, ratio);

      signaturePadRef.current = new SignaturePad(canvas, {
        penColor: 'rgb(15, 23, 42)',
        minWidth: 1.5,
        maxWidth: 3
      });
    }
  }, [activeModal]);

  // Pemanggilan API Khusus dengan URL Pengawas
  const callPengawasAPI = (action, payload = {}) => {
    return fetchGAS(action, payload, PENGAWAS_GAS_URL);
  };

  const loadJadwal = async () => {
    const namaPengawas = user?.nama || user?.nama_lengkap || '';
    const result = await callPengawasAPI('getJadwalPengawas', { nama: namaPengawas });
    if (Array.isArray(result)) {
      setJadwalList(result);
    } else if (result?.data) {
      setJadwalList(result.data);
    } else {
      setJadwalList([]);
    }
  };

  // ================= PRESENSI MANUAL =================
  const bukaPresensiOffline = async (jadwal) => {
    setDataSesiAktif(jadwal);
    setActiveModal('presensi');
    loadListSiswaManual(jadwal.id, jadwal.kelas);
  };

  const loadListSiswaManual = async (id_jadwal, kelas) => {
    setListSiswa([]);
    const result = await callPengawasAPI('getDaftarSiswaAbsensiManual', { id_jadwal, kelas });
    setListSiswa(Array.isArray(result) ? result : []);
  };

  const simpanStatusAbsen = async (nis, nama, status) => {
    if (!confirm(`Tandai ${nama} sebagai ${status}?`)) return;
    const payload = {
      nis, nama_peserta: nama, kelas: dataSesiAktif.kelas,
      id_jadwal: dataSesiAktif.id, tanggal: dataSesiAktif.tanggal, jam: dataSesiAktif.jam,
      mata_ujian: dataSesiAktif.mata_ujian, ruang: dataSesiAktif.ruang, ttd_base64: "", status
    };
    const res = await callPengawasAPI('saveAbsensiSiswa', payload);
    if (res?.status === 'success' || res) {
      alert(`Status ${nama} berhasil diset ${status}!`);
      loadListSiswaManual(dataSesiAktif.id, dataSesiAktif.kelas);
    }
  };

  // ================= TANDA TANGAN =================
  const bukaTtdSiswaManual = (nis, nama) => {
    setModeTtd('siswa_manual');
    setDataTtdSiswa({ nis, nama });
    setActiveModal('signature');
  };

  const bukaTtdPengawas = (jadwal) => {
    setModeTtd('pengawas');
    setDataSesiAktif(jadwal);
    setFormBA({ jmlSeharusnya: '', catatan: '' });
    setActiveModal('signature');
  };

  const clearSignature = () => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
    }
  };

  const saveSignature = async () => {
    if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
      alert("Tanda tangan tidak boleh kosong!");
      return;
    }

    const base64TTD = signaturePadRef.current.toDataURL('image/png');

    if (modeTtd === 'pengawas') {
      if (!formBA.jmlSeharusnya || !formBA.catatan) {
        alert("Jumlah peserta dan catatan wajib diisi!");
        return;
      }
      const payload = {
        id_jadwal: dataSesiAktif.id,
        ttd_base64: base64TTD,
        jml_seharusnya: formBA.jmlSeharusnya,
        catatan: formBA.catatan
      };
      await callPengawasAPI('saveLaporanPengawas', payload);
      alert("Berita Acara berhasil disimpan!");
      setActiveModal(null);
      loadJadwal();

    } else if (modeTtd === 'siswa_manual') {
      const payload = {
        nis: dataTtdSiswa.nis, nama_peserta: dataTtdSiswa.nama, kelas: dataSesiAktif.kelas,
        id_jadwal: dataSesiAktif.id, tanggal: dataSesiAktif.tanggal, jam: dataSesiAktif.jam,
        mata_ujian: dataSesiAktif.mata_ujian, ruang: dataSesiAktif.ruang, ttd_base64: base64TTD, status: "Hadir"
      };
      await callPengawasAPI('saveAbsensiSiswa', payload);
      alert(`Absen a.n ${dataTtdSiswa.nama} berhasil!`);
      setActiveModal('presensi');
      loadListSiswaManual(dataSesiAktif.id, dataSesiAktif.kelas);
    }
  };

  // ================= DETAIL & CETAK PDF =================
  const bukaDetailSesi = async (id_jadwal) => {
    setDetailDataCache(null);
    setActiveModal('detail');
    const res = await callPengawasAPI('getDetailSesi', { id_jadwal });
    if (res) {
      if (res.absensi) {
        res.absensi.sort((a, b) => a.nama_peserta.localeCompare(b.nama_peserta));
      }
      setDetailDataCache(res);
    }
  };

  const formatTanggalIndo = (tglStr) => {
    if (!tglStr) return "";
    const bulanIndo = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const namaHari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    let parts = tglStr.split(/[-/]/);
    if (parts.length < 3) return tglStr;
    let d, m, y;
    if (parts[0].length === 4) { y = parts[0]; m = parseInt(parts[1]) - 1; d = parts[2]; }
    else { d = parts[0]; m = parseInt(parts[1]) - 1; y = parts[2]; }
    const dateObj = new Date(y, m, d);
    const hari = namaHari[dateObj.getDay()];
    return { lengkap: `${hari}, ${d} ${bulanIndo[m]} ${y}`, hari, tanggal: d, bulan: bulanIndo[m], tahun: y };
  };

  const cetakLaporanLengkap = (data) => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const j = data.jadwal || {};
      const ab = data.absensi || [];
      const tglFormat = formatTanggalIndo(j.tanggal);

      // --- HALAMAN 1: BERITA ACARA ---
      doc.setFont("helvetica", "bold"); doc.setFontSize(12);
      doc.text("BERITA ACARA PELAKSANAAN", 105, 20, { align: "center" });
      doc.text("ASESMEN SUMATIF AKHIR TAHUN", 105, 26, { align: "center" });
      doc.text("TAHUN AJARAN 2025/2026", 105, 32, { align: "center" });
      doc.setLineWidth(0.5); doc.line(15, 36, 195, 36);

      doc.setFontSize(10); doc.setFont("helvetica", "normal");
      let teksParagraf = `Pada hari ini ${tglFormat.hari || '.....'} tanggal ${tglFormat.tanggal || '.....'} bulan ${tglFormat.bulan || '.....'} tahun ${tglFormat.tahun || '.....'}, di SMP DARUL MADINAH telah diselenggarakan UJIAN ${j.mata_ujian || '.....'} Kelas ${j.kelas || '.....'}, dari pukul ${j.jam ? j.jam.split('-')[0].trim() : '.....'} sampai dengan pukul ${j.jam ? j.jam.split('-')[1].trim() : '.....'}.`;
      const splitTeks = doc.splitTextToSize(teksParagraf, 180);
      doc.text(splitTeks, 15, 45);

      let yInfo = 60; const spasi = 8;
      doc.setFont("helvetica", "bold"); doc.text("1.", 15, yInfo); doc.setFont("helvetica", "normal");
      doc.text("Sekolah/Madrasah", 22, yInfo); doc.text(": SMP DARUL MADINAH", 75, yInfo);
      doc.text("Mata Ujian - Kelas", 22, yInfo + spasi); doc.text(`: ${j.mata_ujian || '-'} - ${j.kelas || '-'}`, 75, yInfo + spasi);
      doc.text("Ruangan", 22, yInfo + (spasi * 2)); doc.text(`: ${j.ruang || '-'}`, 75, yInfo + (spasi * 2));

      const jmlHadir = ab.filter(a => !a.status || a.status === 'Hadir').length;
      const jmlSeharusnya = parseInt(j.jml_seharusnya) || ab.length;
      const jmlAbsen = Math.max(0, jmlSeharusnya - jmlHadir);

      doc.text("Jumlah Peserta Seharusnya", 22, yInfo + (spasi * 3)); doc.text(`: ${jmlSeharusnya} Orang`, 75, yInfo + (spasi * 3));
      doc.text("Jumlah Hadir (Ikut Ujian)", 22, yInfo + (spasi * 4)); doc.text(`: ${jmlHadir} Orang`, 75, yInfo + (spasi * 4));
      doc.text("Jumlah Tidak Hadir", 22, yInfo + (spasi * 5)); doc.text(`: ${jmlAbsen} Orang`, 75, yInfo + (spasi * 5));

      for (let i = 0; i <= 5; i++) { doc.setLineWidth(0.1); doc.line(75, yInfo + (spasi * i) + 1, 195, yInfo + (spasi * i) + 1); }

      let yCatatan = yInfo + (spasi * 7);
      doc.setFont("helvetica", "bold"); doc.text("2.", 15, yCatatan); doc.text("Catatan selama Tes:", 22, yCatatan); doc.setFont("helvetica", "normal");
      doc.rect(15, yCatatan + 4, 180, 40);
      const splitCatatan = doc.splitTextToSize(j.catatan || "-", 170); doc.text(splitCatatan, 20, yCatatan + 12);

      let yTTD = yCatatan + 55; doc.text("Yang membuat berita acara:", 15, yTTD); yTTD += 15;
      doc.text("Pengawas Ruang", 15, yTTD + 30);
      doc.setFont("helvetica", "bold"); doc.text(j.pengawas || user.nama || "..........................", 60, yTTD + 30);
      doc.line(60, yTTD + 30.5, 110, yTTD + 30.5);

      if (j.ttd_pengawas) {
        try { doc.addImage(j.ttd_pengawas, 'PNG', 130, yTTD + 10, 40, 18); } catch (e) { }
      }

      // --- HALAMAN 2: DAFTAR HADIR ---
      doc.addPage();
      doc.setFont("helvetica", "bold"); doc.setFontSize(14);
      doc.text("DAFTAR HADIR PESERTA UJIAN", 105, 20, { align: "center" });
      doc.setLineWidth(0.5); doc.line(15, 24, 195, 24);

      doc.setFontSize(10); doc.setFont("helvetica", "normal");
      doc.text("Mata Ujian", 15, 32); doc.text(`: ${j.mata_ujian || '-'}`, 40, 32);
      doc.text("Kelas", 15, 38); doc.text(`: ${j.kelas || '-'}`, 40, 38);
      doc.text("Hari, Tanggal", 115, 32); doc.text(`: ${tglFormat.lengkap || '-'}`, 140, 32);
      doc.text("Waktu / Ruang", 115, 38); doc.text(`: ${j.jam || '-'} / ${j.ruang || '-'}`, 140, 38);

      const tb = ab.map((a, i) => [
        i + 1, a.nis, a.nama_peserta,
        a.timestamp ? a.timestamp.split(' ')[1] : '-',
        (a.status && a.status !== 'Hadir') ? a.status.toUpperCase() : ''
      ]);

      autoTable(doc, {
        startY: 46,
        head: [['No', 'NIS', 'Nama Peserta', 'Jam Hadir', 'Tanda Tangan / Ket']],
        body: tb.length ? tb : [['-', '-', 'Kosong', '-', '-']],
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3, valign: 'middle' },
        columnStyles: { 0: { halign: 'center', cellWidth: 10 }, 1: { cellWidth: 25 }, 3: { halign: 'center', cellWidth: 25 }, 4: { halign: 'center', cellWidth: 35 } },
        didDrawCell: (d) => {
          if (d.column.index === 4 && d.section === 'body' && ab.length > 0) {
            const record = ab[d.row.index];
            if (record && (!record.status || record.status === 'Hadir') && record.tanda_tangan_peserta_base64) {
              try { doc.addImage(record.tanda_tangan_peserta_base64, 'PNG', d.cell.x + 7, d.cell.y + 1, 20, 8); } catch (e) { }
            }
          }
        }
      });

      const safeMapel = (j.mata_ujian || 'Ujian').replace(/[^a-zA-Z0-9]/g, '_');
      const safeKelas = (j.kelas || 'Kls').replace(/[^a-zA-Z0-9]/g, '_');
      doc.save(`Laporan_Sesi_${safeMapel}_${safeKelas}.pdf`);
    } catch (err) {
      alert("Gagal membuat PDF Laporan.");
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Daftar Jadwal Mengawas</h2>
          <p className="text-xs text-gray-500 mt-1">Pengawas Terdata: <strong>{user?.nama}</strong></p>
        </div>
        <button onClick={loadJadwal} disabled={isLoading} className="px-4 py-2 border bg-white shadow-sm hover:bg-gray-50 rounded-xl text-sm font-medium transition-colors">
          🔄 Segarkan Jadwal
        </button>
      </div>

      {/* TABEL JADWAL */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Informasi Ujian</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Waktu & Ruang</th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase">Status & Hadir</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Tugas Pengawas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {jadwalList.length === 0 ? (
              <tr><td colSpan="4" className="p-8 text-center text-gray-400">Tidak ada jadwal pengawasan ditemukan.</td></tr>
            ) : (
              jadwalList.map((j) => {
                const isSigned = !!j.ttd_pengawas;
                return (
                  <tr key={j.id || j.mata_ujian} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="font-bold text-gray-800">{j.mata_ujian}</span><br />
                      <span className="text-xs text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded">Kelas: {j.kelas}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-700">{j.tanggal}</span><br />
                      <span className="text-xs text-gray-500">{j.jam} di Ruang {j.ruang}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {isSigned ? (
                        <span className="block text-xs font-bold text-emerald-600 mb-1">✓ Laporan Dibuat</span>
                      ) : (
                        <span className="block text-xs font-bold text-rose-500 mb-1">! Belum Buat BA</span>
                      )}
                      <span className="px-2 py-1 rounded-full text-xs font-bold bg-gray-100 border border-gray-200">{j.jumlah_hadir || 0} Siswa Terdata</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col space-y-2 items-end">
                        <button onClick={() => bukaPresensiOffline(j)} className="px-3 py-1.5 bg-gray-800 text-white hover:bg-gray-700 rounded-lg text-xs font-semibold shadow-sm">
                          📋 Kelola Presensi
                        </button>
                        {!isSigned ? (
                          <button onClick={() => bukaTtdPengawas(j)} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm">
                            Buat Laporan BA
                          </button>
                        ) : (
                          <button onClick={() => bukaDetailSesi(j.id)} className="px-3 py-1.5 border border-gray-300 bg-white hover:bg-gray-50 rounded-lg text-xs font-semibold text-gray-700 shadow-sm">
                            Lihat & Cetak PDF
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL 1: PRESENSI MANUAL */}
      {activeModal === 'presensi' && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col h-[85vh]">
            <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Kelola Presensi Sesi</h3>
                <p className="text-xs text-indigo-600 font-semibold">Mapel: {dataSesiAktif.mata_ujian} | Kelas: {dataSesiAktif.kelas}</p>
              </div>
              <button onClick={() => { setActiveModal(null); loadJadwal(); }} className="text-gray-400 hover:text-gray-600 bg-gray-200 p-1.5 rounded-full">✕</button>
            </div>
            <div className="p-0 overflow-y-auto flex-grow bg-gray-50">
              <table className="min-w-full divide-y divide-gray-200 bg-white">
                <thead className="bg-gray-100 sticky top-0 shadow-sm z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Siswa</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {listSiswa.length === 0 ? (
                    <tr><td colSpan="3" className="p-6 text-center text-gray-400">Memuat / Tidak ada data siswa.</td></tr>
                  ) : (
                    listSiswa.map((s) => (
                      <tr key={s.nis}>
                        <td className="px-4 py-3 border-b border-gray-100">
                          <span className="font-bold text-sm text-gray-800">{s.nama}</span><br />
                          <span className="text-xs text-gray-500">{s.nis}</span>
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 text-center">
                          {s.sudah_absen ? (
                            <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-lg border border-emerald-100">{s.status}</span>
                          ) : (
                            <span className="px-2 py-1 bg-rose-50 text-rose-500 text-xs font-bold rounded-lg border border-rose-100">Belum Absen</span>
                          )}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 text-right">
                          {!s.sudah_absen ? (
                            <div className="flex justify-end space-x-1">
                              <button onClick={() => bukaTtdSiswaManual(s.nis, s.nama)} className="px-2 py-1 bg-gray-800 text-white text-xs font-bold rounded">TTD</button>
                              <button onClick={() => simpanStatusAbsen(s.nis, s.nama, 'Sakit')} className="px-2 py-1 bg-amber-500 text-white text-xs font-bold rounded">S</button>
                              <button onClick={() => simpanStatusAbsen(s.nis, s.nama, 'Izin')} className="px-2 py-1 bg-blue-500 text-white text-xs font-bold rounded">I</button>
                              <button onClick={() => simpanStatusAbsen(s.nis, s.nama, 'Alpa')} className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">A</button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic font-semibold">Terkunci</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CANVASS TANDA TANGAN */}
      {activeModal === 'signature' && (
        <div className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800">{modeTtd === 'pengawas' ? 'Buat Berita Acara Ujian' : 'Tanda Tangan Siswa'}</h3>
              <p className="text-xs text-gray-500">{modeTtd === 'pengawas' ? `Sesi: ${dataSesiAktif.mata_ujian} - Kelas ${dataSesiAktif.kelas}` : `Siswa: ${dataTtdSiswa.nama}`}</p>
            </div>
            <div className="p-6 flex-grow overflow-y-auto space-y-4">
              {modeTtd === 'pengawas' && (
                <>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-gray-700">Jumlah Peserta Seharusnya</label>
                    <input type="number" value={formBA.jmlSeharusnya} onChange={(e) => setFormBA({ ...formBA, jmlSeharusnya: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500" placeholder="Contoh: 30" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-gray-700">Catatan Ujian</label>
                    <textarea value={formBA.catatan} onChange={(e) => setFormBA({ ...formBA, catatan: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500" rows={3} placeholder="Berjalan tertib dan lancar..." />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold mb-2 text-gray-700">Area Tanda Tangan</label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl relative bg-white" style={{ height: 180 }}>
                  <canvas ref={canvasRef} className="w-full h-full rounded-xl cursor-crosshair" style={{ touchAction: 'none' }} />
                </div>
                <div className="flex justify-end mt-1">
                  <button onClick={clearSignature} className="text-xs font-bold text-red-500 hover:text-red-700">Bersihkan Canvas</button>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end space-x-2 bg-gray-50">
              <button onClick={() => setActiveModal(modeTtd === 'siswa_manual' ? 'presensi' : null)} className="px-4 py-2 border bg-white rounded-xl text-xs font-medium text-gray-700">Batal</button>
              <button onClick={saveSignature} disabled={isLoading} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-medium shadow-sm">
                {isLoading ? 'Menyimpan...' : 'Simpan Tanda Tangan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: DETAIL & CETAK PDF */}
      {activeModal === 'detail' && (
        <div className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Detail Laporan Sesi</h3>
                <p className="text-xs text-gray-500">Mapel: {detailDataCache?.jadwal?.mata_ujian} | Kelas: {detailDataCache?.jadwal?.kelas}</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-600 bg-gray-200 p-1.5 rounded-full">✕</button>
            </div>
            <div className="p-6 overflow-y-auto flex-grow space-y-4">
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex flex-col items-center gap-2 text-center">
                <p className="font-bold text-indigo-900 text-sm">Unduh Laporan Sesi Lengkap (PDF)</p>
                <button onClick={() => cetakLaporanLengkap(detailDataCache)} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm">
                  📄 Cetak PDF Laporan
                </button>
              </div>

              <table className="min-w-full divide-y divide-gray-200 border rounded-lg">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold">Nama Peserta</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold">Status / TTD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {detailDataCache?.absensi?.map((a) => (
                    <tr key={a.nis}>
                      <td className="px-4 py-2 text-sm">{a.nama_peserta} <span className="text-xs text-gray-400">({a.nis})</span></td>
                      <td className="px-4 py-2 text-center text-xs font-bold">{a.status || 'Hadir'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// API GATEWAY UNTUK REACT FRONTEND
// ==========================================
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("Tidak ada data payload yang dikirim.");
    }
    
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    let result;

    if (action === 'getJadwalPengawas') {
      result = getJadwalPengawas(data.nama);
    } else if (action === 'getDaftarSiswaAbsensiManual') {
      result = getDaftarSiswaAbsensiManual(data.id_jadwal, data.kelas);
    } else if (action === 'saveAbsensiSiswa') {
      result = saveAbsensiSiswa(data);
    } else if (action === 'saveLaporanPengawas') {
      result = saveLaporanPengawas(data);
    } else if (action === 'getDetailSesi') {
      result = getDetailSesi(data.id_jadwal);
    } else {
      throw new Error("Aksi tidak dikenali: " + action);
    }

    if (Array.isArray(result)) {
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    } else if (typeof result === 'object' && result !== null) {
      result.status = 'success';
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: result })).setMimeType(ContentService.MimeType.JSON);
    }

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}