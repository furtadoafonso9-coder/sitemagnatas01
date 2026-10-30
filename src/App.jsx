import React, { useState, useEffect } from 'react';
import { 
  Shield, Users, DollarSign, AlertTriangle, LogIn, LogOut, 
  Clock, CheckCircle, XCircle, Shirt, Radio, BookOpen, Settings, Send
} from 'lucide-react';
import { auth, googleProvider, db } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export default function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Form State
  const [formData, setFormData] = useState({
    idade: '',
    nomeIngame: '',
    idIngame: '',
    kills: '',
    tempoCidade: '',
    motivo: ''
  });

  // Monitorar Autenticação e Firestore
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Escutar alterações do utilizador no Firestore
        const userRef = doc(db, 'users', currentUser.uid);
        const unsubscribeDoc = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserData(docSnap.data());
          } else {
            setUserData({ status: 'sem_candidatura', role: 'Visitante' });
          }
          setLoading(false);
        });
        return () => unsubscribeDoc();
      } else {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Login com Google
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Erro ao iniciar sessão:", error);
    }
  };

  // Logout
  const handleLogout = async () => {
    await signOut(auth);
  };

  // Submeter Candidatura
  const handleSubmitCandidatura = async (e) => {
    e.preventDefault();
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const payload = {
      uid: user.uid,
      email: user.email,
      nome: user.displayName,
      foto: user.photoURL,
      ...formData,
      status: 'pendente',
      role: 'Visitante',
      dataSubmissao: new Date().toISOString()
    };

    await setDoc(userRef, payload, { merge: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-red-600"></div>
      </div>
    );
  }

  // 1. ECRÃ DE LOGIN (Sem sessão)
  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-neutral-900 border border-red-900/40 p-8 rounded-2xl text-center shadow-2xl space-y-6">
          <div className="flex justify-center">
            <Shield className="w-16 h-16 text-red-600 animate-pulse" />
          </div>
          <h1 className="text-3xl font-black text-red-600 tracking-wider">MAGNATAS 01!</h1>
          <p className="text-neutral-400 text-sm">Acesso restrito à base operacional privada.</p>
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center space-x-3 bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded-xl font-bold transition duration-200">
            <LogIn className="w-5 h-5" />
            <span>Iniciar Sessão</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. FORMULÁRIO DE CANDIDATURA (Sem candidatura)
  if (userData?.status === 'sem_candidatura') {
    return (
      <div className="min-h-screen bg-neutral-950 text-white p-6 flex justify-center items-center">
        <div className="max-w-2xl w-full bg-neutral-900 border border-neutral-800 p-8 rounded-2xl space-y-6">
          <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
            <h1 className="text-2xl font-black text-red-600">FORMULÁRIO DE CANDIDATURA</h1>
            <button onClick={handleLogout} className="text-neutral-400 hover:text-white"><LogOut className="w-5 h-5"/></button>
          </div>
          <form onSubmit={handleSubmitCandidatura} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-neutral-400 font-bold uppercase">1. Idade</label>
                <input required type="number" value={formData.idade} onChange={e => setFormData({...formData, idade: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:border-red-600 outline-none" />
              </div>
              <div>
                <label className="text-xs text-neutral-400 font-bold uppercase">2. Nome In-Game</label>
                <input required type="text" value={formData.nomeIngame} onChange={e => setFormData({...formData, nomeIngame: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:border-red-600 outline-none" />
              </div>
              <div>
                <label className="text-xs text-neutral-400 font-bold uppercase">3. ID In-Game</label>
                <input required type="text" value={formData.idIngame} onChange={e => setFormData({...formData, idIngame: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:border-red-600 outline-none" />
              </div>
              <div>
                <label className="text-xs text-neutral-400 font-bold uppercase">4. Kills Atuais</label>
                <input required type="number" value={formData.kills} onChange={e => setFormData({...formData, kills: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:border-red-600 outline-none" />
              </div>
            </div>
            <div>
              <label className="text-xs text-neutral-400 font-bold uppercase">5. Quanto tempo de cidade?</label>
              <input required type="text" value={formData.tempoCidade} onChange={e => setFormData({...formData, tempoCidade: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:border-red-600 outline-none" />
            </div>
            <div>
              <label className="text-xs text-neutral-400 font-bold uppercase">6. Motivo para entrar na gang?</label>
              <textarea required rows="3" value={formData.motivo} onChange={e => setFormData({...formData, motivo: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:border-red-600 outline-none"></textarea>
            </div>
            <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl flex items-center justify-center space-x-2">
              <Send className="w-5 h-5" />
              <span>Submeter Candidatura</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 3. CANDIDATURA PENDENTE
  if (userData?.status === 'pendente') {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-neutral-900 border border-amber-900/40 p-8 rounded-2xl text-center space-y-4">
          <Clock className="w-16 h-16 text-amber-500 mx-auto animate-pulse" />
          <h1 className="text-2xl font-black text-white">MAGNATAS 01!</h1>
          <p className="text-amber-400 font-bold">A tua candidatura está pendente.</p>
          <p className="text-neutral-400 text-sm">Aguarda que um responsável da gang analise a tua candidatura.</p>
          <button onClick={handleLogout} className="text-xs text-neutral-500 hover:text-white underline pt-4">Sair da Conta</button>
        </div>
      </div>
    );
  }

  // 4. CANDIDATURA REPROVADA
  if (userData?.status === 'reprovado') {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-neutral-900 border border-red-900/40 p-8 rounded-2xl text-center space-y-4">
          <XCircle className="w-16 h-16 text-red-600 mx-auto" />
          <h1 className="text-2xl font-black text-white">MAGNATAS 01!</h1>
          <p className="text-red-500 font-bold">A tua candidatura foi reprovada.</p>
          <button 
            onClick={async () => {
              await setDoc(doc(db, 'users', user.uid), { status: 'sem_candidatura' }, { merge: true });
            }}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-xl text-sm">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  // 5. PAINEL PRINCIPAL (Candidatura Aprovada)
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      <header className="border-b border-red-900/40 bg-neutral-900/80 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Shield className="w-8 h-8 text-red-600" />
          <h1 className="text-2xl font-black tracking-wider text-red-600 uppercase">MAGNATAS 01!</h1>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-red-950/40 border border-red-900/50 px-3 py-1.5 rounded-full">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-semibold text-neutral-300">{userData?.role || "01 Member's"}</span>
          </div>
          <button onClick={handleLogout} className="text-neutral-400 hover:text-white"><LogOut className="w-5 h-5"/></button>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="w-64 border-r border-neutral-800 bg-neutral-900/40 p-4 space-y-2">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition ${activeTab === 'dashboard' ? 'bg-red-600 text-white' : 'hover:bg-neutral-800 text-neutral-400'}`}>
            <Users className="w-5 h-5" /><span>Base da Gang</span>
          </button>
          <button onClick={() => setActiveTab('roupas')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition ${activeTab === 'roupas' ? 'bg-red-600 text-white' : 'hover:bg-neutral-800 text-neutral-400'}`}>
            <Shirt className="w-5 h-5" /><span>Roupas</span>
          </button>
          <button onClick={() => setActiveTab('radio')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition ${activeTab === 'radio' ? 'bg-red-600 text-white' : 'hover:bg-neutral-800 text-neutral-400'}`}>
            <Radio className="w-5 h-5" /><span>Rádio</span>
          </button>
          <button onClick={() => setActiveTab('regras')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition ${activeTab === 'regras' ? 'bg-red-600 text-white' : 'hover:bg-neutral-800 text-neutral-400'}`}>
            <BookOpen className="w-5 h-5" /><span>Regras</span>
          </button>
        </aside>

        <main className="flex-1 p-8 space-y-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-2">Central Magnatas 01!</h2>
            <p className="text-neutral-400">Bem-vindo à base privada digital. Aceda às secções laterais para consultar roupas, rádios e regras oficiais.</p>
          </div>
        </main>
      </div>
    </div>
  );
}
