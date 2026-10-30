import React, { useState, useEffect } from 'react';
import { 
  Users, Shield, Shirt, Radio, BookOpen, Settings, LogIn, LogOut, 
  CheckCircle, XCircle, Clock, Plus, Trash2, Edit3, Save, UserCheck, 
  ChevronRight, Sparkles, Award, AlertTriangle, Eye, RefreshCw, Lock
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, 
  onAuthStateChanged, setPersistence, browserLocalPersistence 
} from 'firebase/auth';
import { 
  getFirestore, doc, setDoc, getDoc, collection, onSnapshot, 
  query, where, updateDoc, deleteDoc, addDoc, serverTimestamp, orderBy 
} from 'firebase/firestore';

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDummyKeyForTemplateOnly01234",
  authDomain: "magnatas-01.firebaseapp.com",
  projectId: "magnatas-01",
  storageBucket: "magnatas-01.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export default function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Dados do Firestore
  const [applications, setApplications] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [outfits, setOutfits] = useState([]);
  const [radios, setRadios] = useState([]);
  const [rules, setRules] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Estado do formulário de candidatura
  const [candidaturaForm, setCandidaturaForm] = useState({
    idade: '',
    nomeInGame: '',
    id: '',
    kills: '',
    tempoCidade: '',
    motivo: ''
  });

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(console.error);

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          setUserProfile(userSnap.data());
        } else {
          const newProfile = {
            uid: currentUser.uid,
            name: currentUser.displayName,
            email: currentUser.email,
            photoURL: currentUser.photoURL,
            appStatus: 'none',
            roles: ['Candidato'],
            createdAt: new Date().toISOString()
          };
          await setDoc(userRef, newProfile);
          setUserProfile(newProfile);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubApps = onSnapshot(collection(db, 'applications'), (snap) => {
      setApplications(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setAllUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubOutfits = onSnapshot(collection(db, 'outfits'), (snap) => {
      setOutfits(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubRadios = onSnapshot(collection(db, 'radios'), (snap) => {
      setRadios(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubRules = onSnapshot(collection(db, 'rules'), (snap) => {
      setRules(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const isFounder = userProfile?.roles?.includes("01 Founder's");
    let unsubLogs = () => {};
    if (isFounder) {
      const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'));
      unsubLogs = onSnapshot(q, (snap) => {
        setAuditLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    }

    return () => {
      unsubApps();
      unsubUsers();
      unsubOutfits();
      unsubRadios();
      unsubRules();
      unsubLogs();
    };
  }, [user, userProfile]);

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Erro no Login:", error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleCandidaturaSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    const appData = {
      userId: user.uid,
      userEmail: user.email,
      userName: user.displayName,
      userPhoto: user.photoURL,
      ...candidaturaForm,
      status: 'pending',
      submittedAt: new Date().toISOString()
    };

    await addDoc(collection(db, 'applications'), appData);
    await updateDoc(doc(db, 'users', user.uid), {
      appStatus: 'pending',
      inGameName: candidaturaForm.nomeInGame,
      gameId: candidaturaForm.id
    });

    setUserProfile(prev => ({ ...prev, appStatus: 'pending' }));
  };

  const isFounder = userProfile?.roles?.includes("01 Founder's");

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-10 h-10 text-red-600 animate-spin" />
          <p className="text-neutral-400 text-sm tracking-widest uppercase">A carregar Magnatas 01!...</p>
        </div>
      </div>
    );
  }

  // Ecrã de Login
  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl text-center">
          <div className="inline-flex p-4 bg-red-950/40 border border-red-800/50 rounded-2xl mb-6">
            <Shield className="w-12 h-12 text-red-600" />
          </div>
          <h1 className="text-3xl font-black tracking-wider text-red-600 uppercase mb-2">MAGNATAS 01!</h1>
          <p className="text-neutral-400 text-sm mb-8">Plataforma Oficial da Gang / FiveM</p>

          <button
            onClick={handleGoogleLogin}
            className="w-full py-3.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-900/30 flex items-center justify-center gap-3"
          >
            <LogIn className="w-5 h-5" />
            Iniciar Sessão com a Conta Google
          </button>
        </div>
      </div>
    );
  }

  // Ecrã de Candidatura Pendente
  if (userProfile?.appStatus === 'pending') {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center shadow-2xl">
          <div className="inline-flex p-4 bg-amber-950/40 border border-amber-800/50 rounded-2xl mb-6">
            <Clock className="w-12 h-12 text-amber-500 animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold text-amber-500 uppercase mb-2">MAGNATAS 01!</h1>
          <h2 className="text-lg font-semibold text-white mb-4">A tua candidatura está pendente.</h2>
          <p className="text-neutral-400 text-sm mb-6">
            Aguarda que um responsável da gang analise a tua candidatura.
          </p>
          <button
            onClick={handleLogout}
            className="w-full py-2.5 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium rounded-xl transition"
          >
            Terminar Sessão
          </button>
        </div>
      </div>
    );
  }

  // Form de Candidatura se ainda não submeteu
  if (userProfile?.appStatus === 'none') {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-4">
        <div className="max-w-xl w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-8 h-8 text-red-600" />
            <div>
              <h1 className="text-2xl font-black text-white uppercase">Candidatura MAGNATAS 01!</h1>
              <p className="text-neutral-400 text-xs">Preenche todos os campos para seres avaliado.</p>
            </div>
          </div>

          <form onSubmit={handleCandidaturaSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-neutral-400 uppercase">1. Idade</label>
                <input
                  required
                  type="number"
                  value={candidaturaForm.idade}
                  onChange={e => setCandidaturaForm({...candidaturaForm, idade: e.target.value})}
                  className="w-full mt-1 p-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:border-red-600 focus:outline-none"
                  placeholder="Ex: 20"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-neutral-400 uppercase">2. Nome In-Game</label>
                <input
                  required
                  type="text"
                  value={candidaturaForm.nomeInGame}
                  onChange={e => setCandidaturaForm({...candidaturaForm, nomeInGame: e.target.value})}
                  className="w-full mt-1 p-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:border-red-600 focus:outline-none"
                  placeholder="Ex: John Doe"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-neutral-400 uppercase">3. ID In-Game</label>
                <input
                  required
                  type="text"
                  value={candidaturaForm.id}
                  onChange={e => setCandidaturaForm({...candidaturaForm, id: e.target.value})}
                  className="w-full mt-1 p-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:border-red-600 focus:outline-none"
                  placeholder="Ex: #1234"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-neutral-400 uppercase">4. Kills Atuais</label>
                <input
                  required
                  type="number"
                  value={candidaturaForm.kills}
                  onChange={e => setCandidaturaForm({...candidaturaForm, kills: e.target.value})}
                  className="w-full mt-1 p-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:border-red-600 focus:outline-none"
                  placeholder="Ex: 150"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-400 uppercase">5. Quanto tempo de cidade?</label>
              <input
                required
                type="text"
                value={candidaturaForm.tempoCidade}
                onChange={e => setCandidaturaForm({...candidaturaForm, tempoCidade: e.target.value})}
                className="w-full mt-1 p-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:border-red-600 focus:outline-none"
                placeholder="Ex: 6 meses"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-400 uppercase">6. Por qual motivo quer entrar na gang?</label>
              <textarea
                required
                rows={3}
                value={candidaturaForm.motivo}
                onChange={e => setCandidaturaForm({...candidaturaForm, motivo: e.target.value})}
                className="w-full mt-1 p-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:border-red-600 focus:outline-none"
                placeholder="Explica as tuas motivações..."
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition shadow-lg shadow-red-900/40 uppercase tracking-wider"
            >
              Submeter Candidatura
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Dashboard Principal (Para Utilizadores Aprovados / Founders)
  return (
    <div className="min-h-screen bg-neutral-950 text-white flex">
      {/* Sidebar */}
      <aside className="w-64 bg-neutral-900 border-r border-neutral-800 p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <Shield className="w-8 h-8 text-red-600" />
            <div>
              <h1 className="font-black text-lg text-red-600 uppercase tracking-wider">MAGNATAS 01!</h1>
              <p className="text-xs text-neutral-500">Base Digital</p>
            </div>
          </div>

          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition ${activeTab === 'dashboard' ? 'bg-red-600 text-white' : 'text-neutral-400 hover:bg-neutral-800'}`}
            >
              <Users className="w-4 h-4" /> Base da Gang
            </button>

            <button
              onClick={() => setActiveTab('outfits')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition ${activeTab === 'outfits' ? 'bg-red-600 text-white' : 'text-neutral-400 hover:bg-neutral-800'}`}
            >
              <Shirt className="w-4 h-4" /> Roupas
            </button>

            <button
              onClick={() => setActiveTab('radios')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition ${activeTab === 'radios' ? 'bg-red-600 text-white' : 'text-neutral-400 hover:bg-neutral-800'}`}
            >
              <Radio className="w-4 h-4" /> Rádios
            </button>

            <button
              onClick={() => setActiveTab('rules')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition ${activeTab === 'rules' ? 'bg-red-600 text-white' : 'text-neutral-400 hover:bg-neutral-800'}`}
            >
              <BookOpen className="w-4 h-4" /> Regras
            </button>

            {isFounder && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition ${activeTab === 'admin' ? 'bg-amber-600 text-white' : 'text-amber-500 hover:bg-amber-950/40'}`}
              >
                <Settings className="w-4 h-4" /> Painel Admin (Founder)
              </button>
            )}
          </nav>
        </div>

        <div className="border-t border-neutral-800 pt-4">
          <div className="flex items-center gap-3 mb-4">
            <img src={user.photoURL} alt="Avatar" className="w-10 h-10 rounded-full border border-neutral-700" />
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white truncate">{user.displayName}</p>
              <p className="text-xs text-amber-500 font-semibold">{userProfile?.roles?.[0] || 'Membro'}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full py-2 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium rounded-xl text-xs flex items-center justify-center gap-2 transition"
          >
            <LogOut className="w-4 h-4" /> Sair da Conta
          </button>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 p-8 overflow-y-auto">
        {activeTab === 'dashboard' && (
          <div>
            <h2 className="text-2xl font-black uppercase text-white mb-6">Base da Gang — Membros</h2>
            <div className="grid grid-cols-3 gap-6">
              {allUsers.filter(u => u.appStatus === 'approved').map((u) => (
                <div key={u.id} className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl flex items-center gap-4">
                  <img src={u.photoURL} alt={u.name} className="w-12 h-12 rounded-full border-2 border-red-600" />
                  <div>
                    <h3 className="font-bold text-white">{u.inGameName || u.name}</h3>
                    <p className="text-xs text-neutral-400">ID: {u.gameId || '#0000'}</p>
                    <span className="inline-block mt-2 px-2.5 py-0.5 bg-red-950/80 border border-red-800/60 text-red-400 text-xs rounded-full font-semibold">
                      {u.roles?.[0] || '01 Member\'s'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'outfits' && (
          <div>
            <h2 className="text-2xl font-black uppercase text-white mb-6">Roupas Oficiais Magnatas 01!</h2>
            <div className="grid grid-cols-3 gap-6">
              {outfits.map(outfit => (
                <div key={outfit.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
                  <img src={outfit.photoURL || 'https://via.placeholder.com/400x300'} alt={outfit.name} className="w-full h-48 object-cover" />
                  <div className="p-4">
                    <h3 className="font-bold text-white">{outfit.name}</h3>
                    <p className="text-xs text-red-500 font-bold mb-2">Número: #{outfit.number}</p>
                    <p className="text-xs text-neutral-400">{outfit.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'radios' && (
          <div>
            <h2 className="text-2xl font-black uppercase text-white mb-6">Frequências de Rádio</h2>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl">
                <h3 className="text-lg font-bold text-red-500 mb-2">Rádio Principal</h3>
                <p className="text-3xl font-black text-white mb-4">101.5 MHz</p>
                <p className="text-sm text-neutral-400">Frequência para operações oficiais e ações de gang.</p>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl">
                <h3 className="text-lg font-bold text-amber-500 mb-2">Rádio Alternativa</h3>
                <p className="text-3xl font-black text-white mb-4">102.8 MHz</p>
                <p className="text-sm text-neutral-400">Frequência secundária de emergência e patrulha.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'rules' && (
          <div>
            <h2 className="text-2xl font-black uppercase text-white mb-6">Regras Oficiais</h2>
            <div className="space-y-4">
              <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl">
                <h3 className="font-bold text-red-500 text-lg mb-1">1. Respeito e Lealdade</h3>
                <p className="text-neutral-300 text-sm">Respeito total aos superiores e lealdade à gang acima de tudo.</p>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl">
                <h3 className="font-bold text-red-500 text-lg mb-1">2. Frequência de Rádio</h3>
                <p className="text-neutral-300 text-sm">Uso obrigatório do rádio oficial durante todas as ações.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'admin' && isFounder && (
          <div>
            <h2 className="text-2xl font-black uppercase text-amber-500 mb-6">Painel de Gestão (Founder)</h2>
            <div className="space-y-6">
              <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl">
                <h3 className="font-bold text-white mb-4">Candidaturas Pendentes</h3>
                <div className="space-y-4">
                  {applications.filter(a => a.status === 'pending').map(app => (
                    <div key={app.id} className="bg-neutral-950 p-4 border border-neutral-800 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="font-bold text-white">{app.nomeInGame} <span className="text-xs text-neutral-400">(ID: #{app.id})</span></p>
                        <p className="text-xs text-neutral-400">Idade: {app.idade} | Kills: {app.kills} | Motivo: {app.motivo}</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={async () => {
                            await updateDoc(doc(db, 'applications', app.id), { status: 'approved' });
                            await updateDoc(doc(db, 'users', app.userId), { 
                              appStatus: 'approved',
                              roles: ['01 Member\'s']
                            });
                          }}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold"
                        >
                          Aprovar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}