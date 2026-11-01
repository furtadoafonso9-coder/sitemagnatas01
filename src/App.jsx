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
  
  const [isRegistering, setIsRegistering] = useState(true);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');

  const [usersList, setUsersList] = useState([]);
  const [roupas, setRoupas] = useState([]);
  const [radios, setRadios] = useState({ principal: {}, alternativa: {} });
  const [regras, setRegras] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

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
  const [editingRadio, setEditingRadio] = useState({ tipo: 'principal', freq: '', info: '' });
  const [selectedUserForRoles, setSelectedUserForRoles] = useState(null);

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
        setUserDoc(docSnap.data());
      }
    } catch (err) {
      console.error("Erro ao buscar doc:", err);
    }
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
      snap.forEach(d => {
        if (d.id === 'radios') setRadios(d.data());
      });
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
      unsubUser();
      unsubUsers();
      unsubRoupas();
      unsubRadios();
      unsubRegras();
      unsubLogs();
    };
  }, [user]);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!emailInput || !passwordInput) {
      alert("Preenche o e-mail e a palavra-passe!");
      return;
    }

    try {
      const cleanEmailId = emailInput.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
      const userRef = doc(db, 'users', cleanEmailId);
      const docSnap = await getDoc(userRef);

      if (isRegistering) {
        if (!usernameInput) {
          alert("Indica um nome de utilizador!");
          return;
        }

        const newUser = {
          uid: cleanEmailId,
          username: usernameInput.trim(),
          email: emailInput.trim(),
          password: passwordInput, // Armazenado para validação simples
          avatar: "https://cdn.discordapp.com/embed/avatars/0.png",
          estado: 'pendente_candidatura',
          roles: ['01 Visitant'],
          createdAt: new Date().toISOString()
        };

        await setDoc(userRef, newUser);
        setUser(newUser);
        setUserDoc(newUser);
        localStorage.setItem('magnatas_email_user', JSON.stringify(newUser));
        alert("Conta criada com sucesso!");
      } else {
        if (!docSnap.exists()) {
          alert("Conta não encontrada. Regista-te primeiro!");
          return;
        }
        const userData = docSnap.data();
        if (userData.password && userData.password !== passwordInput) {
          alert("Palavra-passe incorreta!");
          return;
        }
        setUser(userData);
        setUserDoc(userData);
        localStorage.setItem('magnatas_email_user', JSON.stringify(userData));
      }
    } catch (error) {
      console.error("Erro na autenticação:", error);
      alert("Erro ao ligar à Base de Dados: " + error.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('magnatas_email_user');
    setUser(null);
    setUserDoc(null);
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
      alert("Preenche os campos obrigatórios!");
      return;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        ...formCandidatura,
        estado: 'pendente_analise',
        dataCandidatura: new Date().toISOString()
      });
      alert("Candidatura submetida com sucesso!");
    } catch (err) {
      alert("Erro ao submeter: " + err.message);
    }
  };

  const handleAprovarCandidatura = async (targetUser) => {
    const userRef = doc(db, 'users', targetUser.id);
    const updatedRoles = Array.from(new Set([...(targetUser.roles || []), "01 Member´s"]));
    await updateDoc(userRef, { estado: 'aprovado', roles: updatedRoles });
    await addAuditLog("Aprovação de Candidatura", `Aprovou ${targetUser.username}`);
  };

  const handleReprovarCandidatura = async (targetUser) => {
    const userRef = doc(db, 'users', targetUser.id);
    await updateDoc(userRef, { estado: 'rejeitado' });
    await addAuditLog("Reprovação de Candidatura", `Reprovou ${targetUser.username}`);
  };

  const handleTentarNovamente = async () => {
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, { estado: 'pendente_candidatura', nomeInGame: '', idInGame: '', motivo: '' });
  };

  // -------------------------------------------------------------
  // ECRÃ DE LOGIN / REGISTO
  // -------------------------------------------------------------
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
              <div>
                <label className="text-xs text-neutral-400 font-bold block mb-1">Nome de Utilizador</label>
                <input 
                  type="text" 
                  placeholder="Teu nome" 
                  value={usernameInput} 
                  onChange={e => setUsernameInput(e.target.value)} 
                  className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white"
                  required 
                />
              </div>
            )}
            <div>
              <label className="text-xs text-neutral-400 font-bold block mb-1">E-mail</label>
              <input 
                type="email" 
                placeholder="exemplo@dominio.com" 
                value={emailInput} 
                onChange={e => setEmailInput(e.target.value)} 
                className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white"
                required 
              />
            </div>
            <div>
              <label className="text-xs text-neutral-400 font-bold block mb-1">Palavra-passe</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                value={passwordInput} 
                onChange={e => setPasswordInput(e.target.value)} 
                className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white"
                required 
              />
            </div>

            <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold py-3.5 rounded-xl text-xs uppercase shadow-lg transition">
              {isRegistering ? 'Criar Conta' : 'Iniciar Sessão'}
            </button>
          </form>

          <div className="text-center">
            <button 
              type="button"
              onClick={() => setIsRegistering(!isRegistering)} 
              className="text-xs text-neutral-400 hover:text-red-500 font-semibold cursor-pointer"
            >
              {isRegistering ? 'Já tens conta? Iniciar Sessão' : 'Não tens conta? Criar Registo'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Candidatura
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

  // Pendente Análise
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

  // Rejeitado
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

  // -------------------------------------------------------------
  // DASHBOARD PRINCIPAL
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#0d0f12] text-gray-200 font-sans flex">
      <aside className="w-64 bg-[#15181e] border-r border-neutral-800 flex flex-col justify-between hidden md:flex sticky top-0 h-screen z-20">
        <div>
          <div className="p-6 border-b border-neutral-800">
            <h2 className="text-base font-black text-red-500">MAGNATAS 01!</h2>
          </div>
          <nav className="p-4 space-y-1">
            <button onClick={() => setCurrentView('base')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold ${currentView === 'base' ? 'bg-red-600/10 text-red-500' : 'text-neutral-400'}`}>🏰 Base da Gang</button>
            <button onClick={() => setCurrentView('cargos')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold ${currentView === 'cargos' ? 'bg-red-600/10 text-red-500' : 'text-neutral-400'}`}>🎖️ Cargos</button>
            <button onClick={() => setCurrentView('roupas')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold ${currentView === 'roupas' ? 'bg-red-600/10 text-red-500' : 'text-neutral-400'}`}>👕 Roupas</button>
            <button onClick={() => setCurrentView('radio')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold ${currentView === 'radio' ? 'bg-red-600/10 text-red-500' : 'text-neutral-400'}`}>📻 Rádio</button>
            <button onClick={() => setCurrentView('regras')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold ${currentView === 'regras' ? 'bg-red-600/10 text-red-500' : 'text-neutral-400'}`}>📜 Regras</button>
            {isSupport && <button onClick={() => setCurrentView('admin')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold ${currentView === 'admin' ? 'bg-amber-500/10 text-amber-400' : 'text-amber-500/70'}`}>⚙️ Admin</button>}
          </nav>
        </div>
        <div className="p-4 border-t border-neutral-800 flex justify-between items-center">
          <span className="text-xs font-bold text-white truncate">{user.username}</span>
          <button onClick={handleLogout} className="text-neutral-400 hover:text-red-500 text-sm">🚪</button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-neutral-800 bg-[#15181e] px-8 flex justify-between items-center sticky top-0 z-10">
          <span className="font-extrabold text-xs uppercase tracking-wider text-red-500">MAGNATAS 01! &bull; {currentView.toUpperCase()}</span>
        </header>

        <main className="p-8 flex-1 overflow-y-auto space-y-6">
          {currentView === 'base' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-black text-white">Membros Aprovados</h1>
              <div className="bg-[#15181e] border border-neutral-800 rounded-2xl overflow-hidden p-6">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-400">
                      <th className="p-3">Utilizador</th>
                      <th className="p-3">In-Game</th>
                      <th className="p-3">ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {usersList.filter(u => u.estado === 'aprovado').map(m => (
                      <tr key={m.id}>
                        <td className="p-3 font-bold text-white">{m.username}</td>
                        <td className="p-3 text-red-400">{m.nomeInGame}</td>
                        <td className="p-3 text-neutral-400">{m.idInGame}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {currentView === 'admin' && isSupport && (
            <div className="space-y-6">
              <h1 className="text-2xl font-black text-amber-500">Painel Administrativo</h1>
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase text-amber-400">Candidaturas Pendentes</h3>
                {usersList.filter(u => u.estado === 'pendente_analise').map(c => (
                  <div key={c.id} className="bg-[#15181e] border border-neutral-800 p-6 rounded-2xl flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-white">{c.username} - {c.nomeInGame} (ID: {c.idInGame})</h4>
                      <p className="text-xs text-neutral-400 mt-1">{c.motivo}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleAprovarCandidatura(c)} className="bg-emerald-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold">Aprovar</button>
                      <button onClick={() => handleReprovarCandidatura(c)} className="bg-red-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold">Reprovar</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentView === 'cargos' && <div className="text-white text-sm">Estrutura de Cargos ativa.</div>}
          {currentView === 'roupas' && <div className="text-white text-sm">Catálogo de Roupas ativo.</div>}
          {currentView === 'radio' && <div className="text-white text-sm">Frequências de Rádio ativas.</div>}
          {currentView === 'regras' && <div className="text-white text-sm">Regras oficiais ativas.</div>}
        </main>
      </div>
    </div>
  );
}
