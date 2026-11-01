import React, { useState, useEffect } from 'react';

export default function App() {
  const [user, setUser] = useState(null);
  const [darkMode, setDarkMode] = useState(true);
  const [syncStatus, setSyncStatus] = useState('');
  const [punishments, setPunishments] = useState([]);

  // Simulação de verificação de login OAuth2 do Discord ao carregar a página
  useEffect(() => {
    const savedUser = localStorage.getItem('apex_discord_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      fetchUserPunishments(parsedUser.id);
    }
  }, []);

  const handleLoginDiscord = () => {
    // Redirecionamento simulado para OAuth2 do Discord
    const mockDiscordUser = {
      id: "1544427611566903396",
      username: "MagnatasMember",
      avatar: "https://cdn.discordapp.com/embed/avatars/0.png",
      roles: ["01 Member´s", "PVP Player"]
    };
    localStorage.setItem('apex_discord_user', JSON.stringify(mockDiscordUser));
    setUser(mockDiscordUser);
    fetchUserPunishments(mockDiscordUser.id);
  };

  const handleLogout = () => {
    localStorage.removeItem('apex_discord_user');
    setUser(null);
    setPunishments([]);
  };

  const fetchUserPunishments = (discordId) => {
    // Simulação de busca ao Firestore / Base de dados local
    setPunishments([
      { id: 1, motivo: "Ausência sem avisar (Warning AFK)", tempo: "3d" }
    ]);
  };

  const forceSync = () => {
    setSyncStatus('A sincronizar com o Discord...');
    setTimeout(() => {
      setSyncStatus('✅ Cargos sincronizados com sucesso!');
      setTimeout(() => setSyncStatus(''), 4000);
    }, 1500);
  };

  return (
    <div className={darkMode ? "min-h-screen bg-gray-900 text-white font-sans transition-colors duration-300" : "min-h-screen bg-gray-100 text-gray-900 font-sans transition-colors duration-300"}>
      <header className="flex justify-between items-center p-6 border-b border-gray-800 shadow-md">
        <div className="flex items-center space-x-3">
          <span className="text-2xl font-black tracking-wider text-red-500">APEX // ECOSYSTEM</span>
        </div>
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition"
          >
            {darkMode ? '☀️ Modo Claro' : '🌙 Modo Escuro'}
          </button>
          {user ? (
            <button 
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-bold text-sm transition shadow-lg"
            >
              Terminar Sessão
            </button>
          ) : (
            <button 
              onClick={handleLoginDiscord}
              className="bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 rounded-xl font-bold text-sm transition shadow-lg flex items-center gap-2"
            >
              Entrar com o Discord
            </button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 mt-6">
        {!user ? (
          <div className="text-center py-20 bg-gray-800/50 rounded-2xl border border-gray-700/50 shadow-xl backdrop-blur-md">
            <h1 className="text-4xl font-extrabold mb-4">Acesso Restrito</h1>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">Para aceder ao painel, verificar o seu perfil e sincronizar os seus cargos, é obrigatório efetuar login com a sua conta do Discord.</p>
            <button 
              onClick={handleLoginDiscord}
              className="bg-indigo-600 hover:bg-indigo-700 px-8 py-3 rounded-xl font-bold text-lg transition shadow-xl"
            >
              Autenticar via Discord
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-gray-800/80 border border-gray-700 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-center gap-6">
              <img src={user.avatar} alt="Avatar" className="w-24 h-24 rounded-full border-4 border-indigo-500 shadow-md" />
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-2xl font-bold">{user.username}</h2>
                <p className="text-gray-400 text-sm">ID do Discord: <code className="bg-gray-900 px-2 py-0.5 rounded text-indigo-400">{user.id}</code></p>
                <div className="mt-3 flex flex-wrap gap-2 justify-center md:justify-start">
                  {user.roles.map((role, idx) => (
                    <span key={idx} className="bg-indigo-900/60 text-indigo-300 border border-indigo-700/50 text-xs px-3 py-1 rounded-full font-semibold">
                      {role}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={forceSync}
                  className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-xl text-sm font-bold transition shadow-md"
                >
                  🔄 Forçar Sync
                </button>
                {syncStatus && <span className="text-xs text-emerald-400 font-medium text-center">{syncStatus}</span>}
              </div>
            </div>

            <div className="bg-gray-800/80 border border-gray-700 p-6 rounded-2xl shadow-xl">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">⚠️ Histórico de Punições</h3>
              {punishments.length === 0 ? (
                <p className="text-gray-400 text-sm">Não tens nenhuma punição registada no teu perfil.</p>
              ) : (
                <div className="space-y-3">
                  {punishments.map((p) => (
                    <div key={p.id} className="bg-gray-900/80 border border-gray-800 p-4 rounded-xl flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-red-400">{p.motivo}</p>
                        <p className="text-xs text-gray-500">Duração: {p.tempo}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
