import React, { useState, useEffect } from 'react';
import { 
  Shield, Users, LogIn, LogOut, Clock, XCircle, Shirt, Radio, BookOpen, Send, Settings, Plus, Trash2
} from 'lucide-react';
import { auth, googleProvider, db } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, onSnapshot, collection, query, getDocs, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';

export default function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  const [allUsers, setAllUsers] = useState([]);
  const [formData, setFormData] = useState({ idade: '', nomeIngame: '', idIngame: '', kills: '', tempoCidade: '', motivo: '' });

  // Conteúdos dinâmicos
  const [roupas, setRoupas] = useState([]);
  const [radios, setRadios] = useState([]);
  const [regras, setRegras] = useState([]);

  // Estados para inputs de moderação
  const [novaRoupa, setNovaRoupa] = useState({ nome: '', top: '', calcas: '', mascara: '' });
  const [novaRegra, setNovaRegra] = useState('');

  // Lista integral de cargos organizados
  const cargosDisponiveis = [
    // Cargos Administrativos e Staff
    "Staff ATHOS PvP", "01 Founder´s", "01 Leader´s", "| Magnata 01! ©",
    "Resp. Manager´s", "01 Manager´s", "Suport", "Manager´s Approval", "Resp. Member´s",
    
    // Membros e Comunidade
    "01 Member´s", "Server Booster´s", "01 Friend´s", "01 Visitant",
    "PVP Player", "Homem", "Mulher",
    
    // Cargos de Moderação e Punições
    "Ban Temporário", "Ban Perma", "Muted", "Ausente",
    "Warning 1", "Warning 2", "Warning AFK",
    
    // Bots e Integrações
    "Streamer",
    
    // Outros / Autorizações
    "Conta ALT", "Autorização P/ Calças", "Autorização P/ Manga"
  ];

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        const unsubscribeDoc = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserData(docSnap.data());
          } else {
            setUserData({ status: 'sem_candidatura', role: '01 Visitant' });
          }
          setLoading(false);
        });

        carregarDadosGang();
        return () => unsubscribeDoc();
      } else {
        setUser(null);
        setUserData(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const carregarDadosGang = async () => {
    // Utilizadores
    const usersSnap = await getDocs(query(collection(db, 'users')));
    const usersList = [];
    usersSnap.forEach((d) => usersList.push({ id: d.id, ...d.data() }));
    setAllUsers(usersList);

    // Roupas
    const roupasSnap = await getDocs(query(collection(db, 'roupas')));
    if (roupasSnap.empty) {
      const defaultRoupas = [
        { nome: 'Kit Assalto / Operacional', top: 'ID 142', calcas: 'ID 35', mascara: 'ID 22' },
        { nome: 'Kit Reunião / Conferência', top: 'ID 88', calcas: 'ID 12', mascara: 'Nenhuma' }
      ];
      defaultRoupas.forEach(async r => await addDoc(collection(db, 'roupas'), r));
    }
    const roupasList = [];
    roupasSnap.forEach(d => roupasList.push({ id: d.id, ...d.data() }));
    setRoupas(roupasList);

    // Rádios
    const radiosSnap = await getDocs(query(collection(db, 'radios')));
    if (radiosSnap.empty) {
      const defaultRadios = [
        { canal: 'Rádio Principal (Geral)', freq: '101.5 MHz' },
        { canal: 'Rádio Alternativa (Ações)', freq: '202.0 MHz' }
      ];
      defaultRadios.forEach(async r => await addDoc(collection(db, 'radios'), r));
    }
    const radiosList = [];
    radiosSnap.forEach(d => radiosList.push({ id: d.id, ...d.data() }));
    setRadios(radiosList);

    // Regras
    const regrasSnap = await getDocs(query(collection(db, 'regras')));
    if (regrasSnap.empty) {
      const defaultRegras = [
        'Respeito máximo por todos os membros, independentemente do cargo.',
        'Proibido toxicidade em calls públicas ou com outras organizações.',
        'Uso obrigatório da farda estipulada nas ações oficiais da Magnatas 01!'
      ];
      defaultRegras.forEach(async r => await addDoc(collection(db, 'regras'), { texto: r }));
    }
    const regrasList = [];
    regrasSnap.forEach(d => regrasList.push({ id: d.id, ...d.data() }));
    setRegras(regrasList);
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Erro no login:", error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleSubmitCandidatura = async (e) => {
    e.preventDefault();
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const payload = {
      uid: user.uid,
      email: user.email,
      nome: user.displayName || 'Membro',
      foto: user.photoURL || '',
      ...formData,
      status: 'pendente',
      role: '01 Visitant',
      dataSubmissao: new Date().toISOString()
    };
    await setDoc(userRef, payload, { merge: true });
    setUserData(payload);
  };

  const atualizarStatusCandidato = async (targetUid, novoStatus, novoCargo = '01 Member´s') => {
    const userRef = doc(db, 'users', targetUid);
    await updateDoc(userRef, { status: novoStatus, role: novoCargo });
    carregarDadosGang();
  };

  const alterarCargoMembro = async (targetUid, novoCargo) => {
    const userRef = doc(db, 'users', targetUid);
    await updateDoc(userRef, { role: novoCargo });
    carregarDadosGang();
  };

  const adicionarRoupa = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'roupas'), novaRoupa);
    setNovaRoupa({ nome: '', top: '', calcas: '', mascara: '' });
    carregarDadosGang();
  };

  const apagarRoupa = async (id) => {
    await deleteDoc(doc(db, 'roupas', id));
    carregarDadosGang();
  };

  const adicionarRegra = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'regras'), { texto: novaRegra });
    setNovaRegra('');
    carregarDadosGang();
  };

  const apagarRegra = async (id) => {
    await deleteDoc(doc(db, 'regras', id));
    carregarDadosGang();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-red-600"></div>
      </div>
    );
  }

  // 1. Ecrã de Login
  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-neutral-900 border border-red-900/40 p-8 rounded-2xl text-center shadow-2xl space-y-6">
          <Shield className="w-16 h-16 text-red-600 mx-auto animate-pulse" />
          <h1 className="text-3xl font-black text-red-600 tracking-wider">MAGNATAS 01!</h1>
          <p className="text-neutral-400 text-sm">Acesso restrito à base operacional privada.</p>
          <button onClick={handleLogin} className="w-full flex items-center justify-center space-x-3 bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded-xl font-bold transition">
            <LogIn className="w-5 h-5" /><span>Iniciar Sessão com Google</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. Formulário de Candidatura
  if (!userData || userData.status === 'sem_candidatura') {
    return (
      <div className="min-h-screen bg-neutral-950 text-white p-6 flex justify-center items-center">
        <div className="max-w-2xl w-full bg-neutral-900 border border-neutral-800 p-8 rounded-2xl space-y-6 shadow-2xl">
          <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
            <h1 className="text-2xl font-black text-red-600">FORMULÁRIO DE CANDIDATURA — MAGNATAS 01!</h1>
            <button onClick={handleLogout} className="text-neutral-400 hover:text-white"><LogOut className="w-5 h-5"/></button>
          </div>
          <form onSubmit={handleSubmitCandidatura} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="text-xs text-neutral-400 font-bold">1. IDADE</label><input required type="number" value={formData.idade} onChange={e => setFormData({...formData, idade: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:border-red-600 outline-none" /></div>
              <div><label className="text-xs text-neutral-400 font-bold">2. NOME IN-GAME</label><input required type="text" value={formData.nomeIngame} onChange={e => setFormData({...formData, nomeIngame: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:border-red-600 outline-none" /></div>
              <div><label className="text-xs text-neutral-400 font-bold">3. ID IN-GAME</label><input required type="text" value={formData.idIngame} onChange={e => setFormData({...formData, idIngame: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:border-red-600 outline-none" /></div>
              <div><label className="text-xs text-neutral-400 font-bold">4. KILLS ATUAIS</label><input required type="number" value={formData.kills} onChange={e => setFormData({...formData, kills: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:border-red-600 outline-none" /></div>
            </div>
            <div><label className="text-xs text-neutral-400 font-bold">5. QUANTO TEMPO DE CIDADE?</label><input required type="text" value={formData.tempoCidade} onChange={e => setFormData({...formData, tempoCidade: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:border-red-600 outline-none" /></div>
            <div><label className="text-xs text-neutral-400 font-bold">6. MOTIVO PARA ENTRAR NA GANG?</label><textarea required rows="3" value={formData.motivo} onChange={e => setFormData({...formData, motivo: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:border-red-600 outline-none"></textarea></div>
            <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl flex items-center justify-center space-x-2"><Send className="w-5 h-5"/><span>Submeter Candidatura</span></button>
          </form>
        </div>
      </div>
    );
  }

  // 3. Pendente
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

  // 4. Reprovado
  if (userData?.status === 'reprovado') {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-neutral-900 border border-red-900/40 p-8 rounded-2xl text-center space-y-4">
          <XCircle className="w-16 h-16 text-red-600 mx-auto" />
          <h1 className="text-2xl font-black text-white">MAGNATAS 01!</h1>
          <p className="text-red-500 font-bold">A tua candidatura foi reprovada.</p>
          <button onClick={async () => { await setDoc(doc(db, 'users', user.uid), { status: 'sem_candidatura' }, { merge: true }); }} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-xl text-sm">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const isOwnerOrFounder = ['| Magnata 01! ©', '01 Founder´s', 'Founder', 'Owner', 'Suport', 'Staff ATHOS PvP'].includes(userData?.role);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      <header className="border-b border-red-900/40 bg-neutral-900/90 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Shield className="w-8 h-8 text-red-600" />
          <h1 className="text-2xl font-black tracking-wider text-red-600 uppercase">MAGNATAS 01!</h1>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-red-950/60 border border-red-900/50 px-3 py-1.5 rounded-full flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-neutral-200 uppercase">{userData?.role || '01 Member´s'}</span>
          </div>
          <button onClick={handleLogout} className="text-neutral-400 hover:text-white" title="Sair"><LogOut className="w-5 h-5"/></button>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="w-64 border-r border-neutral-800 bg-neutral-900/30 p-4 space-y-2">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition ${activeTab === 'dashboard' ? 'bg-red-600 text-white shadow-lg shadow-red-900/30' : 'hover:bg-neutral-800 text-neutral-400'}`}><Users className="w-5 h-5" /><span>Base da Gang</span></button>
          <button onClick={() => setActiveTab('roupas')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition ${activeTab === 'roupas' ? 'bg-red-600 text-white shadow-lg shadow-red-900/30' : 'hover:bg-neutral-800 text-neutral-400'}`}><Shirt className="w-5 h-5" /><span>Roupas & Kits</span></button>
          <button onClick={() => setActiveTab('radio')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition ${activeTab === 'radio' ? 'bg-red-600 text-white shadow-lg shadow-red-900/30' : 'hover:bg-neutral-800 text-neutral-400'}`}><Radio className="w-5 h-5" /><span>Frequências Rádio</span></button>
          <button onClick={() => setActiveTab('regras')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition ${activeTab === 'regras' ? 'bg-red-600 text-white shadow-lg shadow-red-900/30' : 'hover:bg-neutral-800 text-neutral-400'}`}><BookOpen className="w-5 h-5" /><span>Regras Oficiais</span></button>
          
          {isOwnerOrFounder && (
            <button onClick={() => setActiveTab('admin')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition ${activeTab === 'admin' ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/30' : 'hover:bg-neutral-800 text-amber-500'}`}><Settings className="w-5 h-5" /><span>Painel Admin</span></button>
          )}
        </aside>

        <main className="flex-1 p-8 space-y-6 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <div className="bg-gradient-to-r from-neutral-900 to-neutral-900/50 border border-red-900/30 rounded-2xl p-8 shadow-xl">
                <h2 className="text-3xl font-black mb-2 text-white">CENTRAL PRIVADA — MAGNATAS 01!</h2>
                <p className="text-neutral-400">Plataforma oficial operacional. Consulta abaixo a listagem de líderes, gerentes e membros ativos da crew.</p>
              </div>

              {/* Listagem de Membros por Categoria */}
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-red-500 border-b border-neutral-800 pb-2">Líderes e Fundadores</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {allUsers.filter(u => ['| Magnata 01! ©', '01 Founder´s', '01 Leader´s'].includes(u.role)).map(m => (
                    <div key={m.uid} className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-full bg-red-950 border border-red-800 flex items-center justify-center font-bold text-red-500 uppercase">{m.nome?.[0]}</div>
                      <div>
                        <h4 className="font-bold text-white">{m.nomeIngame || m.nome}</h4>
                        <p className="text-xs text-red-400 font-semibold">{m.role}</p>
                        <p className="text-xs text-neutral-500">ID In-Game: {m.idIngame || 'N/A'}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <h3 className="text-xl font-bold text-neutral-200 border-b border-neutral-800 pb-2 pt-4">Membros Ativos</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {allUsers.filter(u => u.status === 'aprovado' && !['| Magnata 01! ©', '01 Founder´s', '01 Leader´s'].includes(u.role)).map(m => (
                    <div key={m.uid} className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center font-bold text-white uppercase">{m.nome?.[0]}</div>
                      <div>
                        <h4 className="font-bold text-white">{m.nomeIngame || m.nome}</h4>
                        <p className="text-xs text-emerald-400 font-semibold">{m.role}</p>
                        <p className="text-xs text-neutral-500">ID In-Game: {m.idIngame || 'N/A'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'roupas' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-white">ROUPAS E UNIFORMES OFICIAIS</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {roupas.map(r => (
                  <div key={r.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-3 relative">
                    {isOwnerOrFounder && (
                      <button onClick={() => apagarRoupa(r.id)} className="absolute top-4 right-4 text-neutral-500 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                    )}
                    <h3 className="text-lg font-bold text-red-500">{r.nome}</h3>
                    <div className="text-sm text-neutral-300 space-y-1">
                      <p>Top / Casaco: <span className="font-mono text-white font-bold">{r.top}</span></p>
                      <p>Calças: <span className="font-mono text-white font-bold">{r.calcas}</span></p>
                      <p>Máscara / Acessório: <span className="font-mono text-white font-bold">{r.mascara}</span></p>
                    </div>
                  </div>
                ))}
              </div>

              {isOwnerOrFounder && (
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 mt-6">
                  <h3 className="text-lg font-bold text-white mb-4">Adicionar Nova Roupa / Kit</h3>
                  <form onSubmit={adicionarRoupa} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input required type="text" placeholder="Nome do Kit" value={novaRoupa.nome} onChange={e => setNovaRoupa({...novaRoupa, nome: e.target.value})} className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white text-sm outline-none" />
                    <input required type="text" placeholder="Top (Ex: ID 142)" value={novaRoupa.top} onChange={e => setNovaRoupa({...novaRoupa, top: e.target.value})} className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white text-sm outline-none" />
                    <input required type="text" placeholder="Calças (Ex: ID 35)" value={novaRoupa.calcas} onChange={e => setNovaRoupa({...novaRoupa, calcas: e.target.value})} className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white text-sm outline-none" />
                    <input required type="text" placeholder="Máscara (Ex: ID 22)" value={novaRoupa.mascara} onChange={e => setNovaRoupa({...novaRoupa, mascara: e.target.value})} className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white text-sm outline-none" />
                    <button type="submit" className="md:col-span-4 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl flex items-center justify-center space-x-2"><Plus className="w-5 h-5"/><span>Guardar Roupa</span></button>
                  </form>
                </div>
              )}
            </div>
          )}

          {activeTab === 'radio' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-white">FREQUÊNCIAS DE RÁDIO OFICIAIS</h2>
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
                {radios.map((rad) => (
                  <div key={rad.id} className="flex justify-between items-center border-b border-neutral-800 pb-4">
                    <span className="font-bold text-neutral-200">{rad.canal}</span>
                    <span className="font-mono bg-red-950 text-red-400 px-4 py-1.5 rounded-xl border border-red-900/50 font-bold">{rad.freq}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'regras' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-white">DIRETRIZES E REGRAS DA GANG</h2>
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
                {regras.map((regra, idx) => (
                  <div key={regra.id} className="flex items-start justify-between border-b border-neutral-800 pb-4">
                    <div className="flex items-start space-x-3">
                      <span className="text-red-600 font-black">#{idx + 1}</span>
                      <p className="text-neutral-300 text-sm">{regra.texto}</p>
                    </div>
                    {isOwnerOrFounder && (
                      <button onClick={() => apagarRegra(regra.id)} className="text-neutral-500 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                    )}
                  </div>
                ))}
              </div>

              {isOwnerOrFounder && (
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Adicionar Nova Regra</h3>
                  <form onSubmit={adicionarRegra} className="space-y-3">
                    <textarea required rows="2" placeholder="Texto da regra..." value={novaRegra} onChange={e => setNovaRegra(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white text-sm outline-none"></textarea>
                    <button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-6 rounded-xl text-sm flex items-center space-x-2"><Plus className="w-4 h-4"/><span>Adicionar Regra</span></button>
                  </form>
                </div>
              )}
            </div>
          )}

          {activeTab === 'admin' && isOwnerOrFounder && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-amber-500">PAINEL ADMINISTRATIVO & GESTÃO DE MEMBROS</h2>
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-400">
                      <th className="pb-3">Utilizador</th>
                      <th className="pb-3">In-Game</th>
                      <th className="pb-3">Estado</th>
                      <th className="pb-3">Cargo Atribuído</th>
                      <th className="pb-3 text-right">Ações / Alterar Cargo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {allUsers.map(u => (
                      <tr key={u.uid}>
                        <td className="py-4 font-bold text-white">{u.nome || u.email}</td>
                        <td className="py-4 text-neutral-300">{u.nomeIngame || 'N/A'} (ID: {u.idIngame || '-'})</td>
                        <td className="py-4"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${u.status === 'aprovado' ? 'bg-emerald-950 text-emerald-400' : u.status === 'pendente' ? 'bg-amber-950 text-amber-400' : 'bg-red-950 text-red-400'}`}>{u.status}</span></td>
                        <td className="py-4">
                          <select value={u.role} onChange={(e) => alterarCargoMembro(u.uid, e.target.value)} className="bg-neutral-950 border border-neutral-800 rounded-lg p-1.5 text-xs text-neutral-200 outline-none">
                            {cargosDisponiveis.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </td>
                        <td className="py-4 text-right space-x-2">
                          {u.status === 'pendente' && (
                            <>
                              <button onClick={() => atualizarStatusCandidato(u.uid, 'aprovado', '01 Member´s')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold">Aprovar</button>
                              <button onClick={() => atualizarStatusCandidato(u.uid, 'reprovado', '01 Visitant')} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold">Reprovar</button>
                            </>
                          )}
                          {u.status === 'aprovado' && (
                            <span className="text-xs text-emerald-500 font-bold">Ativo</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
