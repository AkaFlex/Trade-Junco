
import React, { useState, useEffect } from 'react';
import { auth } from './firebaseConfig';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { AdminPanel } from './components/AdminPanel';
import { RCAPanel } from './components/RCAPanel';
import { PromoterPanel } from './components/PromoterPanel';
import { UserProfile, ADMIN_EMAILS } from './types';
import { LogOut, User, Shield, ArrowRight, Utensils } from 'lucide-react';

const App: React.FC = () => {
  // Current active user (Admin via Auth, or RCA via simple state)
  const [user, setUser] = useState<UserProfile | null>(null);
  
  // Login State
  const [viewMode, setViewMode] = useState<'landing' | 'admin-login'>('landing');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Check for existing Admin session on load
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        // Verify Admin Status
        if (ADMIN_EMAILS.includes(authUser.email || '')) {
          setUser({
            uid: authUser.uid,
            email: authUser.email || '',
            role: 'admin'
          });
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Auth observer will handle the rest
    } catch (err) {
      setError("Credenciais inválidas.");
    }
  };

  const handleRCAAccess = () => {
    // Direct access for RCA, no email required initially
    setUser({
      uid: 'guest_' + Date.now(),
      email: '', // Empty initially, will be asked in form or history search
      role: 'rca'
    });
  };

  const handlePromoterAccess = () => {
    setUser({
      uid: 'promoter_' + Date.now(),
      email: '',
      role: 'promoter'
    });
  };

  const handleForgotPassword = async () => {
    if(!email) return alert("Digite seu e-mail primeiro.");
    await sendPasswordResetEmail(auth, email);
    alert("Verifique seu e-mail para redefinir a senha.");
  };

  const handleLogout = () => {
    signOut(auth);
    setUser(null);
    setEmail('');
    setPassword('');
    setViewMode('landing');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-brand-purple animate-pulse">Carregando Junco Trade...</div>;

  // 1. Authenticated / Active View
  if (user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
        <nav className={`${user.role === 'admin' ? 'bg-brand-purple' : user.role === 'promoter' ? 'bg-pink-600' : 'bg-brand-red'} text-white shadow-lg`}>
          <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-white p-1 rounded-md">
                {/* Logo Placeholder */}
                <div className={`w-6 h-6 rounded-full ${user.role === 'admin' ? 'bg-brand-purple' : user.role === 'promoter' ? 'bg-pink-600' : 'bg-brand-red'}`}></div>
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight tracking-wide">JUNCO TRADE</h1>
                <p className="text-[10px] opacity-80 uppercase tracking-widest">
                    {user.role === 'admin' ? 'Gestão Estratégica' : user.role === 'promoter' ? 'Painel da Degustadora' : 'Painel do Vendedor'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {user.email && <span className="text-sm hidden md:inline opacity-90">{user.email}</span>}
              <button 
                onClick={handleLogout}
                className="flex items-center gap-1 bg-black/20 px-3 py-1.5 rounded hover:bg-black/30 transition text-sm font-medium"
              >
                <LogOut size={16} /> Sair
              </button>
            </div>
          </div>
        </nav>

        <main className="flex-1 overflow-y-auto">
          {user.role === 'admin' && <AdminPanel />}
          {user.role === 'rca' && <RCAPanel user={user} />}
          {user.role === 'promoter' && <PromoterPanel />}
        </main>
      </div>
    );
  }

  // 2. Landing / Selection Screen
  if (viewMode === 'landing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col items-center justify-center p-6">
        <div className="max-w-4xl w-full grid md:grid-cols-2 bg-white rounded-3xl shadow-2xl overflow-hidden">
          
          <div className="bg-brand-red p-12 text-white flex flex-col justify-center items-start relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 bg-black/10 rounded-full blur-3xl"></div>
            
            <h1 className="text-4xl font-extrabold mb-4">Trade Manager</h1>
            <p className="text-red-100 text-lg mb-8 leading-relaxed">
              Gestão inteligente de verbas, execuções e relatórios de Trade Marketing.
            </p>
            <div className="w-12 h-1 bg-white rounded-full opacity-50"></div>
          </div>

          <div className="p-12 flex flex-col justify-center space-y-4 bg-white">
            <div className="text-center md:text-left mb-2">
              <h2 className="text-2xl font-bold text-gray-800">Bem-vindo</h2>
              <p className="text-gray-500">Selecione seu perfil para continuar</p>
            </div>

            <button 
              onClick={handleRCAAccess}
              className="group relative w-full flex items-center p-4 border-2 border-gray-100 rounded-xl hover:border-brand-red hover:bg-red-50 transition-all duration-300"
            >
              <div className="bg-red-100 p-3 rounded-full text-brand-red group-hover:scale-110 transition-transform">
                <User size={24} />
              </div>
              <div className="ml-4 text-left flex-1">
                <span className="block font-bold text-gray-800">Sou RCA / Vendedor</span>
                <span className="text-sm text-gray-500">Solicitar e gerenciar ações</span>
              </div>
              <ArrowRight className="text-gray-300 group-hover:text-brand-red group-hover:translate-x-1 transition-all" />
            </button>
            
            <button 
              onClick={handlePromoterAccess}
              className="group relative w-full flex items-center p-4 border-2 border-gray-100 rounded-xl hover:border-pink-500 hover:bg-pink-50 transition-all duration-300"
            >
              <div className="bg-pink-100 p-3 rounded-full text-pink-600 group-hover:scale-110 transition-transform">
                <Utensils size={24} />
              </div>
              <div className="ml-4 text-left flex-1">
                <span className="block font-bold text-gray-800">Sou Degustadora</span>
                <span className="text-sm text-gray-500">Preencher sell-out de ações</span>
              </div>
              <ArrowRight className="text-gray-300 group-hover:text-pink-500 group-hover:translate-x-1 transition-all" />
            </button>

            <button 
              onClick={() => { setViewMode('admin-login'); setError(''); setEmail(''); }}
              className="group relative w-full flex items-center p-4 border-2 border-gray-100 rounded-xl hover:border-brand-purple hover:bg-purple-50 transition-all duration-300"
            >
              <div className="bg-purple-100 p-3 rounded-full text-brand-purple group-hover:scale-110 transition-transform">
                <Shield size={24} />
              </div>
              <div className="ml-4 text-left flex-1">
                <span className="block font-bold text-gray-800">Sou Gestor / Admin</span>
                <span className="text-sm text-gray-500">Aprovações e Configurações</span>
              </div>
              <ArrowRight className="text-gray-300 group-hover:text-brand-purple group-hover:translate-x-1 transition-all" />
            </button>
          </div>
        </div>
        <p className="mt-8 text-xs text-gray-400">© 2024 Junco - Trade Marketing System</p>
      </div>
    );
  }

  // 3. Admin Login Screen
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md border-t-8 border-brand-purple">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800">Login Admin</h2>
          <p className="text-purple-600 font-medium">Acesso Restrito</p>
        </div>
        
        <form onSubmit={handleAdminLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail Administrativo</label>
            <input 
              type="email" 
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-brand-purple outline-none"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input 
              type="password" 
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-brand-purple outline-none"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          
          {error && <p className="text-red-600 text-sm text-center bg-red-50 py-2 rounded">{error}</p>}
          
          <button 
            type="submit" 
            className="w-full bg-brand-purple text-white py-3 rounded-lg font-bold hover:bg-purple-800 transition shadow-md"
          >
            ENTRAR NO SISTEMA
          </button>

          <div className="flex justify-between items-center mt-4 text-sm">
             <button type="button" onClick={() => setViewMode('landing')} className="text-gray-500 hover:text-gray-800">
              ← Voltar
            </button>
            <button type="button" onClick={handleForgotPassword} className="text-brand-purple hover:underline">
              Esqueci a senha
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default App;
