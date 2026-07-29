import DashboardView from './views/dashboard/DashboardView';
import WalasView from './views/walas/WalasView';
import BankSoalView from './views/bank-soal/BankSoalView';
import DokumentasiView from './views/dokumentasi/DokumentasiView';
import JurnalView from './views/jurnal/JurnalView';
import LoginView from './views/auth/LoginView';
import { useState, useEffect } from 'react';
import { useAppContext } from './context/AppContext';

export default function App() {
  const { isLoading } = useAppContext();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState(null); 
  const [isChecking, setIsChecking] = useState(true);
  
  // 💡 State baru untuk visibilitas sidebar di seluler
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const savedUser = sessionStorage.getItem('app_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsChecking(false);
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('app_user');
    setUser(null);
    setActiveTab('dashboard'); 
  };

  // 💡 Fungsi pembantu: Pindah tab sekaligus menutup sidebar di HP
  const handleMenuClick = (tabName) => {
    setActiveTab(tabName);
    setIsSidebarOpen(false); // Otomatis menutup sidebar setelah menu dipilih
  };

  if (isChecking) {
    return <div className="flex h-screen items-center justify-center bg-gray-50 text-gray-500 font-medium">Memeriksa sesi...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <LoginView onLoginSuccess={(userData) => setUser(userData)} />
      </div>
    );
  }

  const isAdmin = user.role?.toLowerCase() === 'superadmin' || user.role?.toLowerCase() === 'admin';
  const isWalas = user.kelasWali !== null && user.kelasWali !== undefined;

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': 
        return (
          <div className="space-y-6">
            <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Selamat Datang, {user.nama}!</h2>
              <p className="text-gray-600 mb-4">Akses Anda: <span className="font-bold text-blue-600">{user.role}</span></p>
              {isWalas && (
                <div className="bg-green-50 p-4 rounded-lg text-sm text-green-800 border border-green-100 mb-4">
                  ✅ Anda tercatat sebagai Wali Kelas untuk kelas <strong>{user.kelasWali}</strong>.
                </div>
              )}
            </div>
            <DashboardView />
          </div>
        );
      case 'jurnal': return <JurnalView user={user} />;
      case 'galeri': return <DokumentasiView />;
      case 'bank-soal': return <BankSoalView />;
      case 'walas': return <WalasView user={user} />;
      case 'admin':
        return (
          <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-indigo-500">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Pusat Kendali Admin</h2>
            <div className="p-6 border border-indigo-100 bg-indigo-50/50 rounded-xl">
               <h3 className="font-bold text-indigo-900 text-lg mb-2">Master Database</h3>
               <a href="https://docs.google.com/spreadsheets/d/1baViZm_dNK5iq1-G1DVsiEKq8ljaOBeW10TWNppcpQA/edit?usp=sharing" target="_blank" rel="noopener noreferrer" className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Buka Spreadsheet</a>
            </div>
          </div>
        );
      default: 
        return <div className="p-6">Halaman tidak ditemukan</div>;
    }
  }

  return (
    <>
      {isLoading && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-gray-900/20 backdrop-blur-sm">
          <div className="bg-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4">
            <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="font-bold text-gray-700">Memproses sistem...</span>
          </div>
        </div>
      )}

      <div className="flex h-screen bg-gray-50 font-sans text-gray-800 overflow-hidden relative">
        
        {/* 💡 OVERLAY GELAP UNTUK SELULER */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-gray-900/50 z-40 md:hidden transition-opacity backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* 💡 SIDEBAR YANG RESPONSIF */}
        <aside 
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col justify-between transform transition-transform duration-300 ease-in-out shadow-xl md:shadow-none md:relative md:translate-x-0 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div>
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h1 className="text-xl font-black text-blue-600 tracking-tight">Portal<span className="text-gray-800">Sekolah</span></h1>
              {/* Tombol X untuk menutup sidebar di HP */}
              <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <nav className="p-4 space-y-1">
              <MenuButton active={activeTab === 'dashboard'} onClick={() => handleMenuClick('dashboard')} label="Dashboard" />
              <MenuButton active={activeTab === 'jurnal'} onClick={() => handleMenuClick('jurnal')} label="Jurnal Mengajar" />
              <MenuButton active={activeTab === 'galeri'} onClick={() => handleMenuClick('galeri')} label="Galeri Sekolah" />
              <MenuButton active={activeTab === 'bank-soal'} onClick={() => handleMenuClick('bank-soal')} label="Bank Soal" />
              
              {(isWalas || isAdmin) && (
                <>
                  <hr className="my-4 border-gray-200" />
                  <MenuButton active={activeTab === 'walas'} onClick={() => handleMenuClick('walas')} label="⭐ Menu Wali Kelas" />
                </>
              )}

              {isAdmin && (
                <>
                  <hr className="my-4 border-gray-200" />
                  <MenuButton active={activeTab === 'admin'} onClick={() => handleMenuClick('admin')} label="⚙️ Ruang Admin" special={true} />
                </>
              )}
            </nav>
          </div>
          <div className="p-4 border-t border-gray-100">
            <button onClick={handleLogout} className="w-full py-2.5 px-4 bg-red-50 text-red-600 hover:bg-red-100 text-sm font-bold rounded-lg border border-red-100 transition-colors">
              Keluar Aplikasi
            </button>
          </div>
        </aside>

        <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
          <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 md:px-6 justify-between flex-shrink-0">
            
            {/* 💡 BAGIAN KIRI HEADER: Tombol Hamburger & Judul */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsSidebarOpen(true)} 
                className="md:hidden p-2 -ml-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 border border-gray-200 focus:outline-none"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h2 className="text-lg font-semibold capitalize truncate">{activeTab.replace('-', ' ')}</h2>
            </div>

            {/* BAGIAN KANAN HEADER: Profil User */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-blue-50 px-2.5 md:px-3 py-1.5 rounded-full border border-blue-100 shadow-sm">
                <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                  {user.nama.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-blue-800 pr-1 hidden sm:block">{user.nama}</span>
              </div>
            </div>
          </header>
          
          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
            {renderContent()}
          </div>
        </main>

      </div>
    </>
  )
}

function MenuButton({ active, onClick, label, special = false }) {
  const activeStyle = special ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm' : 'bg-blue-50 text-blue-700';
  return (
    <button onClick={onClick} className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? activeStyle : 'text-gray-600 hover:bg-gray-100'}`}>
      {label}
    </button>
  )
}
