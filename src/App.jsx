import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithPopup, 
  OAuthProvider, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';

// ==========================================
// CONFIGURAÇÃO DO FIREBASE
// (Substitui pelas chaves do teu projeto Firebase)
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
  const [userData, setUserData] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [globalNotice, setGlobalNotice] = useState('🚨 AVISO STAFF: Reunião geral de membros este sábado às 21:00 no Discord!');

  // Monitoriza a autenticação do utilizador
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        
        // Obtém o ID real do Discord a partir dos dados do login do Firebase
        const discordInfo = currentUser.providerData.find(p => p.providerId === 'oauth2.discord');
        const discordId = discordInfo ? discordInfo.uid : currentUser.uid;

        // Escuta o documento do utilizador no Firestore em tempo real (/users/DOCUMENT_ID)
        const userRef = doc(db, 'users', currentUser.uid);
        
        const unsubscribeDoc = onSnapshot(userRef, async (docSnap) => {
          if (docSnap.exists()) {
            setUserData(docSnap.data());
          } else {
            // Se o documento não existir, cria-o automaticamente com o discordId vinculado
            const initialData = {
              discordId: discordId,
              username: currentUser.displayName || 'Utilizador Apex',
              email: currentUser.email || '',
              roles: ['01 Member´s'],
              createdAt: new Date().toISOString()
            };
            await setDoc(userRef, initialData);
            setUserData(initialData);
          }
        });

        return () => unsubscribeDoc();
      } else {
        setUser(null);
        setUserData(null);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Login com OAuth2 do Discord
  const handleDiscordLogin = async () => {
    try {
      discordProvider.addScope('identify');
      discordProvider.addScope('guilds');
      await signInWithPopup(auth, discordProvider);
    } catch (error) {
      console.error("Erro no login via Discord:", error);
      alert("Falha na autenticação do Discord: " + error.message);
    }
  };

  // Terminar Sessão
  const handleLogout = async () => {
    await signOut(auth);
  };

  // Forçar Sincronização Manual de Cargos
  const handleForceSync = async () => {
    if (!user || !userData) return;
    setSyncLoading(true);
    setSyncMessage('A comunicar com o servidor do Firebase...');

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        lastSync: new Date().toISOString()
      });
      setSyncMessage('✅ Sinal de sincronização enviado! O Bot aplicará as alterações no Discord.');
    } catch (err) {
      setSyncMessage('❌ Erro ao sincronizar com a base de dados.');
    } finally {
      setSyncLoading(false);
      setTimeout(() => setSyncMessage(''), 5000);
    }
  };

  return (
    <div className={darkMode ? "min-h-screen bg-neutral-950 text-neutral-100 font-sans transition-colors duration-300" : "min-h-screen bg-slate-100 text-slate-900 font-sans transition-colors duration-300"}>
      
      {/* BANNER DE AVISO GLOBAL */}
      {globalNotice && (
        <div className="bg-gradient-to-r from-red-600 via-orange-600 to-red-600 text-white py-2 px-4 text-center font-bold text-xs tracking-wider uppercase shadow-md flex justify-between items-center">
          <span className="mx-auto">{globalNotice}</span>
          <button onClick={() => setGlobalNotice('')} className="text-white/80 hover:text-white text-sm font-black">✕</button>
        </div>
      )}

      {/* HEADER PRINCIPAL */}
      <header className={`border-b ${darkMode ? 'border-neutral-800 bg-neutral-900/90' : 'border-slate-200 bg-white'} backdrop-blur-md sticky top-0 z-50`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center font-black text-xl text-white shadow-lg shadow-red-600/30">
              A
            </div>
            <div>
              <span className="text-xl font-black tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-orange-500">
                APEX
              </span>
              <span className="text-xs font-semibold block text-neutral-500 tracking-wider">ECOSYSTEM & SYNC</span>
            </div>
          </div>

          {/* NAVEGAÇÃO POR ABAS */}
          {user && (
            <nav className="flex items-center gap-1 bg-neutral-900/50 p-1 rounded-xl border border-neutral-800/80">
              <button 
                onClick={() => setActiveTab('dashboard')} 
                className={`px-4 py-2 rounded-lg text-xs font-bold transition ${activeTab === 'dashboard' ? 'bg-red-600 text-white shadow-md' : 'text-neutral-400 hover:text-white'}`}
              >
                👤 Perfil
              </button>
              <button 
                onClick={() => setActiveTab('hierarchy')} 
                className={`px-4 py-2 rounded-lg text-xs font-bold transition ${activeTab === 'hierarchy' ? 'bg-red-600 text-white shadow-md' : 'text-neutral-400 hover:text-white'}`}
              >
                🛡️ Cargos
              </button>
              <button 
                onClick={() => setActiveTab('rules')} 
                className={`px-4 py-2 rounded-lg text-xs font-bold transition ${activeTab === 'rules' ? 'bg-red-600 text-white shadow-md' : 'text-neutral-400 hover:text-white'}`}
              >
                📜 Regras
              </button>
              <button 
                onClick={() => setActiveTab('punishments')} 
                className={`px-4 py-2 rounded-lg text-xs font-bold transition ${activeTab === 'punishments' ? 'bg-red-600 text-white shadow-md' : 'text-neutral-400 hover:text-white'}`}
              >
                ⚠️ Punições
              </button>
            </nav>
          )}

          {/* BOTOES DE MODO E AUTH */}
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2.5 rounded-xl border text-xs font-bold transition ${darkMode ? 'bg-neutral-800 border-neutral-700 text-yellow-400 hover:bg-neutral-700' : 'bg-slate-200 border-slate-300 text-slate-700 hover:bg-slate-300'}`}
              title="Alternar Tema"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>

            {user ? (
              <button 
                onClick={handleLogout}
                className="bg-red-600/10 border border-red-600/30 text-red-500 hover:bg-red-600 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition duration-200"
              >
                Sair
              </button>
            ) : (
              <button 
                onClick={handleDiscordLogin}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-extrabold tracking-wide transition shadow-lg shadow-indigo-600/30 flex items-center gap-2"
              >
                <span>VINCULAR DISCORD</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* CASO NÃO ESTEJA AUTENTICADO */}
        {!user ? (
          <div className="max-w-2xl mx-auto my-12 p-10 text-center rounded-3xl bg-neutral-900/60 border border-neutral-800 shadow-2xl backdrop-blur-xl">
            <div className="w-20 h-20 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-3xl mx-auto flex items-center justify-center text-3xl font-black mb-6">
              🔑
            </div>
            <h1 className="text-3xl font-black mb-3 tracking-tight">Autenticação Obrigatória</h1>
            <p className="text-neutral-400 text-sm leading-relaxed mb-8 max-w-lg mx-auto">
              Para garantir a segurança da comunidade, o acesso a esta plataforma exige vinculação direta com a tua conta do Discord. Os teus cargos serão sincronizados automaticamente.
            </p>
            <button 
              onClick={handleDiscordLogin}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-8 py-4 rounded-2xl text-sm tracking-wide shadow-xl shadow-indigo-600/25 transition duration-200 transform hover:-translate-y-0.5"
            >
              ENTRAR COM O DISCORD (OAUTH2)
            </button>
          </div>
        ) : (
          /* CONTEÚDO PARA UTILIZADORES AUTENTICADOS */
          <div className="space-y-8">
            
            {/* ABA 1: DASHBOARD / PERFIL */}
            {activeTab === 'dashboard' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* CARTÃO DE PERFIL */}
                <div className="lg:col-span-1 bg-neutral-900/80 border border-neutral-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                  <div className="h-24 bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl mb-12 relative">
                    <img 
                      src={user.photoURL || "https://cdn.discordapp.com/embed/avatars/0.png"} 
                      alt="Avatar" 
                      className="w-20 h-20 rounded-2xl border-4 border-neutral-900 absolute -bottom-10 left-6 shadow-xl object-cover"
                    />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{user.displayName || 'Membro Apex'}</h2>
                    <p className="text-xs text-neutral-400 mt-1">{user.email}</p>
                    
                    <div className="mt-4 pt-4 border-t border-neutral-800 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-neutral-500">ID Discord:</span>
                        <code className="bg-neutral-950 px-2.5 py-1 rounded-lg text-indigo-400 font-mono text-[11px]">
                          {userData?.discordId || 'Não Vinculado'}
                        </code>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-neutral-500">Estado Sync:</span>
                        <span className="text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-md text-[10px]">
                          ● Ativo
                        </span>
                      </div>
                    </div>

                    <div className="mt-6">
                      <button 
                        onClick={handleForceSync}
                        disabled={syncLoading}
                        className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-xs tracking-wider uppercase shadow-lg shadow-red-600/20 transition duration-200"
                      >
                        {syncLoading ? 'A processar...' : '🔄 Forçar Sincronização'}
                      </button>
                      {syncMessage && (
                        <p className="text-[11px] text-center mt-2 font-medium text-emerald-400">{syncMessage}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* PAINEL DE CARGOS DO UTILIZADOR */}
                <div className="lg:col-span-2 bg-neutral-900/80 border border-neutral-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                      <span>🛡️</span> Cargos Atribuidos
                    </h3>
                    <p className="text-xs text-neutral-400 mb-6">
                      Estes são os cargos detetados no teu perfil do site que são replicados automaticamente no Discord do servidor.
                    </p>

                    <div className="flex flex-wrap gap-2.5">
                      {userData?.roles && userData.roles.length > 0 ? (
                        userData.roles.map((role, idx) => (
                          <div 
                            key={idx} 
                            className="bg-neutral-950 border border-neutral-800 text-neutral-200 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"
                          >
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            {role}
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-neutral-500">Nenhum cargo registado de momento.</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-8 p-4 bg-neutral-950/60 rounded-2xl border border-neutral-800/60 text-xs text-neutral-400">
                    💡 **Como funciona?** Qualquer alteração efetuada nos teus cargos pela administração do site ou servidor é refletida no Discord em segundos através da nossa sincronização em tempo real.
                  </div>
                </div>
              </div>
            )}

            {/* ABA 2: HIERARQUIA & CARGOS */}
            {activeTab === 'hierarchy' && (
              <div className="bg-neutral-900/80 border border-neutral-800 rounded-3xl p-8 shadow-xl">
                <h3 className="text-xl font-black mb-2">Estrutura de Cargos Mapeados</h3>
                <p className="text-xs text-neutral-400 mb-6">Lista oficial dos cargos registados no sistema de sincronização.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    "01 Founder´s", "01 Leader´s", "Resp. Manager´s", "01 Manager´s", 
                    "Staff ATHOS PvP", "Suport", "Streamer", "Resp. Member´s", 
                    "01 Member´s", "Server Booster´s", "PVP Player", "01 Friend´s"
                  ].map((cargo, i) => (
                    <div key={i} className="bg-neutral-950 border border-neutral-800/80 p-4 rounded-2xl flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-200">{cargo}</span>
                      <span className="text-[10px] bg-red-950/40 text-red-400 border border-red-800/30 px-2 py-0.5 rounded-md font-mono">Sincronizado</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ABA 3: REGRAS */}
            {activeTab === 'rules' && (
              <div className="bg-neutral-900/80 border border-neutral-800 rounded-3xl p-8 shadow-xl space-y-6">
                <h3 className="text-xl font-black">Regulamento do Servidor</h3>
                <div className="space-y-4 text-xs text-neutral-300 leading-relaxed">
                  <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800">
                    <h4 className="font-bold text-red-400 mb-1">1. Respeito e Conduta</h4>
                    <p>Qualquer tipo de desrespeito, toxicidade ou assédio no site ou Discord resultará em punição imediata.</p>
                  </div>
                  <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800">
                    <h4 className="font-bold text-red-400 mb-1">2. Vinculação Obrigatória</h4>
                    <p>Todos os membros devem manter a conta do Discord devidamente vinculada para preservação de cargos.</p>
                  </div>
                </div>
              </div>
            )}

            {/* ABA 4: PUNIÇÕES */}
            {activeTab === 'punishments' && (
              <div className="bg-neutral-900/80 border border-neutral-800 rounded-3xl p-8 shadow-xl">
                <h3 className="text-xl font-black mb-2">Histórico Pessoal de Punições</h3>
                <p className="text-xs text-neutral-400 mb-6">Registo transparente das advertências associadas ao teu ID.</p>

                <div className="p-8 text-center bg-neutral-950/50 rounded-2xl border border-neutral-800/60">
                  <span className="text-3xl block mb-2">🎉</span>
                  <p className="text-xs font-bold text-emerald-400">Sem registos de punição ativas!</p>
                  <p className="text-[11px] text-neutral-500 mt-1">A tua conta cumpre com todas as diretrizes do servidor.</p>
                </div>
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  );
}
