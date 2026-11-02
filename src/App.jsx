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
  addDoc,
  deleteDoc
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
  const [subTabBase, setSubTabBase] = useState('ativos');
  const [adminTab, setAdminTab] = useState('candidaturas');

  const [isRegistering, setIsRegistering] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');

  const [usersList, setUsersList] = useState([]);
  const [roupas, setRoupas] = useState([]);
  const [regras, setRegras] = useState([]);
  const [radiosList, setRadiosList] = useState([]);
  const [logsList, setLogsList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRoleModalUser, setActiveRoleModalUser] = useState(null);

  // Forms
  const [formCandidatura, setFormCandidatura] = useState({ idade: '', nomeInGame: '', idInGame: '', killsAtual: '', tempoCidade: '', motivo: '' });
  const [formPerfil, setFormPerfil] = useState({ avatar: '', biografia: '' });
  const [formRoupa, setFormRoupa] = useState({ nome: '', numero: '', imagem: '' });
  const [formRegra, setFormRegra] = useState({ titulo: '', descricao: '', ordem: 1 });
  const [formRadio, setFormRadio] = useState({ titulo: '', frequencia: '', info: '' });
  const [formPunicao, setFormPunicao] = useState({ targetUserId: '', tipo: 'Warning 1', tempo: '', motivo: '' });

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
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserDoc(data);
        setFormPerfil({ avatar: data.avatar || '', biografia: data.biografia || '' });
      }
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
    const unsubRadios = onSnapshot(collection(db, 'radios'), (snap) => {
      let rads = [];
      snap.forEach(d => rads.push({ id: d.id, ...d.data() }));
      setRadiosList(rads);
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
      setLogsList(l);
    });

    return () => {
      unsubUser(); unsubUsers(); unsubRoupas(); unsubRadios(); unsubRegras(); unsubLogs();
    };
  }, [user]);

  const addLog = async (acao, detalhe) => {
    try {
      await addDoc(collection(db, 'logs'), {
        autor: user.username,
        acao,
        detalhe,
        timestamp: new Date().toLocaleString()
      });
    } catch(e) { console.error(e); }
  };

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
          biografia: "Sem biografia definida.",
          estado: 'pendente_candidatura',
          roles: ["01 Member´s", "HOMEM"],
          destacado: false,
          ausente: false,
          punicoes: []
        };
        await setDoc(userRef, newUser);
        setUser(newUser); setUserDoc(newUser);
        localStorage.setItem('magnatas_email_user', JSON.stringify(newUser));
      } else {
        if (!docSnap.exists()) return alert("Conta não encontrada!");
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
  const isSupport = isFounder || userRoles.includes("SUPORT") || userRoles.includes("01 Leader´s") || userRoles.includes("01 DEV") || userRoles.includes("STAFF ATHOS PVP");

  const handleFileUpload = (e, callback) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => callback(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // Perfil
  const handleSavePerfil = async (e) => {
    e.preventDefault();
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      avatar: formPerfil.avatar || userDoc?.avatar,
      biografia: formPerfil.biografia
    });
    alert("Perfil atualizado com sucesso!");
  };

  // Candidatura
  const handleSubmitCandidatura = async (e) => {
    e.preventDefault();
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, { ...formCandidatura, estado: 'pendente_analise' });
    alert("Candidatura submetida!");
  };

  const handleAprovarCandidatura = async (targetUser) => {
    await updateDoc(doc(db, 'users', targetUser.id), { estado: 'aprovado' });
    await addLog("Aprovação", `Aprovou a candidatura de ${targetUser.username}`);
  };

  const handleReprovarCandidatura = async (targetUser) => {
    await updateDoc(doc(db, 'users', targetUser.id), { estado: 'rejeitado' });
    await addLog("Reprovação", `Reprovou a candidatura de ${targetUser.username}`);
  };

  // Roupas
  const handleAddRoupa = async (e) => {
    e.preventDefault();
    if (!isFounder) return alert("Apenas o Owner/Founder pode adicionar roupas!");
    await addDoc(collection(db, 'roupas'), formRoupa);
    setFormRoupa({ nome: '', numero: '', imagem: '' });
    await addLog("Roupas", `Adicionou kit ${formRoupa.nome}`);
  };

  const handleDeleteRoupa = async (id) => {
    if (!isFounder) return;
    await deleteDoc(doc(db, 'roupas', id));
  };

  // Rádio
  const handleAddRadio = async (e) => {
    e.preventDefault();
    if (!isFounder) return;
    await addDoc(collection(db, 'radios'), formRadio);
    setFormRadio({ titulo: '', frequencia: '', info: '' });
    await addLog("Rádio", `Adicionou/Editar rádio ${formRadio.titulo}`);
  };

  const handleDeleteRadio = async (id) => {
    if (!isFounder) return;
    await deleteDoc(doc(db, 'radios', id));
    await addLog("Rádio", "Eliminou uma frequência de rádio");
  };

  // Regras
  const handleAddRegra = async (e) => {
    e.preventDefault();
    if (!isFounder) return;
    await addDoc(collection(db, 'regras'), { ...formRegra, ordem: Number(formRegra.ordem) });
    setFormRegra({ titulo: '', descricao: '', ordem: regras.length + 1 });
    await addLog("Regras", `Adicionou a regra: ${formRegra.titulo}`);
  };

  const handleDeleteRegra = async (id) => {
    if (!isFounder) return;
    await deleteDoc(doc(db, 'regras', id));
  };

  // Punições & Revogações
  const handleAplicarPunicao = async (e) => {
    e.preventDefault();
    if (!formPunicao.targetUserId) return alert("Seleciona um membro!");
    const target = usersList.find(u => u.id === formPunicao.targetUserId);
    if (!target) return;

    const novaPunicao = {
      id: Date.now(),
      tipo: formPunicao.tipo,
      tempo: formPunicao.tempo,
      motivo: formPunicao.motivo,
      aplicadoPor: user.username,
      data: new Date().toLocaleDateString()
    };

    const punicoesAtuais = target.punicoes || [];
    let novoEstado = target.estado;
    if (formPunicao.tipo.includes("Ban")) novoEstado = "banido";

    await updateDoc(doc(db, 'users', target.id), {
      punicoes: [...punicoesAtuais, novaPunicao],
      estado: novoEstado
    });

    alert("Punição aplicada com sucesso!");
    await addLog("Punição", `Aplicou ${formPunicao.tipo} a ${target.username}`);
    setFormPunicao({ targetUserId: '', tipo: 'Warning 1', tempo: '', motivo: '' });
  };

  const handleRevogarBan = async (targetUser) => {
    if (!isSupport) return;
    await updateDoc(doc(db, 'users', targetUser.id), { estado: 'aprovado' });
    alert(`O banimento de ${targetUser.username} foi revogado!`);
    await addLog("Unban", `Revogou o banimento de ${targetUser.username}`);
  };

  const handleToggleRole = async (targetId, roleName) => {
    const target = usersList.find(u => u.id === targetId);
    if (!target) return;
    let roles = target.roles || [];
    let updated = roles.includes(roleName) ? roles.filter(r => r !== roleName) : [...roles, roleName];
    await updateDoc(doc(db, 'users', targetId), { roles: updated });
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

  const membrosBase = usersList.filter(m => {
    const matchesSearch = (m.nomeInGame || '').toLowerCase().includes(searchQuery.toLowerCase()) || (m.username || '').toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (subTabBase === 'ativos') return m.estado === 'aprovado' && !m.ausente;
    if (subTabBase === 'destaque') return m.destacado;
    if (subTabBase === 'ausentes') return m.ausente === true;
    if (subTabBase === 'banidos') return m.estado === 'banido' || m.estado === 'rejeitado';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#0d0e12] text-gray-200 font-sans flex relative">
      {/* SIDEBAR */}
      <aside className="w-64 bg-[#121418] border-r border-neutral-800/80 flex flex-col justify-between hidden md:flex sticky top-0 h-screen z-20">
        <div>
          <div className="p-5 border-b border-neutral-800/60 flex items-center gap-3">
            <div className="w-8 h-8 bg-red-600/20 border border-red-600/40 rounded-xl flex items-center justify-center font-black text-red-500 shadow-lg">🛡️</div>
            <h2 className="text-lg font-black tracking-wider text-red-600">MAGNATAS 01!</h2>
          </div>
          <nav className="p-3 space-y-1 text-xs font-bold">
            <button onClick={() => setCurrentView('base')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition ${currentView === 'base' ? 'bg-red-600/10 text-red-500 font-extrabold' : 'text-neutral-400 hover:bg-neutral-900/50'}`}><span>👥</span> Base da Gang</button>
            <button onClick={() => setCurrentView('roupas')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition ${currentView === 'roupas' ? 'bg-red-600/10 text-red-500 font-extrabold' : 'text-neutral-400 hover:bg-neutral-900/50'}`}><span>👕</span> Roupas & Kits</button>
            <button onClick={() => setCurrentView('radio')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition ${currentView === 'radio' ? 'bg-red-600/10 text-red-500 font-extrabold' : 'text-neutral-400 hover:bg-neutral-900/50'}`}><span>📡</span> Frequências Rádio</button>
            <button onClick={() => setCurrentView('regras')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition ${currentView === 'regras' ? 'bg-red-600/10 text-red-500 font-extrabold' : 'text-neutral-400 hover:bg-neutral-900/50'}`}><span>📖</span> Regras Oficiais</button>
            <button onClick={() => setCurrentView('cargos')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition ${currentView === 'cargos' ? 'bg-red-600/10 text-red-500 font-extrabold' : 'text-neutral-400 hover:bg-neutral-900/50'}`}><span>🎖️</span> Lista de Cargos</button>
            <button onClick={() => setCurrentView('meusavisos')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition ${currentView === 'meusavisos' ? 'bg-red-600/10 text-red-500 font-extrabold' : 'text-neutral-400 hover:bg-neutral-900/50'}`}><span>⚠️</span> Meus Avisos / Punições</button>
            <button onClick={() => setCurrentView('perfil')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition ${currentView === 'perfil' ? 'bg-red-600/10 text-red-500 font-extrabold' : 'text-neutral-400 hover:bg-neutral-900/50'}`}><span>👤</span> Meu Perfil & Discord</button>
          </nav>
        </div>

        {isSupport && (
          <div className="p-3">
            <button onClick={() => setCurrentView('admin')} className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-black py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition">
              <span>⚙️</span> Painel Admin & Suporte
            </button>
          </div>
        )}
      </aside>

      {/* ÁREA DE CONTEÚDO */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-neutral-800/80 bg-[#121418] px-8 flex justify-between items-center sticky top-0 z-30">
          <h1 className="font-black text-sm uppercase tracking-wider text-red-600">MAGNATAS 01! &bull; {currentView.toUpperCase()}</h1>
          <button onClick={handleLogout} className="text-neutral-500 hover:text-red-500 text-sm font-bold">🚪 Sair</button>
        </header>

        <main className="p-8 space-y-6 flex-1 overflow-y-auto">

          {/* BASE DA GANG */}
          {currentView === 'base' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b border-neutral-800 pb-4">
                <button onClick={() => setSubTabBase('ativos')} className={`px-4 py-2 rounded-xl text-xs font-bold ${subTabBase === 'ativos' ? 'bg-red-600 text-white' : 'bg-neutral-900 text-neutral-400'}`}>👥 Ativos ({usersList.filter(u => u.estado === 'aprovado' && !u.ausente).length})</button>
                <button onClick={() => setSubTabBase('destaque')} className={`px-4 py-2 rounded-xl text-xs font-bold ${subTabBase === 'destaque' ? 'bg-amber-600 text-white' : 'bg-neutral-900 text-neutral-400'}`}>⭐ Em Destaque ({usersList.filter(u => u.destacado).length})</button>
                <button onClick={() => setSubTabBase('ausentes')} className={`px-4 py-2 rounded-xl text-xs font-bold ${subTabBase === 'ausentes' ? 'bg-purple-600 text-white' : 'bg-neutral-900 text-neutral-400'}`}>💤 Ausentes ({usersList.filter(u => u.ausente).length})</button>
                <button onClick={() => setSubTabBase('banidos')} className={`px-4 py-2 rounded-xl text-xs font-bold ${subTabBase === 'banidos' ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-neutral-900 text-neutral-400'}`}>🚫 Banidos ({usersList.filter(u => u.estado === 'banido' || u.estado === 'rejeitado').length})</button>
              </div>

              <input type="text" placeholder="Pesquisar membros..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-[#121418] border border-neutral-800 px-4 py-3 rounded-xl text-xs text-white" />

              <div className="bg-[#121418] border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-400 bg-neutral-900/30">
                      <th className="p-4">Membro</th>
                      <th className="p-4">ID In-Game</th>
                      <th className="p-4">Estado</th>
                      <th className="p-4">Cargos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60">
                    {membrosBase.map(m => (
                      <tr key={m.id} className="hover:bg-neutral-900/40">
                        <td className="p-4 flex items-center gap-3">
                          <img src={m.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"} className="w-8 h-8 rounded-full border border-neutral-700" />
                          <div>
                            <span className="font-black text-white block">{m.nomeInGame || m.username} {m.destacado && '⭐'}</span>
                            <span className="text-[10px] text-neutral-400">@{m.username}</span>
                          </div>
                        </td>
                        <td className="p-4 text-white font-bold">ID: {m.idInGame || 'N/A'}</td>
                        <td className="p-4"><span className="px-2.5 py-1 rounded text-[10px] uppercase font-bold bg-neutral-900 border border-neutral-700">{m.estado}</span></td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {(m.roles || []).map(r => <span key={r} className="px-2 py-0.5 rounded bg-neutral-900 text-[10px] text-neutral-300">{r}</span>)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ROUPAS & KITS */}
          {currentView === 'roupas' && (
            <div className="space-y-6">
              <h2 className="text-xl font-black text-white">Roupas & Kits Oficiais</h2>
              {isFounder && (
                <form onSubmit={handleAddRoupa} className="bg-[#121418] border border-neutral-800 p-6 rounded-2xl space-y-4">
                  <h3 className="text-xs font-black text-red-500 uppercase">Adicionar Novo Kit (Apenas Owner)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input type="text" placeholder="Nome do Kit / Roupa" value={formRoupa.nome} onChange={e => setFormRoupa({...formRoupa, nome: e.target.value})} className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white" required />
                    <input type="text" placeholder="Número no Vestuário (ex: #145)" value={formRoupa.numero} onChange={e => setFormRoupa({...formRoupa, numero: e.target.value})} className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white" required />
                    <input type="url" placeholder="Link da Imagem (URL)" value={formRoupa.imagem} onChange={e => setFormRoupa({...formRoupa, imagem: e.target.value})} className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white" />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-400 font-bold block mb-1">Ou carregar foto do Computador (PC):</label>
                    <input type="file" accept="image/*" onChange={e => handleFileUpload(e, (res) => setFormRoupa({...formRoupa, imagem: res}))} className="text-xs text-neutral-400 bg-neutral-900 p-2 rounded-xl w-full border border-neutral-800" />
                  </div>
                  <button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs uppercase">Guardar Kit</button>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {roupas.map(item => (
                  <div key={item.id} className="bg-[#121418] border border-neutral-800 rounded-2xl overflow-hidden shadow-xl space-y-3 relative group">
                    <img src={item.imagem || "https://cdn.discordapp.com/embed/avatars/0.png"} className="w-full h-48 object-cover" />
                    <div className="p-4 flex justify-between items-center">
                      <div>
                        <h4 className="font-black text-white text-sm">{item.nome}</h4>
                        <span className="inline-block bg-red-600/20 text-red-400 border border-red-600/40 text-xs font-black px-2.5 py-1 rounded-lg mt-1">
                          NÚMERO: #{item.numero}
                        </span>
                      </div>
                      {isFounder && <button onClick={() => handleDeleteRoupa(item.id)} className="text-xs bg-red-950 text-red-400 px-3 py-1.5 rounded-lg border border-red-900">Remover</button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FREQUÊNCIAS RÁDIO */}
          {currentView === 'radio' && (
            <div className="space-y-6">
              <h2 className="text-xl font-black text-white">Frequências Rádio</h2>
              {isFounder && (
                <form onSubmit={handleAddRadio} className="bg-[#121418] border border-neutral-800 p-6 rounded-2xl space-y-4 max-w-xl">
                  <h3 className="text-xs font-black text-amber-500 uppercase">Gerir Frequência Rádio (Adicionar / Editar)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="Título (ex: Rádio Principal)" value={formRadio.titulo} onChange={e => setFormRadio({...formRadio, titulo: e.target.value})} className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white" required />
                    <input type="text" placeholder="Frequência (ex: 100.0)" value={formRadio.frequencia} onChange={e => setFormRadio({...formRadio, frequencia: e.target.value})} className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white" required />
                  </div>
                  <input type="text" placeholder="Informação / Nota..." value={formRadio.info} onChange={e => setFormRadio({...formRadio, info: e.target.value})} className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white" required />
                  <button type="submit" className="bg-amber-600 text-white font-bold px-6 py-2.5 rounded-xl text-xs uppercase">Publicar / Atualizar Rádio</button>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {radiosList.map(rad => (
                  <div key={rad.id} className="bg-[#121418] border border-neutral-800 p-6 rounded-2xl flex justify-between items-start">
                    <div className="space-y-1">
                      <h3 className="text-sm font-black text-red-500 uppercase">{rad.titulo}: {rad.frequencia} MHz</h3>
                      <p className="text-xs text-neutral-400">{rad.info}</p>
                    </div>
                    {isFounder && (
                      <button onClick={() => handleDeleteRadio(rad.id)} className="text-xs bg-red-950 text-red-400 px-3 py-1.5 rounded-lg border border-red-900">
                        Eliminar
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* REGRAS OFICIAIS */}
          {currentView === 'regras' && (
            <div className="space-y-6">
              <h2 className="text-xl font-black text-white">Regras Oficiais do Servidor</h2>
              {isFounder && (
                <form onSubmit={handleAddRegra} className="bg-[#121418] border border-neutral-800 p-6 rounded-2xl space-y-4">
                  <h3 className="text-xs font-black text-red-500 uppercase">Adicionar Nova Regra (Apenas Owner)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="Título da Regra" value={formRegra.titulo} onChange={e => setFormRegra({...formRegra, titulo: e.target.value})} className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white" required />
                    <input type="number" placeholder="Ordem de Exibição" value={formRegra.ordem} onChange={e => setFormRegra({...formRegra, ordem: e.target.value})} className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white" required />
                  </div>
                  <textarea placeholder="Descrição detalhada da regra..." value={formRegra.descricao} onChange={e => setFormRegra({...formRegra, descricao: e.target.value})} className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white h-24" required></textarea>
                  <button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs uppercase">Publicar Regra</button>
                </form>
              )}

              <div className="space-y-4">
                {regras.map((r, i) => (
                  <div key={r.id} className="bg-[#121418] border border-neutral-800 p-6 rounded-2xl flex justify-between items-start space-x-4">
                    <div className="space-y-1">
                      <h4 className="font-black text-white text-sm">#{i+1}. {r.titulo}</h4>
                      <p className="text-xs text-neutral-300 leading-relaxed">{r.descricao}</p>
                    </div>
                    {isFounder && (
                      <button onClick={() => handleDeleteRegra(r.id)} className="text-xs bg-red-950 text-red-400 px-3 py-1.5 rounded-lg border border-red-900 shrink-0">
                        Remover
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LISTA DE CARGOS */}
          {currentView === 'cargos' && (
            <div className="space-y-6">
              <h2 className="text-xl font-black text-white">Lista Completa de Cargos do Servidor</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {ALL_ROLES.map(role => (
                  <div key={role.name} className="bg-[#121418] border border-neutral-800 p-5 rounded-2xl flex justify-between items-center">
                    <span className={`px-3 py-1 rounded-lg text-xs font-black border uppercase ${role.color}`}>{role.name}</span>
                    <span className="text-xs bg-neutral-900 px-3 py-1 rounded-full text-neutral-400 font-bold">
                      {usersList.filter(u => (u.roles || []).includes(role.name)).length} membros
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MEUS AVISOS / PUNIÇÕES */}
          {currentView === 'meusavisos' && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <h2 className="text-xl font-black text-white flex items-center gap-2">⚠️ Meus Avisos / Histórico de Punições</h2>
              
              {userDoc?.punicoes && userDoc.punicoes.length > 0 ? (
                <div className="space-y-4">
                  {userDoc.punicoes.map((p, idx) => (
                    <div key={idx} className="bg-[#121418] border border-red-900/60 p-6 rounded-2xl space-y-2">
                      <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
                        <span className="text-xs font-black text-red-500 uppercase">{p.tipo}</span>
                        <span className="text-[10px] text-neutral-500">{p.data}</span>
                      </div>
                      <p className="text-xs text-neutral-300"><strong>Motivo:</strong> {p.motivo}</p>
                      <p className="text-xs text-neutral-400"><strong>Duração:</strong> {p.tempo || 'N/A'}</p>
                      <p className="text-[10px] text-neutral-500">Aplicado por: {p.aplicadoPor}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 bg-emerald-950/40 border border-emerald-900/60 rounded-2xl text-emerald-400 text-xs font-bold text-center">
                  ✓ Excelente! Não tens avisos ou punições registadas no teu perfil.
                </div>
              )}
            </div>
          )}

          {/* MEU PERFIL & DISCORD */}
          {currentView === 'perfil' && (
            <div className="max-w-xl mx-auto bg-[#121418] border border-neutral-800 p-8 rounded-2xl space-y-6">
              <div className="flex items-center gap-4 border-b border-neutral-800 pb-6">
                <img src={formPerfil.avatar || userDoc?.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"} className="w-16 h-16 rounded-full border-2 border-red-600 object-cover" />
                <div>
                  <h3 className="text-lg font-black text-white">{userDoc?.nomeInGame || user.username}</h3>
                  <p className="text-xs text-neutral-400">@{user.username}</p>
                  <p className="text-[10px] text-red-500 font-bold mt-1">{user.email}</p>
                </div>
              </div>

              <form onSubmit={handleSavePerfil} className="space-y-4">
                <div>
                  <label className="text-xs text-neutral-400 font-bold block mb-1">URL do Avatar (Link de Imagem):</label>
                  <input type="url" placeholder="https://..." value={formPerfil.avatar} onChange={e => setFormPerfil({...formPerfil, avatar: e.target.value})} className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white" />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 font-bold block mb-1">Ou Carregar foto do Computador (PC):</label>
                  <input type="file" accept="image/*" onChange={e => handleFileUpload(e, (res) => setFormPerfil({...formPerfil, avatar: res}))} className="text-xs text-neutral-400 bg-neutral-900 p-2 rounded-xl w-full border border-neutral-800" />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 font-bold block mb-1">Biografia</label>
                  <textarea placeholder="Escreve a tua biografia..." value={formPerfil.biografia} onChange={e => setFormPerfil({...formPerfil, biografia: e.target.value})} className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white h-24"></textarea>
                </div>
                <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold py-3.5 rounded-xl text-xs uppercase">Guardar Alterações do Perfil</button>
              </form>
            </div>
          )}

          {/* PAINEL ADMIN COMPLETO */}
          {currentView === 'admin' && isSupport && (
            <div className="space-y-6">
              <div className="flex gap-2 border-b border-neutral-800 pb-4 overflow-x-auto">
                <button onClick={() => setAdminTab('candidaturas')} className={`px-4 py-2 rounded-xl text-xs font-bold ${adminTab === 'candidaturas' ? 'bg-amber-600 text-white' : 'bg-neutral-900 text-neutral-400'}`}>⏳ Candidaturas</button>
                <button onClick={() => setAdminTab('cargos')} className={`px-4 py-2 rounded-xl text-xs font-bold ${adminTab === 'cargos' ? 'bg-amber-600 text-white' : 'bg-neutral-900 text-neutral-400'}`}>🎖️ Gestão de Cargos</button>
                <button onClick={() => setAdminTab('punicoes')} className={`px-4 py-2 rounded-xl text-xs font-bold ${adminTab === 'punicoes' ? 'bg-red-600 text-white' : 'bg-neutral-900 text-neutral-400'}`}>⚠️ Aplicar Punições / Revogar Ban</button>
                <button onClick={() => setAdminTab('logs')} className={`px-4 py-2 rounded-xl text-xs font-bold ${adminTab === 'logs' ? 'bg-purple-600 text-white' : 'bg-neutral-900 text-neutral-400'}`}>📜 Logs</button>
              </div>

              {adminTab === 'candidaturas' && (
                <div className="space-y-4">
                  {usersList.filter(u => u.estado === 'pendente_analise').length === 0 ? (
                    <div className="bg-[#121418] border border-neutral-800 p-8 rounded-2xl text-center text-neutral-500 text-xs">Sem candidaturas pendentes.</div>
                  ) : (
                    usersList.filter(u => u.estado === 'pendente_analise').map(cand => (
                      <div key={cand.id} className="bg-[#121418] border border-amber-500/30 p-6 rounded-2xl flex justify-between items-center">
                        <div>
                          <h4 className="font-black text-white text-sm">{cand.username} (In-Game: {cand.nomeInGame || 'N/A'})</h4>
                          <p className="text-xs text-neutral-400 mt-1">ID: {cand.idInGame} | Idade: {cand.idade} | Motivo: {cand.motivo}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleAprovarCandidatura(cand)} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold">Aprovar</button>
                          <button onClick={() => handleReprovarCandidatura(cand)} className="bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-bold">Reprovar</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {adminTab === 'cargos' && (
                <div className="bg-[#121418] border border-neutral-800 rounded-2xl overflow-visible shadow-2xl">
                  <table className="w-full text-left text-xs">
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
                              {(m.roles || []).map(r => <span key={r} className="px-2 py-0.5 rounded bg-neutral-900 text-[10px] text-neutral-300">{r}</span>)}
                            </div>
                          </td>
                          <td className="p-4 text-center relative">
                            <button onClick={() => setActiveRoleModalUser(activeRoleModalUser === m.id ? null : m.id)} className="bg-amber-600/20 border border-amber-600/40 text-amber-300 px-3 py-1.5 rounded-lg text-[11px] font-bold">
                              + Gerir Cargos
                            </button>
                            {activeRoleModalUser === m.id && (
                              <div className="absolute right-10 top-12 w-60 bg-[#16191f] border border-neutral-700 rounded-xl p-3 shadow-2xl z-50 text-left space-y-1.5 max-h-56 overflow-y-auto">
                                {ALL_ROLES.map(r => {
                                  const has = (m.roles || []).includes(r.name);
                                  return (
                                    <button key={r.name} onClick={() => handleToggleRole(m.id, r.name)} className={`w-full text-left px-2.5 py-1.5 rounded text-[10px] font-bold flex justify-between ${has ? 'bg-red-600/20 text-red-400' : 'text-neutral-400 hover:bg-neutral-800'}`}>
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
              )}

              {/* GESTÃO DE PUNIÇÕES & REVOGAÇÃO DE BANIMENTOS */}
              {adminTab === 'punicoes' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <form onSubmit={handleAplicarPunicao} className="bg-[#121418] border border-neutral-800 p-8 rounded-2xl space-y-4">
                    <h3 className="text-sm font-black text-red-500 uppercase">Aplicar Punição a Membro</h3>
                    <select value={formPunicao.targetUserId} onChange={e => setFormPunicao({...formPunicao, targetUserId: e.target.value})} className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white" required>
                      <option value="">Seleciona o membro...</option>
                      {usersList.map(u => <option key={u.id} value={u.id}>{u.nomeInGame || u.username} (@{u.username})</option>)}
                    </select>
                    <select value={formPunicao.tipo} onChange={e => setFormPunicao({...formPunicao, tipo: e.target.value})} className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white">
                      <option value="Warning 1">Warning 1</option>
                      <option value="Warning 2">Warning 2</option>
                      <option value="Muted">Mute Temporário</option>
                      <option value="Ban Temporário">Ban Temporário</option>
                      <option value="Ban Perma">Ban Permanente</option>
                    </select>
                    <input type="text" placeholder="Duração (ex: 3 dias / Permanente)" value={formPunicao.tempo} onChange={e => setFormPunicao({...formPunicao, tempo: e.target.value})} className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white" required />
                    <textarea placeholder="Motivo da punição..." value={formPunicao.motivo} onChange={e => setFormPunicao({...formPunicao, motivo: e.target.value})} className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white h-24" required></textarea>
                    <button type="submit" className="w-full bg-red-600 text-white font-bold py-3.5 rounded-xl text-xs uppercase">Aplicar Punição</button>
                  </form>

                  {/* SUB-PAINEL DE REVOGAR BANIMENTOS (UNBAN) */}
                  <div className="bg-[#121418] border border-neutral-800 p-8 rounded-2xl space-y-4">
                    <h3 className="text-sm font-black text-emerald-400 uppercase">Revogar Banimentos (Unban)</h3>
                    <p className="text-xs text-neutral-400">Lista de utilizadores atualmente banidos ou rejeitados:</p>
                    
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {usersList.filter(u => u.estado === 'banido' || u.estado === 'rejeitado').length === 0 ? (
                        <div className="text-xs text-neutral-500 bg-neutral-900/60 p-4 rounded-xl text-center">Nenhum membro atualmente banido.</div>
                      ) : (
                        usersList.filter(u => u.estado === 'banido' || u.estado === 'rejeitado').map(banned => (
                          <div key={banned.id} className="bg-neutral-900 p-4 rounded-xl flex justify-between items-center border border-neutral-800">
                            <div>
                              <h4 className="font-bold text-white text-xs">{banned.nomeInGame || banned.username}</h4>
                              <span className="text-[10px] text-red-400 uppercase font-bold">Estado: {banned.estado}</span>
                            </div>
                            <button onClick={() => handleRevogarBan(banned)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg uppercase">
                              Revogar Ban
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {adminTab === 'logs' && (
                <div className="bg-[#121418] border border-neutral-800 p-6 rounded-2xl space-y-3 max-h-96 overflow-y-auto">
                  {logsList.map(l => (
                    <div key={l.id} className="text-xs p-3 bg-neutral-900/60 rounded-xl flex justify-between border border-neutral-800">
                      <div><strong className="text-red-400">[{l.acao}]</strong> <span className="text-white font-bold">{l.autor}:</span> <span className="text-neutral-300">{l.detalhe}</span></div>
                      <span className="text-[10px] text-neutral-500">{l.timestamp}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
