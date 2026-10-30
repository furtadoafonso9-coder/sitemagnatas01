import React, { useState, useEffect } from 'react';
import { 
  Shield, Users, LogIn, LogOut, Clock, CheckCircle, XCircle, Shirt, Radio, BookOpen, Send, Settings, UserCheck, Trash2, Plus
} from 'lucide-react';
import { auth, googleProvider, db } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, onSnapshot, collection, query, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';

export default function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Estados para dados operacionais e admin
  const [allUsers, setAllUsers] = useState([]);
  const [formData, setFormData] = useState({ idade: '', nomeIngame: '', idIngame: '', kills: '', tempoCidade: '', motivo: '' });
  
  // Conteúdos da gang (Roupas, Rádio, Regras)
  const [roupas, setRoupas] = useState([
    { id: 1, nome: 'Kit Assalto / Operacional', top: 'ID 142', calcas: 'ID 35', Mascara: 'ID 22' },
    { id: 2, nome: 'Kit Conferencia / Reunião', top: 'ID 88', calcas: 'ID 12', Mascara: 'Nenhuma' }
  ]);
  const [radios, setRadios] = useState([
    { canal: 'Frequência Principal (Geral)', freq: '101.5 MHz' },
    { canal: 'Frequência de Ações / Assaltos', freq: '202.0 MHz' },
    { canal: 'Frequência de Fuga', freq: '303.3 MHz' }
  ]);
  const [regras, setRegras] = useState([
    'Respeito máximo por todos os membros, independentemente do cargo.',
    'Proibido toxicidade em calls públicas ou com outras organizações.',
    'Uso obrigatório da farda estipulada nas ações oficiais da Magnatas 01!',
    'Disponibilidade para reuniões gerais e alinhamentos de gang.'
  ]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        const unsubscribeDoc = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserData(docSnap.data());
          } else {
            setUserData({ status: 'sem_candidatura', role: 'Visitante' });
          }
          setLoading(false);
        });

        // Buscar todos os utilizadores para a aba de Admin
        const q = query(collection(db, 'users'));
        const querySnapshot = await getDocs(q);
        const usersList = [];
        querySnapshot.forEach((doc) => {
          usersList.push({ id: doc.id, ...doc.data() });
        });
        setAllUsers(usersList);

        return () => unsubscribeDoc();
      } else {
        setUser(null);
        setUserData(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Erro no login:", error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleSubmitCandidatura = async (e) => {
    e.preventDefault();
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const payload = {
      uid: user.uid,
      email: user.email,
      nome: user.displayName,
      ...formData,
      status: 'pendente',
      role: 'Visitante',
      dataSubmissao: new Date().toISOString()
    };
    await setDoc(userRef, payload, { merge: true });
  };

  const atualizarStatusCandidato = async (targetUid, novoStatus, novoCargo = 'Membro') => {
    const userRef = doc(db, 'users', targetUid);
    await updateDoc(userRef, { status: novoStatus, role: novoCargo });
    // Recarregar lista local
    setAllUsers(allUsers.map(u => u.uid === targetUid ? { ...u, status: novoStatus, role: novoCargo } : u));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-red-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-neutral-900 border border-red-900/40 p-8 rounded-2xl text-center shadow-2xl space-y-6">
          <Shield className="w-16 h-16 text-red-600 mx-auto animate-pulse" />
          <h1 className="text-3xl font-black text-red-600 tracking-wider">MAGNATAS 01!</h1>
          <p className="text-neutral-400 text-sm">Base operacional privada de FiveM.</p>
          <button onClick={handleLogin} className="w-full flex items-center justify-center space-x-3 bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded-xl font-bold transition">
            <LogIn className="w-5 h-5" /><span>Iniciar Sessão com Google</span>
          </button>
        </div>
      </div>
    );
  }

  if (userData?.status === 'sem_candidatura') {
    return (
      <div className="min-h-screen bg-neutral-950 text-white p-6 flex justify-center items-center">
        <div className="max-w-2xl w-full bg-neutral-900 border border-neutral-800 p-8 rounded-2xl space-y-6">
          <h1 className="text-2xl font-black text-red-600 border-b border-neutral-800 pb-4">FORMULÁRIO DE RECRUTAMENTO</h1>
          <form onSubmit={handleSubmitCandidatura} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="text-xs text-neutral-400 font-bold">IDADE</label><input required type="number" value={formData.idade} onChange={e => setFormData({...formData, idade: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:border-red-600 outline-none" /></div>
              <div><label className="text-xs text-neutral-400 font-bold">NOME IN-GAME</label><input required type="text" value={formData.nomeIngame} onChange={e => setFormData({...formData, nomeIngame: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:border-red-600 outline-none" /></div>
              <div><label className="text-xs text-neutral-400 font-bold">ID IN-GAME</label><input required type="text" value={formData.idIngame} onChange={e => setFormData({...formData, idIngame: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:border-red-600 outline-none" /></div>
              <div><label className="text-xs text-neutral-400 font-bold">KILLS ATUAIS</label><input required type="number" value={formData.kills} onChange={e => setFormData({...formData, kills: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:border-red-600 outline-none" /></div>
            </div>
            <div><label className="text-xs text-neutral-400 font-bold">TEMPO DE CIDADE</label><input required type="text" value={formData.tempoCidade} onChange={e => setFormData({...formData, tempoCidade: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:border-red-600 outline-none" /></div>
            <div><label className="text-xs text-neutral-400 font-bold">MOTIVO PARA ENTRAR</label><textarea required rows="3" value={formData.motivo} onChange={e => setFormData({...formData, motivo: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:border-red-600 outline-none"></textarea></div>
            <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl flex items-center justify-center space-x-2"><Send className="w-5 h-5"/><span>Enviar Candidatura</span></button>
          </form>
        </div>
      </div>
    );
  }

  if (userData?.status === 'pendente') {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-neutral-900 border border-amber-900/40 p-8 rounded-2xl text-center space-y-4">
          <Clock className="w-16 h-16 text-amber-500 mx-auto animate-pulse" />
          <h1 className="text-2xl font-black text-white">CANDIDATURA PENDENTE</h1>
          <p className="text-neutral-400 text-sm">O alto comando da Magnatas 01 está a analisar os teus dados.</p>
          <button onClick={handleLogout} className="text-xs text-neutral-500 hover:text-white underline">Terminar Sessão</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      <header className="border-b border-red-900/40 bg-neutral-900/90 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Shield className="w-8 h-8 text-red-600" />
          <h1 className="text-2xl font-black tracking-wider text-red-600 uppercase">MAGNATAS 01!</h1>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-red-950/60 border border-red-900/50 px-3 py-1.5 rounded-full flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-neutral-200 uppercase">{userData?.role || 'Membro'}</span>
          </div>
          <button onClick={handleLogout} className="text-neutral-400 hover:text-white"><LogOut className="w-5 h-5"/></button>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="w-64 border-r border-neutral-800 bg-neutral-900/30 p-4 space-y-2">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition ${activeTab === 'dashboard' ? 'bg-red-600 text-white shadow-lg shadow-red-900/30' : 'hover:bg-neutral-800 text-neutral-400'}`}><Users className="w-5 h-5" /><span>Base da Gang</span></button>
          <button onClick={() => setActiveTab('roupas')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition ${activeTab === 'roupas' ? 'bg-red-600 text-white shadow-lg shadow-red-900/30' : 'hover:bg-neutral-800 text-neutral-400'}`}><Shirt className="w-5 h-5" /><span>Roupas & Kits</span></button>
          <button onClick={() => setActiveTab('radio')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition ${activeTab === 'radio' ? 'bg-red-600 text-white shadow-lg shadow-red-900/30' : 'hover:bg-neutral-800 text-neutral-400'}`}><Radio className="w-5 h-5" /><span>Frequências Rádio</span></button>
          <button onClick={() => setActiveTab('regras')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition ${activeTab === 'regras' ? 'bg-red-600 text-white shadow-lg shadow-red-900/30' : 'hover:bg-neutral-800 text-neutral-400'}`}><BookOpen className="w-5 h-5" /><span>Regras Oficiais</span></button>
          
          {(userData?.role === 'Founder' || userData?.role === 'Staff') && (
            <button onClick={() => setActiveTab('admin')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition ${activeTab === 'admin' ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/30' : 'hover:bg-neutral-800 text-amber-500'}`}><Settings className="w-5 h-5" /><span>Painel Admin</span></button>
          )}
        </aside>

        <main className="flex-1 p-8 space-y-6 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-neutral-900 to-neutral-900/50 border border-red-900/30 rounded-2xl p-8 shadow-xl">
                <h2 className="text-3xl font-black mb-2 text-white">BEM-VINDO À CENTRAL, {userData?.nome || 'MEMBRO'}</h2>
                <p className="text-neutral-400">Aqui tens acesso direto aos recursos operativos, frequências seguras e diretrizes da Magnatas 01!.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                  <h3 className="text-neutral-400 text-xs font-bold uppercase mb-1">Membros Ativos</h3>
                  <p className="text-3xl font-black text-emerald-500">Online</p>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                  <h3 className="text-neutral-400 text-xs font-bold uppercase mb-1">O teu Cargo</h3>
                  <p className="text-3xl font-black text-red-600">{userData?.role}</p>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                  <h3 className="text-neutral-400 text-xs font-bold uppercase mb-1">Estado da Conta</h3>
                  <p className="text-3xl font-black text-white capitalize">{userData?.status}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'roupas' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-white">ROUPAS E UNIFORMES OFICIAIS</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {roupas.map(r => (
                  <div key={r.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-3">
                    <h3 className="text-lg font-bold text-red-500">{r.nome}</h3>
                    <div className="text-sm text-neutral-300 space-y-1">
                      <p>Top / Casaco: <span className="font-mono text-white font-bold">{r.top}</span></p>
                      <p>Calças: <span className="font-mono text-white font-bold">{r.calcas}</span></p>
                      <p>Máscara / Acessório: <span className="font-mono text-white font-bold">{r.Mascara}</span></p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'radio' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-white">FREQUÊNCIAS DE RÁDIO</h2>
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
                {radios.map((rad, idx) => (
                  <div key={idx} className="flex justify-between items-center border-b border-neutral-800 pb-4">
                    <span className="font-bold text-neutral-200">{rad.canal}</span>
                    <span className="font-mono bg-red-950 text-red-400 px-4 py-1.5 rounded-xl border border-red-900/50 font-bold">{rad.freq}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'regras' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-white">DIRETRIZES E REGRAS</h2>
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
                {regras.map((regra, idx) => (
                  <div key={idx} className="flex items-start space-x-3 border-b border-neutral-800 pb-4">
                    <span className="text-red-600 font-black">#{idx + 1}</span>
                    <p className="text-neutral-300 text-sm">{regra}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'admin' && (userData?.role === 'Founder' || userData?.role === 'Staff') && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-amber-500">PAINEL DE GESTÃO E CANDIDATURAS</h2>
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-400">
                      <th className="pb-3">Utilizador</th>
                      <th className="pb-3">In-Game</th>
                      <th className="pb-3">Estado</th>
                      <th className="pb-3">Cargo</th>
                      <th className="pb-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {allUsers.map(u => (
                      <tr key={u.uid}>
                        <td className="py-4 font-bold text-white">{u.nome || u.email}</td>
                        <td className="py-4 text-neutral-300">{u.nomeIngame || 'N/A'} (ID: {u.idIngame || '-'})</td>
                        <td className="py-4"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${u.status === 'aprovado' ? 'bg-emerald-950 text-emerald-400' : u.status === 'pendente' ? 'bg-amber-950 text-amber-400' : 'bg-red-950 text-red-400'}`}>{u.status}</span></td>
                        <td className="py-4 text-neutral-300">{u.role}</td>
                        <td className="py-4 text-right space-x-2">
                          {u.status === 'pendente' && (
                            <>
                              <button onClick={() => atualizarStatusCandidato(u.uid, 'aprovado', 'Membro')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold">Aprovar</button>
                              <button onClick={() => atualizarStatusCandidato(u.uid, 'reprovado', 'Visitante')} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold">Reprovar</button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
