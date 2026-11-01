import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  query, 
  orderBy,
  addDoc
} from 'firebase/firestore';

const ALL_ROLES = [
  { name: "HOMEM", color: "bg-emerald-900/60 border-emerald-500/40 text-emerald-300" },
  { name: "STREAMER", color: "bg-pink-900/60 border-pink-500/40 text-pink-300" },
  { name: "STAFF ATHOS PVP", color: "bg-blue-900/60 border-blue-500/40 text-blue-300" },
  { name: "SUPORT", color: "bg-cyan-900/60 border-cyan-500/40 text-cyan-300" },
  { name: "01 DEV", color: "bg-amber-900/60 border-amber-500/40 text-amber-300" },
  { name: "OWNER", color: "bg-purple-900/60 border-purple-500/40 text-purple-300" },
  { name: "MULHER", color: "bg-pink-950/80 border-pink-600/40 text-pink-400" },
  { name: "01 Founder´s", color: "bg-purple-950/80 border-purple-600/50 text-purple-300" },
  { name: "CONTA ALT", color: "bg-neutral-800 border-neutral-700 text-neutral-300" },
  { name: "01 Member´s", color: "bg-emerald-950 border-emerald-600/50 text-emerald-400" },
  { name: "01 Leader´s", color: "bg-amber-950 border-amber-600/50 text-amber-400" },
  { name: "Resp. Manager´s", color: "bg-blue-950 border-blue-600/50 text-blue-400" },
  { name: "Resp. Member´s", color: "bg-teal-950 border-teal-600/50 text-teal-400" },
  { name: "01 Visitant", color: "bg-amber-900/50 border-amber-700 text-amber-300" },
  { name: "PVP Player", color: "bg-teal-900/50 border-teal-700 text-teal-300" }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [userDoc, setUserDoc] = useState(null);
  const [currentView, setCurrentView] = useState('base');
  const [subTab, setSubTab] = useState('membros');

  const [isRegistering, setIsRegistering] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');

  const [usersList, setUsersList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('aprovado');
  const [roleFilter, setRoleFilter] = useState('todos');
  const [activeRoleModalUser, setActiveRoleModalUser] = useState(null);

  // Forms auxiliares
  const [formCandidatura, setFormCandidatura] = useState({ idade: '', nomeInGame: '', idInGame: '', killsAtual: '', tempoCidade: '', motivo: '' });
  const [formUpgrade, setFormUpgrade] = useState({ cargoDesejado: '', motivo: '' });
  const [formAutorizacao, setFormAutorizacao] = useState({ tipo: 'Calças', motivo: '' });

  useEffect(() => {
    const savedUser = localStorage.getItem('magnatas_email_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        fetchUserDocument(parsed.uid);
      } catch(e) {
        localStorage.removeItem('magnatas_email_user');
      }
    }
  }, []);

  const fetchUserDocument = async (uid) => {
    try {
      const userRef = doc(db, 'users', uid);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) setUserDoc(docSnap.data());
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (!user) return;

    const unsubUser = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) setUserDoc(snap.data());
    });
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      let list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setUsersList(list);
    });

    return () => {
      unsubUser(); unsubUsers();
    };
  }, [user]);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!emailInput || !passwordInput) return alert("Preenche todos os campos!");

    try {
      const cleanId = emailInput.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
      const userRef = doc(db, 'users', cleanId);
      const docSnap = await getDoc(userRef);

      if (isRegistering) {
        if (!usernameInput) return alert("Indica o nome de utilizador!");
        const newUser = {
          uid: cleanId,
          username: usernameInput.trim(),
          email: emailInput.trim(),
          password: passwordInput,
          avatar: "https://cdn.discordapp.com/embed/avatars/0.png",
          estado: 'pendente_candidatura',
          roles: ["01 Member´s", "HOMEM"],
          destacado: false
        };
        await setDoc(userRef, newUser);
        setUser(newUser); setUserDoc(newUser);
        localStorage.setItem('magnatas_email_user', JSON.stringify(newUser));
      } else {
        if (!docSnap.exists()) return alert("Conta não encontrada. Regista-te primeiro!");
        const data = docSnap.data();
        if (data.password && data.password !== passwordInput) return alert("Palavra-passe incorreta!");
        setUser(data); setUserDoc(data);
        localStorage.setItem('magnatas_email_user', JSON.stringify(data));
      }
    } catch (err) { alert("Erro de autenticação: " + err.message); }
  };

  const handleLogout = () => {
    localStorage.removeItem('magnatas_email_user');
    setUser(null); setUserDoc(null);
  };

  const userRoles = userDoc?.roles || [];
  const isFounder = userRoles.includes("01 Founder´s") || userRoles.includes("OWNER");
  const isSupport = isFounder || userRoles.includes("SUPORT") || userRoles.includes("01 Leader´s");

  const handleSubmitCandidatura = async (e) => {
    e.preventDefault();
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, { ...formCandidatura, estado: 'pendente_analise' });
    alert("Candidatura submetida com sucesso!");
  };

  const handleToggleDestaque = async (targetId, estadoAtual) => {
    const userRef = doc(db, 'users', targetId);
    await updateDoc(userRef, { destacado: !estadoAtual });
  };

  const handleToggleRole = async (targetId, roleName) => {
    const target = usersList.find(u => u.id === targetId);
    if (!target) return;
    let roles = target.roles || [];
    let updated = roles.includes(roleName) ? roles.filter(r => r !== roleName) : [...roles, roleName];
    await updateDoc(doc(db, 'users', targetId), { roles: updated });
  };

  const handlePedirUpgrade = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'pedidosUpgrade'), {
      uid: user.uid,
      username: user.username,
      nomeInGame: userDoc?.nomeInGame || user.username,
      cargoDesejado: formUpgrade.cargoDesejado,
      motivo: formUpgrade.motivo,
      data: new Date().toLocaleDateString()
    });
    alert("Pedido de upgrade submetido com sucesso!");
    setFormUpgrade({ cargoDesejado: '', motivo: '' });
  };

  const handlePedirAutorizacao = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'autorizacoes'), {
      uid: user.uid,
      username: user.username,
      tipo: formAutorizacao.tipo,
      motivo: formAutorizacao.motivo,
      status: 'pendente',
      data: new Date().toLocaleDateString()
    });
    alert("Pedido de autorização enviado!");
    setFormAutorizacao({ tipo: 'Calças', motivo: '' });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0b0d] text-gray-100 flex flex-col justify-center items-center p-6 font-sans">
        <div className="max-w-md w-full bg-[#121418] border border-neutral-800 rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-red-600/10 border border-red-600/30 text-red-500 rounded-2xl mx-auto flex items-center justify-center text-3xl font-black">🛡️</div>
            <h1 className="text-2xl font-black tracking-wider text-white">MAGNATAS 01!</h1>
            <p className="text-xs text-red-500 uppercase font-bold">Portal de Acesso Oficial</p>
          </div>
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {isRegistering && (
              <input type="text" placeholder="Nome de Utilizador" value={usernameInput} onChange={e => setUsernameInput(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white" required />
            )}
            <input type="email" placeholder="E-mail" value={emailInput} onChange={e => setEmailInput(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white" required />
            <input type="password" placeholder="Palavra-passe" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white" required />
            <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold py-3.5 rounded-xl text-xs uppercase shadow-lg transition">
              {isRegistering ? 'Criar Conta' : 'Iniciar Sessão'}
            </button>
          </form>
          <div className="text-center">
            <button type="button" onClick={() => setIsRegistering(!isRegistering)} className="text-xs text-neutral-400 hover:text-red-500 font-semibold cursor-pointer">
              {isRegistering ? 'Já tens conta? Iniciar Sessão' : 'Criar nova conta'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (userDoc?.estado === 'pendente_candidatura') {
    return (
      <div className="min-h-screen bg-[#0a0b0d] text-gray-100 p-6 flex items-center justify-center">
        <div className="max-w-xl w-full bg-[#121418] border border-neutral-800 rounded-2xl p-8 space-y-6">
          <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
            <h1 className="text-xl font-black text-white">FORMULÁRIO DE CANDIDATURA</h1>
            <button onClick={handleLogout} className="text-xs bg-red-950 text-red-400 px-3 py-1.5 rounded-xl">Sair</button>
          </div>
          <form onSubmit={handleSubmitCandidatura} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input type="text" placeholder="Idade" value={formCandidatura.idade} onChange={e => setFormCandidatura({...formCandidatura, idade: e.target.value})} className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white" required />
              <input type="text" placeholder="Nome In-Game" value={formCandidatura.nomeInGame} onChange={e => setFormCandidatura({...formCandidatura, nomeInGame: e.target.value})} className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white" required />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <input type="number" placeholder="ID In-Game" value={formCandidatura.idInGame} onChange={e => setFormCandidatura({...formCandidatura, idInGame: e.target.value})} className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white" required />
              <input type="number" placeholder="Kills Atuais" value={formCandidatura.killsAtual} onChange={e => setFormCandidatura({...formCandidatura, killsAtual: e.target.value})} className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white" />
              <input type="text" placeholder="Tempo de Cidade" value={formCandidatura.tempoCidade} onChange={e => setFormCandidatura({...formCandidatura, tempoCidade: e.target.value})} className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white" />
            </div>
            <textarea placeholder="Motivo de entrada..." value={formCandidatura.motivo} onChange={e => setFormCandidatura({...formCandidatura, motivo: e.target.value})} className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white h-24" required></textarea>
            <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold py-3.5 rounded-xl text-xs uppercase">Submeter Candidatura</button>
          </form>
        </div>
      </div>
    );
  }

  const filteredUsers = usersList.filter(m => {
    const matchesSearch = (m.nomeInGame || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (m.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          String(m.idInGame || '').includes(searchQuery);
    const matchesStatus = statusFilter === 'todos' || m.estado === statusFilter;
    const matchesRole = roleFilter === 'todos' || (m.roles || []).includes(roleFilter);
    return matchesSearch && matchesStatus && matchesRole;
  });

  return (
    <div className="min-h-screen bg-[#0d0e12] text-gray-200 font-sans flex relative">
      {/* SIDEBAR COM TODAS AS ABAS */}
      <aside className="w-64 bg-[#121418] border-r border-neutral-800/80 flex flex-col justify-between hidden md:flex sticky top-0 h-screen z-20">
        <div>
          <div className="p-5 border-b border-neutral-800/60 flex items-center gap-3">
            <div className="w-8 h-8 bg-red-600/20 border border-red-600/40 rounded-xl flex items-center justify-center font-black text-red-500 shadow-lg">🛡️</div>
            <h2 className="text-lg font-black tracking-wider text-red-600">MAGNATAS 01!</h2>
          </div>
          <nav className="p-3 space-y-1 text-xs font-bold">
            <button onClick={() => setCurrentView('base')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition ${currentView === 'base' ? 'bg-red-600/10 text-red-500 font-extrabold' : 'text-neutral-400 hover:bg-neutral-900/50'}`}>
              <span>👥</span> Base da Gang
            </button>
            <button onClick={() => setCurrentView('avisos')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition ${currentView === 'avisos' ? 'bg-red-600/10 text-red-500 font-extrabold' : 'text-neutral-400 hover:bg-neutral-900/50'}`}>
              <span>🔔</span> Avisos Gerais da Gang
            </button>
            <button onClick={() => setCurrentView('roupas')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition ${currentView === 'roupas' ? 'bg-red-600/10 text-red-500 font-extrabold' : 'text-neutral-400 hover:bg-neutral-900/50'}`}>
              <span>👕</span> Roupas & Kits
            </button>
            <button onClick={() => setCurrentView('radio')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition ${currentView === 'radio' ? 'bg-red-600/10 text-red-500 font-extrabold' : 'text-neutral-400 hover:bg-neutral-900/50'}`}>
              <span>📡</span> Frequências Rádio
            </button>
            <button onClick={() => setCurrentView('regras')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition ${currentView === 'regras' ? 'bg-red-600/10 text-red-500 font-extrabold' : 'text-neutral-400 hover:bg-neutral-900/50'}`}>
              <span>📖</span> Regras Oficiais
            </button>
            <button onClick={() => setCurrentView('cargos')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition ${currentView === 'cargos' ? 'bg-red-600/10 text-red-500 font-extrabold' : 'text-neutral-400 hover:bg-neutral-900/50'}`}>
              <span>🎖️</span> Lista de Cargos
            </button>
            <button onClick={() => setCurrentView('upgrade')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition ${currentView === 'upgrade' ? 'bg-red-600/10 text-red-500 font-extrabold' : 'text-neutral-400 hover:bg-neutral-900/50'}`}>
              <span>⭐</span> Pedir Upgrade / Promoção
            </button>
            <button onClick={() => setCurrentView('autorizacoes')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition ${currentView === 'autorizacoes' ? 'bg-red-600/10 text-red-500 font-extrabold' : 'text-neutral-400 hover:bg-neutral-900/50'}`}>
              <span>🎽</span> Autorizações (Calças/Manga)
            </button>
            <button onClick={() => setCurrentView('meusavisos')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition ${currentView === 'meusavisos' ? 'bg-red-600/10 text-red-500 font-extrabold' : 'text-neutral-400 hover:bg-neutral-900/50'}`}>
              <span>⚠️</span> Meus Avisos / Punições
            </button>
            <button onClick={() => setCurrentView('discord')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition ${currentView === 'discord' ? 'bg-red-600/10 text-red-500 font-extrabold' : 'text-neutral-400 hover:bg-neutral-900/50'}`}>
              <span>💬</span> Discord da Gang
            </button>
            <button onClick={() => setCurrentView('perfil')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition ${currentView === 'perfil' ? 'bg-red-600/10 text-red-500 font-extrabold' : 'text-neutral-400 hover:bg-neutral-900/50'}`}>
              <span>👤</span> Meu Perfil & Discord
            </button>
          </nav>
        </div>

        <div className="p-3">
          <button onClick={() => setCurrentView('admin')} className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-black py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition">
            <span>⚙️</span> Painel Admin & Suporte
          </button>
        </div>
      </aside>

      {/* ÁREA DE CONTEÚDO */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-neutral-800/80 bg-[#121418] px-8 flex justify-between items-center sticky top-0 z-30">
          <h1 className="font-black text-sm uppercase tracking-wider text-red-600">MAGNATAS 01!</h1>
          <div className="flex items-center gap-2">
            <div className="flex flex-wrap gap-1.5 items-center">
              {ALL_ROLES.slice(0, 8).map(role => (
                <span key={role.name} className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase ${role.color}`}>
                  {role.name}
                </span>
              ))}
            </div>
            <button onClick={handleLogout} className="ml-4 text-neutral-500 hover:text-red-500 text-sm font-bold">🚪</button>
          </div>
        </header>

        <main className="p-8 space-y-6 flex-1 overflow-y-auto">
          {/* BASE DA GANG: APENAS LISTAGEM DE MEMBROS E ESTRELINHA DE DESTAQUE */}
          {currentView === 'base' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <button onClick={() => setSubTab('membros')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition ${subTab === 'membros' ? 'bg-red-600 text-white shadow-lg shadow-red-600/30' : 'bg-[#121418] text-neutral-400 border border-neutral-800'}`}>
                  <span>👥</span> Gestão Geral de Membros
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-[#121418] border border-neutral-800/80 p-5 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-950/60 text-emerald-400 rounded-xl flex items-center justify-center text-xl">👥</div>
                  <div>
                    <p className="text-[10px] font-extrabold text-neutral-400 uppercase">Membros Ativos</p>
                    <h3 className="text-2xl font-black text-white">{usersList.filter(u => u.estado === 'aprovado').length}</h3>
                  </div>
                </div>
                <div className="bg-[#121418] border border-neutral-800/80 p-5 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-950/60 text-amber-400 rounded-xl flex items-center justify-center text-xl">⏳</div>
                  <div>
                    <p className="text-[10px] font-extrabold text-neutral-400 uppercase">Pendentes</p>
                    <h3 className="text-2xl font-black text-white">{usersList.filter(u => u.estado === 'pendente_analise').length}</h3>
                  </div>
                </div>
                <div className="bg-[#121418] border border-neutral-800/80 p-5 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-950/60 text-red-400 rounded-xl flex items-center justify-center text-xl">❗</div>
                  <div>
                    <p className="text-[10px] font-extrabold text-neutral-400 uppercase">Warnings Ativos</p>
                    <h3 className="text-2xl font-black text-white">0</h3>
                  </div>
                </div>
                <div className="bg-[#121418] border border-neutral-800/80 p-5 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-950/60 text-purple-400 rounded-xl flex items-center justify-center text-xl">👑</div>
                  <div>
                    <p className="text-[10px] font-extrabold text-neutral-400 uppercase">Founders / Staff</p>
                    <h3 className="text-2xl font-black text-white">{usersList.filter(u => (u.roles || []).some(r => r.includes('Founder') || r.includes('STAFF'))).length || 1}</h3>
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-3 items-center">
                <input 
                  type="text"
                  placeholder="Pesquisar por Nome In-Game, ID, Motivo..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1 bg-[#121418] border border-neutral-800/80 px-4 py-3 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-600"
                />
              </div>

              <div className="bg-[#121418] border border-neutral-800/80 rounded-2xl overflow-hidden shadow-2xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-400 bg-neutral-900/30">
                      <th className="p-4 w-10 text-center"><input type="checkbox" className="rounded border-neutral-800 bg-neutral-900" /></th>
                      <th className="p-4">Membro</th>
                      <th className="p-4">ID / Idade</th>
                      <th className="p-4">Discord</th>
                      <th className="p-4">Estado</th>
                      <th className="p-4">Cargos Atribuídos</th>
                      <th className="p-4 text-right">Destaque</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60">
                    {filteredUsers.map(m => (
                      <tr key={m.id} className="hover:bg-neutral-900/40">
                        <td className="p-4 text-center"><input type="checkbox" className="rounded border-neutral-800 bg-neutral-900" /></td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-red-950 border border-red-700 flex items-center justify-center font-bold text-white text-xs">
                              {(m.nomeInGame || m.username || 'M')[0].toUpperCase()}
                            </div>
                            <div>
                              <span className="font-black text-white uppercase text-xs flex items-center gap-1">
                                {m.nomeInGame || m.username}
                                {m.destacado && <span title="Membro Destacado">⭐</span>}
                              </span>
                              <span className="text-[10px] text-neutral-400">@{m.username}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-neutral-300">ID: <strong className="text-white">{m.idInGame || 'N/A'}</strong> | {m.idade || '18'} anos</td>
                        <td className="p-4 text-indigo-400 font-medium">@{m.username}</td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase bg-emerald-950 text-emerald-400 border border-emerald-700">
                            {m.estado || 'aprovado'}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {(m.roles || ["01 Member´s"]).map(r => {
                              const roleObj = ALL_ROLES.find(ar => ar.name === r);
                              return (
                                <span key={r} className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${roleObj ? roleObj.color : 'bg-emerald-950 border-emerald-600 text-emerald-400'}`}>
                                  {r}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <button 
                            onClick={() => handleToggleDestaque(m.id, m.destacado)} 
                            className={`p-2 rounded-lg border text-sm transition ${m.destacado ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : 'bg-neutral-900 text-neutral-600 border-neutral-800 hover:text-amber-400'}`}
                            title="Destacar Membro"
                          >
                            ⭐
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PAINEL ADMIN: GESTÃO DE CARGOS E CANDIDATURAS PENDENTES */}
          {currentView === 'admin' && (
            <div className="space-y-6">
              <h2 className="text-xl font-black text-amber-500">⚙️ Painel de Gestão & Controlo de Cargos</h2>

              <div className="bg-[#121418] border border-neutral-800/80 rounded-2xl overflow-visible shadow-2xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-400 bg-neutral-900/30">
                      <th className="p-4">Membro</th>
                      <th className="p-4">Cargos Atuais</th>
                      <th className="p-4 text-center">Atribuir / Remover Cargos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60">
                    {usersList.map(m => (
                      <tr key={m.id} className="hover:bg-neutral-900/40">
                        <td className="p-4 font-bold text-white">{m.nomeInGame || m.username} (@{m.username})</td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {(m.roles || []).map(r => (
                              <span key={r} className="px-2 py-0.5 rounded bg-neutral-900 text-[10px] text-neutral-300 border border-neutral-800">{r}</span>
                            ))}
                          </div>
                        </td>
                        <td className="p-4 text-center relative">
                          <button onClick={() => setActiveRoleModalUser(activeRoleModalUser === m.id ? null : m.id)} className="bg-amber-600/20 border border-amber-600/40 text-amber-300 px-3 py-1.5 rounded-lg text-[11px] font-bold hover:bg-amber-600/30">
                            + Gerir Cargos (Discord 💬)
                          </button>
                          {activeRoleModalUser === m.id && (
                            <div className="absolute right-10 top-12 w-60 bg-[#16191f] border border-neutral-700 rounded-xl p-3 shadow-2xl z-50 text-left space-y-1.5 max-h-56 overflow-y-auto">
                              {ALL_ROLES.map(r => {
                                const has = (m.roles || []).includes(r.name);
                                return (
                                  <button key={r.name} onClick={() => handleToggleRole(m.id, r.name)} className={`w-full text-left px-2.5 py-1.5 rounded text-[10px] font-bold flex justify-between items-center ${has ? 'bg-red-600/20 text-red-400 border border-red-600/40' : 'text-neutral-400 hover:bg-neutral-800'}`}>
                                    <span>{r.name}</span><span>{has ? '✓' : '+'}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PEDIR UPGRADE / PROMOÇÃO */}
          {currentView === 'upgrade' && (
            <div className="max-w-xl mx-auto bg-[#121418] border border-neutral-800 p-8 rounded-2xl space-y-6">
              <h2 className="text-xl font-black text-white flex items-center gap-2">⭐ Pedir Upgrade / Promoção</h2>
              <form onSubmit={handlePedirUpgrade} className="space-y-4">
                <div>
                  <label className="text-xs text-neutral-400 font-bold block mb-1">Cargo Pretendido</label>
                  <select value={formUpgrade.cargoDesejado} onChange={e => setFormUpgrade({...formUpgrade, cargoDesejado: e.target.value})} className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white" required>
                    <option value="">Seleciona o cargo...</option>
                    {ALL_ROLES.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-neutral-400 font-bold block mb-1">Motivo do Pedido</label>
                  <textarea value={formUpgrade.motivo} onChange={e => setFormUpgrade({...formUpgrade, motivo: e.target.value})} placeholder="Explica porque mereces a promoção..." className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white h-28" required></textarea>
                </div>
                <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold py-3.5 rounded-xl text-xs uppercase">Submeter Pedido</button>
              </form>
            </div>
          )}

          {/* AUTORIZAÇÕES (CALÇAS / MANGA) */}
          {currentView === 'autorizacoes' && (
            <div className="max-w-xl mx-auto bg-[#121418] border border-neutral-800 p-8 rounded-2xl space-y-6">
              <h2 className="text-xl font-black text-white flex items-center gap-2">🎽 Autorizações (Calças/Manga)</h2>
              <form onSubmit={handlePedirAutorizacao} className="space-y-4">
                <div>
                  <label className="text-xs text-neutral-400 font-bold block mb-1">Tipo de Autorização</label>
                  <select value={formAutorizacao.tipo} onChange={e => setFormAutorizacao({...formAutorizacao, tipo: e.target.value})} className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white">
                    <option value="Calças">Autorização P/ Calças</option>
                    <option value="Manga">Autorização P/ Manga</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-neutral-400 font-bold block mb-1">Justificação</label>
                  <textarea value={formAutorizacao.motivo} onChange={e => setFormAutorizacao({...formAutorizacao, motivo: e.target.value})} placeholder="Motivo do pedido..." className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white h-24" required></textarea>
                </div>
                <button type="submit" className="w-full bg-red-600 text-white font-extrabold py-3.5 rounded-xl text-xs uppercase">Enviar Pedido</button>
              </form>
            </div>
          )}

          {/* MEUS AVISOS / PUNIÇÕES */}
          {currentView === 'meusavisos' && (
            <div className="bg-[#121418] border border-neutral-800 p-8 rounded-2xl space-y-4">
              <h2 className="text-xl font-black text-white flex items-center gap-2">⚠️ Meus Avisos / Punições</h2>
              <div className="p-4 bg-emerald-950/40 border border-emerald-900/60 rounded-xl text-emerald-400 text-xs font-bold">
                ✓ Não tens avisos ou punições registadas na tua conta. Mantém o bom comportamento!
              </div>
            </div>
          )}

          {/* DISCORD DA GANG */}
          {currentView === 'discord' && (
            <div className="bg-[#121418] border border-neutral-800 p-8 rounded-2xl space-y-4 text-center max-w-lg mx-auto">
              <div className="w-16 h-16 bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 rounded-2xl mx-auto flex items-center justify-center text-3xl">💬</div>
              <h2 className="text-xl font-black text-white">Servidor Discord Oficial</h2>
              <p className="text-xs text-neutral-400">Junta-te à nossa comunidade no Discord para estares a par de todos os anúncios e formações de ação.</p>
              <button onClick={() => window.open('https://discord.gg', '_blank')} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3.5 rounded-xl text-xs uppercase">Entrar no Discord</button>
            </div>
          )}

          {/* MEU PERFIL & DISCORD */}
          {currentView === 'perfil' && (
            <div className="max-w-lg mx-auto bg-[#121418] border border-neutral-800 p-8 rounded-2xl space-y-6">
              <div className="flex items-center gap-4 border-b border-neutral-800 pb-6">
                <img src={userDoc?.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"} className="w-16 h-16 rounded-full border-2 border-red-600" />
                <div>
                  <h3 className="text-lg font-black text-white">{userDoc?.nomeInGame || user.username}</h3>
                  <p className="text-xs text-neutral-400">@{user.username}</p>
                  <p className="text-[10px] text-red-500 font-bold mt-1">{user.email}</p>
                </div>
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between p-3 bg-neutral-900 rounded-xl">
                  <span className="text-neutral-400">ID In-Game:</span>
                  <strong className="text-white">{userDoc?.idInGame || 'N/A'}</strong>
                </div>
                <div className="flex justify-between p-3 bg-neutral-900 rounded-xl">
                  <span className="text-neutral-400">Estado da Candidatura:</span>
                  <strong className="text-emerald-400 uppercase">{userDoc?.estado || 'aprovado'}</strong>
                </div>
              </div>
            </div>
          )}

          {currentView === 'avisos' && <div className="text-white text-sm bg-[#121418] p-6 rounded-2xl border border-neutral-800">Avisos Gerais da Gang ativos.</div>}
          {currentView === 'roupas' && <div className="text-white text-sm bg-[#121418] p-6 rounded-2xl border border-neutral-800">Catálogo de Roupas & Kits ativo.</div>}
          {currentView === 'radio' && <div className="text-white text-sm bg-[#121418] p-6 rounded-2xl border border-neutral-800">Frequências de Rádio ativas.</div>}
          {currentView === 'regras' && <div className="text-white text-sm bg-[#121418] p-6 rounded-2xl border border-neutral-800">Regras Oficiais ativas.</div>}
          {currentView === 'cargos' && <div className="text-white text-sm bg-[#121418] p-6 rounded-2xl border border-neutral-800">Lista de Cargos ativa.</div>}

        </main>
      </div>
    </div>
  );
}
