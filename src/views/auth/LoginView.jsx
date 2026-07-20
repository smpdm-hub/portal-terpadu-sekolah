import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';

export default function LoginView({ onLoginSuccess }) {
  const { fetchGAS, isLoading } = useAppContext();
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!credentials.username || !credentials.password) {
      setErrorMsg('Username dan password wajib diisi.');
      return;
    }

    const result = await fetchGAS('login', credentials);

    if (result && result.status === 'success') {
      // Simpan sesi login ke memori browser
      sessionStorage.setItem('app_user', JSON.stringify(result.user));
      alert(`Selamat datang, ${result.user.nama}!`);
      onLoginSuccess(result.user); // Panggil fungsi dari komponen induk
    } else {
      setErrorMsg(result?.message || 'Gagal terhubung ke server.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 w-full max-w-md">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800">SSO SMP Darul Madinah</h2>
          <p className="text-gray-500 text-sm mt-2">Silakan masuk untuk mengakses fitur terpadu GTK</p>
        </div>

        {errorMsg && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-100 text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input 
              type="text" 
              name="username" 
              value={credentials.username} 
              onChange={handleChange} 
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              placeholder="Masukkan username Anda"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
              type="password" 
              name="password" 
              value={credentials.password} 
              onChange={handleChange} 
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              placeholder="••••••••"
            />
          </div>
          <button 
            type="submit" 
            disabled={isLoading} 
            className={`w-full py-3 px-4 rounded-xl text-white font-bold transition-all shadow-sm ${
              isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-md'
            }`}
          >
            {isLoading ? 'Memeriksa Kredensial...' : 'Masuk Sekarang'}
          </button>
        </form>
        
        <p className="text-xs text-center text-gray-400 mt-6">
          Gunakan <strong>username</strong> dan <strong>password</strong> anda untuk login.
        </p>
      </div>
    </div>
  );
}
