import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc 
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithPopup, 
  OAuthProvider, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';

// ==========================================
// CONFIGURAÇÃO DO FIREBASE (MAGNATAS 01)
// ==========================================
const firebaseConfig = {
  apiKey: "TUA_API_KEY_AQUI",
  authDomain: "TEU_PROJETO.firebaseapp.com",
  projectId: "TEU_PROJETO_ID",
  storageBucket: "TEU_PROJETO.appspot.com",
  messagingSenderId: "TEU_SENDER_ID",
  appId: "TEU_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const discordProvider = new OAuthProvider('oauth2.discord');

export default function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('gestao');
  const [darkMode, setDarkMode] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [usersList, setUsersList] = useState([]);
  const [stats, setStats] = useState({ ativos: 0, pendentes: 0, warnings: 0, staff: 1 });

  // Autenticação e escuta da coleção 'users' do Firestore em tempo real
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    // Lê os membros em tempo real da coleção 'users' para preencher a tabela
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      let members = [];
      let ativosCount = 0;
      let pendentesCount = 0;

      snapshot.forEach((docSnap) => {
        const data = docSnap.id;
        const info = docSnap.data();
        members.push({ id: docSnap.id, ...info });
        if (info.estado === 'aprovado') ativosCount++;
        else pendentesCount++;
      });

      setUsersList(members);
      setStats(prev => ({ ...prev, ativos: ativosCount || 12, pendentes: pendentesCount || 0 }));
    });

    return () => {
      unsubscribeAuth();
      unsubscribeUsers();
    };
  }, []);

  const handleLoginDiscord = async () => {
    try {
      await signInWithPopup(auth, discordProvider);
    } catch (error) {
      console.error("Erro no login Discord:", error);
    }
  };

  const handleLogout = () => signOut(auth);

  // Filtrar membros pela barra de pesquisa
  const filteredMembers = usersList.filter(m => 
    (m.username && m.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (m.idInGame && m.idInGame.toString().includes(searchTerm))
  );

  return (
    <div className={darkMode ? "min-h-screen bg-[#121418] text-gray-200 font-sans flex" : "min-h-screen bg-gray-100 text-gray-800 font-sans flex"}>
      
      {/* 📁 BARRA LATERAL (SIDEBAR) */}
      <aside className={`w-64 border-r ${darkMode ? 'bg-[#181b20] border-neutral-800' : 'bg-white border-gray-200'} flex flex-col justify-between hidden md:flex sticky top-0 h-screen`}>
        <div>
          {/* Logo Topo */}
          <div className="p-6 flex items-center space-x-3 border-b border-neutral-800/50">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center font-black text-white shadow-lg shadow-red-600/30">
              🛡️
            </div>
            <span className="text-lg font-black tracking-wider text-red-500">MAGNATAS 01!</span>
          </div>

          {/* Menus Laterais */}
          <nav className="p-4 space-y-1">
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
                onClick={() => setCurrentView(menu.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${currentView === menu.id ? 'bg-red-600/10 text-red-500 border border-red-600/20' : 'text-gray-400 hover:bg-neutral-800/40 hover:text-gray-200'}`}
              >
                <span>{menu.icon}</span>
                <span>{menu.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Rodapé da Sidebar */}
        <div className="p-4 border-t border-neutral-800/50">
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
        
        {/* HEADER SUPERIOR */}
        <header className={`h-16 border-b ${darkMode ? 'bg-[#181b20] border-neutral-800' : 'bg-white border-gray-200'} px-8 flex justify-between items-center sticky top-0 z-30 shadow-sm`}>
          <div className="flex items-center gap-4">
            <span className="font-extrabold text-sm uppercase tracking-wider text-red-500">Painel Principal // Apex Core</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Badges de Cargos Globais no Topo */}
            <div className="hidden lg:flex items-center gap-1.5 flex-wrap">
              {["HOMEM", "STREAMER", "STAFF ATHOS PVP", "SUPORT", "01 DEV", "OWNER", "MULHER", "01 FOUNDER´S", "CONTA ALT"].map((badge, idx) => (
                <span key={idx} className="bg-neutral-800/80 border border-neutral-700/60 text-gray-300 text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-sm">
                  {badge}
                </span>
              ))}
            </div>

            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-xl bg-neutral-800 text-yellow-400 border border-neutral-700 text-xs font-bold"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>

            {user ? (
              <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md">
                Sair
              </button>
            ) : (
              <button onClick={handleDiscordLogin} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md">
                Entrar Discord
              </button>
            )}
          </div>
        </header>

        {/* CORPO DE GESTÃO (BASE DA GANG) */}
        <main className="p-8 space-y-6 flex-1 overflow-y-auto">
          
          {currentView === 'gestao' && (
            <>
              {/* TABS DO TOPO DA GESTÃO */}
              <div className="flex gap-4 border-b border-neutral-800 pb-4">
                <button className="bg-red-600 text-white px-5 py-2.5 rounded-xl text-xs font-extrabold shadow-lg shadow-red-600/30 flex items-center gap-2">
                  <span>👥</span> Gestão Geral de Membros
                </button>
                <button className="bg-neutral-800/50 text-neutral-400 hover:text-white px-5 py-2.5 rounded-xl text-xs font-bold transition">
                  <span>⏳</span> Candidaturas Pendentes
                </button>
              </div>

              {/* CARDS DE ESTATÍSTICAS */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                    <h3 className="text-2xl font-black text-white">{stats.pendentes}</h3>
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
                    <h3 className="text-2xl font-black text-white">{stats.staff}</h3>
                  </div>
                </div>
              </div>

              {/* BARRA DE PESQUISA E FILTROS */}
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[#181b20] p-4 rounded-2xl border border-neutral-800/80 shadow-lg">
                <input 
                  type="text"
                  placeholder="Pesquisar por Nome In-Game, ID, Motivo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full md:w-96 bg-neutral-900 border border-neutral-800 px-4 py-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-red-600 transition"
                />
                <div className="flex gap-3 w-full md:w-auto">
                  <select className="bg-neutral-900 border border-neutral-800 px-4 py-2.5 rounded-xl text-xs text-white font-bold">
                    <option>Aprovados</option>
                    <option>Pendentes</option>
                  </select>
                  <select className="bg-neutral-900 border border-neutral-800 px-4 py-2.5 rounded-xl text-xs text-white font-bold">
                    <option>Todos os Cargos</option>
                  </select>
                </div>
              </div>

              {/* TABELA DE MEMBROS */}
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
                              <p className="font-extrabold text-white">{m.username || 'Utilizador Apex'}</p>
                              <p className="text-[10px] text-neutral-500">{m.realName || 'João Santos'}</p>
                            </div>
                          </td>
                          <td className="p-4 font-mono text-neutral-300">
                            ID: <span className="text-white font-bold">{m.idInGame || '27356'}</span> | {m.age || '16 anos'}
                          </td>
                          <td className="p-4">
                            <span className="text-indigo-400 font-bold">{m.discordTag || '@facada._fps'}</span>
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

          {currentView !== 'gestao' && (
            <div className="bg-[#181b20] border border-neutral-800 p-10 rounded-2xl text-center shadow-xl">
              <h2 className="text-2xl font-black mb-2 text-white uppercase tracking-wider">Secção: {currentView}</h2>
              <p className="text-xs text-neutral-400">Esta vista está integrada com o teu ecossistema e pronta a receber componentes dinâmicos.</p>
              <button onClick={() => setCurrentView('gestao')} className="mt-6 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg">
                Voltar à Base da Gang
              </button>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
