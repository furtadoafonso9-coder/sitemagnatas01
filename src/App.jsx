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

// Configurações do Discord OAuth2
const DISCORD_CLIENT_ID = "1545423627846025296"; 
const REDIRECT_URI = "https://sitemagnatas01-cgr6-6ng0k1x14-magnatas01.vercel.app";
const DISCORD_AUTH_URL = `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=identify+guilds+email`;

// Hierarquia e Definição de Cargos
const ALL_ROLES = [
  // Cargos Administrativos e Staff
  { name: "Staff ATHOS PvP", category: "staff", admin: true },
  { name: "01 Founder´s", category: "staff", founder: true, admin: true },
  { name: "01 Leader´s", category: "staff", leader: true, admin: true },
  { name: "Magnata 01! ©", category: "staff", admin: true },
  { name: "Resp. Manager´s", category: "staff", manager: true, admin: true },
  { name: "01 Manager´s", category: "staff", manager: true, admin: true },
  { name: "Suport", category: "staff", support: true },
  { name: "Manager´s Approval", category: "staff", support: true },
  { name: "Resp. Member´s", category: "staff", support: true },
  
  // Membros e Comunidade
  { name: "01 Member´s", category: "membros" },
  { name: "Server Booster´s", category: "membros" },
  { name: "01 Friend´s", category: "membros" },
  { name: "01 Visitant", category: "membros" },
  { name: "PVP Player", category: "membros" },
  { name: "Homem", category: "membros" },
  { name: "Mulher", category: "membros" },

  // Moderação e Punições
  { name: "Ban Temporário", category: "punicoes" },
  { name: "Ban Perma", category: "punicoes" },
  { name: "Muted", category: "punicoes" },
  { name: "Ausente", category: "punicoes" },
  { name: "Warning 1", category: "punicoes" },
  { name: "Warning 2", category: "punicoes" },
  { name: "Warning AFK", category: "punicoes" },

  // Streamers e Integrações
  { name: "Streamer", category: "outros" },

  // Autorizações
  { name: "Conta ALT", category: "outros" },
  { name: "Autorização P/ Calças", category: "outros" },
  { name: "Autorização P/ Manga", category: "outros" }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [userDoc, setUserDoc] = useState(null);
  const [currentView, setCurrentView] = useState('base');

  // Coleções em tempo real do Firestore
  const [usersList, setUsersList] = useState([]);
  const [roupas, setRoupas] = useState([]);
  const [radios, setRadios] = useState({ principal: {}, alternativa: {} });
  const [regras, setRegras] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Estados dos Formulários
  const [formCandidatura, setFormCandidatura] = useState({
    idade: '',
    nomeInGame: '',
    idInGame: '',
    killsAtual: '',
    tempoCidade: '',
    motivo: ''
  });

  const [formRoupa, setFormRoupa] = useState({ nome: '', numero: '', imagem: '', descricao: '' });
  const [formRegra, setFormRegra] = useState({ categoria: 'Gerais', titulo: '', descricao: '', ordem: 1 });
  const [editingRadio, setEditingRadio] = useState({ tipo: 'principal', freq: '', info: '' });
  const [selectedUserForRoles, setSelectedUserForRoles] = useState(null);

  // -------------------------------------------------------------
  // 1. SISTEMA DE AUTENTICAÇÃO E PERFIL DISCORD
  // -------------------------------------------------------------
  useEffect(() => {
    const hash = window.location.hash;
    const savedUser = localStorage.getItem('magnatas_discord_user');

    if (hash && hash.includes('access_token')) {
      const fragment = new URLSearchParams(hash.slice(1));
      const accessToken = fragment.get('access_token');
      window.history.replaceState({}, document.title, window.location.pathname);

      if (accessToken) {
        fetch('https://discord.com/api/users/@me', {
          headers: { authorization: `Bearer ${accessToken}` }
        })
        .then(res => res.json())
        .then(async (discordUser) => {
          if (discordUser && discordUser.id) {
            const profile = {
              id: discordUser.id,
              username: discordUser.username,
              email: discordUser.email || '',
              avatar: discordUser.avatar 
                ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` 
                : "https://cdn.discordapp.com/embed/avatars/0.png"
            };
            
            setUser(profile);
            localStorage.setItem('magnatas_discord_user', JSON.stringify(profile));
            await syncUserWithFirestore(profile);
          }
        })
        .catch(err => console.error("Erro ao obter dados do Discord:", err));
      }
    } else if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        syncUserWithFirestore(parsed);
      } catch(e) {
        localStorage.removeItem('magnatas_discord_user');
      }
    }
  }, []);

  const syncUserWithFirestore = async (profile) => {
    const userRef = doc(db, 'users', profile.id);
    const docSnap = await getDoc(userRef);

    if (docSnap.exists()) {
      setUserDoc(docSnap.data());
    } else {
      const initialData = {
        discordId: profile.id,
        username: profile.username,
        email: profile.email,
        avatar: profile.avatar,
        estado: 'pendente_candidatura',
        roles: ['01 Visitant'],
        lastLogin: new Date().toISOString()
      };
      await setDoc(userRef, initialData);
      setUserDoc(initialData);
    }
  };

  // Escuta no Firestore em Tempo Real
  useEffect(() => {
    if (!user) return;

    // Utilizador Atual
    const unsubUser = onSnapshot(doc(db, 'users', user.id), (snap) => {
      if (snap.exists()) setUserDoc(snap.data());
    });

    // Lista de Utilizadores
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      let list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setUsersList(list);
    });

    // Roupas
    const unsubRoupas = onSnapshot(collection(db, 'roupas'), (snap) => {
      let r = [];
      snap.forEach(d => r.push({ id: d.id, ...d.data() }));
      setRoupas(r);
    });

    // Rádios
    const unsubRadios = onSnapshot(collection(db, 'config'), (snap) => {
      snap.forEach(d => {
        if (d.id === 'radios') setRadios(d.data());
      });
    });

    // Regras
    const qRegras = query(collection(db, 'regras'), orderBy('ordem', 'asc'));
    const unsubRegras = onSnapshot(qRegras, (snap) => {
      let reg = [];
      snap.forEach(d => reg.push({ id: d.id, ...d.data() }));
      setRegras(reg);
    });

    // Logs Administrativos
    const qLogs = query(collection(db, 'logs'), orderBy('timestamp', 'desc'));
    const unsubLogs = onSnapshot(qLogs, (snap) => {
      let l = [];
      snap.forEach(d => l.push({ id: d.id, ...d.data() }));
      setAuditLogs(l);
    });

    return () => {
      unsubUser();
      unsubUsers();
      unsubRoupas();
      unsubRadios();
      unsubRegras();
      unsubLogs();
    };
  }, [user]);

  // Registar Log de Auditoria no Firestore
  const addAuditLog = async (acao, detalhe) => {
    await addDoc(collection(db, 'logs'), {
      autorId: user.id,
      autorName: user.username,
      acao,
      detalhe,
      timestamp: new Date().toISOString()
    });
  };

  // -------------------------------------------------------------
  // PERMISSÕES & VALIDAÇÃO DE SEGURANÇA (RBAC)
  // -------------------------------------------------------------
  const userRoles = userDoc?.roles || [];
  const isFounder = userRoles.includes("01 Founder´s");
  const isLeader = isFounder || userRoles.includes("01 Leader´s");
  const isManager = isLeader || userRoles.includes("01 Manager´s") || userRoles.includes("Resp. Manager´s");
  const isSupport = isManager || userRoles.includes("Suport") || userRoles.includes("Manager´s Approval");
  const isApprovedMember = userDoc?.estado === 'aprovado';

  // -------------------------------------------------------------
  // 2. SUBMISSÃO E GESTÃO DE CANDIDATURAS
  // -------------------------------------------------------------
  const handleSubmitCandidatura = async (e) => {
    e.preventDefault();
    if (!formCandidatura.nomeInGame || !formCandidatura.idInGame || !formCandidatura.motivo) {
      alert("Por favor, preenche todos os campos obrigatórios!");
      return;
    }

    const userRef = doc(db, 'users', user.id);
    await updateDoc(userRef, {
      idade: formCandidatura.idade,
      nomeInGame: formCandidatura.nomeInGame,
      idInGame: formCandidatura.idInGame,
      killsAtual: formCandidatura.killsAtual || '0',
      tempoCidade: formCandidatura.tempoCidade || 'Não informado',
      motivo: formCandidatura.motivo,
      estado: 'pendente_analise',
      dataCandidatura: new Date().toISOString()
    });

    alert("Candidatura submetida com sucesso!");
  };

  const handleAprovarCandidatura = async (targetUser) => {
    if (!isSupport) return alert("Acesso negado.");

    const userRef = doc(db, 'users', targetUser.id);
    const updatedRoles = Array.from(new Set([...(targetUser.roles || []), "01 Member´s"]));
    
    await updateDoc(userRef, {
      estado: 'aprovado',
      roles: updatedRoles,
      aprovadoPor: user.username,
      dataAprovacao: new Date().toISOString()
    });

    await addAuditLog("Aprovação de Candidatura", `Aprovou a candidatura de ${targetUser.username} (${targetUser.nomeInGame})`);
    alert(`Candidatura de ${targetUser.username} aprovada com sucesso! Cargo 01 Member's atribuído.`);
  };

  const handleReprovarCandidatura = async (targetUser) => {
    if (!isSupport) return alert("Acesso negado.");

    const userRef = doc(db, 'users', targetUser.id);
    await updateDoc(userRef, {
      estado: 'rejeitado',
      rejeitadoPor: user.username,
      dataRejeicao: new Date().toISOString()
    });

    await addAuditLog("Reprovação de Candidatura", `Reprovou a candidatura de ${targetUser.username}`);
    alert(`Candidatura de ${targetUser.username} reprovada.`);
  };

  const handleTentarNovamente = async () => {
    const userRef = doc(db, 'users', user.id);
    await updateDoc(userRef, {
      estado: 'pendente_candidatura',
      nomeInGame: '',
      idInGame: '',
      motivo: ''
    });
    setFormCandidatura({ idade: '', nomeInGame: '', idInGame: '', killsAtual: '', tempoCidade: '', motivo: '' });
  };

  // -------------------------------------------------------------
  // 3. GESTÃO DE CARGOS E PERMISSÕES (RBAC)
  // -------------------------------------------------------------
  const handleToggleRole = async (targetId, roleName) => {
    if (!isSupport) return alert("Não tens permissões para gerir cargos.");
    
    const target = usersList.find(u => u.id === targetId);
    if (!target) return;

    let currentRoles = target.roles || [];
    let updated = currentRoles.includes(roleName)
      ? currentRoles.filter(r => r !== roleName)
      : [...currentRoles, roleName];

    await updateDoc(doc(db, 'users', targetId), { roles: updated });
    await addAuditLog("Alteração de Cargos", `Alterou cargos de ${target.username}: ${updated.join(', ')}`);
  };

  // -------------------------------------------------------------
  // 5. GESTÃO DE ROUPAS (Exclusivo Founder)
  // -------------------------------------------------------------
  const handleAddRoupa = async (e) => {
    e.preventDefault();
    if (!isFounder) return alert("Apenas o Founder pode gerir roupas.");

    await addDoc(collection(db, 'roupas'), {
      ...formRoupa,
      criadoPor: user.username,
      data: new Date().toISOString()
    });

    setFormRoupa({ nome: '', numero: '', imagem: '', descricao: '' });
    await addAuditLog("Gestão Roupas", `Adicionou nova roupa: ${formRoupa.nome}`);
    alert("Roupa adicionada com sucesso!");
  };

  const handleDeleteRoupa = async (id, nome) => {
    if (!isFounder) return alert("Apenas o Founder pode remover roupas.");
    await deleteDoc(doc(db, 'roupas', id));
    await addAuditLog("Gestão Roupas", `Removeu a roupa: ${nome}`);
  };

  // -------------------------------------------------------------
  // 6. GESTÃO DE RÁDIOS (Exclusivo Founder)
  // -------------------------------------------------------------
  const handleSaveRadio = async (tipo) => {
    if (!isFounder) return alert("Apenas o Founder pode alterar frequências de rádio.");

    const newRadios = {
      ...radios,
      [tipo]: {
        frequencia: editingRadio.freq,
        info: editingRadio.info,
        atualizadoPor: user.username,
        data: new Date().toISOString()
      }
    };

    await setDoc(doc(db, 'config', 'radios'), newRadios);
    await addAuditLog("Gestão Rádio", `Atualizou a Rádio ${tipo.toUpperCase()} para ${editingRadio.freq} MHz`);
    alert(`Frequência da Rádio ${tipo.toUpperCase()} atualizada!`);
  };

  // -------------------------------------------------------------
  // 7. GESTÃO DE REGRAS (Exclusivo Founder)
  // -------------------------------------------------------------
  const handleAddRegra = async (e) => {
    e.preventDefault();
    if (!isFounder) return alert("Apenas o Founder pode adicionar regras.");

    await addDoc(collection(db, 'regras'), {
      ...formRegra,
      ordem: Number(formRegra.ordem),
      criadoPor: user.username
    });

    setFormRegra({ categoria: 'Gerais', titulo: '', descricao: '', ordem: regras.length + 1 });
    await addAuditLog("Gestão Regras", `Adicionou a regra: ${formRegra.titulo}`);
    alert("Regra adicionada!");
  };

  const handleDeleteRegra = async (id, titulo) => {
    if (!isFounder) return alert("Apenas o Founder pode eliminar regras.");
    await deleteDoc(doc(db, 'regras', id));
    await addAuditLog("Gestão Regras", `Eliminou a regra: ${titulo}`);
  };

  // Autenticação OAuth2 Discord Redirect
  const handleDiscordLogin = () => {
    window.location.href = DISCORD_AUTH_URL;
  };

  const handleLogout = () => {
    localStorage.removeItem('magnatas_discord_user');
    setUser(null);
    setUserDoc(null);
    window.location.href = window.location.pathname;
  };

  // -------------------------------------------------------------
  // RENDERIZAÇÃO CONDICIONAL POR ESTADO DA CANDIDATURA
  // -------------------------------------------------------------

  // Ecrã 1: Não autenticado
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0d0f12] text-gray-100 flex flex-col justify-center items-center p-6 relative overflow-hidden font-sans">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.15)_0,transparent_70%)] pointer-events-none"></div>
        <div className="max-w-md w-full bg-[#15181e] border border-neutral-800 rounded-3xl p-8 text-center shadow-2xl relative z-10 space-y-6">
          <div className="w-20 h-20 bg-red-600/10 border border-red-600/30 text-red-500 rounded-3xl mx-auto flex items-center justify-center text-4xl shadow-inner">
            🛡️
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-wider text-white">MAGNATAS 01!</h1>
            <p className="text-xs text-red-500 uppercase font-bold tracking-widest mt-1">Base Digital & Gestão Oficial</p>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Acede à plataforma da gang efetuando a vinculação da tua conta do Discord.
          </p>
          <button 
            onClick={handleDiscordLogin}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-4 rounded-2xl text-xs uppercase tracking-wider transition-all duration-200 shadow-lg hover:shadow-indigo-600/30 flex items-center justify-center gap-3"
          >
            <span>💬</span> Vincular Discord (OAuth2)
          </button>
        </div>
      </div>
    );
  }

  // Ecrã 2: Sem Candidatura (Formulário)
  if (userDoc?.estado === 'pendente_candidatura') {
    return (
      <div className="min-h-screen bg-[#0d0f12] text-gray-100 p-6 flex flex-col items-center justify-center">
        <div className="max-w-2xl w-full bg-[#15181e] border border-neutral-800 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
            <div>
              <h1 className="text-xl font-black text-white">FORMULÁRIO DE CANDIDATURA</h1>
              <p className="text-xs text-red-500 font-bold uppercase">Magnatas 01!</p>
            </div>
            <button onClick={handleLogout} className="text-xs bg-red-950/50 hover:bg-red-900/60 text-red-400 px-3 py-1.5 rounded-xl border border-red-800/40">
              Sair ({user.username})
            </button>
          </div>

          <form onSubmit={handleSubmitCandidatura} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-neutral-400 font-bold block mb-1">1. Idade Real</label>
                <input 
                  type="text" 
                  placeholder="Ex: 19 anos" 
                  value={formCandidatura.idade}
                  onChange={e => setFormCandidatura({...formCandidatura, idade: e.target.value})}
                  className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white focus:outline-none focus:border-red-600"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400 font-bold block mb-1">2. Nome In-Game</label>
                <input 
                  type="text" 
                  placeholder="Ex: Athos Magnata" 
                  value={formCandidatura.nomeInGame}
                  onChange={e => setFormCandidatura({...formCandidatura, nomeInGame: e.target.value})}
                  className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white focus:outline-none focus:border-red-600"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-neutral-400 font-bold block mb-1">3. ID In-Game</label>
                <input 
                  type="number" 
                  placeholder="Ex: 27356" 
                  value={formCandidatura.idInGame}
                  onChange={e => setFormCandidatura({...formCandidatura, idInGame: e.target.value})}
                  className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white focus:outline-none focus:border-red-600"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400 font-bold block mb-1">4. Kills Atuais</label>
                <input 
                  type="number" 
                  placeholder="Ex: 150" 
                  value={formCandidatura.killsAtual}
                  onChange={e => setFormCandidatura({...formCandidatura, killsAtual: e.target.value})}
                  className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white focus:outline-none focus:border-red-600"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400 font-bold block mb-1">5. Tempo de Cidade</label>
                <input 
                  type="text" 
                  placeholder="Ex: 6 meses" 
                  value={formCandidatura.tempoCidade}
                  onChange={e => setFormCandidatura({...formCandidatura, tempoCidade: e.target.value})}
                  className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white focus:outline-none focus:border-red-600"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-neutral-400 font-bold block mb-1">6. Por qual motivo queres entrar na gang?</label>
              <textarea 
                placeholder="Explica detalhadamente a tua motivação..." 
                value={formCandidatura.motivo}
                onChange={e => setFormCandidatura({...formCandidatura, motivo: e.target.value})}
                className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white h-24 focus:outline-none focus:border-red-600"
                required
              ></textarea>
            </div>

            <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold py-3.5 rounded-xl text-xs uppercase shadow-lg transition">
              Submeter Candidatura
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Ecrã 3: Candidatura Pendente
  if (userDoc?.estado === 'pendente_analise') {
    return (
      <div className="min-h-screen bg-[#0d0f12] text-gray-100 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#15181e] border border-neutral-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 bg-amber-500/10 text-amber-400 rounded-2xl mx-auto flex items-center justify-center text-3xl">⏳</div>
          <h1 className="text-2xl font-black text-white tracking-wider">MAGNATAS 01!</h1>
          <p className="text-sm font-bold text-amber-400">A tua candidatura está pendente.</p>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Aguarda que um responsável da gang analise a tua candidatura.
          </p>
          <button onClick={handleLogout} className="text-xs bg-neutral-900 text-neutral-400 hover:text-white px-4 py-2 rounded-xl border border-neutral-800">
            Sair da Conta
          </button>
        </div>
      </div>
    );
  }

  // Ecrã 4: Candidatura Reprovada
  if (userDoc?.estado === 'rejeitado') {
    return (
      <div className="min-h-screen bg-[#0d0f12] text-gray-100 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#15181e] border border-neutral-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 bg-red-600/10 text-red-500 rounded-2xl mx-auto flex items-center justify-center text-3xl">❌</div>
          <h1 className="text-2xl font-black text-white tracking-wider">MAGNATAS 01!</h1>
          <p className="text-sm font-bold text-red-500">A tua candidatura foi reprovada.</p>
          <button 
            onClick={handleTentarNovamente}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold py-3.5 rounded-xl text-xs uppercase tracking-wider transition shadow-lg"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // ECRÃ PRINCIPAL: DASHBOARD DA GANG (Membros Aprovados)
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#0d0f12] text-gray-200 font-sans flex">
      {/* SIDEBAR DE NAVEGAÇÃO */}
      <aside className="w-64 bg-[#15181e] border-r border-neutral-800 flex flex-col justify-between hidden md:flex sticky top-0 h-screen z-20">
        <div>
          <div className="p-6 border-b border-neutral-800 flex items-center gap-3">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center font-black text-white shadow-lg">🛡️</div>
            <div>
              <h2 className="text-base font-black tracking-wider text-red-500">MAGNATAS 01!</h2>
              <span className="text-[10px] text-neutral-400 uppercase font-semibold">Painel da Gang</span>
            </div>
          </div>
          <nav className="p-4 space-y-1">
            <button 
              onClick={() => setCurrentView('base')} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${currentView === 'base' ? 'bg-red-600/10 text-red-500 border border-red-600/20' : 'text-neutral-400 hover:bg-neutral-900'}`}
            >
              <span>🏰</span> Base da Gang
            </button>
            <button 
              onClick={() => setCurrentView('cargos')} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${currentView === 'cargos' ? 'bg-red-600/10 text-red-500 border border-red-600/20' : 'text-neutral-400 hover:bg-neutral-900'}`}
            >
              <span>🎖️</span> Cargos & Hierarquia
            </button>
            <button 
              onClick={() => setCurrentView('roupas')} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${currentView === 'roupas' ? 'bg-red-600/10 text-red-500 border border-red-600/20' : 'text-neutral-400 hover:bg-neutral-900'}`}
            >
              <span>👕</span> Roupas Oficiais
            </button>
            <button 
              onClick={() => setCurrentView('radio')} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${currentView === 'radio' ? 'bg-red-600/10 text-red-500 border border-red-600/20' : 'text-neutral-400 hover:bg-neutral-900'}`}
            >
              <span>📻</span> Rádio Frequência
            </button>
            <button 
              onClick={() => setCurrentView('regras')} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${currentView === 'regras' ? 'bg-red-600/10 text-red-500 border border-red-600/20' : 'text-neutral-400 hover:bg-neutral-900'}`}
            >
              <span>📜</span> Regras Oficiais
            </button>

            {isSupport && (
              <button 
                onClick={() => setCurrentView('admin')} 
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${currentView === 'admin' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-amber-500/70 hover:bg-neutral-900'}`}
              >
                <span>⚙️</span> Painel Admin
              </button>
            )}
          </nav>
        </div>

        <div className="p-4 border-t border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={user.avatar} alt="Avatar" className="w-8 h-8 rounded-full border border-neutral-700" />
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">{user.username}</p>
              <p className="text-[10px] text-red-500 truncate">{userRoles[0] || 'Membro'}</p>
            </div>
          </div>
          <button onClick={handleLogout} title="Sair" className="text-neutral-400 hover:text-red-500 p-1 text-sm">
            🚪
          </button>
        </div>
      </aside>

      {/* ÁREA DE CONTEÚDO PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-neutral-800 bg-[#15181e] px-8 flex justify-between items-center sticky top-0 z-10">
          <span className="font-extrabold text-xs uppercase tracking-wider text-red-500">
            MAGNATAS 01! &bull; {currentView.toUpperCase()}
          </span>
          <div className="flex items-center gap-4">
            <span className="text-xs bg-red-950/60 border border-red-800/50 text-red-400 px-3 py-1 rounded-full font-bold">
              ID: {userDoc?.idInGame || 'N/A'}
            </span>
          </div>
        </header>

        <main className="p-8 flex-1 overflow-y-auto space-y-6">

          {/* 1. ABA: BASE DA GANG */}
          {currentView === 'base' && (
            <div className="space-y-8">
              <div>
                <h1 className="text-2xl font-black text-white tracking-wider">MAGNATAS 01!</h1>
                <p className="text-xs text-neutral-400">Painel de Membros Aprovados e Hierarquia Ativa</p>
              </div>

              {/* LÍDERES */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase text-red-500 tracking-wider flex items-center gap-2">
                  👑 Líderes
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {usersList.filter(u => (u.roles || []).some(r => ["01 Founder´s", "01 Leader´s"].includes(r))).map(membro => (
                    <div key={membro.id} className="bg-[#15181e] border border-red-900/30 rounded-2xl p-4 flex items-center gap-4 shadow-lg">
                      <img src={membro.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"} className="w-12 h-12 rounded-xl border border-red-600/40" />
                      <div>
                        <h4 className="font-bold text-white text-sm">{membro.nomeInGame || membro.username}</h4>
                        <p className="text-[11px] text-red-400 font-semibold">{membro.roles?.find(r => ["01 Founder´s", "01 Leader´s"].includes(r))}</p>
                        <p className="text-[10px] text-neutral-500">ID: {membro.idInGame} | DC: @{membro.username}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* GERENTES */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase text-amber-500 tracking-wider flex items-center gap-2">
                  ⭐ Gerentes
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {usersList.filter(u => (u.roles || []).some(r => ["Resp. Manager´s", "01 Manager´s"].includes(r))).map(membro => (
                    <div key={membro.id} className="bg-[#15181e] border border-neutral-800 rounded-2xl p-4 flex items-center gap-4 shadow-lg">
                      <img src={membro.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"} className="w-12 h-12 rounded-xl border border-amber-500/30" />
                      <div>
                        <h4 className="font-bold text-white text-sm">{membro.nomeInGame || membro.username}</h4>
                        <p className="text-[11px] text-amber-400 font-semibold">{membro.roles?.find(r => ["Resp. Manager´s", "01 Manager´s"].includes(r))}</p>
                        <p className="text-[10px] text-neutral-500">ID: {membro.idInGame} | DC: @{membro.username}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* TODOS OS MEMBROS APROVADOS */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase text-neutral-400 tracking-wider">
                  🛡️ Todos os Membros ({usersList.filter(u => u.estado === 'aprovado').length})
                </h3>
                <div className="bg-[#15181e] border border-neutral-800 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-800 text-neutral-400 bg-neutral-900/50">
                        <th className="p-3">Membro</th>
                        <th className="p-3">Nome In-Game / ID</th>
                        <th className="p-3">Discord ID</th>
                        <th className="p-3">Cargos Principais</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/50">
                      {usersList.filter(u => u.estado === 'aprovado').map(m => (
                        <tr key={m.id} className="hover:bg-neutral-900/30">
                          <td className="p-3 flex items-center gap-3">
                            <img src={m.avatar} className="w-7 h-7 rounded-full" />
                            <span className="font-bold text-white">{m.username}</span>
                          </td>
                          <td className="p-3 text-red-400 font-semibold">{m.nomeInGame || 'N/A'} (ID: {m.idInGame || 'N/A'})</td>
                          <td className="p-3 text-neutral-400 font-mono text-[11px]">{m.discordId}</td>
                          <td className="p-3 flex flex-wrap gap-1">
                            {(m.roles || []).slice(0, 3).map(r => (
                              <span key={r} className="px-2 py-0.5 rounded bg-neutral-800 text-[10px] text-neutral-300 border border-neutral-700">{r}</span>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 2. ABA: CARGOS & HIERARQUIA */}
          {currentView === 'cargos' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-black text-white tracking-wider">ESTRUTURA DE CARGOS</h1>
                <p className="text-xs text-neutral-400">Hierarquia oficial do servidor Magnatas 01!</p>
              </div>

              {['staff', 'membros', 'punicoes', 'outros'].map(cat => (
                <div key={cat} className="space-y-3">
                  <h3 className="text-xs font-black uppercase text-red-500 tracking-wider">
                    Categoria: {cat.toUpperCase()}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {ALL_ROLES.filter(r => r.category === cat).map(r => (
                      <div key={r.name} className="bg-[#15181e] border border-neutral-800 rounded-xl p-4 flex justify-between items-center">
                        <span className="text-xs font-bold text-white">{r.name}</span>
                        <span className="text-[10px] bg-neutral-900 border border-neutral-800 px-2 py-1 rounded text-neutral-400">
                          {usersList.filter(u => (u.roles || []).includes(r.name)).length} Membros
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 3. ABA: ROUPAS OFICIAIS */}
          {currentView === 'roupas' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-black text-white tracking-wider">ROUPAS OFICIAIS DA GANG</h1>
                  <p className="text-xs text-neutral-400">Catálogo de vestuário e padronização</p>
                </div>
              </div>

              {/* Formulário Founder */}
              {isFounder && (
                <form onSubmit={handleAddRoupa} className="bg-[#15181e] border border-neutral-800 p-6 rounded-2xl space-y-4">
                  <h3 className="text-xs font-black text-red-500 uppercase">Adicionar Nova Roupa (Founder)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input type="text" placeholder="Nome da Roupa" value={formRoupa.nome} onChange={e => setFormRoupa({...formRoupa, nome: e.target.value})} className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white" required />
                    <input type="text" placeholder="Número da Roupa (Ex: 142)" value={formRoupa.numero} onChange={e => setFormRoupa({...formRoupa, numero: e.target.value})} className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white" required />
                    <input type="url" placeholder="Link da Imagem (URL Directo)" value={formRoupa.imagem} onChange={e => setFormRoupa({...formRoupa, imagem: e.target.value})} className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white" required />
                  </div>
                  <button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs uppercase">
                    Adicionar Roupa
                  </button>
                </form>
              )}

              {/* Grelha de Roupas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {roupas.map(item => (
                  <div key={item.id} className="bg-[#15181e] border border-neutral-800 rounded-2xl overflow-hidden shadow-lg space-y-3">
                    <img src={item.imagem} alt={item.nome} className="w-full h-48 object-cover border-b border-neutral-800" />
                    <div className="p-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <h4 className="font-black text-white text-sm">{item.nome}</h4>
                        <span className="text-xs bg-red-950 text-red-400 font-bold px-2 py-0.5 rounded border border-red-900">
                          #{item.numero}
                        </span>
                      </div>
                      {isFounder && (
                        <button onClick={() => handleDeleteRoupa(item.id, item.nome)} className="w-full bg-red-950/40 hover:bg-red-900/60 text-red-400 py-1.5 rounded-xl text-[11px] font-bold border border-red-800/40 mt-2">
                          Remover Roupa
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. ABA: RÁDIO FREQUÊNCIA */}
          {currentView === 'radio' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-black text-white tracking-wider">FREQUÊNCIAS DE RÁDIO</h1>
                <p className="text-xs text-neutral-400">Comunicações táticas oficiais da Magnatas 01!</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* RÁDIO PRINCIPAL */}
                <div className="bg-[#15181e] border border-red-900/40 rounded-2xl p-6 space-y-4 shadow-xl">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-black text-red-500 uppercase flex items-center gap-2">📻 Rádio Principal</h3>
                    <span className="text-xs font-mono bg-red-950 text-red-400 font-bold px-3 py-1 rounded-xl border border-red-800">
                      {radios.principal?.frequencia || '100.0'} MHz
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">{radios.principal?.info || 'Frequência padrão para ações, confrontos e eventos.'}</p>
                  
                  {isFounder && (
                    <div className="pt-4 border-t border-neutral-800 space-y-2">
                      <input type="text" placeholder="Nova Frequência (Ex: 102.5)" onChange={e => setEditingRadio({...editingRadio, freq: e.target.value})} className="w-full bg-neutral-900 border border-neutral-800 p-2.5 rounded-xl text-xs text-white" />
                      <button onClick={() => handleSaveRadio('principal')} className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold py-2 rounded-xl text-xs uppercase">
                        Atualizar Rádio Principal
                      </button>
                    </div>
                  )}
                </div>

                {/* RÁDIO ALTERNATIVA */}
                <div className="bg-[#15181e] border border-neutral-800 rounded-2xl p-6 space-y-4 shadow-xl">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-black text-amber-500 uppercase flex items-center gap-2">📻 Rádio Alternativa</h3>
                    <span className="text-xs font-mono bg-neutral-900 text-amber-400 font-bold px-3 py-1 rounded-xl border border-neutral-800">
                      {radios.alternativa?.frequencia || '105.5'} MHz
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">{radios.alternativa?.info || 'Frequência reservada para conversas secundárias e patrulhas.'}</p>

                  {isFounder && (
                    <div className="pt-4 border-t border-neutral-800 space-y-2">
                      <input type="text" placeholder="Nova Frequência (Ex: 108.0)" onChange={e => setEditingRadio({...editingRadio, freq: e.target.value})} className="w-full bg-neutral-900 border border-neutral-800 p-2.5 rounded-xl text-xs text-white" />
                      <button onClick={() => handleSaveRadio('alternativa')} className="w-full bg-amber-600 hover:bg-amber-700 text-white font-extrabold py-2 rounded-xl text-xs uppercase">
                        Atualizar Rádio Alternativa
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 5. ABA: REGRAS OFICIAIS */}
          {currentView === 'regras' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-black text-white tracking-wider">REGRAS OFICIAIS MAGNATAS 01!</h1>
                <p className="text-xs text-neutral-400">Código de conduta e regulamento da gang</p>
              </div>

              {/* Formulário Adicionar Regra (Founder) */}
              {isFounder && (
                <form onSubmit={handleAddRegra} className="bg-[#15181e] border border-neutral-800 p-6 rounded-2xl space-y-4">
                  <h3 className="text-xs font-black text-red-500 uppercase">Adicionar Nova Regra (Founder)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input type="text" placeholder="Título da Regra" value={formRegra.titulo} onChange={e => setFormRegra({...formRegra, titulo: e.target.value})} className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white" required />
                    <input type="text" placeholder="Categoria" value={formRegra.categoria} onChange={e => setFormRegra({...formRegra, categoria: e.target.value})} className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white" required />
                    <input type="number" placeholder="Ordem de Apresentação" value={formRegra.ordem} onChange={e => setFormRegra({...formRegra, ordem: e.target.value})} className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white" required />
                  </div>
                  <textarea placeholder="Descrição completa da regra..." value={formRegra.descricao} onChange={e => setFormRegra({...formRegra, descricao: e.target.value})} className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white h-20" required></textarea>
                  <button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs uppercase">
                    Publicar Regra
                  </button>
                </form>
              )}

              {/* Lista de Regras */}
              <div className="space-y-4">
                {regras.map((regra, idx) => (
                  <div key={regra.id} className="bg-[#15181e] border border-neutral-800 rounded-2xl p-6 space-y-2">
                    <div className="flex justify-between items-center">
                      <h4 className="font-black text-white text-sm">#{idx + 1}. {regra.titulo}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-red-950 text-red-400 font-bold px-2 py-0.5 rounded border border-red-900">
                          {regra.categoria}
                        </span>
                        {isFounder && (
                          <button onClick={() => handleDeleteRegra(regra.id, regra.titulo)} className="text-red-500 hover:text-red-400 text-xs font-bold ml-2">
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-neutral-400 leading-relaxed">{regra.descricao}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. ABA: PAINEL ADMINISTRATIVO (RBAC) */}
          {currentView === 'admin' && isSupport && (
            <div className="space-y-8">
              <div>
                <h1 className="text-2xl font-black text-amber-500 tracking-wider">PAINEL ADMINISTRATIVO</h1>
                <p className="text-xs text-neutral-400">Gestão de Candidaturas, Cargos e Auditoria do Sistema</p>
              </div>

              {/* CANDIDATURAS PENDENTES */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase text-amber-400 tracking-wider">
                  ⏳ Candidaturas Pendentes ({usersList.filter(u => u.estado === 'pendente_analise').length})
                </h3>
                
                <div className="grid grid-cols-1 gap-4">
                  {usersList.filter(u => u.estado === 'pendente_analise').map(candidato => (
                    <div key={candidato.id} className="bg-[#15181e] border border-amber-500/30 rounded-2xl p-6 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-white text-base">{candidato.username}</h4>
                          <p className="text-xs text-red-400 font-semibold">In-Game: {candidato.nomeInGame} (ID: {candidato.idInGame})</p>
                          <p className="text-[11px] text-neutral-500 font-mono">Discord ID: {candidato.discordId}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleAprovarCandidatura(candidato)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-2 rounded-xl text-xs uppercase shadow">
                            Aprovar
                          </button>
                          <button onClick={() => handleReprovarCandidatura(candidato)} className="bg-red-600 hover:bg-red-700 text-white font-extrabold px-4 py-2 rounded-xl text-xs uppercase shadow">
                            Reprovar
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-neutral-900/60 p-3 rounded-xl text-xs">
                        <div><strong className="text-neutral-500 block">Idade:</strong> {candidato.idade}</div>
                        <div><strong className="text-neutral-500 block">Kills Atuais:</strong> {candidato.killsAtual}</div>
                        <div><strong className="text-neutral-500 block">Tempo Cidade:</strong> {candidato.tempoCidade}</div>
                        <div><strong className="text-neutral-500 block">Data:</strong> {new Date(candidato.dataCandidatura).toLocaleDateString('pt-PT')}</div>
                      </div>

                      <div className="bg-neutral-900/40 p-3 rounded-xl border border-neutral-800 text-xs text-neutral-300">
                        <strong className="text-neutral-500 block mb-1">Motivo de Entrada:</strong>
                        {candidato.motivo}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* GESTÃO DE CARGOS RBAC DOS MEMBROS */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase text-neutral-400 tracking-wider">
                  🎖️ Atribuição Directa de Cargos (RBAC)
                </h3>
                
                <div className="bg-[#15181e] border border-neutral-800 rounded-2xl p-6 space-y-4">
                  <label className="text-xs text-neutral-400 block font-bold">Seleciona o Membro a Gerir:</label>
                  <select 
                    onChange={e => setSelectedUserForRoles(usersList.find(u => u.id === e.target.value))}
                    className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white"
                  >
                    <option value="">-- Selecionar Utilizador --</option>
                    {usersList.map(u => (
                      <option key={u.id} value={u.id}>{u.username} ({u.nomeInGame || 'Sem Nome'})</option>
                    ))}
                  </select>

                  {selectedUserForRoles && (
                    <div className="pt-4 border-t border-neutral-800 space-y-4">
                      <h4 className="text-xs font-bold text-white">Cargos de {selectedUserForRoles.username}:</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {ALL_ROLES.map(role => {
                          const hasRole = (selectedUserForRoles.roles || []).includes(role.name);
                          return (
                            <button
                              key={role.name}
                              onClick={() => handleToggleRole(selectedUserForRoles.id, role.name)}
                              className={`p-2.5 rounded-xl text-[11px] font-bold text-left transition border ${
                                hasRole 
                                  ? 'bg-red-950/80 border-red-600 text-red-300' 
                                  : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:border-neutral-700'
                              }`}
                            >
                              {hasRole ? '✅ ' : '+ '} {role.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* HISTÓRICO DE AUDITORIA (LOGS) */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase text-neutral-400 tracking-wider">
                  📜 Registo de Auditoria de Ações Administrativas
                </h3>
                <div className="bg-[#15181e] border border-neutral-800 rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-800 text-neutral-400 bg-neutral-900/50">
                        <th className="p-3">Data/Hora</th>
                        <th className="p-3">Administrador</th>
                        <th className="p-3">Ação</th>
                        <th className="p-3">Detalhe</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/50">
                      {auditLogs.map(log => (
                        <tr key={log.id}>
                          <td className="p-3 text-neutral-500 font-mono text-[10px]">{new Date(log.timestamp).toLocaleString('pt-PT')}</td>
                          <td className="p-3 font-bold text-white">{log.autorName}</td>
                          <td className="p-3 text-amber-400 font-semibold">{log.acao}</td>
                          <td className="p-3 text-neutral-300">{log.detalhe}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
