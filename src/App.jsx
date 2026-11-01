import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  doc, 
  setDoc,
  getDoc,
  updateDoc 
} from 'firebase/firestore';

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

// ==========================================
// CONFIGURAÇÃO OAUTH2 DISCORD
// ==========================================
const DISCORD_CLIENT_ID = "1545423627846025296"; 
const REDIRECT_URI = "https://sitemagnatas01-cgr6-6ng0k1x14-magnatas01.vercel.app";
// Pedimos o escopo 'guilds' para conseguir verificar os servidores do utilizador
const DISCORD_AUTH_URL = `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=identify+guilds+email`;

// ID do Servidor do Discord dos Magnatas 01 (substitui pelo ID real do teu servidor se necessário)
const MAGNATAS_GUILD_ID = "123456789012345678"; 
const DISCORD_INVITE_LINK = "https://discord.gg/magnatas01";

export default function App() {
  const [user, setUser] = useState(null);
  const [userStatus, setUserStatus] = useState('verificando'); // 'verificando', 'fora_do_servidor', 'pendente_candidatura', 'pendente_analise', 'aprovado'
  const [currentView, setCurrentView] = useState('gestao');
  const [subView, setSubView] = useState('membros'); 
  const [darkMode, setDarkMode] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [usersList, setUsersList] = useState([]);
  const [stats, setStats] = useState({ ativos: 12, pendentes: 2, warnings: 0, staff: 1 });

  // Formulário de Candidatura
  const [formCandidatura, setFormCandidatura] = useState({ idInGame: '', idade: '', motivo: '' });

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

  // Captura do Token do Discord e Verificação de Servidores
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      const fragment = new URLSearchParams(hash.slice(1));
      const accessToken = fragment.get('access_token');

      if (accessToken) {
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // 1. Obter dados do utilizador
        fetch('https://discord.com/api/users/@me', {
          headers: { authorization: `Bearer ${accessToken}` }
        })
        .then(res => res.json())
        .then(async (discordUser) => {
          if (discordUser.id) {
            const profile = {
              id: discordUser.id,
              username: discordUser.username,
              avatar: discordUser.avatar 
                ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` 
                : "https://cdn.discordapp.com/embed/avatars/0.png",
              discordTag: `@${discordUser.username}`
            };
            setUser(profile);
            localStorage.setItem('magnatas_discord_user', JSON.stringify(profile));

            // 2. Verificar se o utilizador está no servidor dos Magnatas através do endpoint /users/@me/guilds
            try {
              const guildsRes = await fetch('https://discord.com/api/users/@me/guilds', {
                headers: { authorization: `Bearer ${accessToken}` }
              });
              const guilds = await guildsRes.json();
              
              // Verifica se o ID do servidor do Magnatas está na lista de servidores do utilizador
              const isInServer = Array.isArray(guilds) && guilds.some(g => g.id === MAGNATAS_GUILD_ID);

              // Se não estiver no servidor, bloqueia com aviso para entrar
              if (!isInServer && MAGNATAS_GUILD_ID !== "123456789012345678") {
                setUserStatus('fora_do_servidor');
                return;
              }
            } catch (e) {
              console.warn("Não foi possível verificar as guilds via API, prosseguindo com base no Firestore.");
            }

            // 3. Verificar estado atual no Firestore
            const userRef = doc(db, 'users', discordUser.id);
            const docSnap = await getDoc(userRef);
            
            if (docSnap.exists()) {
              setUserStatus(docSnap.data().estado || 'pendente_candidatura');
            } else {
              await setDoc(userRef, {
                discordId: discordUser.id,
                username: discordUser.username,
                discordTag: profile.discordTag,
                avatar: profile.avatar,
                estado: 'pendente_candidatura',
                lastLogin: new Date().toISOString()
              });
              setUserStatus('pendente_candidatura');
            }
          }
        })
        .catch(err => console.error("Erro ao obter perfil do Discord:", err));
      }
    } else {
      const saved = localStorage.getItem('magnatas_discord_user');
      if (saved) {
        const parsedUser = JSON.parse(saved);
        setUser(parsedUser);
        getDoc(doc(db, 'users', parsedUser.id)).then(docSnap => {
          if (docSnap.exists()) {
            setUserStatus(docSnap.data().estado || 'pendente_candidatura');
          } else {
            setUserStatus('pendente_candidatura');
          }
        });
      }
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
      setStats(prev => ({ ...prev, ativos: ativosCount }));
    });

    return () => unsubscribeUsersCollection();
  }, []);

  const handleDiscordLogin = () => {
    window.location.href = DISCORD_AUTH_URL;
  };

  const handleLogout = () => {
    localStorage.removeItem('magnatas_discord_user');
    setUser(null);
    setUserStatus('pendente_candidatura');
  };

  // Submeter Candidatura
  const handleSubmitCandidatura = async (e) => {
    e.preventDefault();
    if (!formCandidatura.idInGame || !formCandidatura.motivo) {
      alert('Preenche todos os campos obrigatórios da candidatura!');
      return;
    }

    const userRef = doc(db, 'users', user.id);
    await updateDoc(userRef, {
      idInGame: formCandidatura.idInGame,
      idade: formCandidatura.idade || '18 anos',
      motivo: formCandidatura.motivo,
      estado: 'pendente_analise'
    });

    setUserStatus('pendente_analise');
    alert('Candidatura enviada com sucesso! Aguarda a aprovação da Staff.');
  };

  const handleAprovarCandidatura = async (id, discordId) => {
    setCandidaturas(prev => prev.filter(c => c.id !== id));
    if (discordId) {
      await updateDoc(doc(db, 'users', discordId), { estado: 'aprovado', roles: ['01 Member´s'] });
    }
    alert('Candidatura aprovada com sucesso!');
  };

  const handleRejeitarCandidatura = (id) => {
    setCandidaturas(prev => prev.filter(c => c.id !== id));
    alert('Candidatura rejeitada.');
  };

  return (
    <div className={darkMode ? "min-h-screen bg-[#121418] text-gray-200 font-sans flex" : "min-h-screen bg-gray-100 text-gray-800 font-sans flex"}>
      
      {/* SIDEBAR (Apenas para utilizadores autenticados E aprovados) */}
      {user && userStatus === 'aprovado' && (
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
      )}

      {/* CONTEÚDO PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0">
        
        <header className={`h-16 border-b ${darkMode ? 'bg-[#181b20] border-neutral-800' : 'bg-white border-gray-200'} px-8 flex justify-between items-center sticky top-0 z-30 shadow-sm`}>
          <div className="flex items-center gap-4">
            <span className="font-extrabold text-xs uppercase tracking-wider text-red-500">
              {user && userStatus === 'aprovado' ? 'PAINEL GERAL DE MEMBROS' : 'PORTAL DE ACESSO - MAGNATAS 01'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition">
                Sair ({user.username})
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
                Efetua login com o Discord para verificar a tua adesão ao servidor e submeter a candidatura aos Magnatas 01.
              </p>
              <button 
                onClick={handleDiscordLogin}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-8 py-3.5 rounded-2xl text-xs tracking-wider uppercase shadow-xl shadow-indigo-600/30 transition duration-200"
              >
                VINCULAR DISCORD (OAUTH2)
              </button>
            </div>
          ) : userStatus === 'fora_do_servidor' ? (
            /* AVISO CASO NÃO ESTEJA NO SERVIDOR DO DISCORD */
            <div className="max-w-xl mx-auto my-16 p-10 text-center rounded-3xl bg-[#181b20] border border-red-500/30 shadow-2xl space-y-6">
              <div className="w-20 h-20 bg-red-600/10 border border-red-500/20 text-red-500 rounded-3xl mx-auto flex items-center justify-center text-3xl font-black">
                ⚠️
              </div>
              <h1 className="text-2xl font-black text-white">Servidor Não Encontrado</h1>
              <p className="text-neutral-400 text-xs leading-relaxed">
                Olá, <span className="text-indigo-400 font-bold">{user.username}</span>! O bot detetou que **não estás no servidor oficial do Discord** dos Magnatas 01.
              </p>
              <div className="pt-2">
                <a 
                  href={DISCORD_INVITE_LINK} 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-8 py-3.5 rounded-2xl text-xs tracking-wider uppercase shadow-xl transition"
                >
                  Entrar no Discord dos Magnatas 01
                </a>
              </div>
              <p className="text-[10px] text-neutral-500">Depois de entrasres no servidor, faz login novamente.</p>
            </div>
          ) : userStatus === 'pendente_analise' ? (
            /* AVISO DE CANDIDATURA EM ANÁLISE */
            <div className="max-w-xl mx-auto my-16 p-10 text-center rounded-3xl bg-[#181b20] border border-neutral-800 shadow-2xl space-y-4">
              <div className="w-16 h-16 bg-amber-500/10 text-amber-400 rounded-2xl mx-auto flex items-center justify-center text-2xl font-black border border-amber-500/20">
                ⏳
              </div>
              <h2 className="text-xl font-black text-white">Candidatura em Análise</h2>
              <p className="text-xs text-neutral-400">A tua candidatura já foi submetida e está a ser avaliada pela liderança. Assim que fores aprovado, o painel completo será desbloqueado.</p>
            </div>
          ) : userStatus !== 'aprovado' ? (
            /* FORMULÁRIO DE CANDIDATURA (LIBERADO SE ESTIVER NO SERVIDOR) */
            <div className="max-w-xl mx-auto my-12 p-8 bg-[#181b20] border border-neutral-800 rounded-3xl shadow-2xl space-y-6">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-emerald-600/10 border border-emerald-500/20 text-emerald-500 rounded-2xl mx-auto flex items-center justify-center text-2xl font-black">
                  ✅
                </div>
                <h2 className="text-xl font-black text-white">Servidor Verificado! Formulário de Candidatura</h2>
                <p className="text-xs text-neutral-400">Parabéns, <span className="text-indigo-400 font-bold">{user.username}</span>! Estás no servidor oficial. Preenche os dados abaixo:</p>
              </div>

              <form onSubmit={handleSubmitCandidatura} className="space-y-4">
                <div>
                  <label className="text-xs text-neutral-400 font-bold block mb-1.5">ID In-Game</label>
                  <input 
                    type="number"
                    placeholder="Ex: 27356"
                    value={formCandidatura.idInGame}
                    onChange={(e) => setFormCandidatura({...formCandidatura, idInGame: e.target.value})}
                    className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white focus:outline-none focus:border-red-600"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-neutral-400 font-bold block mb-1.5">Idade na Vida Real</label>
                  <input 
                    type="text"
                    placeholder="Ex: 19 anos"
                    value={formCandidatura.idade}
                    onChange={(e) => setFormCandidatura({...formCandidatura, idade: e.target.value})}
                    className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white focus:outline-none focus:border-red-600"
                  />
                </div>

                <div>
                  <label className="text-xs text-neutral-400 font-bold block mb-1.5">Por que queres entrar na Gang?</label>
                  <textarea 
                    placeholder="Explica a tua motivação..."
                    value={formCandidatura.motivo}
                    onChange={(e) => setFormCandidatura({...formCandidatura, motivo: e.target.value})}
                    className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white h-28 focus:outline-none focus:border-red-600"
                    required
                  ></textarea>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-lg transition"
                >
                  Enviar Candidatura para Análise
                </button>
              </form>
            </div>
          ) : (
            /* PAINEL COMPLETO PARA MEMBROS APROVADOS */
            <div className="space-y-6">
              <div className="flex gap-4 border-b border-neutral-800 pb-4">
                <button onClick={() => setSubView('membros')} className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition ${subView === 'membros' ? 'bg-red-600 text-white' : 'bg-neutral-800/50 text-neutral-400'}`}>
                  👥 Gestão de Membros
                </button>
                <button onClick={() => setSubView('candidaturas')} className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition ${subView === 'candidaturas' ? 'bg-red-600 text-white' : 'bg-neutral-800/50 text-neutral-400'}`}>
                  ⏳ Candidaturas Pendentes
                </button>
              </div>

              {subView === 'membros' && (
                <div className="bg-[#181b20] border border-neutral-800/80 rounded-2xl overflow-hidden shadow-2xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-800 text-[10px] font-black uppercase text-neutral-400 bg-neutral-900/50">
                        <th className="p-4">Membro</th>
                        <th className="p-4">ID In-Game</th>
                        <th className="p-4">Discord</th>
                        <th className="p-4">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/60 text-xs">
                      {usersList.map((m, index) => (
                        <tr key={index} className="hover:bg-neutral-800/30 transition">
                          <td className="p-4 font-extrabold text-white">{m.username}</td>
                          <td className="p-4 font-mono text-neutral-300">ID: {m.idInGame || 'N/A'}</td>
                          <td className="p-4 text-indigo-400 font-bold">{m.discordTag}</td>
                          <td className="p-4"><span className="bg-emerald-950 text-emerald-400 px-2.5 py-1 rounded-lg text-[10px] uppercase font-bold">{m.estado}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {subView === 'candidaturas' && (
                <div className="bg-[#181b20] border border-neutral-800/80 rounded-3xl p-8 space-y-6 shadow-2xl">
                  <h2 className="text-xl font-black text-white">⏳ Candidaturas Pendentes</h2>
                  {candidaturas.map((cand) => (
                    <div key={cand.id} className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl flex justify-between items-center gap-4">
                      <div>
                        <h3 className="font-extrabold text-white text-base">{cand.nome} (ID: {cand.idInGame})</h3>
                        <p className="text-xs text-neutral-400 italic mt-1">"{cand.motivo}"</p>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => handleAprovarCandidatura(cand.id)} className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-extrabold">✅ Aprovar</button>
                        <button onClick={() => handleRejeitarCandidatura(cand.id)} className="bg-red-600 text-white px-5 py-2.5 rounded-xl text-xs font-extrabold">❌ Rejeitar</button>
                      </div>
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
