import { createContext, useContext, useState } from 'react';

const AppContext = createContext();

// 💡 VARIABEL CADANGAN (FALLBACK): Masukkan URL Web App GAS paman di sini.
// Jika file .env lokal tidak terbaca saat di-deploy ke hosting, URL ini yang akan otomatis bekerja.
const FALLBACK_GAS_URL = "ttps://script.google.com/macros/s/AKfycbzplNqGBiiQnuEZcEbRD0wE3h9WAm7zrroiXAJ2zHGXoyj7NZBWMSLGOlTFZ7kKa0hm/exec";

// Variabel memori lokal untuk melacak waktu pemanggilan terakhir (Anti-Spam)
let lastFetchTime = {};

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notif, setNotif] = useState({ show: false, message: '', type: '' });

  const fetchGAS = async (action, payload = {}) => {
    const now = Date.now();

    // 1. TAMAN PELINDUNG: ANTI-SPAM KLIK (Jeda 3 Detik per Aksi)
    if (lastFetchTime[action] && (now - lastFetchTime[action] < 3000)) {
      console.warn(`⏳ Anti-Spam Aktif: Memblokir pemanggilan brutal untuk aksi "${action}"`);
      // Memberikan notifikasi ringan tanpa membebani server Google sama sekali
      return { status: 'error', message: 'Mohon tunggu 3 detik sebelum menekan tombol lagi.' };
    }
    lastFetchTime[action] = now;

    setIsLoading(true);
    try {
      // 2. PENENTUAN URL CERDAS: Utamakan .env, jika kosong gunakan Fallback
      const envUrl = import.meta.env.VITE_GAS_WEB_APP_URL;
      const gasUrl = (envUrl && envUrl !== 'undefined') ? envUrl : FALLBACK_GAS_URL;

      // X-RAY 1: Memastikan URL tidak benar-benar kosong atau belum diisi
      if (!gasUrl || gasUrl.includes("GANTI_DENGAN_ID_SCRIPT_GAS_PAMAN")) {
        console.error("X-RAY DETECT: URL GAS belum dikonfigurasi!");
        alert("URL Google Apps Script belum diisi! Silakan ganti nilai FALLBACK_GAS_URL di file AppContext.jsx dengan URL Web App paman.");
        return null;
      }

      // Pengiriman data menggunakan 'text/plain' untuk menghindari pemblokiran CORS browser
      const response = await fetch(gasUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({ action, ...payload }),
        redirect: 'follow'
      });

      // X-RAY 2: Menangkap balasan mentah sebelum diubah ke JSON
      const rawText = await response.text();
      
      // Mencegah crash jika Google mengirim halaman HTML Error (misal karena salah hak akses)
      if (rawText.includes('<html') || rawText.includes('<!DOCTYPE')) {
        console.error("X-RAY DETECT: Google menolak akses dan mengirim HTML:", rawText);
        alert("Akses ditolak oleh Google. Pastikan Deploy GAS diatur ke 'Siapa Saja' (Anyone).");
        return null;
      }

      // Konversi balasan menjadi objek JSON React
      const result = JSON.parse(rawText);
      return result;

    } catch (error) {
      // X-RAY 3: Menangkap kendala koneksi atau CORS keras
      console.error("X-RAY DETECT: Jaringan terputus atau CORS Block:", error);
      alert("Gagal terhubung ke server Google. Periksa koneksi internet paman.");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const value = { user, setUser, isLoading, setIsLoading, notif, setNotif, fetchGAS };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);