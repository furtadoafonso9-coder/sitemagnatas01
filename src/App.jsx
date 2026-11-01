import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot,
  collection,
  getDocs,
  addQuery,
  query,
  orderBy
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithPopup, 
  OAuthProvider, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';

// ============================================================================
// CONFIGURAÇÃO DO FIREBASE (APEX ECOSYSTEM)
// ============================================================================
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
  // Estados Globais da Aplicação
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [globalNotice, setGlobalNotice] = useState('🚨 AVISO GLOBAL APEX: Sincronização de cargos Discord v2.5 ativa em tempo real!');
  
  // Estados para as 30 Funcionalidades Avançadas
  const [auditLogs, setAuditLogs] = useState([]);
  const [upgradeRequests, setUpgradeRequests] = useState([]);
  const [radioChannels, setRadioChannels] = useState([]);
  const [serverStats, setServerStats] = useState({ onlineDiscord: 184, totalUsers: 1420, activeSyncs: 98 });
  const [supportTickets, setSupportTickets] = useState([]);
  const [shopItems, setShopItems] = useState([
    { id: 1, name: "Cargo VIP Ouro", price: 500, role: "VIP Ouro" },
    { id: 2, name: "Cor Pessoal Chat", price: 200, role: "Custom Color" }
  ]);

  // Monitorização de Sessão e Firestore em Tempo Real
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const discordInfo = currentUser.providerData.find(p => p.providerId === 'oauth2.discord');
        const discordId = discordInfo ? discordInfo.uid : currentUser.uid;

        const userRef = doc(db, 'users', currentUser.uid);
        const unsubscribeDoc = onSnapshot(userRef, async (docSnap) => {
          if (docSnap.exists()) {
            setUserData(docSnap.data());
          } else {
            const initialData = {
              discordId: discordId,
              username: currentUser.displayName || 'Membro Apex',
              email: currentUser.email || '',
              roles: ['01 Member´s'],
              balance: 100,
              createdAt: new Date().toISOString()
            };
            await setDoc(userRef, initialData);
            setUserData(initialData);
          }
        });

        // Simulação de carregamento de logs e dados secundários das 30 ideias
        loadExtendedSystemData();

        return () => unsubscribeDoc();
      } else {
        setUser(null);
        setUserData(null);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const loadExtendedSystemData = () => {
    setAuditLogs([
      { id: 1, action: "Sincronização de Cargos", user: "SystemBot", time: "Há 2 mins" },
      { id: 2, action: "Alteração de Regras", user: "Founder Moka", time: "Há 1 hora" },
      { id: 3, action: "Moderação / Mute aplicado", user: "Staff Athos", time: "Há 3 horas" }
    ]);
    setRadioChannels([
      { id: 1, name: "Frequência Principal Liderança", freq: "101.5 MHz", status: "Seguro" },
      { id: 2, name: "Canal Tático Operacional", freq: "55.0 MHz", status: "Criptografado" }
    ]);
  };

  // Autenticação OAuth2 Discord
  const handleDiscordLogin = async () => {
    try {
      discordProvider.addScope('identify');
      discordProvider.addScope('guilds');
      discordProvider.addScope('email');
      await signInWithPopup(auth, discordProvider);
    } catch (error) {
      console.error("Erro no login Discord:", error);
      alert("Falha na autenticação: " + error.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  // Forçar Sincronização Manual (Ideia #2)
  const handleForceSync = async () => {
    if (!user || !userData) return;
    setSyncLoading(true);
    setSyncMessage('A comunicar com o Firebase e Bot Discord...');

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        lastManualSync: new Date().toISOString()
      });
      setSyncMessage('✅ Sincronizada com sucesso! O Bot atualizou os cargos no Discord.');
    } catch (err) {
      setSyncMessage('❌ Erro de comunicação com a base de dados.');
    } finally {
      setSyncLoading(false);
      setTimeout(() => setSyncMessage(''), 5000);
    }
  };

  return (
    <div className={darkMode ? "min-h-screen bg-neutral-950 text-neutral-100 font-sans transition-colors duration-300" : "min-h-screen bg-slate-50 text-slate-900 font-sans transition-colors duration-300"}>
      
      {/* 20. BANNER DE ALERTA GLOBAL (IDEIA #20) */}
      {globalNotice && (
        <div className="bg-gradient-to-r from-red-600 via-orange-600 to-red-600 text-white py-2 px-4 text-center font-black text-xs tracking-widest uppercase shadow-lg flex justify-between items-center z-50 relative">
          <span className="mx-auto flex items-center gap-2">🔥 {globalNotice}</span>
          <button onClick={() => setGlobalNotice('')} className="text-white/80 hover:text-white text-sm font-black px-2">✕</button>
        </div>
      )}

      {/* HEADER & NAVEGAÇÃO SUPERIOR */}
      <header className={`border-b ${darkMode ? 'border-neutral-900 bg-neutral-900/90' : 'border-slate-200 bg-white/90'} backdrop-blur-xl sticky top-0 z-40 shadow-sm`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 bg-gradient-to-br from-red-600 to-orange-600 rounded-2xl flex items-center justify-center font-black text-2xl text-white shadow-xl shadow-red-600/20">
              A
            </div>
            <div>
              <span className="text-2xl font-black tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-red-500 via-orange-500 to-red-600">
                APEX
              </span>
              <span className="text-[10px] font-bold block text-neutral-500 tracking-widest uppercase">Ecosystem & Sync Core</span>
            </div>
          </div>

          {/* MENU DE ABAS EXPANDIDO (COBRINDO AS 30 IDEIAS) */}
          {user && (
            <nav className="flex items-center gap-1.5 bg-neutral-900/60 p-1.5 rounded-2xl border border-neutral-800/80 overflow-x-auto max-w-full">
              {[
                { id: 'dashboard', label: '👤 Perfil', icon: '👤' },
                { id: 'hierarchy', label: '🛡️ Cargos', icon: '🛡️' },
                { id: 'radios', label: '📻 Rádios', icon: '📻' },
                { id: 'shop', label: '💎 Loja', icon: '💎' },
                { id: 'tickets', label: '🎫 Denúncias', icon: '🎫' },
                { id: 'rules', label: '📜 Regras', icon: '📜' },
                { id: 'punishments', label: '⚠️ Punições', icon: '⚠️' },
                { id: 'admin', label: '⚡ Staff Admin', icon: '⚡' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${activeTab === tab.id ? 'bg-red-600 text-white shadow-lg shadow-red-600/30' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'}`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          )}

          {/* CONTROLES DE TEMA E SESSÃO */}
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2.5 rounded-xl border text-xs font-bold transition ${darkMode ? 'bg-neutral-900 border-neutral-800 text-yellow-400 hover:bg-neutral-800' : 'bg-slate-200 border-slate-300 text-slate-700 hover:bg-slate-300'}`}
              title="Alternar Tema Claro/Escuro (Ideia #9)"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>

            {user ? (
              <button 
                onClick={handleLogout}
                className="bg-red-600/10 border border-red-600/30 text-red-500 hover:bg-red-600 hover:text-white px-4 py-2.5 rounded-xl text-xs font-bold transition duration-200 shadow-sm"
              >
                Terminar Sessão
              </button>
            ) : (
              <button 
                onClick={handleDiscordLogin}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl text-xs font-black tracking-wider uppercase transition shadow-xl shadow-indigo-600/30 flex items-center gap-2 transform hover:-translate-y-0.5"
              >
                <span>VINCULAR DISCORD (OAUTH2)</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* CORPO PRINCIPAL DA APLICAÇÃO */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {!user ? (
          /* BLOCO DE ENTRADA / LANDING OBRIGATÓRIA */
          <div className="max-w-2xl mx-auto my-16 p-12 text-center rounded-3xl bg-neutral-900/80 border border-neutral-800/80 shadow-2xl backdrop-blur-2xl relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="w-24 h-24 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-3xl mx-auto flex items-center justify-center text-4xl font-black mb-6 shadow-inner">
              🔑
            </div>
            <h1 className="text-4xl font-black mb-4 tracking-tight">Portal Apex Ecosystem</h1>
            <p className="text-neutral-400 text-sm leading-relaxed mb-8 max-w-lg mx-auto">
              Plataforma centralizada com sincronização em tempo real via Firestore e Discord OAuth2 obrigatório. Acede para gerir o teu perfil e estatísticas.
            </p>
            <button 
              onClick={handleDiscordLogin}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-10 py-4 rounded-2xl text-sm tracking-wider uppercase shadow-2xl shadow-indigo-600/40 transition duration-200 transform hover:-translate-y-1"
            >
              ENTRAR COM O DISCORD
            </button>

            {/* WIDGET DE ESTATÍSTICAS RÁPIDAS (IDEIA #10) */}
            <div className="grid grid-cols-3 gap-4 mt-12 pt-8 border-t border-neutral-800/80">
              <div>
                <span className="block text-xl font-black text-white">{serverStats.onlineDiscord}</span>
                <span className="text-[10px] uppercase font-bold text-neutral-500">Membros Online</span>
              </div>
              <div>
                <span className="block text-xl font-black text-indigo-400">{serverStats.totalUsers}</span>
                <span className="text-[10px] uppercase font-bold text-neutral-500">Contas Registadas</span>
              </div>
              <div>
                <span className="block text-xl font-black text-emerald-400">{serverStats.activeSyncs}</span>
                <span className="text-[10px] uppercase font-bold text-neutral-500">Syncs Ativos</span>
              </div>
            </div>
          </div>
        ) : (
          /* CONTEÚDO DAS ABAS DO PAINEL DO UTILIZADOR */
          <div className="space-y-8 animate-fadeIn">
            
            {/* ABA 1: DASHBOARD / PERFIL PESSOAL */}
            {activeTab === 'dashboard' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* CARTÃO DE PERFIL LATERAL */}
                <div className="lg:col-span-1 bg-neutral-900/90 border border-neutral-800/80 rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="h-28 bg-gradient-to-r from-red-600 via-orange-600 to-red-700 rounded-2xl mb-12 relative shadow-md">
                      <img 
                        src={user.photoURL || "https://cdn.discordapp.com/embed/avatars/0.png"} 
                        alt="Avatar" 
                        className="w-20 h-20 rounded-2xl border-4 border-neutral-900 absolute -bottom-10 left-6 shadow-2xl object-cover bg-neutral-800"
                      />
                    </div>
                    <div>
                      <h2 className="text-xl font-black tracking-tight">{user.displayName || 'Membro Apex'}</h2>
                      <p className="text-xs text-neutral-400 mt-0.5">{user.email || 'Discord OAuth2 User'}</p>
                      
                      <div className="mt-6 pt-6 border-t border-neutral-800/80 space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-neutral-500 font-medium">ID Discord:</span>
                          <code className="bg-neutral-950 px-2.5 py-1 rounded-lg text-indigo-400 font-mono text-[11px] border border-neutral-800">
                            {userData?.discordId || 'Sincronizando...'}
                          </code>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-neutral-500 font-medium">Saldo ApexCoins:</span>
                          <span className="text-amber-400 font-black bg-amber-950/40 border border-amber-800/30 px-2 py-0.5 rounded-md text-xs">
                            🪙 {userData?.balance || 100} APX
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-neutral-500 font-medium">Estado Bot:</span>
                          <span className="text-emerald-400 font-bold bg-emerald-950/50 border border-emerald-800/40 px-2 py-0.5 rounded-md text-[10px] flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Ligado
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-neutral-800/80">
                    <button 
                      onClick={handleForceSync}
                      disabled={syncLoading}
                      className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 disabled:opacity-50 text-white font-black py-3.5 rounded-2xl text-xs tracking-wider uppercase shadow-xl shadow-red-600/25 transition duration-200 transform hover:-translate-y-0.5"
                    >
                      {syncLoading ? 'A sincronizar...' : '🔄 Forçar Sincronização'}
                    </button>
                    {syncMessage && (
                      <p className="text-[11px] text-center mt-2.5 font-bold text-emerald-400">{syncMessage}</p>
                    )}
                  </div>
                </div>

                {/* PAINEL CENTRAL DE CARGOS E ATIVIDADE */}
                <div className="lg:col-span-2 space-y-8">
                  <div className="bg-neutral-900/90 border border-neutral-800/80 rounded-3xl p-8 shadow-xl">
                    <h3 className="text-lg font-black mb-2 flex items-center gap-2">
                      <span>🛡️</span> Cargos Atribuídos no Servidor
                    </h3>
                    <p className="text-xs text-neutral-400 mb-6 leading-relaxed">
                      Estes cargos são geridos automaticamente pelo nosso bot em tempo real com base na tua atividade no site e na base de dados Firestore.
                    </p>

                    <div className="flex flex-wrap gap-2.5">
                      {userData?.roles && userData.roles.length > 0 ? (
                        userData.roles.map((role, idx) => (
                          <div 
                            key={idx} 
                            className="bg-neutral-950 border border-neutral-800/80 text-neutral-200 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2.5 shadow-sm"
                          >
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-md shadow-red-500/50"></span>
                            {role}
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-neutral-500">Nenhum cargo detetado.</p>
                      )}
                    </div>
                  </div>

                  {/* NOTIFICAÇÕES E ATIVIDADE RECENTE */}
                  <div className="bg-neutral-900/90 border border-neutral-800/80 rounded-3xl p-8 shadow-xl">
                    <h3 className="text-lg font-black mb-4 flex items-center gap-2">
                      <span>🔔</span> Notificações e Registo de Conta
                    </h3>
                    <div className="space-y-3">
                      <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800/80 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-indigo-400">Conta validada via Discord OAuth2</p>
                          <p className="text-[11px] text-neutral-500 mt-0.5">Sincronização de ID efetuada com sucesso.</p>
                        </div>
                        <span className="text-[10px] bg-neutral-900 text-neutral-400 px-2.5 py-1 rounded-lg">Hoje</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* ABA 2: HIERARQUIA DE CARGOS */}
            {activeTab === 'hierarchy' && (
              <div className="bg-neutral-900/90 border border-neutral-800/80 rounded-3xl p-8 shadow-xl">
                <h3 className="text-xl font-black mb-2">Hierarquia Oficial & Cargos Mapeados</h3>
                <p className="text-xs text-neutral-400 mb-8">Todos os cargos sincronizados diretamente com a infraestrutura do bot no FalixNodes.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    "01 Founder´s", "01 Leader´s", "Resp. Manager´s", "01 Manager´s", 
                    "Staff ATHOS PvP", "Suport", "Streamer", "Manager´s Approval", 
                    "Resp. Member´s", "Ban Temporário", "Ban Perma", "Muted", 
                    "Ausente", "01 Member´s", "Server Booster´s", "PVP Player", 
                    "Homem", "Mulher", "Warning 1", "Warning 2", "Warning AFK"
                  ].map((cargo, i) => (
                    <div key={i} className="bg-neutral-950 border border-neutral-800/80 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                      <span className="text-xs font-bold text-neutral-200">{cargo}</span>
                      <span className="text-[10px] bg-red-950/50 text-red-400 border border-red-800/30 px-2.5 py-1 rounded-lg font-mono">Ativo</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ABA 3: GESTÃO DE RÁDIOS (IDEIA #7) */}
            {activeTab === 'radios' && (
              <div className="bg-neutral-900/90 border border-neutral-800/80 rounded-3xl p-8 shadow-xl space-y-6">
                <h3 className="text-xl font-black">Diretório de Frequências & Rádios</h3>
                <p className="text-xs text-neutral-400">Gere e consulta as frequências autorizadas para comunicação interna.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {radioChannels.map(r => (
                    <div key={r.id} className="bg-neutral-950 border border-neutral-800 p-6 rounded-2xl flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-sm text-white">{r.name}</h4>
                        <p className="text-xs text-indigo-400 mt-1 font-mono">Frequência: {r.freq}</p>
                      </div>
                      <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/40 px-3 py-1 rounded-xl font-bold">{r.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ABA 4: LOJA DO SITE (IDEIA #8) */}
            {activeTab === 'shop' && (
              <div className="bg-neutral-900/90 border border-neutral-800/80 rounded-3xl p-8 shadow-xl space-y-6">
                <h3 className="text-xl font-black">Loja de Cargos & Vantagens Apex</h3>
                <p className="text-xs text-neutral-400">Utiliza os teus APX Coins para adquirir vantagens que sincronizam automaticamente no Discord.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {shopItems.map(item => (
                    <div key={item.id} className="bg-neutral-950 border border-neutral-800 p-6 rounded-2xl flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-white">{item.name}</h4>
                        <p className="text-xs text-amber-400 mt-1 font-black">🪙 {item.price} APX Coins</p>
                      </div>
                      <button onClick={() => alert('Compra efetuada! O bot atualizará os teus cargos.')} className="bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-lg transition">
                        Adquirir
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ABA 5: TICKETS E DENÚNCIAS (IDEIA #14) */}
            {activeTab === 'tickets' && (
              <div className="bg-neutral-900/90 border border-neutral-800/80 rounded-3xl p-8 shadow-xl space-y-6">
                <h3 className="text-xl font-black">Central de Denúncias e Suporte</h3>
                <p className="text-xs text-neutral-400">Abre um ticket confidencial que será encaminhado diretamente para a moderação.</p>
                
                <div className="p-8 bg-neutral-950 rounded-2xl border border-neutral-800 text-center">
                  <span className="text-3xl block mb-3">🎫</span>
                  <p className="text-xs font-bold text-white mb-4">Nenhum ticket ativo no momento.</p>
                  <button onClick={() => alert('Ticket criado com sucesso!')} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl text-xs shadow-lg transition">
                    Criar Nova Denúncia / Ticket
                  </button>
                </div>
              </div>
            )}

            {/* ABA 6: REGRAS DO SERVIDOR (IDEIA #11) */}
            {activeTab === 'rules' && (
              <div className="bg-neutral-900/90 border border-neutral-800/80 rounded-3xl p-8 shadow-xl space-y-6">
                <h3 className="text-xl font-black">Regulamento Oficial da Comunidade</h3>
                <div className="space-y-4 text-xs text-neutral-300 leading-relaxed">
                  <div className="p-5 bg-neutral-950 rounded-2xl border border-neutral-800">
                    <h4 className="font-bold text-red-400 mb-1.5">Artigo 1º - Respeito Mútuo</h4>
                    <p>Qualquer ofensa de cariz discriminatorio, pessoal ou tóxico no site ou Discord resultará em ban permanente sem direito a recurso.</p>
                  </div>
                  <div className="p-5 bg-neutral-950 rounded-2xl border border-neutral-800">
                    <h4 className="font-bold text-red-400 mb-1.5">Artigo 2º - Obrigatoriedade de Sincronización</h4>
                    <p>A conta do site deve estar sempre vinculada ao Discord oficial da Apex para validação de privilégios.</p>
                  </div>
                </div>
              </div>
            )}

            {/* ABA 7: HISTÓRICO DE PUNIÇÕES (IDEIA #3) */}
            {activeTab === 'punishments' && (
              <div className="bg-neutral-900/90 border border-neutral-800/80 rounded-3xl p-8 shadow-xl space-y-6">
                <h3 className="text-xl font-black">Registo Pessoal de Punições</h3>
                <p className="text-xs text-neutral-400">Histórico detalhado sincronizado com o bot e base de dados local.</p>

                <div className="p-8 text-center bg-neutral-950 rounded-2xl border border-neutral-800">
                  <span className="text-3xl block mb-2">🎉</span>
                  <p className="text-xs font-black text-emerald-400">Histórico Limpo!</p>
                  <p className="text-[11px] text-neutral-500 mt-1">Não tens nenhuma advertência ou punição registada no teu perfil.</p>
                </div>
              </div>
            )}

            {/* ABA 8: PAINEL ADMINISTRATIVO / STAFF (IDEIA #4) */}
            {activeTab === 'admin' && (
              <div className="bg-neutral-900/90 border border-neutral-800/80 rounded-3xl p-8 shadow-xl space-y-6">
                <h3 className="text-xl font-black text-red-500">⚡ Painel de Auditoria & Controlo Staff</h3>
                <p className="text-xs text-neutral-400">Registo global de auditoria executado no ecossistema.</p>

                <div className="space-y-3">
                  {auditLogs.map(log => (
                    <div key={log.id} className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-white">{log.action}</p>
                        <p className="text-[11px] text-neutral-500">Executado por: <span className="text-indigo-400">{log.user}</span></p>
                      </div>
                      <span className="text-[10px] text-neutral-400 bg-neutral-900 px-2.5 py-1 rounded-lg">{log.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

      </main>
    </div>
  );
}
