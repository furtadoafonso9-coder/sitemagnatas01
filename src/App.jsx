import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  addDoc, 
  deleteDoc, 
  query, 
  orderBy 
} from 'firebase/firestore';

const ALL_ROLES = [
  { name: "Staff ATHOS PvP", category: "staff" },
  { name: "01 Founder´s", category: "staff", founder: true, admin: true },
  { name: "01 Leader´s", category: "staff", leader: true, admin: true },
  { name: "Magnata 01! ©", category: "staff", admin: true },
  { name: "Resp. Manager´s", category: "staff", manager: true, admin: true },
  { name: "01 Manager´s", category: "staff", manager: true, admin: true },
  { name: "Suport", category: "staff", support: true },
  { name: "Manager´s Approval", category: "staff", support: true },
  { name: "Resp. Member´s", category: "staff", support: true },
  
  { name: "01 Member´s", category: "membros" },
  { name: "Server Booster´s", category: "membros" },
  { name: "01 Friend´s", category: "membros" },
  { name: "01 Visitant", category: "membros" },
  { name: "PVP Player", category: "membros" },
  { name: "Homem", category: "membros" },
  { name: "Mulher", category: "membros" },

  { name: "Ban Temporário", category: "punicoes" },
  { name: "Ban Perma", category: "punicoes" },
  { name: "Muted", category: "punicoes" },
  { name: "Ausente", category: "punicoes" },
  { name: "Warning 1", category: "punicoes" },
  { name: "Warning 2", category: "punicoes" },
  { name: "Warning AFK", category: "punicoes" },

  { name: "Streamer", category: "outros" },
  { name: "Conta ALT", category: "outros" },
  { name: "Autorização P/ Calças", category: "outros" },
  { name: "Autorização P/ Manga", category: "outros" }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [userDoc, setUserDoc] = useState(null);
  const [currentView, setCurrentView] = useState('base');
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');

  const [usersList, setUsersList] = useState([]);
  const [roupas, setRoupas] = useState([]);
  const [radios, setRadios] = useState({ principal: { frequencia: '100.0', info: 'Rádio Principal' }, alternativa: { frequencia: '105.5', info: 'Rádio Alternativa' } });
  const [regras, setRegras] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [formCandidatura, setFormCandidatura] = useState({
    idade: '',
    nomeInGame: '',
    idInGame: '',
    killsAtual: '',
    tempoCidade: '',
    motivo: ''
  });

  const [formRoupa, setFormRoupa] = useState({ nome: '', numero: '', imagem: '' });
  const [formRegra, setFormRegra] = useState({ categoria: 'Gerais', titulo: '', descricao: '', ordem: 1 });
  const [editingRadio, setEditingRadio] = useState({ freq: '', info: '' });

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
    const unsubRoupas = onSnapshot(collection(db, 'roupas'), (snap) => {
      let r = [];
      snap.forEach(d => r.push({ id: d.id, ...d.data() }));
      setRoupas(r);
    });
    const unsubRadios = onSnapshot(collection(db, 'config'), (snap) => {
      snap.forEach(d => { if (d.id === 'radios') setRadios(d.data()); });
    });
    const qRegras = query(collection(db, 'regras'), orderBy('ordem', 'asc'));
    const unsubRegras = onSnapshot(qRegras, (snap) => {
      let reg = [];
      snap.forEach(d => reg.push({ id: d.id, ...d.data() }));
      setRegras(reg);
    });
    const qLogs = query(collection(db, 'logs'), orderBy('timestamp', 'desc'));
    const unsubLogs = onSnapshot(qLogs, (snap) => {
      let l = [];
      snap.forEach(d => l.push({ id: d.id, ...d.data() }));
      setAuditLogs(l);
    });

    return () => {
      unsubUser(); unsubUsers(); unsubRoupas(); unsubRadios(); unsubRegras(); unsubLogs();
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
          roles: ['01 Visitant'],
          createdAt: new Date().toISOString()
        };
        await setDoc(userRef, newUser);
        setUser(newUser); setUserDoc(newUser);
        localStorage.setItem('magnatas_email_user', JSON.stringify(newUser));
        alert("Conta criada com sucesso!");
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

  const addAuditLog = async (acao, detalhe) => {
    try {
      await addDoc(collection(db, 'logs'), {
        autorId: user.uid,
        autorName: user.username,
        acao,
        detalhe,
        timestamp: new Date().toISOString()
      });
    } catch(e) { console.error(e); }
  };

  const userRoles = userDoc?.roles || [];
  const isFounder = userRoles.includes("01 Founder´s");
  const isLeader = isFounder || userRoles.includes("01 Leader´s");
  const isManager = isLeader || userRoles.includes("01 Manager´s") || userRoles.includes("Resp. Manager´s");
  const isSupport = isManager || userRoles.includes("Suport") || userRoles.includes("Manager´s Approval");

  const handleSubmitCandidatura = async (e) => {
    e.preventDefault();
    if (!formCandidatura.nomeInGame || !formCandidatura.idInGame || !formCandidatura.motivo) {
      return alert("Preenche os campos obrigatórios!");
    }
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, { ...formCandidatura, estado: 'pendente_analise', dataCandidatura: new Date().toISOString() });
    alert("Candidatura submetida com sucesso!");
  };

  const handleAprovarCandidatura = async (targetUser) => {
    const userRef = doc(db, 'users', targetUser.id);
    const updatedRoles = Array.from(new Set([...(targetUser.roles || []), "01 Member´s"]));
    await updateDoc(userRef, { estado: 'aprovado', roles: updatedRoles });
    await addAuditLog("Aprovação", `Aprovou a candidatura de ${targetUser.username}`);
  };

  const handleReprovarCandidatura = async (targetUser) => {
    const userRef = doc(db, 'users', targetUser.id);
    await updateDoc(userRef, { estado: 'rejeitado' });
    await addAuditLog("Reprovação", `Reprovou a candidatura de ${targetUser.username}`);
  };

  const handleTentarNovamente = async () => {
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, { estado: 'pendente_candidatura', nomeInGame: '', idInGame: '', motivo: '' });
  };

  const handleToggleRole = async (targetId, roleName) => {
    if (!isSupport) return alert("Sem permissões.");
    const target = usersList.find(u => u.id === targetId);
    if (!target) return;
    let roles = target.roles || [];
    let updated = roles.includes(roleName) ? roles.filter(r => r !== roleName) : [...roles, roleName];
    await updateDoc(doc(db, 'users', targetId), { roles: updated });
    await addAuditLog("Gestão de Cargos", `Alterou cargos de ${target.username}`);
  };

  const handleAddRoupa = async (e) => {
    e.preventDefault();
    if (!isFounder) return alert("Apenas o Founder.");
    await addDoc(collection(db, 'roupas'), { ...formRoupa, criadoPor: user.username });
    setFormRoupa({ nome: '', numero: '', imagem: '' });
    await addAuditLog("Roupas", `Adicionou roupa: ${formRoupa.nome}`);
  };

  const handleDeleteRoupa = async (id, nome) => {
    if (!isFounder) return;
    await deleteDoc(doc(db, 'roupas', id));
    await addAuditLog("Roupas", `Removeu roupa: ${nome}`);
  };

  const handleSaveRadio = async (tipo) => {
    if (!isFounder) return;
    const newRadios = { ...radios, [tipo]: { frequencia: editingRadio.freq || radios[tipo].frequencia, info: editingRadio.info || radios[tipo].info } };
    await setDoc(doc(db, 'config', 'radios'), newRadios);
    await addAuditLog("Rádio", `Atualizou rádio ${tipo}`);
    alert("Rádio atualizada!");
  };

  const handleAddRegra = async (e) => {
    e.preventDefault();
    if (!isFounder) return;
    await addDoc(collection(db, 'regras'), { ...formRegra, ordem: Number(formRegra.ordem) });
    setFormRegra({ categoria: 'Gerais', titulo: '', descricao: '', ordem: regras.length + 1 });
    await addAuditLog("Regras", `Adicionou regra: ${formRegra.titulo}`);
  };

  const handleDeleteRegra = async (id, titulo) => {
    if (!isFounder) return;
    await deleteDoc(doc(db, 'regras', id));
    await addAuditLog("Regras", `Removeu regra: ${titulo}`);
  };

  // Ecrã Autenticação
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0d0f12] text-gray-100 flex flex-col justify-center items-center p-6 font-sans">
        <div className="max-w-md w-full bg-[#15181e] border border-neutral-800 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-red-600/10 border border-red-600/30 text-red-500 rounded-2xl mx-auto flex items-center justify-center text-3xl font-black">🛡️</div>
            <h1 className="text-2xl font-black text-white">MAGNATAS 01!</h1>
            <p className="text-xs text-red-500 uppercase font-bold">Portal de Acesso por E-mail</p>
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
              {isRegistering ? 'Já tens conta? Iniciar Sessão' : 'Não tens conta? Criar Registo'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (userDoc?.estado === 'pendente_candidatura') {
    return (
      <div className="min-h-screen bg-[#0d0f12] text-gray-100 p-6 flex items-center justify-center">
        <div className="max-w-xl w-full bg-[#15181e] border border-neutral-800 rounded-3xl p-8 space-y-6">
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

  if (userDoc?.estado === 'pendente_analise') {
    return (
      <div className="min-h-screen bg-[#0d0f12] text-gray-100 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#15181e] border border-neutral-800 rounded-3xl p-8 text-center space-y-6">
          <div className="text-3xl">⏳</div>
          <h1 className="text-2xl font-black text-white">MAGNATAS 01!</h1>
          <p className="text-sm font-bold text-amber-400">A tua candidatura está pendente. Aguarda análise.</p>
          <button onClick={handleLogout} className="text-xs bg-neutral-900 text-neutral-400 px-4 py-2 rounded-xl">Sair</button>
        </div>
      </div>
    );
  }

  if (userDoc?.estado === 'rejeitado') {
    return (
      <div className="min-h-screen bg-[#0d0f12] text-gray-100 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#15181e] border border-neutral-800 rounded-3xl p-8 text-center space-y-6">
          <div className="text-3xl">❌</div>
          <h1 className="text-2xl font-black text-white">Candidatura Reprovada</h1>
          <button onClick={handleTentarNovamente} className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold py-3.5 rounded-xl text-xs uppercase">Tentar Novamente</button>
        </div>
      </div>
    );
  }

  // Dashboard Completo Estilizado
  return (
    <div className="min-h-screen bg-[#0d0f12] text-gray-200 font-sans flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#15181e] border-r border-neutral-800 flex flex-col justify-between hidden md:flex sticky top-0 h-screen z-20">
        <div>
          <div className="p-6 border-b border-neutral-800 flex items-center gap-3">
            <span className="text-red-500 font-black text-lg">🛡️ MAGNATAS 01!</span>
          </div>
          <nav className="p-4 space-y-1 text-xs font-bold">
            <button onClick={() => setCurrentView('base')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${currentView === 'base' ? 'bg-red-600/10 text-red-500' : 'text-neutral-400'}`}>🏰 Gestão de Membros</button>
            <button onClick={() => setCurrentView('cargos')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${currentView === 'cargos' ? 'bg-red-600/10 text-red-500' : 'text-neutral-400'}`}>🎖️ Lista de Cargos</button>
            <button onClick={() => setCurrentView('roupas')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${currentView === 'roupas' ? 'bg-red-600/10 text-red-500' : 'text-neutral-400'}`}>👕 Roupas & Kits</button>
            <button onClick={() => setCurrentView('radio')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${currentView === 'radio' ? 'bg-red-600/10 text-red-500' : 'text-neutral-400'}`}>📻 Frequências Rádio</button>
            <button onClick={() => setCurrentView('regras')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${currentView === 'regras' ? 'bg-red-600/10 text-red-500' : 'text-neutral-400'}`}>📜 Regras Oficiais</button>
            {isSupport && <button onClick={() => setCurrentView('admin')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${currentView === 'admin' ? 'bg-amber-500/10 text-amber-400' : 'text-amber-500/70'}`}>⚙️ Painel Admin</button>}
          </nav>
        </div>
        <div className="p-4 border-t border-neutral-800 flex justify-between items-center">
          <span className="text-xs font-bold text-white truncate">{user.username}</span>
          <button onClick={handleLogout} className="text-neutral-400 hover:text-red-500 text-sm">🚪</button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-neutral-800 bg-[#15181e] px-8 flex justify-between items-center sticky top-0 z-10">
          <span className="font-extrabold text-xs uppercase tracking-wider text-red-500">PAINEL OFICIAL &bull; {currentView.toUpperCase()}</span>
          <div className="flex items-center gap-2 flex-wrap">
            {userRoles.map(r => (
              <span key={r} className="px-2 py-1 bg-neutral-900 border border-neutral-800 text-[10px] rounded-lg text-red-400 font-bold">{r}</span>
            ))}
          </div>
        </header>

        <main className="p-8 flex-1 overflow-y-auto space-y-6">
          {currentView === 'base' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-[#15181e] border border-neutral-800 p-4 rounded-2xl flex items-center gap-4">
                  <div className="p-3 bg-red-600/10 text-red-500 rounded-xl">👥</div>
                  <div><p className="text-[10px] text-neutral-400 font-bold uppercase">Membros Ativos</p><h3 className="text-xl font-black text-white">{usersList.filter(u => u.estado === 'aprovado').length}</h3></div>
                </div>
                <div className="bg-[#15181e] border border-neutral-800 p-4 rounded-2xl flex items-center gap-4">
                  <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">⏳</div>
                  <div><p className="text-[10px] text-neutral-400 font-bold uppercase">Pendentes</p><h3 className="text-xl font-black text-white">{usersList.filter(u => u.estado === 'pendente_analise').length}</h3></div>
                </div>
                <div className="bg-[#15181e] border border-neutral-800 p-4 rounded-2xl flex items-center gap-4">
                  <div className="p-3 bg-red-500/10 text-red-400 rounded-xl">⚠️</div>
                  <div><p className="text-[10px] text-neutral-400 font-bold uppercase">Total Registados</p><h3 className="text-xl font-black text-white">{usersList.length}</h3></div>
                </div>
                <div className="bg-[#15181e] border border-neutral-800 p-4 rounded-2xl flex items-center gap-4">
                  <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl">👑</div>
                  <div><p className="text-[10px] text-neutral-400 font-bold uppercase">Staff / Founders</p><h3 className="text-xl font-black text-white">{usersList.filter(u => (u.roles || []).some(r => r.includes('Founder') || r.includes('Leader'))).length}</h3></div>
                </div>
              </div>

              <input 
                type="text" 
                placeholder="Pesquisar por Nome In-Game, ID ou Nome..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#15181e] border border-neutral-800 p-3 rounded-2xl text-xs text-white focus:outline-none focus:border-red-600"
              />

              <div className="bg-[#15181e] border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-400 bg-neutral-900/40">
                      <th className="p-4">Membro</th>
                      <th className="p-4">ID / Idade</th>
                      <th className="p-4">Estado</th>
                      <th className="p-4">Cargos Atribuídos</th>
                      <th className="p-4 text-right">Gestão de Cargos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60">
                    {usersList.filter(m => 
                      (m.username || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                      (m.nomeInGame || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                      String(m.idInGame || '').includes(searchQuery)
                    ).map(m => (
                      <tr key={m.id} className="hover:bg-neutral-900/20">
                        <td className="p-4 flex items-center gap-3">
                          <img src={m.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"} className="w-8 h-8 rounded-full border border-neutral-700" />
                          <div>
                            <span className="font-bold text-white block">{m.nomeInGame || m.username}</span>
                            <span className="text-[10px] text-neutral-400 font-bold">@{m.username}</span>
                          </div>
                        </td>
                        <td className="p-4 text-neutral-300">ID: <strong className="text-red-400">{m.idInGame || 'N/A'}</strong> | {m.idade || 'N/A'}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                            m.estado === 'aprovado' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' :
                            m.estado === 'pendente_analise' ? 'bg-amber-950 text-amber-400 border border-amber-900' : 'bg-red-950 text-red-400 border border-red-900'
                          }`}>{m.estado}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {(m.roles || ['01 Visitant']).map(r => (
                              <span key={r} className="px-2 py-0.5 rounded bg-neutral-900 text-[10px] text-neutral-300 border border-neutral-800">{r}</span>
                            ))}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          {isSupport && (
                            <div className="flex justify-end gap-1 flex-wrap max-w-xs">
                              {ALL_ROLES.map(role => {
                                const has = (m.roles || []).includes(role.name);
                                return (
                                  <button 
                                    key={role.name} 
                                    onClick={() => handleToggleRole(m.id, role.name)}
                                    className={`text-[9px] px-2 py-1 rounded border ${has ? 'bg-red-950 text-red-300 border-red-800' : 'bg-neutral-900 text-neutral-500 border-neutral-800'}`}
                                  >
                                    {has ? '✓ ' : '+ '}{role.name}
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

          {currentView === 'cargos' && (
            <div className="space-y-4">
              <h2 className="text-xl font-black text-white">Estrutura de Cargos Oficiais</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {ALL_ROLES.map(role => (
                  <div key={role.name} className="bg-[#15181e] border border-neutral-800 p-4 rounded-2xl flex justify-between items-center">
                    <span className="text-xs font-bold text-white">{role.name}</span>
                    <span className="text-[10px] bg-neutral-900 px-2 py-1 rounded text-neutral-400">
                      {usersList.filter(u => (u.roles || []).includes(role.name)).length} membros
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentView === 'roupas' && (
            <div className="space-y-6">
              <h2 className="text-xl font-black text-white">Roupas & Kits Oficiais</h2>
              {isFounder && (
                <form onSubmit={handleAddRoupa} className="bg-[#15181e] border border-neutral-800 p-6 rounded-2xl space-y-4">
                  <h3 className="text-xs font-black text-red-500 uppercase">Adicionar Roupa</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input type="text" placeholder="Nome" value={formRoupa.nome} onChange={e => setFormRoupa({...formRoupa, nome: e.target.value})} className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white" required />
                    <input type="text" placeholder="Número" value={formRoupa.numero} onChange={e => setFormRoupa({...formRoupa, numero: e.target.value})} className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white" required />
                    <input type="url" placeholder="Link Imagem" value={formRoupa.imagem} onChange={e => setFormRoupa({...formRoupa, imagem: e.target.value})} className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white" required />
                  </div>
                  <button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-extrabold px-6 py-2 rounded-xl text-xs uppercase">Adicionar</button>
                </form>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {roupas.map(item => (
                  <div key={item.id} className="bg-[#15181e] border border-neutral-800 rounded-2xl overflow-hidden space-y-3 shadow-lg">
                    <img src={item.imagem} className="w-full h-48 object-cover" />
                    <div className="p-4 space-y-2">
                      <h4 className="font-black text-white text-sm">{item.nome} — #{item.numero}</h4>
                      {isFounder && <button onClick={() => handleDeleteRoupa(item.id, item.nome)} className="text-xs bg-red-950 text-red-400 px-3 py-1 rounded">Remover</button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentView === 'radio' && (
            <div className="space-y-6">
              <h2 className="text-xl font-black text-white">Frequências de Rádio</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#15181e] border border-neutral-800 p-6 rounded-2xl space-y-4">
                  <h3 className="text-sm font-black text-red-500 uppercase">Principal: {radios.principal?.frequencia} MHz</h3>
                  <p className="text-xs text-neutral-400">{radios.principal?.info}</p>
                  {isFounder && (
                    <div className="space-y-2 pt-2">
                      <input type="text" placeholder="Nova Frequência" onChange={e => setEditingRadio({...editingRadio, freq: e.target.value})} className="w-full bg-neutral-900 border border-neutral-800 p-2 rounded text-xs text-white" />
                      <button onClick={() => handleSaveRadio('principal')} className="bg-red-600 text-white px-4 py-2 rounded text-xs">Atualizar</button>
                    </div>
                  )}
                </div>
                <div className="bg-[#15181e] border border-neutral-800 p-6 rounded-2xl space-y-4">
                  <h3 className="text-sm font-black text-amber-500 uppercase">Alternativa: {radios.alternativa?.frequencia} MHz</h3>
                  <p className="text-xs text-neutral-400">{radios.alternativa?.info}</p>
                  {isFounder && (
                    <div className="space-y-2 pt-2">
                      <input type="text" placeholder="Nova Frequência" onChange={e => setEditingRadio({...editingRadio, freq: e.target.value})} className="w-full bg-neutral-900 border border-neutral-800 p-2 rounded text-xs text-white" />
                      <button onClick={() => handleSaveRadio('alternativa')} className="bg-amber-600 text-white px-4 py-2 rounded text-xs">Atualizar</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentView === 'regras' && (
            <div className="space-y-6">
              <h2 className="text-xl font-black text-white">Regras Oficiais</h2>
              {isFounder && (
                <form onSubmit={handleAddRegra} className="bg-[#15181e] border border-neutral-800 p-6 rounded-2xl space-y-4">
                  <h3 className="text-xs font-black text-red-500 uppercase">Adicionar Regra</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <input type="text" placeholder="Título" value={formRegra.titulo} onChange={e => setFormRegra({...formRegra, titulo: e.target.value})} className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white" required />
                    <input type="text" placeholder="Categoria" value={formRegra.categoria} onChange={e => setFormRegra({...formRegra, categoria: e.target.value})} className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white" required />
                    <input type="number" placeholder="Ordem" value={formRegra.ordem} onChange={e => setFormRegra({...formRegra, ordem: e.target.value})} className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white" required />
                  </div>
                  <textarea placeholder="Descrição" value={formRegra.descricao} onChange={e => setFormRegra({...formRegra, descricao: e.target.value})} className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white h-20" required></textarea>
                  <button type="submit" className="bg-red-600 text-white px-6 py-2 rounded text-xs">Publicar Regra</button>
                </form>
              )}
              <div className="space-y-4">
                {regras.map((r, i) => (
                  <div key={r.id} className="bg-[#15181e] border border-neutral-800 p-6 rounded-2xl space-y-2">
                    <div className="flex justify-between">
                      <h4 className="font-black text-white text-sm">#{i+1}. {r.titulo}</h4>
                      {isFounder && <button onClick={() => handleDeleteRegra(r.id, r.titulo)} className="text-red-500 text-xs">🗑️</button>}
                    </div>
                    <p className="text-xs text-neutral-400">{r.descricao}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentView === 'admin' && isSupport && (
            <div className="space-y-6">
              <h2 className="text-xl font-black text-amber-500">Painel Administrativo</h2>
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase text-amber-400">Candidaturas Pendentes</h3>
                {usersList.filter(u => u.estado === 'pendente_analise').map(c => (
                  <div key={c.id} className="bg-[#15181e] border border-neutral-800 p-6 rounded-2xl flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-white">{c.username} — {c.nomeInGame} (ID: {c.idInGame})</h4>
                      <p className="text-xs text-neutral-400 mt-1">Motivo: {c.motivo}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleAprovarCandidatura(c)} className="bg-emerald-600 text-white px-4 py-2 rounded text-xs font-bold">Aprovar</button>
                      <button onClick={() => handleReprovarCandidatura(c)} className="bg-red-600 text-white px-4 py-2 rounded text-xs font-bold">Reprovar</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
