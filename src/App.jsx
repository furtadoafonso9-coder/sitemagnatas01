import React, { useState, useEffect } from 'react';
import { 
  Shield, Users, LogIn, LogOut, Clock, XCircle, Shirt, Radio, BookOpen, Send, Settings, Plus, Trash2, Award, Star, AlertCircle, UserX, Crown
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
  const [cargosCustom, setCargosCustom] = useState([]);

  // Estados para moderação e criação
  const [novaRoupa, setNovaRoupa] = useState({ nome: '', top: '', calcas: '', mascara: '', imagem: '' });
  const [novaRadio, setNovaRadio] = useState({ canal: '', freq: '' });
  const [novaRegra, setNovaRegra] = useState('');
  const [novoCargoNome, setNovoCargoNome] = useState('');
  const [novaCategoriaCargo, setNovaCategoriaCargo] = useState('Cargos Administrativos e Staff');

  // Categorias base de cargos
  const categoriasBase = [
    "Cargos Administrativos e Staff", 
    "Membros e Comunidade", 
    "Cargos de Moderação e Punições", 
    "Bots e Integrações", 
    "Outros / Autorizações"
  ];

  const cargosPadrao = [
    { categoria: "Cargos Administrativos e Staff", cargos: ["Staff ATHOS PvP", "01 Founder´s", "01 Leader´s", "| Magnata 01! ©", "Resp. Manager´s", "01 Manager´s", "Suport", "Manager´s Approval", "Resp. Member´s"] },
    { categoria: "Membros e Comunidade", cargos: ["01 Member´s", "Server Booster´s", "01 Friend´s", "01 Visitant", "PVP Player", "Homem", "Mulher"] },
    { categoria: "Cargos de Moderação e Punições", cargos: ["Ban Temporário", "Ban Perma", "Muted", "Ausente", "Warning 1", "Warning 2", "Warning AFK"] },
    { categoria: "Bots e Integrações", cargos: ["Streamer"] },
    { categoria: "Outros / Autorizações", cargos: ["Conta ALT", "Autorização P/ Calças", "Autorização P/ Manga"] }
  ];

  const categoriasCargos = categoriasBase.map(cat => {
    const extrasDestaCat = cargosCustom.filter(c => c.categoria === cat).map(c => c.nome);
    const padraoDestaCat = cargosPadrao.find(p => p.categoria === cat)?.cargos || [];
    return {
      categoria: cat,
      cargos: [...padraoDestaCat, ...extrasDestaCat]
    };
  });

  const cargosDisponiveis = categoriasCargos.flatMap(cat => cat.cargos);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        const unsubscribeDoc = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (!data.roles && data.role) {
              data.roles = [data.role];
            } else if (!data.roles) {
              data.roles = ['01 Visitant'];
            }
            setUserData(data);
          } else {
            // Se o utilizador for novo, cria o documento base
            const defaultData = { 
              uid: currentUser.uid,
              email: currentUser.email,
              nome: currentUser.displayName || 'Membro',
              status: 'sem_candidatura', 
              roles: ['01 Visitant'],
              role: '01 Visitant'
            };
            setDoc(userRef, defaultData, { merge: true });
            setUserData(defaultData);
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
    try {
      const usersSnap = await getDocs(query(collection(db, 'users')));
      const usersList = [];
      usersSnap.forEach((d) => {
        const u = d.data();
        usersList.push({ id: d.id, ...u, roles: u.roles || (u.role ? [u.role] : ['01 Visitant']) });
      });
      setAllUsers(usersList);

      const roupasSnap = await getDocs(query(collection(db, 'roupas')));
      const roupasList = [];
      roupasSnap.forEach(d => roupasList.push({ id: d.id, ...d.data() }));
      setRoupas(roupasList);

      const radiosSnap = await getDocs(query(collection(db, 'radios')));
      const radiosList = [];
      radiosSnap.forEach(d => radiosList.push({ id: d.id, ...d.data() }));
      setRadios(radiosList);

      const regrasSnap = await getDocs(query(collection(db, 'regras')));
      const regrasList = [];
      regrasSnap.forEach(d => regrasList.push({ id: d.id, ...d.data() }));
      setRegras(regrasList);

      const cargosSnap = await getDocs(query(collection(db, 'cargosCustom')));
      const cargosList = [];
      cargosSnap.forEach(d => cargosList.push({ id: d.id, ...d.data() }));
      setCargosCustom(cargosList);
    } catch (e) {
      console.error("Erro ao carregar dados do Firestore:", e);
    }
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
      ...userData,
      uid: user.uid,
      email: user.email,
      nome: user.displayName || 'Membro',
      foto: user.photoURL || '',
      ...formData,
      status: 'pendente',
      roles: ['01 Visitant'],
      dataSubmissao: new Date().toISOString()
    };
    await setDoc(userRef, payload, { merge: true });
    setUserData(payload);
  };

  const atualizarStatusCandidato = async (targetUid, novoStatus, novosCargos = ['01 Member´s']) => {
    const userRef = doc(db, 'users', targetUid);
    await updateDoc(userRef, { status: novoStatus, roles: novosCargos, role: novosCargos[0] || '01 Member´s' });
    carregarDadosGang();
  };

  const alternarCargoMembro = async (targetUid, cargoTarget, userRolesAtual = []) => {
    let novasRoles = [...userRolesAtual];
    if (novasRoles.includes(cargoTarget)) {
      novasRoles = novasRoles.filter(c => c !== cargoTarget);
    } else {
      novasRoles.push(cargoTarget);
    }
    if (novasRoles.length === 0) novasRoles = ['01 Member´s'];
    const userRef = doc(db, 'users', targetUid);
    await updateDoc(userRef, { roles: novasRoles, role: novasRoles[0] });
    carregarDadosGang();
  };

  const alternarDestaqueMembro = async (targetUid, destaqueAtual) => {
    const userRef = doc(db, 'users', targetUid);
    await updateDoc(userRef, { emDestaque: !destaqueAtual });
    carregarDadosGang();
  };

  const adicionarRoupa = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'roupas'), novaRoupa);
    setNovaRoupa({ nome: '', top: '', calcas: '', mascara: '', imagem: '' });
    carregarDadosGang();
  };

  const apagarRoupa = async (id) => {
    await deleteDoc(doc(db, 'roupas', id));
    carregarDadosGang();
  };

  const adicionarRadio = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'radios'), novaRadio);
    setNovaRadio({ canal: '', freq: '' });
    carregarDadosGang();
  };

  const apagarRadio = async (id) => {
    await deleteDoc(doc(db, 'radios', id));
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

  const adicionarNovoCargo = async (e) => {
    e.preventDefault();
    if (!novoCargoNome.trim()) return;
    await addDoc(collection(db, 'cargosCustom'), { nome: novoCargoNome.trim(), categoria: novaCategoriaCargo });
    setNovoCargoNome('');
    carregarDadosGang();
  };

  const apagarCargoCustom = async (id) => {
    await deleteDoc(doc(db, 'cargosCustom', id));
    carregarDadosGang();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-red-600"></div>
      </div>
    );
  }

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

  if (!userData || userData.status === 'sem_candidatura') {
    return (
      <div className="min-h-screen bg-neutral-950 text-white p-6 flex justify-center items-center">
        <div className="max-w-2xl w-full bg-neutral-900 border border-neutral-800 p-8 rounded-2xl space-y-6 shadow-2xl">
          <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
            <h1 className="text-2xl font-black text-red-600">FORMULÁRIO DE CANDIDATURA</h1>
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

  if (userData?.status === 'pendente') {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-neutral-900 border border-amber-900/40 p-8 rounded-2xl text-center space-y-4">
          <Clock className="w-16 h-16 text-amber-500 mx-auto animate-pulse" />
          <h1 className="text-2xl font-black text-white">MAGNATAS 01!</h1>
          <p className="text-amber-400 font-bold">A tua candidatura está pendente.</p>
          <button onClick={handleLogout} className="text-xs text-neutral-500 hover:text-white underline pt-4">Sair da Conta</button>
        </div>
      </div>
    );
  }

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

  const userRoles = userData?.roles || (userData?.role ? [userData.role] : []);
  const isFounder = userRoles.some(r => ['Owner', '| Magnata 01! ©', '01 Founder´s', 'Founder'].includes(r));
  const isSuportOrAdmin = isFounder || userRoles.some(r => ['Suport', 'Staff ATHOS PvP', 'Resp. Manager´s', 'Manager´s Approval'].includes(r));

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      <header className="border-b border-red-900/40 bg-neutral-900/90 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Shield className="w-8 h-8 text-red-600" />
          <h1 className="text-2xl font-black tracking-wider text-red-600 uppercase">MAGNATAS 01!</h1>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex flex-wrap gap-1">
            {userRoles.map((r, i) => (
              <span key={i} className="bg-red-950/60 border border-red-900/50 px-2.5 py-1 rounded-full text-xs font-bold text-neutral-200 uppercase">{r}</span>
            ))}
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
          <button onClick={() => setActiveTab('cargos')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition ${activeTab === 'cargos' ? 'bg-red-600 text-white shadow-lg shadow-red-900/30' : 'hover:bg-neutral-800 text-neutral-400'}`}><Award className="w-5 h-5" /><span>Lista de Cargos</span></button>
          
          {isSuportOrAdmin && (
            <button onClick={() => setActiveTab('admin')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition ${activeTab === 'admin' ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/30' : 'hover:bg-neutral-800 text-amber-500'}`}><Settings className="w-5 h-5" /><span>Painel Admin & Suporte</span></button>
          )}
        </aside>

        <main className="flex-1 p-8 space-y-6 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <div className="bg-gradient-to-r from-neutral-900 to-neutral-900/50 border border-red-900/30 rounded-2xl p-8 shadow-xl">
                <h2 className="text-3xl font-black mb-2 text-white">CENTRAL PRIVADA — MAGNATAS 01!</h2>
                <p className="text-neutral-400">Plataforma oficial operacional. Consulta abaixo o estado de membros, líderes e punições.</p>
              </div>

              {/* Destaques */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-amber-400 flex items-center space-x-2 border-b border-neutral-800 pb-2">
                  <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                  <span>Players em Destaque</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {allUsers.filter(u => u.emDestaque).map(m => (
                    <div key={m.uid} className="bg-neutral-900 border border-amber-500/40 p-4 rounded-xl flex items-center space-x-4 shadow-lg">
                      <div className="w-12 h-12 rounded-full bg-amber-950 border border-amber-600 flex items-center justify-center font-bold text-amber-400 uppercase">{m.nome?.[0]}</div>
                      <div>
                        <h4 className="font-bold text-white">{m.nomeIngame || m.nome}</h4>
                        <p className="text-xs text-amber-400 font-semibold">{m.roles?.[0] || 'Membro'}</p>
                        <p className="text-xs text-neutral-500">ID: {m.idIngame || 'N/A'}</p>
                      </div>
                    </div>
                  ))}
                  {allUsers.filter(u => u.emDestaque).length === 0 && (
                    <p className="text-xs text-neutral-500 italic col-span-3">Nenhum jogador marcado em destaque de momento.</p>
                  )}
                </div>
              </div>

              {/* Líderes */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-red-500 border-b border-neutral-800 pb-2">Líderes e Fundadores</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {allUsers.filter(u => u.roles?.some(r => ['Owner', '| Magnata 01! ©', '01 Founder´s', '01 Leader´s'].includes(r))).map(m => (
                    <div key={m.uid} className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-full bg-red-950 border border-red-800 flex items-center justify-center font-bold text-red-500 uppercase">{m.nome?.[0]}</div>
                      <div>
                        <h4 className="font-bold text-white">{m.nomeIngame || m.nome}</h4>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {m.roles?.map((r, idx) => <span key={idx} className="text-[10px] bg-red-950 text-red-400 border border-red-900 px-1.5 py-0.5 rounded-md font-semibold">{r}</span>)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Membros Ativos */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-neutral-200 border-b border-neutral-800 pb-2">Membros Ativos</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {allUsers.filter(u => u.status === 'aprovado' && !u.roles?.some(r => ['Owner', '| Magnata 01! ©', '01 Founder´s', '01 Leader´s', 'Ausente', 'Ban Temporário', 'Ban Perma'].includes(r))).map(m => (
                    <div key={m.uid} className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center font-bold text-white uppercase">{m.nome?.[0]}</div>
                      <div>
                        <h4 className="font-bold text-white">{m.nomeIngame || m.nome}</h4>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {m.roles?.map((r, idx) => <span key={idx} className="text-[10px] bg-neutral-800 text-emerald-400 border border-neutral-700 px-1.5 py-0.5 rounded-md font-semibold">{r}</span>)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ausentes */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-amber-500 flex items-center space-x-2 border-b border-neutral-800 pb-2">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  <span>Membros em Ausência</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {allUsers.filter(u => u.roles?.includes('Ausente')).map(m => (
                    <div key={m.uid} className="bg-neutral-900 border border-amber-900/30 p-4 rounded-xl flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-full bg-amber-950 flex items-center justify-center font-bold text-amber-500 uppercase">{m.nome?.[0]}</div>
                      <div>
                        <h4 className="font-bold text-white">{m.nomeIngame || m.nome}</h4>
                        <span className="text-xs text-amber-500 font-bold">Ausente do Servidor</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Banidos */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-red-600 flex items-center space-x-2 border-b border-neutral-800 pb-2">
                  <UserX className="w-5 h-5 text-red-600" />
                  <span>Membros Banidos</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {allUsers.filter(u => u.roles?.some(r => ['Ban Temporário', 'Ban Perma'].includes(r))).map(m => (
                    <div key={m.uid} className="bg-neutral-900 border border-red-950 p-4 rounded-xl flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-full bg-red-950 flex items-center justify-center font-bold text-red-600 uppercase">{m.nome?.[0]}</div>
                      <div>
                        <h4 className="font-bold text-white">{m.nomeIngame || m.nome}</h4>
                        <span className="text-xs text-red-600 font-bold">{m.roles?.filter(r => r.includes('Ban')).join(', ')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'roupas' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-white">ROUPAS E UNIFORMES OFICIAIS</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {roupas.map(r => (
                  <div key={r.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-3 relative">
                    {isFounder && (
                      <button onClick={() => apagarRoupa(r.id)} className="absolute top-4 right-4 text-neutral-500 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                    )}
                    {r.imagem && (
                      <img src={r.imagem} alt={r.nome} className="w-full h-48 object-cover rounded-xl border border-neutral-800 mb-2" />
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

              {isFounder && (
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 mt-6">
                  <h3 className="text-lg font-bold text-white mb-4">Adicionar Nova Roupa / Kit</h3>
                  <form onSubmit={adicionarRoupa} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input required type="text" placeholder="Nome do Kit" value={novaRoupa.nome} onChange={e => setNovaRoupa({...novaRoupa, nome: e.target.value})} className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white text-sm outline-none" />
                    <input required type="text" placeholder="Link da Imagem (URL da foto)" value={novaRoupa.imagem} onChange={e => setNovaRoupa({...novaRoupa, imagem: e.target.value})} className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white text-sm outline-none" />
                    <input required type="text" placeholder="Top (Ex: ID 142)" value={novaRoupa.top} onChange={e => setNovaRoupa({...novaRoupa, top: e.target.value})} className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white text-sm outline-none" />
                    <input required type="text" placeholder="Calças (Ex: ID 35)" value={novaRoupa.calcas} onChange={e => setNovaRoupa({...novaRoupa, calcas: e.target.value})} className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white text-sm outline-none" />
                    <input required type="text" placeholder="Máscara (Ex: ID 22)" value={novaRoupa.mascara} onChange={e => setNovaRoupa({...novaRoupa, mascara: e.target.value})} className="md:col-span-2 bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white text-sm outline-none" />
                    <button type="submit" className="md:col-span-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl flex items-center justify-center space-x-2"><Plus className="w-5 h-5"/><span>Guardar Roupa com Foto</span></button>
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
                    <div className="flex items-center space-x-3">
                      <span className="font-mono bg-red-950 text-red-400 px-4 py-1.5 rounded-xl border border-red-900/50 font-bold">{rad.freq}</span>
                      {isFounder && (
                        <button onClick={() => apagarRadio(rad.id)} className="text-neutral-500 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {isFounder && (
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Adicionar Nova Frequência</h3>
                  <form onSubmit={adicionarRadio} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input required type="text" placeholder="Nome do Canal (Ex: Rádio Fuga)" value={novaRadio.canal} onChange={e => setNovaRadio({...novaRadio, canal: e.target.value})} className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white text-sm outline-none" />
                    <input required type="text" placeholder="Frequência (Ex: 101.5 MHz)" value={novaRadio.freq} onChange={e => setNovaRadio({...novaRadio, freq: e.target.value})} className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white text-sm outline-none" />
                    <button type="submit" className="md:col-span-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl flex items-center justify-center space-x-2"><Plus className="w-5 h-5"/><span>Guardar Frequência</span></button>
                  </form>
                </div>
              )}
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
                    {isFounder && (
                      <button onClick={() => apagarRegra(regra.id)} className="text-neutral-500 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                    )}
                  </div>
                ))}
              </div>

              {isFounder && (
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

          {activeTab === 'cargos' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-white">HIERARQUIA DE CARGOS DA GANG</h2>

              {isFounder && (
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4 shadow-xl">
                  <h3 className="text-lg font-bold text-red-500 flex items-center space-x-2">
                    <Plus className="w-5 h-5 bg-red-600 text-white rounded-md p-0.5" />
                    <span>Adicionar Novo Cargo</span>
                  </h3>
                  <form onSubmit={adicionarNovoCargo} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input required type="text" placeholder="Nome do Cargo..." value={novoCargoNome} onChange={e => setNovoCargoNome(e.target.value)} className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white text-sm outline-none" />
                    <select value={novaCategoriaCargo} onChange={e => setNovaCategoriaCargo(e.target.value)} className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white text-sm outline-none">
                      {categoriasBase.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl flex items-center justify-center space-x-2"><Plus className="w-5 h-5"/><span>Criar Cargo</span></button>
                  </form>
                </div>
              )}

              <div className="space-y-6">
                {categoriasCargos.map((cat, i) => (
                  <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
                    <h3 className="text-lg font-bold text-red-500 border-b border-neutral-800 pb-2">{cat.categoria}</h3>
                    <div className="flex flex-wrap gap-2">
                      {cat.cargos.map((c, j) => {
                        const customObj = cargosCustom.find(item => item.nome === c);
                        return (
                          <div key={j} className="bg-neutral-950 border border-neutral-800 text-neutral-200 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-2">
                            <span>{c}</span>
                            {isFounder && customObj && (
                              <button onClick={() => apagarCargoCustom(customObj.id)} className="text-neutral-500 hover:text-red-500 ml-1"><Trash2 className="w-3.5 h-3.5"/></button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'admin' && isSuportOrAdmin && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-amber-500">PAINEL ADMINISTRATIVO & GESTÃO DE MEMBROS</h2>
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-400">
                      <th className="pb-3">Utilizador</th>
                      <th className="pb-3">In-Game / Respostas</th>
                      <th className="pb-3">Estado</th>
                      <th className="pb-3">Destaque</th>
                      <th className="pb-3">Atribuir Cargos (Ativa/Desativa)</th>
                      <th className="pb-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {allUsers.map(u => (
                      <tr key={u.uid}>
                        <td className="py-4 font-bold text-white">{u.nome || u.email}</td>
                        <td className="py-4 text-neutral-300">
                          <div><span className="font-bold text-white">{u.nomeIngame || 'N/A'}</span> (ID: {u.idIngame || '-'})</div>
                          {u.motivo && <div className="text-xs text-neutral-500 italic mt-0.5">Motivo: "{u.motivo}"</div>}
                        </td>
                        <td className="py-4"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${u.status === 'aprovado' ? 'bg-emerald-950 text-emerald-400' : u.status === 'pendente' ? 'bg-amber-950 text-amber-400' : 'bg-red-950 text-red-400'}`}>{u.status}</span></td>
                        <td className="py-4">
                          <button onClick={() => alternarDestaqueMembro(u.uid, u.emDestaque)} className={`p-1.5 rounded-lg border ${u.emDestaque ? 'bg-amber-950 border-amber-500 text-amber-400' : 'bg-neutral-950 border-neutral-800 text-neutral-500 hover:text-white'}`}>
                            <Star className="w-4 h-4 fill-current" />
                          </button>
                        </td>
                        <td className="py-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {cargosDisponiveis.map(c => {
                              const ativo = u.roles?.includes(c);
                              return (
                                <button 
                                  key={c} 
                                  onClick={() => alternarCargoMembro(u.uid, c, u.roles)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${ativo ? 'bg-red-600 text-white border-red-500' : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-600'}`}
                                >
                                  {c}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                        <td className="py-4 text-right space-x-2">
                          {u.status === 'pendente' && (
                            <>
                              <button onClick={() => atualizarStatusCandidato(u.uid, 'aprovado', ['01 Member´s'])} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold">Aprovar</button>
                              <button onClick={() => atualizarStatusCandidato(u.uid, 'reprovado', ['01 Visitant'])} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold">Reprovar</button>
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
