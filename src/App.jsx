import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  doc, 
  setDoc,
  updateDoc 
} from 'firebase/firestore';
import { 
  getAuth 
} from 'firebase/auth';

// ==========================================
// CONFIGURAÇÃO REAL DO FIREBASE (MAGNATAS 01)
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyCstl872xKUcdUwX5aQVFMkpo8v-R-9EoE",
  authDomain: "sitemagnatas01.firebaseapp.com",
  projectId: "sitemagnatas01",
  storageBucket: "sitemagnatas01.firebasestorage.app",
  messagingSenderId: "848648566155",
  appId: "1:848648566155:web:024e93ea5dcecaaef86b8e",
  measurementId: "G-Q57NRPGDVE"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ==========================================
// CONFIGURAÇÃO OAUTH2 DISCORD (DIRETA E OFICIAL)
// ==========================================
const DISCORD_CLIENT_ID = "1544523627846025296"; 
const REDIRECT_URI = "https://sitemagnatas01-cgr6-6ng0k1x14-magnatas01.vercel.app/";
const DISCORD_AUTH_URL = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=token&scope=identify+guilds+email`;

export default function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('gestao');
  const [subView, setSubView] = useState('membros'); 
  const [darkMode, setDarkMode] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [usersList, setUsersList] = useState([]);
  const [stats, setStats] = useState({ ativos: 12, pendentes: 0, warnings: 0, staff: 1 });
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const [candidaturas, setCandidaturas] = useState([
    { id: '1', nome: 'shadow_01', idInGame: '19283', idade: '19 anos', motivo: 'Quero entrar na gang para ajudar nos assaltos e portagem.', estado: 'pendente' },
    { id: '2', nome: 'reys_fps', idInGame: '30492', idade: '17 anos', motivo: 'Recomendado pelo membro Ciganomano.', estado: 'pendente' }
  ]);

  const [auditLogs] = useState([
    { id: 1, acao: "Mute Aplicado", mod: "Staff Athos", alvo: "P0ker NoSleep", data: "Há 10 min" },
    { id: 2, acao: "Cargo Adicionado", mod: "01 Founder", alvo: "soso.exe 01!", data: "Há 1 hora" }
  ]);
  
  const [radios] = useState([
    { id: 1, nome: "Frequência Principal Gang", freq: "101.5 MHz", status: "Ativa" },
    { id: 2, nome: "Canal Ação / Assaltos", freq: "88.2 MHz", status: "Restrita" }
  ]);

  // Captura do Token do Discord na URL após o Redirecionamento OAuth2
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      const fragment = new URLSearchParams(hash.slice(1));
      const accessToken = fragment.get('access_token');

      if (accessToken) {
        window.history.replaceState({}, document.title, window.location.pathname);
        fetch('https://discord.com/api/users/@me', {
          headers: { authorization: `Bearer ${accessToken}` }
        })
        .then(res => res.json())
        .then(async (discordUser) => {
          if (discordUser.id) {
            const profile = {
              id: discordUser.id,
              username: discordUser.username,
              avatar: discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : "https://cdn.discordapp.com/embed/avatars/0.png",
              discordTag: `@${discordUser.username}`
            };
            setUser(profile);
            localStorage.setItem('magnatas_discord_user', JSON.stringify(profile));

            const userRef = doc(db, 'users', discordUser.id);
            const initialData = {
              discordId: discordUser.id,
              username: discordUser.username,
              discordTag: profile.discordTag,
              avatar: profile.avatar,
              idInGame: Math.floor(2000 + Math.random() * 25000),
              age: '18 anos',
              estado: 'aprovado',
              roles: ['01 Member´s'],
              lastLogin: new Date().toISOString()
            };
            await setDoc(userRef, initialData, { merge: true });
          }
        })
        .catch(err => console.error("Erro ao obter perfil Discord:", err));
      }
    } else {
      const saved = localStorage.getItem('magnatas_discord_user');
      if (saved) setUser(JSON.parse(saved));
    }
  }, []);

  // Leitura em Tempo Real do Firestore
  useEffect(() => {
    const unsubscribeUsersCollection = onSnapshot(collection(db, 'users'), (snapshot) => {
      let members = [];
      let ativosCount = 0;

      snapshot.forEach((docSnap) => {
        const info = docSnap.data();
        members.push({ id: docSnap.id, ...info });
        if (info.estado === 'aprovado') ativosCount++;
      });

      setUsersList(members);
      if (members.length > 0) {
        setStats(prev => ({ 
          ...prev, 
          ativos: ativosCount, 
          pendentes: candidaturas.length 
        }));
      }
    });

    return () => unsubscribeUsersCollection();
  }, [candidaturas.length]);

  const handleDiscordLogin = () => {
    window.location.href = DISCORD_AUTH_URL;
  };

  const handleLogout = () => {
    localStorage.removeItem('magnatas_discord_user');
    setUser(null);
  };

  const handleAprovarCandidatura = (id) => {
    setCandidaturas(prev => prev.filter(c => c.id !== id));
    alert('Candidatura aprovada com sucesso!');
  };

  const handleRejeitarCandidatura = (id) => {
    setCandidaturas(prev => prev.filter(c => c.id !== id));
    alert('Candidatura rejeitada.');
  };

  const handleForceSync = async () => {
    if (!user) return;
    setSyncLoading(true);
    setSyncMessage('A comunicar com o Bot do Discord...');
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, { lastSyncRequest: new Date().toISOString() });
      setSyncMessage('✅ Cargos sincronizados com sucesso!');
    } catch (error) {
      setSyncMessage('❌ Erro de sincronização.');
    } finally {
      setSyncLoading(false);
      setTimeout(() => setSyncMessage(''), 4000);
    }
  };

  const filteredMembers = usersList.filter(m => 
    (m.username && m.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (m.idInGame && m.idInGame.toString().includes(searchTerm)) ||
    (m.discordTag && m.discordTag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className={darkMode ? "min-h-screen bg-[#121418] text-gray-200 font-sans flex" : "min-h-screen bg-gray-100 text-gray-800 font-sans flex"}>
      
      {/* 📁 SIDEBAR */}
      <aside className={`w-64 border-r ${darkMode ? 'bg-[#181b20] border-neutral-800' : 'bg-white border-gray-200'} flex flex-col justify-between hidden md:flex sticky top-0 h-screen z-20`}>
        <div>
          <div className="p-6 flex items-center space-x-3 border-b border-neutral-800/50">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center font-black text-white shadow-lg shadow-red-600/30">
              🛡️
            </div>
            <span className="text-lg font-black tracking-wider text-red-500">MAGNATAS 01!</span>
          </div>

          <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-160px)]">
            {[
              { id: 'gestao', label: 'Base da Gang', icon: '📂' },
              { id: 'avisos', label: 'Avisos Gerais da Gang', icon: '🔔' },
              { id: 'roupas', label: 'Roupas & Kits', icon: '👕' },
              { id: 'radios', label: 'Frequências Rádio', icon: '📻' },
              { id: 'regras', label: 'Regras Oficiais', icon: '📜' },
              { id: 'cargos', label: 'Lista de Cargos', icon: '🏷️' },
              { id: 'upgrade', label: 'Pedir Upgrade / Promoção', icon: '⭐' },
              { id: 'autorizacoes', label: 'Autorizações (Calças/Manga)', icon: '✨' },
              { id: 'punicoes', label: 'Meus Avisos / Punições', icon: '⚠️' },
              { id: 'discord', label: 'Discord da Gang', icon: '💬' }
            ].map((menu) => (
              <button
                key={menu.id}
                onClick={() => { setCurrentView(menu.id); if(menu.id === 'gestao') setSubView('membros'); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${currentView === menu.id ? 'bg-red-600/10 text-red-500 border border-red-600/20' : 'text-gray-400 hover:bg-neutral-800/40 hover:text-gray-200'}`}
              >
                <span>{menu.icon}</span>
                <span>{menu.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-neutral-800/50 space-y-2">
          <button 
            onClick={() => setCurrentView('admin')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${currentView === 'admin' ? 'bg-amber-600 text-white' : 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/20'}`}
          >
            <span>⚙️</span>
            <span>Painel Admin & Suporte</span>
          </button>
          
          <button 
            onClick={() => setCurrentView('perfil')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${currentView === 'perfil' ? 'bg-red-600 text-white shadow-lg' : 'bg-neutral-800/60 text-gray-300 hover:bg-neutral-800'}`}
          >
            <span>👤</span>
            <span>Meu Perfil & Discord</span>
          </button>
        </div>
      </aside>

      {/* 🖥️ CONTEÚDO PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0">
        
        <header className={`h-16 border-b ${darkMode ? 'bg-[#181b20] border-neutral-800' : 'bg-white border-gray-200'} px-8 flex justify-between items-center sticky top-0 z-30 shadow-sm`}>
          <div className="flex items-center gap-4">
            <span className="font-extrabold text-xs uppercase tracking-wider text-red-500">
              {currentView === 'gestao' ? 'PAINEL GERAL DE MEMBROS' : `SECÇÃO: ${currentView.toUpperCase()}`}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden xl:flex items-center gap-1.5 flex-wrap">
              {["HOMEM", "STREAMER", "STAFF ATHOS PVP", "SUPORT", "01 DEV", "OWNER", "MULHER", "01 FOUNDER´S", "CONTA ALT"].map((badge, idx) => (
                <span key={idx} className="bg-neutral-800/80 border border-neutral-700/60 text-gray-300 text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-sm">
                  {badge}
                </span>
              ))}
            </div>

            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-xl bg-neutral-800 text-yellow-400 border border-neutral-700 text-xs font-bold hover:bg-neutral-700 transition"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>

            {user ? (
              <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition">
                Sair
              </button>
            ) : (
              <button onClick={handleDiscordLogin} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md transition">
                Entrar com Discord
              </button>
            )}
          </div>
        </header>

        <main className="p-8 space-y-6 flex-1 overflow-y-auto">
          {!user ? (
            <div className="max-w-xl mx-auto my-16 p-10 text-center rounded-3xl bg-[#181b20] border border-neutral-800 shadow-2xl">
              <div className="w-20 h-20 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-3xl mx-auto flex items-center justify-center text-3xl font-black mb-6">
                🔑
              </div>
              <h1 className="text-2xl font-black mb-3 text-white">Autenticação Obrigatória</h1>
              <p className="text-neutral-400 text-xs leading-relaxed mb-8">
                Para aceder à plataforma e sincronizar os teus cargos no Discord do Magnatas 01, efetua login com a tua conta do Discord.
              </p>
              <button 
                onClick={handleDiscordLogin}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-8 py-3.5 rounded-2xl text-xs tracking-wider uppercase shadow-xl shadow-indigo-600/30 transition duration-200"
              >
                VINCULAR DISCORD (OAUTH2)
              </button>
            </div>
          ) : (
            <>
              {currentView === 'gestao' && (
                <>
                  <div className="flex gap-4 border-b border-neutral-800 pb-4">
                    <button 
                      onClick={() => setSubView('membros')}
                      className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center gap-2 ${subView === 'membros' ? 'bg-red-600 text-white shadow-lg shadow-red-600/30' : 'bg-neutral-800/50 text-neutral-400 hover:text-white'}`}
                    >
                      <span>👥</span> Gestão Geral de Membros
                    </button>
                    <button 
                      onClick={() => setSubView('candidaturas')}
                      className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center gap-2 relative ${subView === 'candidaturas' ? 'bg-red-600 text-white shadow-lg shadow-red-600/30' : 'bg-neutral-800/50 text-neutral-400 hover:text-white'}`}
                    >
                      <span>⏳</span> Candidaturas Pendentes
                      {candidaturas.length > 0 && (
                        <span className="bg-amber-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full">
                          {candidaturas.length}
                        </span>
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-[#181b20] border border-neutral-800/80 p-5 rounded-2xl flex items-center gap-4 shadow-xl">
                      <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center font-bold text-lg border border-emerald-500/20">👥</div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Membros Ativos</p>
                        <h3 className="text-2xl font-black text-white">{stats.ativos}</h3>
                      </div>
                    </div>

                    <div className="bg-[#181b20] border border-neutral-800/80 p-5 rounded-2xl flex items-center gap-4 shadow-xl">
                      <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center font-bold text-lg border border-amber-500/20">⏳</div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Pendentes</p>
                        <h3 className="text-2xl font-black text-white">{candidaturas.length}</h3>
                      </div>
                    </div>

                    <div className="bg-[#181b20] border border-neutral-800/80 p-5 rounded-2xl flex items-center gap-4 shadow-xl">
                      <div className="w-12 h-12 bg-red-500/10 text-red-400 rounded-xl flex items-center justify-center font-bold text-lg border border-red-500/20">⚠️</div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Warnings Ativos</p>
                        <h3 className="text-2xl font-black text-white">0</h3>
                      </div>
                    </div>

                    <div className="bg-[#181b20] border border-neutral-800/80 p-5 rounded-2xl flex items-center gap-4 shadow-xl">
                      <div className="w-12 h-12 bg-purple-500/10 text-purple-400 rounded-xl flex items-center justify-center font-bold text-lg border border-purple-500/20">👑</div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Founders / Staff</p>
                        <h3 className="text-2xl font-black text-white">1</h3>
                      </div>
                    </div>
                  </div>

                  {subView === 'membros' && (
                    <>
                      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[#181b20] p-4 rounded-2xl border border-neutral-800/80 shadow-lg">
                        <input 
                          type="text"
                          placeholder="Pesquisar por Nome In-Game, ID, Motivo..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full md:w-96 bg-neutral-900 border border-neutral-800 px-4 py-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-red-600 transition"
                        />
                      </div>

                      <div className="bg-[#181b20] border border-neutral-800/80 rounded-2xl overflow-hidden shadow-2xl">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-neutral-800 text-[10px] font-black uppercase text-neutral-400 bg-neutral-900/50">
                              <th className="p-4">Membro</th>
                              <th className="p-4">ID / Idade</th>
                              <th className="p-4">Discord</th>
                              <th className="p-4">Estado</th>
                              <th className="p-4">Cargos Atribuídos</th>
                              <th className="p-4 text-right">Gerir Cargos</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-800/60 text-xs">
                            {filteredMembers.length > 0 ? (
                              filteredMembers.map((m, index) => (
                                <tr key={index} className="hover:bg-neutral-800/30 transition">
                                  <td className="p-4 flex items-center gap-3">
                                    <div className="w-9 h-9 bg-neutral-800 rounded-xl flex items-center justify-center font-bold text-red-500 border border-neutral-700">
                                      {m.username ? m.username.charAt(0) : 'M'}
                                    </div>
                                    <div>
                                      <p className="font-extrabold text-white">{m.username || 'Membro'}</p>
                                      <p className="text-[10px] text-neutral-500">ID Discord: {m.id}</p>
                                    </div>
                                  </td>
                                  <td className="p-4 font-mono text-neutral-300">
                                    ID: <span className="text-white font-bold">{m.idInGame || '27356'}</span> | {m.age || '16 anos'}
                                  </td>
                                  <td className="p-4">
                                    <span className="text-indigo-400 font-bold">{m.discordTag || 'Não vinculado'}</span>
                                  </td>
                                  <td className="p-4">
                                    <span className="bg-emerald-950 text-emerald-400 border border-emerald-800/40 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase">
                                      {m.estado || 'aprovado'}
                                    </span>
                                  </td>
                                  <td className="p-4">
                                    <div className="flex flex-wrap gap-1.5">
                                      {(m.roles || ['01 Member´s']).map((role, rIdx) => (
                                        <span key={rIdx} className="bg-emerald-900/40 text-emerald-300 border border-emerald-700/50 px-2 py-0.5 rounded-md text-[10px] font-bold">
                                          {role}
                                        </span>
                                      ))}
                                    </div>
                                  </td>
                                  <td className="p-4 text-right">
                                    <button className="bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold border border-neutral-700 transition">
                                      + Cargos (Discord 💬)
                                    </button>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan="6" className="p-8 text-center text-neutral-500">
                                  A carregar membros do Firestore em tempo real...
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}

                  {subView === 'candidaturas' && (
                    <div className="bg-[#181b20] border border-neutral-800/80 rounded-3xl p-8 space-y-6 shadow-2xl">
                      <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
                        <div>
                          <h2 className="text-xl font-black text-white">⏳ Candidaturas Pendentes</h2>
                          <p className="text-xs text-neutral-400">Analisa e aprova novos membros para a gang Magnatas 01.</p>
                        </div>
                        <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-xl text-xs font-bold">
                          Total: {candidaturas.length}
                        </span>
                      </div>

                      {candidaturas.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4">
                          {candidaturas.map((cand) => (
                            <div key={cand.id} className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                  <h3 className="font-extrabold text-white text-base">{cand.nome}</h3>
                                  <span className="text-[10px] bg-neutral-800 px-2.5 py-0.5 rounded-md font-mono text-indigo-400">ID In-Game: {cand.idInGame}</span>
                                  <span className="text-[10px] bg-neutral-800 px-2.5 py-0.5 rounded-md text-neutral-300">{cand.idade}</span>
                                </div>
                                <p className="text-xs text-neutral-400 italic">"{cand.motivo}"</p>
                              </div>
                              <div className="flex gap-3 w-full md:w-auto">
                                <button 
                                  onClick={() => handleAprovarCandidatura(cand.id)}
                                  className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-extrabold shadow-lg transition"
                                >
                                  ✅ Aprovar
                                </button>
                                <button 
                                  onClick={() => handleRejeitarCandidatura(cand.id)}
                                  className="flex-1 md:flex-none bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-xs font-extrabold shadow-lg transition"
                                >
                                  ❌ Rejeitar
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-12 text-center text-neutral-500">
                          🎉 Não existem candidaturas pendentes de momento!
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {currentView === 'radios' && (
                <div className="bg-[#181b20] border border-neutral-800 p-8 rounded-3xl space-y-6">
                  <h2 className="text-xl font-bold text-white">📻 Frequências de Comunicação da Gang</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {radios.map(r => (
                      <div key={r.id} className="p-5 bg-neutral-900 rounded-2xl border border-neutral-800 flex justify-between items-center">
                        <div>
                          <p className="font-bold text-white">{r.nome}</p>
                          <p className="text-xs text-indigo-400 font-mono mt-1">{r.freq}</p>
                        </div>
                        <span className="bg-emerald-950 text-emerald-400 text-[10px] px-3 py-1 rounded-lg border border-emerald-800 font-bold">{r.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentView === 'upgrade' && (
                <div className="bg-[#181b20] border border-neutral-800 p-8 rounded-3xl space-y-6 max-w-2xl mx-auto">
                  <h2 className="text-xl font-bold text-white">⭐ Pedido de Promoção / Cargo</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-neutral-400 font-bold block mb-2">Cargo Pretendido</label>
                      <select className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white">
                        <option>01 Leader´s</option>
                        <option>Resp. Manager´s</option>
                        <option>Staff ATHOS PvP</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-neutral-400 font-bold block mb-2">Motivo / Ações Realizadas</label>
                      <textarea placeholder="Explica a razão do pedido..." className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white h-28"></textarea>
                    </div>
                    <button onClick={() => alert('Pedido submetido para a Staff!')} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl text-xs shadow-lg">
                      Enviar Pedido de Promoção
                    </button>
                  </div>
                </div>
              )}

              {currentView === 'admin' && (
                <div className="bg-[#181b20] border border-neutral-800 p-8 rounded-3xl space-y-6">
                  <h2 className="text-xl font-bold text-amber-500">⚙️ Log de Auditoria & Painel da Staff</h2>
                  <div className="space-y-3">
                    {auditLogs.map(log => (
                      <div key={log.id} className="p-4 bg-neutral-900 rounded-2xl border border-neutral-800 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-white">{log.acao} em <span className="text-indigo-400">{log.alvo}</span></p>
                          <p className="text-[10px] text-neutral-500">Executado por: {log.mod}</p>
                        </div>
                        <span className="text-[10px] text-neutral-400 bg-neutral-800 px-2.5 py-1 rounded-lg">{log.data}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentView === 'perfil' && (
                <div className="max-w-2xl mx-auto bg-[#181b20] border border-neutral-800 p-8 rounded-3xl shadow-xl space-y-6">
                  <div className="flex items-center gap-6">
                    <img src={user.avatar} alt="Avatar" className="w-20 h-20 rounded-2xl border-2 border-red-500 shadow-md object-cover" />
                    <div>
                      <h2 className="text-xl font-bold text-white">{user.username}</h2>
                      <p className="text-xs text-neutral-400">{user.discordTag}</p>
                      <span className="mt-2 inline-block text-[10px] bg-indigo-950 text-indigo-400 border border-indigo-800/50 px-2.5 py-0.5 rounded-md font-mono">
                        ID Discord: {user.id}
                      </span>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-neutral-800">
                    <h3 className="text-sm font-bold text-white mb-3">Sincronização com o Bot</h3>
                    <button 
                      onClick={handleForceSync}
                      disabled={syncLoading}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl text-xs uppercase shadow-lg shadow-red-600/20 transition"
                    >
                      {syncLoading ? 'A processar...' : '🔄 Forçar Sincronização de Cargos'}
                    </button>
                    {syncMessage && (
                      <p className="text-xs text-center mt-3 text-emerald-400 font-bold">{syncMessage}</p>
                    )}
                  </div>
                </div>
              )}

              {!['gestao', 'radios', 'upgrade', 'admin', 'perfil'].includes(currentView) && (
                <div className="bg-[#181b20] border border-neutral-800 p-12 rounded-3xl text-center shadow-xl">
                  <h2 className="text-2xl font-black mb-2 text-white uppercase tracking-wider">Secção: {currentView}</h2>
                  <p className="text-xs text-neutral-400 mb-6">Esta funcionalidade está sincronizada com a base de dados do Magnatas 01.</p>
                  <button onClick={() => setCurrentView('gestao')} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg transition">
                    Voltar à Base da Gang
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
