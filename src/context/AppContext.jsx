import { createContext, useContext, useState } from 'react';

const AppContext = createContext();

// 💡 PASTIKAN DIAWALI DENGAN "https://" (H-T-T-P-S)
const FALLBACK_GAS_URL = "https://script.google.com/macros/s/AKfycbzplNqGBiiQnuEZcEbRD0wE3h9WAm7zrroiXAJ2zHGXoyj7NZBWMSLGOlTFZ7kKa0hm/exec";

// Variabel lokal untuk Anti-Spam (Cooldown 3 Detik)
let lastFetchTime = {};

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notif, setNotif] = useState({ show: false, message: '', type: '' });

  const fetchGAS = async (action, payload = {}) => {
    const now = Date.now();

    // 1. ANTI-SPAM KLIK: Jeda 3 Detik per Aksi
    if (lastFetchTime[action] && (now - lastFetchTime[action] < 3000)) {
      console.warn(`⏳ Anti-Spam: Memblokir pemanggilan cepat untuk "${action}"`);
      return { status: 'error', message: 'Mohon tunggu 3 detik sebelum menekan tombol lagi.' };
    }
    lastFetchTime[action] = now;

    setIsLoading(true);
    try {
      // 2. AMBIL URL: Utamakan .env, jika kosong pakai Fallback
      const envUrl = import.meta.env.VITE_GAS_WEB_APP_URL;
      const gasUrl = (envUrl && envUrl !== 'undefined') ? envUrl : FALLBACK_GAS_URL;

      // X-RAY 1: Validasi URL
      if (!gasUrl || !gasUrl.startsWith('https://')) {
        console.error("X-RAY DETECT: URL GAS tidak valid atau tidak diawali https://");
        alert("URL Google Apps Script tidak valid! Pastikan diawali dengan 'https://'.");
        return null;
      }

      const response = await fetch(gasUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({ action, ...payload }),
        redirect: 'follow'
      });

      const rawText = await response.text();
      
      // X-RAY 2: Tangkap jika Google mengirim respon HTML
      if (rawText.includes('<html') || rawText.includes('<!DOCTYPE')) {
        console.error("X-RAY DETECT: Google menolak akses:", rawText);
        alert("Akses ditolak oleh Google. Pastikan Deploy GAS diatur ke 'Siapa Saja' (Anyone).");
        return null;
      }

      return JSON.parse(rawText);

    } catch (error) {
      // X-RAY 3: Tangkap kendala koneksi
      console.error("X-RAY DETECT: Gagal terhubung:", error);
      alert("Gagal terhubung ke server Google. Periksa URL GAS atau koneksi internet.");
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

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext harus digunakan di dalam <AppProvider>');
  }
  return context;
};
