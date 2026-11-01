import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc,
  getDoc,
  updateDoc 
} from 'firebase/firestore';

const DISCORD_CLIENT_ID = "1545423627846025296"; 
const REDIRECT_URI = "https://sitemagnatas01-cgr6-6ng0k1x14-magnatas01.vercel.app";
const DISCORD_AUTH_URL = `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=identify+guilds+email`;

export default function App() {
  const [user, setUser] = useState(null);
  const [userStatus, setUserStatus] = useState('pendente_candidatura'); 
  const [currentView, setCurrentView] = useState('gestao');
  const [usersList, setUsersList] = useState([]);
  
  const [formCandidatura, setFormCandidatura] = useState({ idInGame: '', idade: '', motivo: '' });

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
              avatar: discordUser.avatar 
                ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` 
                : "https://cdn.discordapp.com/embed/avatars/0.png",
              discordTag: `@${discordUser.username}`
            };
            
            setUser(profile);
            localStorage.setItem('magnatas_discord_user', JSON.stringify(profile));

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
        .catch(err => console.error("Erro no perfil do Discord:", err));
      }
    } else if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        getDoc(doc(db, 'users', parsed.id)).then(docSnap => {
          if (docSnap.exists()) {
            setUserStatus(docSnap.data().estado || 'pendente_candidatura');
          }
        }).catch(() => {});
      } catch(e) {
        localStorage.removeItem('magnatas_discord_user');
      }
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      let members = [];
      snapshot.forEach((docSnap) => {
        members.push({ id: docSnap.id, ...docSnap.data() });
      });
      setUsersList(members);
    }, (err) => console.error("Erro no Firestore:", err));
    
    return () => unsubscribe();
  }, []);

  const handleDiscordLogin = () => {
    window.location.href = DISCORD_AUTH_URL;
  };

  const handleLogout = () => {
    localStorage.removeItem('magnatas_discord_user');
    setUser(null);
    setUserStatus('pendente_candidatura');
    window.location.href = window.location.pathname;
  };

  const handleSubmitCandidatura = async (e) => {
    e.preventDefault();
    if (!formCandidatura.idInGame || !formCandidatura.motivo) {
      alert('Preenche os campos obrigatórios!');
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
    alert('Candidatura submetida com sucesso!');
  };

  // Ações de Admin: Aprovar ou Rejeitar
  const handleAprovar = async (discordId) => {
    await updateDoc(doc(db, 'users', discordId), { estado: 'aprovado' });
    alert('Membro aprovado com sucesso!');
  };

  const handleRejeitar = async (discordId) => {
    await updateDoc(doc(db, 'users', discordId), { estado: 'rejeitado' });
    alert('Candidatura rejeitada.');
  };

  // Permitir tentar novamente (volta ao estado 'pendente_candidatura')
  const handleTentarNovamente = async () => {
    const userRef = doc(db, 'users', user.id);
    await updateDoc(userRef, { estado: 'pendente_candidatura' });
    setUserStatus('pendente_candidatura');
  };

  const isApproved = user && userStatus === 'aprovado';

  return (
    <div className="min-h-screen bg-[#121418] text-gray-200 font-sans flex">
      
      {/* 🛡️ SIDEBAR SÓ APARECE PARA MEMBROS APROVADOS */}
      {isApproved && (
        <aside className="w-64 border-r bg-[#181b20] border-neutral-800 flex flex-col justify-between hidden md:flex sticky top-0 h-screen z-20">
          <div>
            <div className="p-6 flex items-center space-x-3 border-b border-neutral-800/50">
              <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center font-black text-white shadow-lg">🛡️</div>
              <span className="text-lg font-black tracking-wider text-red-500">MAGNATAS 01!</span>
            </div>
            <nav className="p-4 space-y-1">
              <button onClick={() => setCurrentView('gestao')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold bg-red-600/10 text-red-500 border border-red-600/20">
                <span>📂</span> Base da Gang
              </button>
            </nav>
          </div>
        </aside>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b bg-[#181b20] border-neutral-800 px-8 flex justify-between items-center sticky top-0 z-30">
          <span className="font-extrabold text-xs uppercase tracking-wider text-red-500">
            {isApproved ? 'PAINEL GESTÃO MAGNATAS 01' : 'PORTAL DE CANDIDATURA - MAGNATAS 01'}
          </span>
          {user ? (
            <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition">
              Sair ({user.username})
            </button>
          ) : (
            <button onClick={handleDiscordLogin} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition">
              Entrar com Discord
            </button>
          )}
        </header>

        <main className="p-8 space-y-6 flex-1 overflow-y-auto">
          {!user ? (
            <div className="max-w-xl mx-auto my-16 p-10 text-center rounded-3xl bg-[#181b20] border border-neutral-800 shadow-2xl">
              <div className="w-20 h-20 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-3xl mx-auto flex items-center justify-center text-3xl font-black mb-6">🔑</div>
              <h1 className="text-2xl font-black mb-3 text-white">Autenticação Obrigatória</h1>
              <p className="text-neutral-400 text-xs mb-8">Efetua login com o Discord para aceder ao sistema e submeter a tua candidatura.</p>
              <button onClick={handleDiscordLogin} className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-8 py-3.5 rounded-2xl text-xs uppercase shadow-xl transition">
                VINCULAR DISCORD (OAUTH2)
              </button>
            </div>
          ) : userStatus === 'pendente_analise' ? (
            <div className="max-w-xl mx-auto my-16 p-10 text-center rounded-3xl bg-[#181b20] border border-neutral-800 shadow-2xl space-y-4">
              <div className="w-16 h-16 bg-amber-500/10 text-amber-400 rounded-2xl mx-auto flex items-center justify-center text-2xl font-black">⏳</div>
              <h2 className="text-xl font-black text-white">Candidatura em Análise</h2>
              <p className="text-xs text-neutral-400">A tua candidatura foi submetida com sucesso. Aguarda que a liderança aprove o teu acesso ao painel!</p>
            </div>
          ) : userStatus === 'rejeitado' ? (
            /* ❌ ECRÃ DE REJEITADO COM OPÇÃO DE TENTAR NOVAMENTE */
            <div className="max-w-xl mx-auto my-16 p-10 text-center rounded-3xl bg-[#181b20] border border-neutral-800 shadow-2xl space-y-4">
              <div className="w-16 h-16 bg-red-600/10 text-red-500 rounded-2xl mx-auto flex items-center justify-center text-2xl font-black">❌</div>
              <h2 className="text-xl font-black text-white">Candidatura Rejeitada</h2>
              <p className="text-xs text-neutral-400">Infelizmente a tua candidatura não foi aprovada pela liderança neste momento.</p>
              <button 
                onClick={handleTentarNovamente}
                className="mt-4 bg-red-600 hover:bg-red-700 text-white font-extrabold px-6 py-3 rounded-xl text-xs uppercase transition shadow-lg"
              >
                Tentar Novamente
              </button>
            </div>
          ) : userStatus === 'aprovado' ? (
            <div className="space-y-6">
              <h2 className="text-xl font-black text-white">Painel Geral de Membros Aprovados</h2>
              <div className="bg-[#181b20] border border-neutral-800 rounded-2xl overflow-hidden p-6">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-400">
                      <th className="p-3">Membro</th>
                      <th className="p-3">ID In-Game</th>
                      <th className="p-3">Estado / Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {usersList.map((m) => (
                      <tr key={m.id}>
                        <td className="p-3 font-bold text-white">{m.username}</td>
                        <td className="p-3 text-indigo-400">ID: {m.idInGame || 'Pendente'}</td>
                        <td className="p-3 flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                            m.estado === 'aprovado' ? 'bg-emerald-950 text-emerald-400' : 
                            m.estado === 'rejeitado' ? 'bg-red-950 text-red-400' : 'bg-amber-950 text-amber-400'
                          }`}>
                            {m.estado}
                          </span>
                          {m.estado !== 'aprovado' && (
                            <button onClick={() => handleAprovar(m.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg">
                              Aprovar
                            </button>
                          )}
                          {m.estado !== 'rejeitado' && (
                            <button onClick={() => handleRejeitar(m.id)} className="bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded-lg">
                              Rejeitar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* 📝 FORMULÁRIO DE CANDIDATURA SIMPLES */
            <div className="max-w-xl mx-auto my-12 p-8 bg-[#181b20] border border-neutral-800 rounded-3xl shadow-2xl space-y-6">
              <h2 className="text-xl font-black text-white text-center">Formulário de Candidatura</h2>
              <form onSubmit={handleSubmitCandidatura} className="space-y-4">
                <div>
                  <label className="text-xs text-neutral-400 font-bold block mb-1.5">ID In-Game</label>
                  <input 
                    type="number"
                    placeholder="Ex: 27356"
                    value={formCandidatura.idInGame}
                    onChange={(e) => setFormCandidatura({...formCandidatura, idInGame: e.target.value})}
                    className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white"
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
                    className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 font-bold block mb-1.5">Motivo de Entrada</label>
                  <textarea 
                    placeholder="Explica a tua motivação..."
                    value={formCandidatura.motivo}
                    onChange={(e) => setFormCandidatura({...formCandidatura, motivo: e.target.value})}
                    className="w-full bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs text-white h-28"
                    required
                  ></textarea>
                </div>
                <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold py-3.5 rounded-xl text-xs uppercase shadow-lg transition">
                  Submeter Candidatura
                </button>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
