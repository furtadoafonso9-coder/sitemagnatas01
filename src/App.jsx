import React, { useState, useEffect } from 'react';
import { 
  Shield, Users, LogIn, LogOut, Clock, XCircle, Shirt, Radio, BookOpen, Send, Settings, Plus, Trash2, Award, Star, AlertCircle, UserX, Crown, Search, History, StickyNote, Download, CheckSquare, Square, Sun, Moon, User, Bell, MessageSquare, ShieldAlert, Check, UserCheck
} from 'lucide-react';
import { auth, googleProvider, db } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, onSnapshot, collection, query, getDocs, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';

export default function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [adminSubTab, setAdminSubTab] = useState('membros'); // 'membros' ou 'candidaturas'
  const [darkMode, setDarkMode] = useState(true);

  const [allUsers, setAllUsers] = useState([]);
  const [formData, setFormData] = useState({ idade: '', nomeIngame: '', idIngame: '', kills: '', tempoCidade: '', motivo: '', fotoPerfil: '', bio: '' });

  // Edição de Perfil Próprio
  const [perfilEdit, setPerfilEdit] = useState({ fotoPerfil: '', bio: '' });

  // Conteúdos dinâmicos
  const [roupas, setRoupas] = useState([]);
  const [radios, setRadios] = useState([]);
  const [regras, setRegras] = useState([]);
  const [cargosCustom, setCargosCustom] = useState([]);
  const [avisosGerais, setAvisosGerais] = useState([]);
  const [pedidosUpgrade, setPedidosUpgrade] = useState([]);
  const [autorizacoes, setAutorizacoes] = useState([]);

  // Estados de Moderação / Filtros / Seleção
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroCargo, setFiltroCargo] = useState('todos');
  const [membrosSelecionados, setMembrosSelecionados] = useState([]);
  const [membroModalAudit, setMembroModalAudit] = useState(null);
  const [notaEdicao, setNotaEdicao] = useState('');
  const [cargoMenuAberto, setCargoMenuAberto] = useState(null);

  // Formulários
  const [novaRoupa, setNovaRoupa] = useState({ nome: '', top: '', calcas: '', mascara: '', imagem: '' });
  const [novaRadio, setNovaRadio] = useState({ canal: '', freq: '' });
  const [novaRegra, setNovaRegra] = useState('');
  const [novoAviso, setNovoAviso] = useState({ titulo: '', mensagem: '' });
  const [novoPedidoUpgrade, setNovoPedidoUpgrade] = useState({ cargoDesejado: '', motivo: '' });
  const [novoPedidoAuth, setNovoPedidoAuth] = useState({ tipo: 'Autorização P/ Calças', motivo: '' });
  const [novoCargoNome, setNovoCargoNome] = useState('');
  const [novaCategoriaCargo, setNovaCategoriaCargo] = useState('Cargos Administrativos e Staff');

  // Categorias base de cargos
  const categoriasBase = [
    "Cargos Administrativos e Staff", 
    "Membros e Comunidade", 
    "Cargos de Moderação e Punições", 
    "Bots e Integrações", 
    "Outros / Autorizações"
  ];

  const cargosPadrao = [
    { categoria: "Cargos Administrativos e Staff", cargos: ["Staff ATHOS PvP", "01 Founder´s", "01 Leader´s", "| Magnata 01! ©", "Resp. Manager´s", "01 Manager´s", "Suport", "Manager´s Approval", "Resp. Member´s", "Owner"] },
    { categoria: "Membros e Comunidade", cargos: ["01 Member´s", "Server Booster´s", "01 Friend´s", "01 Visitant", "PVP Player", "Homem", "Mulher"] },
    { categoria: "Cargos de Moderação e Punições", cargos: ["Ban Temporário", "Ban Perma", "Muted", "Ausente", "Warning 1", "Warning 2", "Warning AFK"] },
    { categoria: "Bots e Integrações", cargos: ["Streamer"] },
    { categoria: "Outros / Autorizações", cargos: ["Conta ALT", "Autorização P/ Calças", "Autorização P/ Manga"] }
  ];

  const categoriasCargos = categoriasBase.map(cat => {
    const extrasDestaCat = cargosCustom.filter(c => c.categoria === cat).map(c => c.nome);
    const padraoDestaCat = cargosPadrao.find(p => p.categoria === cat)?.cargos || [];
    return {
      categoria: cat,
      cargos: [...padraoDestaCat, ...extrasDestaCat]
    };
  });

  const cargosDisponiveis = categoriasCargos.flatMap(cat => cat.cargos);

  const getCargoColorStyle = (cargo) => {
    const c = cargo.toLowerCase();
    if (c.includes('owner') || c.includes('founder') || c.includes('magnata')) return 'bg-purple-950/80 text-purple-300 border-purple-800';
    if (c.includes('staff') || c.includes('manager') || c.includes('suport')) return 'bg-blue-950/80 text-blue-300 border-blue-800';
    if (c.includes('booster') || c.includes('streamer') || c.includes('friend')) return 'bg-pink-950/80 text-pink-300 border-pink-800';
    if (c.includes('warning') || c.includes('ban') || c.includes('muted')) return 'bg-red-950/80 text-red-300 border-red-800';
    if (c.includes('member') || c.includes('player') || c.includes('homem') || c.includes('mulher')) return 'bg-emerald-950/80 text-emerald-300 border-emerald-800';
    return 'bg-amber-950/80 text-amber-300 border-amber-800';
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        const unsubscribeDoc = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (!data.roles && data.role) {
              data.roles = [data.role];
            } else if (!data.roles) {
              data.roles = ['01 Visitant'];
            }
            setUserData(data);
            setPerfilEdit({ fotoPerfil: data.fotoPerfil || '', bio: data.bio || '' });
          } else {
            const defaultData = { 
              uid: currentUser.uid,
              email: currentUser.email,
              nome: currentUser.displayName || 'Membro',
              status: 'sem_candidatura', 
              roles: ['01 Visitant'],
              role: '01 Visitant',
              auditLog: [],
              notasInternas: '',
              fotoPerfil: currentUser.photoURL || '',
              bio: 'Membro oficial da Magnatas 01!'
            };
            setDoc(userRef, defaultData, { merge: true });
            setUserData(defaultData);
            setPerfilEdit({ fotoPerfil: defaultData.fotoPerfil, bio: defaultData.bio });
          }
          setLoading(false);
        });

        carregarDadosGang();
        return () => unsubscribeDoc();
      } else {
        setUser(null);
        setUserData(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const carregarDadosGang = async () => {
    try {
      const usersSnap = await getDocs(query(collection(db, 'users')));
      const usersList = [];
      usersSnap.forEach((d) => {
        const u = d.data();
        usersList.push({ 
          id: d.id, 
          ...u, 
          roles: u.roles || (u.role ? [u.role] : ['01 Visitant']),
          auditLog: u.auditLog || [],
          notasInternas: u.notasInternas || ''
        });
      });
      setAllUsers(usersList);

      const roupasSnap = await getDocs(query(collection(db, 'roupas')));
      const roupasList = [];
      roupasSnap.forEach(d => roupasList.push({ id: d.id, ...d.data() }));
      setRoupas(roupasList);

      const radiosSnap = await getDocs(query(collection(db, 'radios')));
      const radiosList = [];
      radiosSnap.forEach(d => radiosList.push({ id: d.id, ...d.data() }));
      setRadios(radiosList);

      const regrasSnap = await getDocs(query(collection(db, 'regras')));
      const regrasList = [];
      regrasSnap.forEach(d => regrasList.push({ id: d.id, ...d.data() }));
      setRegras(regrasList);

      const cargosSnap = await getDocs(query(collection(db, 'cargosCustom')));
      const cargosList = [];
      cargosSnap.forEach(d => cargosList.push({ id: d.id, ...d.data() }));
      setCargosCustom(cargosList);

      const avisosSnap = await getDocs(query(collection(db, 'avisosGerais')));
      const avisosList = [];
      avisosSnap.forEach(d => avisosList.push({ id: d.id, ...d.data() }));
      setAvisosGerais(avisosList);

      const upgradeSnap = await getDocs(query(collection(db, 'pedidosUpgrade')));
      const upgradeList = [];
      upgradeSnap.forEach(d => upgradeList.push({ id: d.id, ...d.data() }));
      setPedidosUpgrade(upgradeList);

      const authSnap = await getDocs(query(collection(db, 'autorizacoes')));
      const authList = [];
      authSnap.forEach(d => authList.push({ id: d.id, ...d.data() }));
      setAutorizacoes(authList);
    } catch (e) {
      console.error("Erro ao carregar dados do Firestore:", e);
    }
  };

  const registarAuditLog = (userObj, acao, detalhe) => {
    const novoLog = {
      data: new Date().toLocaleString('pt-PT'),
      autor: userData?.nomeIngame || userData?.nome || 'Staff',
      acao,
      detalhe
    };
    return [novoLog, ...(userObj.auditLog || [])];
  };

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
    const logInicial = [{ data: new Date().toLocaleString('pt-PT'), autor: formData.nomeIngame, acao: 'Candidatura Submetida', detalhe: 'Formulário inicial preenchido' }];
    const payload = {
      ...userData,
      uid: user.uid,
      email: user.email,
      nomeReal: user.displayName || 'Membro',
      ...formData,
      status: 'pendente',
      roles: ['01 Visitant'],
      auditLog: logInicial,
      dataEntrada: new Date().toLocaleDateString('pt-PT')
    };
    await setDoc(userRef, payload, { merge: true });
    setUserData(payload);
    setPerfilEdit({ fotoPerfil: formData.fotoPerfil, bio: formData.bio });
  };

  const guardarPerfilPessoal = async (e) => {
    e.preventDefault();
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, { fotoPerfil: perfilEdit.fotoPerfil, bio: perfilEdit.bio });
    setUserData(prev => ({ ...prev, ...perfilEdit }));
    carregarDadosGang();
    alert("Perfil atualizado com sucesso!");
  };

  const publicarAvisoGeral = async (e) => {
    e.preventDefault();
    if (!novoAviso.titulo || !novoAviso.mensagem) return;
    await addDoc(collection(db, 'avisosGerais'), {
      ...novoAviso,
      autor: userData?.nomeIngame || userData?.nome || 'Admin',
      data: new Date().toLocaleString('pt-PT')
    });
    setNovoAviso({ titulo: '', mensagem: '' });
    carregarDadosGang();
  };

  const apagarAvisoGeral = async (id) => {
    await deleteDoc(doc(db, 'avisosGerais', id));
    carregarDadosGang();
  };

  const submeterPedidoUpgrade = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'pedidosUpgrade'), {
      uid: user.uid,
      membro: userData?.nomeIngame || userData?.nome,
      ...novoPedidoUpgrade,
      status: 'pendente',
      data: new Date().toLocaleString('pt-PT')
    });
    setNovoPedidoUpgrade({ cargoDesejado: '', motivo: '' });
    carregarDadosGang();
    alert("Pedido de upgrade submetido com sucesso!");
  };

  const atualizarStatusUpgrade = async (id, novoStatus) => {
    await updateDoc(doc(db, 'pedidosUpgrade', id), { status: novoStatus });
    carregarDadosGang();
  };

  const submeterPedidoAutorizacao = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'autorizacoes'), {
      uid: user.uid,
      membro: userData?.nomeIngame || userData?.nome,
      ...novoPedidoAuth,
      status: 'pendente',
      data: new Date().toLocaleString('pt-PT')
    });
    setNovoPedidoAuth({ tipo: 'Autorização P/ Calças', motivo: '' });
    carregarDadosGang();
    alert("Solicitação enviada com sucesso!");
  };

  const atualizarStatusAutorizacao = async (id, novoStatus) => {
    await updateDoc(doc(db, 'autorizacoes', id), { status: novoStatus });
    carregarDadosGang();
  };

  const atualizarStatusCandidato = async (targetUid, novoStatus, novosCargos = ['01 Member´s']) => {
    const userTarget = allUsers.find(u => u.uid === targetUid);
    if (!userTarget) return;
    const logs = registarAuditLog(userTarget, 'Alteração de Estado', `Estado alterado para ${novoStatus.toUpperCase()}`);
    const userRef = doc(db, 'users', targetUid);
    await updateDoc(userRef, { status: novoStatus, roles: novosCargos, role: novosCargos[0] || '01 Member´s', auditLog: logs });
    carregarDadosGang();
  };

  const alternarCargoMembro = async (targetUid, cargoTarget, userRolesAtual = []) => {
    const userTarget = allUsers.find(u => u.uid === targetUid);
    if (!userTarget) return;

    let novasRoles = [...userRolesAtual];
    let acaoTxt = '';
    if (novasRoles.includes(cargoTarget)) {
      novasRoles = novasRoles.filter(c => c !== cargoTarget);
      acaoTxt = `Cargo Removido: ${cargoTarget}`;
    } else {
      novasRoles.push(cargoTarget);
      acaoTxt = `Cargo Adicionado: ${cargoTarget}`;
    }
    if (novasRoles.length === 0) novasRoles = ['01 Member´s'];
    
    const logs = registarAuditLog(userTarget, 'Gestão de Cargo', acaoTxt);
    const userRef = doc(db, 'users', targetUid);
    await updateDoc(userRef, { roles: novasRoles, role: novasRoles[0], auditLog: logs });
    carregarDadosGang();
  };

  const alternarDestaqueMembro = async (targetUid, destaqueAtual) => {
    const userTarget = allUsers.find(u => u.uid === targetUid);
    if (!userTarget) return;
    const logs = registarAuditLog(userTarget, 'Destaque', destaqueAtual ? 'Destaque Removido' : 'Destaque Atribuído');
    const userRef = doc(db, 'users', targetUid);
    await updateDoc(userRef, { emDestaque: !destaqueAtual, auditLog: logs });
    carregarDadosGang();
  };

  const guardarNotaInterna = async (targetUid) => {
    const userTarget = allUsers.find(u => u.uid === targetUid);
    if (!userTarget) return;
    const logs = registarAuditLog(userTarget, 'Nota Interna', 'Nota confidencial atualizada');
    const userRef = doc(db, 'users', targetUid);
    await updateDoc(userRef, { notasInternas: notaEdicao, auditLog: logs });
    setMembroModalAudit(prev => prev ? { ...prev, notasInternas: notaEdicao } : null);
    carregarDadosGang();
  };

  const selecionarTodosVisiveis = () => {
    if (membrosSelecionados.length === membrosFiltrados.length) {
      setMembrosSelecionados([]);
    } else {
      setMembrosSelecionados(membrosFiltrados.map(m => m.uid));
    }
  };

  const alternarSelecaoMembro = (uid) => {
    if (membrosSelecionados.includes(uid)) {
      setMembrosSelecionados(membrosSelecionados.filter(id => id !== uid));
    } else {
      setMembrosSelecionados([...membrosSelecionados, uid]);
    }
  };

  const acaoEmMassaCargo = async (cargo, adicionar = true) => {
    for (const uid of membrosSelecionados) {
      const u = allUsers.find(x => x.uid === uid);
      if (u) {
        let novas = [...u.roles];
        if (adicionar && !novas.includes(cargo)) novas.push(cargo);
        if (!adicionar) novas = novas.filter(x => x !== cargo);
        const logs = registarAuditLog(u, 'Ação em Massa', `${adicionar ? 'Adicionado' : 'Removido'} cargo ${cargo}`);
        await updateDoc(doc(db, 'users', uid), { roles: novas, auditLog: logs });
      }
    }
    setMembrosSelecionados([]);
    carregarDadosGang();
  };

  const exportarMembrosJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allUsers, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "membros_magnatas01.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const adicionarRoupa = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'roupas'), novaRoupa);
    setNovaRoupa({ nome: '', top: '', calcas: '', mascara: '', imagem: '' });
    carregarDadosGang();
  };

  const apagarRoupa = async (id) => {
    await deleteDoc(doc(db, 'roupas', id));
    carregarDadosGang();
  };

  const adicionarRadio = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'radios'), novaRadio);
    setNovaRadio({ canal: '', freq: '' });
    carregarDadosGang();
  };

  const apagarRadio = async (id) => {
    await deleteDoc(doc(db, 'radios', id));
    carregarDadosGang();
  };

  const adicionarRegra = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'regras'), { texto: novaRegra });
    setNovaRegra('');
    carregarDadosGang();
  };

  const apagarRegra = async (id) => {
    await deleteDoc(doc(db, 'regras', id));
    carregarDadosGang();
  };

  const adicionarNovoCargo = async (e) => {
    e.preventDefault();
    if (!novoCargoNome.trim()) return;
    await addDoc(collection(db, 'cargosCustom'), { nome: novoCargoNome.trim(), categoria: novaCategoriaCargo });
    setNovoCargoNome('');
    carregarDadosGang();
  };

  const apagarCargoCustom = async (id) => {
    await deleteDoc(doc(db, 'cargosCustom', id));
    carregarDadosGang();
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
          <p className="text-neutral-400 text-sm">Acesso restrito à base operacional privada.</p>
          <button onClick={handleLogin} className="w-full flex items-center justify-center space-x-3 bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded-xl font-bold transition">
            <LogIn className="w-5 h-5" /><span>Iniciar Sessão com Google</span>
          </button>
        </div>
      </div>
    );
  }

  if (!userData || userData.status === 'sem_candidatura') {
    return (
      <div className="min-h-screen bg-neutral-950 text-white p-6 flex justify-center items-center">
        <div className="max-w-2xl w-full bg-neutral-900 border border-neutral-800 p-8 rounded-2xl space-y-6 shadow-2xl">
          <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
            <h1 className="text-2xl font-black text-red-600">FORMULÁRIO DE CANDIDATURA</h1>
            <button onClick={handleLogout} className="text-neutral-400 hover:text-white"><LogOut className="w-5 h-5"/></button>
          </div>
          <form onSubmit={handleSubmitCandidatura} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="text-xs text-neutral-400 font-bold">1. IDADE</label><input required type="number" value={formData.idade} onChange={e => setFormData({...formData, idade: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:border-red-600 outline-none" /></div>
              <div><label className="text-xs text-neutral-400 font-bold">2. NOME IN-GAME</label><input required type="text" value={formData.nomeIngame} onChange={e => setFormData({...formData, nomeIngame: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:border-red-600 outline-none" /></div>
              <div><label className="text-xs text-neutral-400 font-bold">3. ID IN-GAME</label><input required type="text" value={formData.idIngame} onChange={e => setFormData({...formData, idIngame: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:border-red-600 outline-none" /></div>
              <div><label className="text-xs text-neutral-400 font-bold">4. KILLS ATUAIS</label><input required type="number" value={formData.kills} onChange={e => setFormData({...formData, kills: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:border-red-600 outline-none" /></div>
            </div>
            <div><label className="text-xs text-neutral-400 font-bold">5. QUANTO TEMPO DE CIDADE?</label><input required type="text" value={formData.tempoCidade} onChange={e => setFormData({...formData, tempoCidade: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:border-red-600 outline-none" /></div>
            <div><label className="text-xs text-neutral-400 font-bold">6. LINK DA FOTO DE PERFIL / IN-GAME (URL) <span className="text-neutral-500 font-normal">(Opcional)</span></label><input type="text" placeholder="https://exemplo.com/foto.jpg" value={formData.fotoPerfil} onChange={e => setFormData({...formData, fotoPerfil: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:border-red-600 outline-none" /></div>
            <div><label className="text-xs text-neutral-400 font-bold">7. BIOGRAFIA / BREVE DESCRIÇÃO</label><input required type="text" placeholder="Ex: Operacional focado em assaltos..." value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:border-red-600 outline-none" /></div>
            <div><label className="text-xs text-neutral-400 font-bold">8. MOTIVO PARA ENTRAR NA GANG?</label><textarea required rows="3" value={formData.motivo} onChange={e => setFormData({...formData, motivo: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:border-red-600 outline-none"></textarea></div>
            <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl flex items-center justify-center space-x-2"><Send className="w-5 h-5"/><span>Submeter Candidatura</span></button>
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
          <h1 className="text-2xl font-black text-white">MAGNATAS 01!</h1>
          <p className="text-amber-400 font-bold">A tua candidatura está pendente.</p>
          <button onClick={handleLogout} className="text-xs text-neutral-500 hover:text-white underline pt-4">Sair da Conta</button>
        </div>
      </div>
    );
  }

  if (userData?.status === 'reprovado') {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-neutral-900 border border-red-900/40 p-8 rounded-2xl text-center space-y-4">
          <XCircle className="w-16 h-16 text-red-600 mx-auto" />
          <h1 className="text-2xl font-black text-white">MAGNATAS 01!</h1>
          <p className="text-red-500 font-bold">A tua candidatura foi reprovada.</p>
          <button onClick={async () => { await setDoc(doc(db, 'users', user.uid), { status: 'sem_candidatura' }, { merge: true }); }} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-xl text-sm">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const userRoles = userData?.roles || (userData?.role ? [userData.role] : []);
  const isFounder = userRoles.some(r => ['Owner', '| Magnata 01! ©', '01 Founder´s', 'Founder'].includes(r));
  const isSuportOrAdmin = isFounder || userRoles.some(r => ['Suport', 'Staff ATHOS PvP', 'Resp. Manager´s', 'Manager´s Approval'].includes(r));
  const isAdmOrFounder = isFounder || userRoles.some(r => ['Staff ATHOS PvP', 'Resp. Manager´s'].includes(r));

  // Filtros de membros
  const membrosFiltrados = allUsers.filter(u => {
    const ingame = (u.nomeIngame || '').toLowerCase();
    const idGame = (u.idIngame || '').toLowerCase();
    const motivo = (u.motivo || '').toLowerCase();
    const buscaLower = busca.toLowerCase();

    const bateBusca = ingame.includes(buscaLower) || idGame.includes(buscaLower) || motivo.includes(buscaLower);
    const bateStatus = filtroStatus === 'todos' || u.status === filtroStatus;
    const bateCargo = filtroCargo === 'todos' || u.roles?.includes(filtroCargo);

    return bateBusca && bateStatus && bateCargo;
  });

  const candidaturasPendentes = allUsers.filter(u => u.status === 'pendente');

  const totalAtivos = allUsers.filter(u => u.status === 'aprovado').length;
  const totalPendentes = candidaturasPendentes.length;
  const totalWarnings = allUsers.filter(u => u.roles?.some(r => r.includes('Warning'))).length;
  const totalFounders = allUsers.filter(u => u.roles?.some(r => ['Owner', '01 Founder´s', '| Magnata 01! ©'].includes(r))).length;

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${darkMode ? 'bg-neutral-950 text-neutral-100' : 'bg-neutral-100 text-neutral-900'}`}>
      
      {/* HEADER */}
      <header className={`border-b px-6 py-4 flex items-center justify-between transition-colors duration-300 ${darkMode ? 'border-red-900/40 bg-neutral-900/90' : 'border-neutral-300 bg-white/90 shadow-sm'}`}>
        <div className="flex items-center space-x-3">
          <Shield className="w-8 h-8 text-red-600" />
          <h1 className="text-2xl font-black tracking-wider text-red-600 uppercase">MAGNATAS 01!</h1>
        </div>
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setDarkMode(!darkMode)} 
            className={`p-2 rounded-xl border transition ${darkMode ? 'bg-neutral-800 border-neutral-700 text-amber-400 hover:bg-neutral-700' : 'bg-neutral-200 border-neutral-300 text-neutral-700 hover:bg-neutral-300'}`}
            title="Alternar Modo Escuro / Branco"
          >
            {darkMode ? <Sun className="w-5 h-5"/> : <Moon className="w-5 h-5"/>}
          </button>

          <div className="flex flex-wrap gap-1 max-w-xl">
            {userRoles.map((r, i) => (
              <span key={i} className={`border px-2.5 py-1 rounded-full text-xs font-bold uppercase ${getCargoColorStyle(r)}`}>{r}</span>
            ))}
          </div>
          <button onClick={handleLogout} className={`transition ${darkMode ? 'text-neutral-400 hover:text-white' : 'text-neutral-600 hover:text-black'}`} title="Sair"><LogOut className="w-5 h-5"/></button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* SIDEBAR */}
        <aside className={`w-64 border-r p-4 space-y-2 transition-colors duration-300 ${darkMode ? 'border-neutral-800 bg-neutral-900/30' : 'border-neutral-300 bg-white shadow-inner'}`}>
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition ${activeTab === 'dashboard' ? 'bg-red-600 text-white shadow-lg shadow-red-900/30' : darkMode ? 'hover:bg-neutral-800 text-neutral-400' : 'hover:bg-neutral-200 text-neutral-600'}`}><Users className="w-5 h-5" /><span>Base da Gang</span></button>
          <button onClick={() => setActiveTab('avisos_gerais')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition ${activeTab === 'avisos_gerais' ? 'bg-red-600 text-white shadow-lg shadow-red-900/30' : darkMode ? 'hover:bg-neutral-800 text-neutral-400' : 'hover:bg-neutral-200 text-neutral-600'}`}><Bell className="w-5 h-5" /><span>Avisos Gerais da Gang</span></button>
          <button onClick={() => setActiveTab('roupas')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition ${activeTab === 'roupas' ? 'bg-red-600 text-white shadow-lg shadow-red-900/30' : darkMode ? 'hover:bg-neutral-800 text-neutral-400' : 'hover:bg-neutral-200 text-neutral-600'}`}><Shirt className="w-5 h-5" /><span>Roupas & Kits</span></button>
          <button onClick={() => setActiveTab('radio')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition ${activeTab === 'radio' ? 'bg-red-600 text-white shadow-lg shadow-red-900/30' : darkMode ? 'hover:bg-neutral-800 text-neutral-400' : 'hover:bg-neutral-200 text-neutral-600'}`}><Radio className="w-5 h-5" /><span>Frequências Rádio</span></button>
          <button onClick={() => setActiveTab('regras')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition ${activeTab === 'regras' ? 'bg-red-600 text-white shadow-lg shadow-red-900/30' : darkMode ? 'hover:bg-neutral-800 text-neutral-400' : 'hover:bg-neutral-200 text-neutral-600'}`}><BookOpen className="w-5 h-5" /><span>Regras Oficiais</span></button>
          <button onClick={() => setActiveTab('cargos')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition ${activeTab === 'cargos' ? 'bg-red-600 text-white shadow-lg shadow-red-900/30' : darkMode ? 'hover:bg-neutral-800 text-neutral-400' : 'hover:bg-neutral-200 text-neutral-600'}`}><Award className="w-5 h-5" /><span>Lista de Cargos</span></button>
          <button onClick={() => setActiveTab('pedir_upgrade')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition ${activeTab === 'pedir_upgrade' ? 'bg-red-600 text-white shadow-lg shadow-red-900/30' : darkMode ? 'hover:bg-neutral-800 text-neutral-400' : 'hover:bg-neutral-200 text-neutral-600'}`}><Award className="w-5 h-5" /><span>Pedir Upgrade / Promoção</span></button>
          <button onClick={() => setActiveTab('autorizacoes')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition ${activeTab === 'autorizacoes' ? 'bg-red-600 text-white shadow-lg shadow-red-900/30' : darkMode ? 'hover:bg-neutral-800 text-neutral-400' : 'hover:bg-neutral-200 text-neutral-600'}`}><Shirt className="w-5 h-5" /><span>Autorizações (Calças/Manga)</span></button>
          <button onClick={() => setActiveTab('avisos_pessoais')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition ${activeTab === 'avisos_pessoais' ? 'bg-red-600 text-white shadow-lg shadow-red-900/30' : darkMode ? 'hover:bg-neutral-800 text-neutral-400' : 'hover:bg-neutral-200 text-neutral-600'}`}><ShieldAlert className="w-5 h-5" /><span>Meus Avisos / Punições</span></button>
          <button onClick={() => setActiveTab('discord')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition ${activeTab === 'discord' ? 'bg-red-600 text-white shadow-lg shadow-red-900/30' : darkMode ? 'hover:bg-neutral-800 text-neutral-400' : 'hover:bg-neutral-200 text-neutral-600'}`}><MessageSquare className="w-5 h-5" /><span>Discord da Gang</span></button>
          <button onClick={() => setActiveTab('perfil')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition ${activeTab === 'perfil' ? 'bg-red-600 text-white shadow-lg shadow-red-900/30' : darkMode ? 'hover:bg-neutral-800 text-neutral-400' : 'hover:bg-neutral-200 text-neutral-600'}`}><User className="w-5 h-5" /><span>Meu Perfil</span></button>
          
          {isSuportOrAdmin && (
            <button onClick={() => setActiveTab('admin')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition ${activeTab === 'admin' ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/30' : darkMode ? 'hover:bg-neutral-800 text-amber-500' : 'hover:bg-neutral-200 text-amber-600'}`}>
              <Settings className="w-5 h-5" />
              <div className="flex justify-between items-center w-full">
                <span>Painel Admin & Suporte</span>
                {totalPendentes > 0 && <span className="bg-red-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{totalPendentes}</span>}
              </div>
            </button>
          )}
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 p-8 space-y-6 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <div className={`border rounded-2xl p-8 shadow-xl transition-colors duration-300 ${darkMode ? 'bg-gradient-to-r from-neutral-900 to-neutral-900/50 border-red-900/30' : 'bg-gradient-to-r from-white to-neutral-100 border-neutral-300 shadow-md'}`}>
                <h2 className={`text-3xl font-black mb-2 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>CENTRAL PRIVADA — MAGNATAS 01!</h2>
                <p className={`${darkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>Plataforma oficial operacional. Consulta abaixo o estado de membros, líderes e punições.</p>
              </div>

              {/* Destaques */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-amber-500 flex items-center space-x-2 border-b border-neutral-800 pb-2">
                  <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
                  <span>Players em Destaque</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {allUsers.filter(u => u.emDestaque).map(m => (
                    <div key={m.uid} className={`border p-4 rounded-xl flex items-center space-x-4 shadow-lg transition-colors duration-300 ${darkMode ? 'bg-neutral-900 border-amber-500/40' : 'bg-white border-amber-300 shadow-sm'}`}>
                      {m.fotoPerfil ? (
                        <img src={m.fotoPerfil} alt={m.nomeIngame} className="w-12 h-12 rounded-full object-cover border border-amber-500" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-amber-950 border border-amber-600 flex items-center justify-center font-bold text-amber-400 uppercase">{m.nomeIngame?.[0]}</div>
                      )}
                      <div>
                        <h4 className={`font-bold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>{m.nomeIngame || 'Membro'}</h4>
                        <p className="text-xs text-amber-500 font-semibold">{m.roles?.[0] || 'Membro'}</p>
                        <p className="text-xs text-neutral-500">ID: {m.idIngame || 'N/A'}</p>
                        {m.bio && <p className="text-[11px] text-neutral-400 italic mt-1">"{m.bio}"</p>}
                      </div>
                    </div>
                  ))}
                  {allUsers.filter(u => u.emDestaque).length === 0 && (
                    <p className="text-xs text-neutral-500 italic col-span-3">Nenhum jogador marcado em destaque de momento.</p>
                  )}
                </div>
              </div>

              {/* Líderes */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-red-600 border-b border-neutral-800 pb-2">Líderes e Fundadores</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {allUsers.filter(u => u.roles?.some(r => ['Owner', '| Magnata 01! ©', '01 Founder´s', '01 Leader´s'].includes(r))).map(m => (
                    <div key={m.uid} className={`border p-4 rounded-xl flex items-center space-x-4 transition-colors duration-300 ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-300 shadow-sm'}`}>
                      {m.fotoPerfil ? (
                        <img src={m.fotoPerfil} alt={m.nomeIngame} className="w-12 h-12 rounded-full object-cover border border-red-600" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-red-950 border border-red-800 flex items-center justify-center font-bold text-red-500 uppercase">{m.nomeIngame?.[0]}</div>
                      )}
                      <div>
                        <h4 className={`font-bold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>{m.nomeIngame || 'Membro'}</h4>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {m.roles?.map((r, idx) => <span key={idx} className={`text-[10px] border px-1.5 py-0.5 rounded-md font-semibold ${getCargoColorStyle(r)}`}>{r}</span>)}
                        </div>
                        {m.bio && <p className="text-[11px] text-neutral-400 italic mt-1">"{m.bio}"</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Membros Ativos */}
              <div className="space-y-4">
                <h3 className={`text-xl font-bold border-b border-neutral-800 pb-2 ${darkMode ? 'text-neutral-200' : 'text-neutral-800'}`}>Membros Ativos</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {allUsers.filter(u => u.status === 'aprovado' && !u.roles?.some(r => ['Owner', '| Magnata 01! ©', '01 Founder´s', '01 Leader´s', 'Ausente', 'Ban Temporário', 'Ban Perma'].includes(r))).map(m => (
                    <div key={m.uid} className={`border p-4 rounded-xl flex items-center space-x-4 transition-colors duration-300 ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-300 shadow-sm'}`}>
                      {m.fotoPerfil ? (
                        <img src={m.fotoPerfil} alt={m.nomeIngame} className="w-12 h-12 rounded-full object-cover border border-neutral-700" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center font-bold text-white uppercase">{m.nomeIngame?.[0]}</div>
                      )}
                      <div>
                        <h4 className={`font-bold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>{m.nomeIngame || 'Membro'}</h4>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {m.roles?.map((r, idx) => <span key={idx} className={`text-[10px] border px-1.5 py-0.5 rounded-md font-semibold ${getCargoColorStyle(r)}`}>{r}</span>)}
                        </div>
                        {m.bio && <p className="text-[11px] text-neutral-400 italic mt-1">"{m.bio}"</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'avisos_gerais' && (
            <div className="space-y-6">
              <h2 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-neutral-900'}`}>AVISOS GERAIS DA GANG</h2>
              
              {isAdmOrFounder && (
                <div className={`border rounded-2xl p-6 space-y-4 shadow-md transition-colors duration-300 ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-300'}`}>
                  <h3 className="text-lg font-bold text-red-500">Publicar Novo Aviso Oficial</h3>
                  <form onSubmit={publicarAvisoGeral} className="space-y-3">
                    <input required type="text" placeholder="Título do Aviso..." value={novoAviso.titulo} onChange={e => setNovoAviso({...novoAviso, titulo: e.target.value})} className={`w-full border rounded-lg p-3 text-sm outline-none ${darkMode ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-neutral-50 border-neutral-300 text-black'}`} />
                    <textarea required rows="3" placeholder="Escreve aqui o comunicado oficial para a gang..." value={novoAviso.mensagem} onChange={e => setNovoAviso({...novoAviso, mensagem: e.target.value})} className={`w-full border rounded-lg p-3 text-sm outline-none ${darkMode ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-neutral-50 border-neutral-300 text-black'}`}></textarea>
                    <button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-6 rounded-xl text-sm flex items-center space-x-2"><Bell className="w-4 h-4"/><span>Publicar Aviso</span></button>
                  </form>
                </div>
              )}

              <div className="space-y-4">
                {avisosGerais.map(aviso => (
                  <div key={aviso.id} className={`border rounded-2xl p-6 space-y-3 relative shadow-md transition-colors duration-300 ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-300'}`}>
                    {isAdmOrFounder && (
                      <button onClick={() => apagarAvisoGeral(aviso.id)} className="absolute top-4 right-4 text-neutral-500 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                    )}
                    <div className="flex justify-between items-center border-b pb-2 border-neutral-800">
                      <h3 className="text-lg font-bold text-red-500">{aviso.titulo}</h3>
                      <span className="text-xs text-neutral-500 font-mono">{aviso.data} • Por: <strong className="text-white">{aviso.autor}</strong></span>
                    </div>
                    <p className={`text-sm ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>{aviso.mensagem}</p>
                  </div>
                ))}
                {avisosGerais.length === 0 && (
                  <p className="text-xs text-neutral-500 italic">Nenhum aviso geral publicado de momento.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'pedir_upgrade' && (
            <div className="space-y-6 max-w-xl mx-auto">
              <h2 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-neutral-900'}`}>SOLICITAR UPGRADE / PROMOÇÃO</h2>
              <div className={`border rounded-2xl p-6 space-y-6 shadow-md transition-colors duration-300 ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-300'}`}>
                <form onSubmit={submeterPedidoUpgrade} className="space-y-4">
                  <div>
                    <label className="text-xs text-neutral-400 font-bold">Cargo Desejado</label>
                    <select value={novoPedidoUpgrade.cargoDesejado} onChange={e => setNovoPedidoUpgrade({...novoPedidoUpgrade, cargoDesejado: e.target.value})} className={`w-full border rounded-lg p-3 text-sm outline-none mt-1 ${darkMode ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-neutral-50 border-neutral-300 text-black'}`}>
                      <option value="">Seleciona o cargo pretendido...</option>
                      {cargosDisponiveis.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-neutral-400 font-bold">Por que acreditas que deves subir de cargo?</label>
                    <textarea required rows="4" value={novoPedidoUpgrade.motivo} onChange={e => setNovoPedidoUpgrade({...novoPedidoUpgrade, motivo: e.target.value})} placeholder="Descreve as tuas contribuições e méritos na gang..." className={`w-full border rounded-lg p-3 text-sm outline-none mt-1 ${darkMode ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-neutral-50 border-neutral-300 text-black'}`}></textarea>
                  </div>
                  <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl flex items-center justify-center space-x-2">
                    <Award className="w-5 h-5"/><span>Enviar Pedido de Promoção</span>
                  </button>
                </form>

                <div className="space-y-3 pt-4 border-t border-neutral-800">
                  <h3 className="text-sm font-bold text-white">Os Teus Pedidos Recentes</h3>
                  {pedidosUpgrade.filter(p => isFounder || p.uid === user.uid).map(ped => (
                    <div key={ped.id} className={`border p-4 rounded-xl space-y-2 ${darkMode ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-100 border-neutral-300'}`}>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-red-500 text-sm">{ped.membro} ➔ {ped.cargoDesejado}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ped.status === 'aprovado' ? 'bg-emerald-950 text-emerald-400' : ped.status === 'reprovado' ? 'bg-red-950 text-red-400' : 'bg-amber-950 text-amber-400'}`}>{ped.status}</span>
                      </div>
                      <p className="text-xs text-neutral-300">"{ped.motivo}"</p>
                      {isFounder && ped.status === 'pendente' && (
                        <div className="flex space-x-2 pt-2">
                          <button onClick={() => atualizarStatusUpgrade(ped.id, 'aprovado')} className="bg-emerald-600 text-white px-3 py-1 rounded text-xs font-bold">Aprovar</button>
                          <button onClick={() => atualizarStatusUpgrade(ped.id, 'reprovado')} className="bg-red-600 text-white px-3 py-1 rounded text-xs font-bold">Reprovar</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'autorizacoes' && (
            <div className="space-y-6 max-w-xl mx-auto">
              <h2 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-neutral-900'}`}>SOLICITAR AUTORIZAÇÕES (CALÇAS / MANGA)</h2>
              <div className={`border rounded-2xl p-6 space-y-6 shadow-md transition-colors duration-300 ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-300'}`}>
                <form onSubmit={submeterPedidoAutorizacao} className="space-y-4">
                  <div>
                    <label className="text-xs text-neutral-400 font-bold">Tipo de Autorização</label>
                    <select value={novoPedidoAuth.tipo} onChange={e => setNovoPedidoAuth({...novoPedidoAuth, tipo: e.target.value})} className={`w-full border rounded-lg p-3 text-sm outline-none mt-1 ${darkMode ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-neutral-50 border-neutral-300 text-black'}`}>
                      <option value="Autorização P/ Calças">Autorização P/ Calças</option>
                      <option value="Autorização P/ Manga">Autorização P/ Manga</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-neutral-400 font-bold">Motivo / Justificação</label>
                    <textarea required rows="3" value={novoPedidoAuth.motivo} onChange={e => setNovoPedidoAuth({...novoPedidoAuth, motivo: e.target.value})} placeholder="Explica o motivo da solicitação..." className={`w-full border rounded-lg p-3 text-sm outline-none mt-1 ${darkMode ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-neutral-50 border-neutral-300 text-black'}`}></textarea>
                  </div>
                  <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl flex items-center justify-center space-x-2">
                    <Shirt className="w-5 h-5"/><span>Solicitar Autorização</span>
                  </button>
                </form>

                <div className="space-y-3 pt-4 border-t border-neutral-800">
                  <h3 className="text-sm font-bold text-white">Estado das Autorizações</h3>
                  {autorizacoes.filter(a => isFounder || a.uid === user.uid).map(auth => (
                    <div key={auth.id} className={`border p-4 rounded-xl space-y-2 ${darkMode ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-100 border-neutral-300'}`}>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-amber-400 text-sm">{auth.membro} ➔ {auth.tipo}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${auth.status === 'aprovado' ? 'bg-emerald-950 text-emerald-400' : auth.status === 'reprovado' ? 'bg-red-950 text-red-400' : 'bg-amber-950 text-amber-400'}`}>{auth.status}</span>
                      </div>
                      <p className="text-xs text-neutral-300">"{auth.motivo}"</p>
                      {isFounder && auth.status === 'pendente' && (
                        <div className="flex space-x-2 pt-2">
                          <button onClick={() => atualizarStatusAutorizacao(auth.id, 'aprovado')} className="bg-emerald-600 text-white px-3 py-1 rounded text-xs font-bold">Aprovar</button>
                          <button onClick={() => atualizarStatusAutorizacao(auth.id, 'reprovado')} className="bg-red-600 text-white px-3 py-1 rounded text-xs font-bold">Reprovar</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'avisos_pessoais' && (
            <div className="space-y-6 max-w-xl mx-auto">
              <h2 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-neutral-900'}`}>MEUS AVISOS E PUNIÇÕES</h2>
              <div className={`border rounded-2xl p-6 space-y-4 shadow-md transition-colors duration-300 ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-300'}`}>
                <div className="flex items-center space-x-3 border-b border-neutral-800 pb-4">
                  <ShieldAlert className="w-8 h-8 text-red-600 animate-pulse" />
                  <div>
                    <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>{userData?.nomeIngame}</h3>
                    <p className="text-xs text-neutral-500">Estado de Punições Ativo</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-bold text-neutral-400">Cargos de Punição / Advertências Atribuídas:</p>
                  <div className="flex flex-wrap gap-2">
                    {userData?.roles?.filter(r => r.includes('Warning') || r.includes('Ban') || r.includes('Muted')).map((p, i) => (
                      <span key={i} className="bg-red-950 border border-red-800 text-red-400 px-3 py-1.5 rounded-xl text-xs font-bold">
                        ⚠️ {p}
                      </span>
                    ))}
                    {(!userData?.roles || !userData.roles.some(r => r.includes('Warning') || r.includes('Ban') || r.includes('Muted'))) && (
                      <p className="text-xs text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-900 p-3 rounded-xl w-full">
                        ✅ Parabéns! Não tens nenhuma advertência ou punição registada na tua ficha.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'discord' && (
            <div className="space-y-6 max-w-xl mx-auto text-center py-10">
              <div className={`border rounded-2xl p-8 space-y-6 shadow-xl ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-300'}`}>
                <MessageSquare className="w-16 h-16 text-indigo-500 mx-auto animate-bounce" />
                <h2 className={`text-3xl font-black ${darkMode ? 'text-white' : 'text-neutral-900'}`}>DISCORD OFICIAL MAGNATAS 01!</h2>
                <p className="text-neutral-400 text-sm">Entra no nosso servidor de Discord para comunicados em tempo real, calls de assalto e suporte direto com a liderança.</p>
                <a href="https://discord.gg/MRdedT4nKd" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl transition shadow-lg">
                  <MessageSquare className="w-5 h-5"/><span>Entrar no Servidor do Discord</span>
                </a>
              </div>
            </div>
          )}

          {activeTab === 'perfil' && (
            <div className="space-y-6 max-w-xl mx-auto">
              <h2 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-neutral-900'}`}>GERIR MEU PERFIL</h2>
              <div className={`border rounded-2xl p-6 space-y-6 shadow-md transition-colors duration-300 ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-300'}`}>
                <div className="flex items-center space-x-4">
                  {perfilEdit.fotoPerfil ? (
                    <img src={perfilEdit.fotoPerfil} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-2 border-red-600 shadow" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-red-950 border-2 border-red-600 flex items-center justify-center font-bold text-xl text-red-500 uppercase">
                      {userData?.nomeIngame?.[0] || 'M'}
                    </div>
                  )}
                  <div>
                    <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-neutral-900'}`}>{userData?.nomeIngame || 'Membro'}</h3>
                    <p className="text-xs text-neutral-500">ID In-Game: {userData?.idIngame || 'N/A'}</p>
                  </div>
                </div>

                <form onSubmit={guardarPerfilPessoal} className="space-y-4">
                  <div>
                    <label className="text-xs text-neutral-400 font-bold">Link da Foto de Perfil (URL) <span className="text-neutral-500 font-normal">(Opcional)</span></label>
                    <input 
                      type="text" 
                      value={perfilEdit.fotoPerfil} 
                      onChange={e => setPerfilEdit({...perfilEdit, fotoPerfil: e.target.value})} 
                      placeholder="https://exemplo.com/foto.jpg" 
                      className={`w-full border rounded-lg p-3 text-sm outline-none mt-1 ${darkMode ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-neutral-50 border-neutral-300 text-black'}`} 
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-400 font-bold">Biografia / Descrição do Personagem</label>
                    <textarea 
                      rows="3" 
                      value={perfilEdit.bio} 
                      onChange={e => setPerfilEdit({...perfilEdit, bio: e.target.value})} 
                      placeholder="Conta um pouco sobre ti na cidade..." 
                      className={`w-full border rounded-lg p-3 text-sm outline-none mt-1 ${darkMode ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-neutral-50 border-neutral-300 text-black'}`}
                    ></textarea>
                  </div>
                  <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl flex items-center justify-center space-x-2">
                    <User className="w-5 h-5"/><span>Guardar Alterações do Perfil</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'roupas' && (
            <div className="space-y-6">
              <h2 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-neutral-900'}`}>ROUPAS E UNIFORMES OFICIAIS</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {roupas.map(r => (
                  <div key={r.id} className={`border rounded-2xl p-6 space-y-3 relative shadow-md transition-colors duration-300 ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-300'}`}>
                    {isFounder && (
                      <button onClick={() => apagarRoupa(r.id)} className="absolute top-4 right-4 text-neutral-500 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                    )}
                    {r.imagem && (
                      <img src={r.imagem} alt={r.nome} className="w-full h-48 object-cover rounded-xl border border-neutral-800 mb-2" />
                    )}
                    <h3 className="text-lg font-bold text-red-600">{r.nome}</h3>
                    <div className={`text-sm space-y-1 ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>
                      <p>Top / Casaco: <span className={`font-mono font-bold ${darkMode ? 'text-white' : 'text-black'}`}>{r.top}</span></p>
                      <p>Calças: <span className={`font-mono font-bold ${darkMode ? 'text-white' : 'text-black'}`}>{r.calcas}</span></p>
                      <p>Máscara / Acessório: <span className={`font-mono font-bold ${darkMode ? 'text-white' : 'text-black'}`}>{r.mascara}</span></p>
                    </div>
                  </div>
                ))}
              </div>

              {isFounder && (
                <div className={`border rounded-2xl p-6 mt-6 shadow-md transition-colors duration-300 ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-300'}`}>
                  <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>Adicionar Nova Roupa / Kit</h3>
                  <form onSubmit={adicionarRoupa} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input required type="text" placeholder="Nome do Kit" value={novaRoupa.nome} onChange={e => setNovaRoupa({...novaRoupa, nome: e.target.value})} className={`border rounded-lg p-3 text-sm outline-none ${darkMode ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-neutral-50 border-neutral-300 text-black'}`} />
                    <input required type="text" placeholder="Link da Imagem (URL da foto)" value={novaRoupa.imagem} onChange={e => setNovaRoupa({...novaRoupa, imagem: e.target.value})} className={`border rounded-lg p-3 text-sm outline-none ${darkMode ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-neutral-50 border-neutral-300 text-black'}`} />
                    <input required type="text" placeholder="Top (Ex: ID 142)" value={novaRoupa.top} onChange={e => setNovaRoupa({...novaRoupa, top: e.target.value})} className={`border rounded-lg p-3 text-sm outline-none ${darkMode ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-neutral-50 border-neutral-300 text-black'}`} />
                    <input required type="text" placeholder="Calças (Ex: ID 35)" value={novaRoupa.calcas} onChange={e => setNovaRoupa({...novaRoupa, calcas: e.target.value})} className={`border rounded-lg p-3 text-sm outline-none ${darkMode ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-neutral-50 border-neutral-300 text-black'}`} />
                    <input required type="text" placeholder="Máscara (Ex: ID 22)" value={novaRoupa.mascara} onChange={e => setNovaRoupa({...novaRoupa, mascara: e.target.value})} className={`md:col-span-2 border rounded-lg p-3 text-sm outline-none ${darkMode ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-neutral-50 border-neutral-300 text-black'}`} />
                    <button type="submit" className="md:col-span-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl flex items-center justify-center space-x-2"><Plus className="w-5 h-5"/><span>Guardar Roupa com Foto</span></button>
                  </form>
                </div>
              )}
            </div>
          )}

          {activeTab === 'radio' && (
            <div className="space-y-6">
              <h2 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-neutral-900'}`}>FREQUÊNCIAS DE RÁDIO OFICIAIS</h2>
              <div className={`border rounded-2xl p-6 space-y-4 shadow-md transition-colors duration-300 ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-300'}`}>
                {radios.map((rad) => (
                  <div key={rad.id} className={`flex justify-between items-center border-b pb-4 ${darkMode ? 'border-neutral-800' : 'border-neutral-200'}`}>
                    <span className={`font-bold ${darkMode ? 'text-neutral-200' : 'text-neutral-800'}`}>{rad.canal}</span>
                    <div className="flex items-center space-x-3">
                      <span className="font-mono bg-red-950 text-red-400 px-4 py-1.5 rounded-xl border border-red-900/50 font-bold">{rad.freq}</span>
                      {isFounder && (
                        <button onClick={() => apagarRadio(rad.id)} className="text-neutral-500 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {isFounder && (
                <div className={`border rounded-2xl p-6 shadow-md transition-colors duration-300 ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-300'}`}>
                  <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>Adicionar Nova Frequência</h3>
                  <form onSubmit={adicionarRadio} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input required type="text" placeholder="Nome do Canal (Ex: Rádio Fuga)" value={novaRadio.canal} onChange={e => setNovaRadio({...novaRadio, canal: e.target.value})} className={`border rounded-lg p-3 text-sm outline-none ${darkMode ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-neutral-50 border-neutral-300 text-black'}`} />
                    <input required type="text" placeholder="Frequência (Ex: 101.5 MHz)" value={novaRadio.freq} onChange={e => setNovaRadio({...novaRadio, freq: e.target.value})} className={`border rounded-lg p-3 text-sm outline-none ${darkMode ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-neutral-50 border-neutral-300 text-black'}`} />
                    <button type="submit" className="md:col-span-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl flex items-center justify-center space-x-2"><Plus className="w-5 h-5"/><span>Guardar Frequência</span></button>
                  </form>
                </div>
              )}
            </div>
          )}

          {activeTab === 'regras' && (
            <div className="space-y-6">
              <h2 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-neutral-900'}`}>DIRETRIZES E REGRAS DA GANG</h2>
              <div className={`border rounded-2xl p-6 space-y-4 shadow-md transition-colors duration-300 ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-300'}`}>
                {regras.map((regra, idx) => (
                  <div key={regra.id} className={`flex items-start justify-between border-b pb-4 ${darkMode ? 'border-neutral-800' : 'border-neutral-200'}`}>
                    <div className="flex items-start space-x-3">
                      <span className="text-red-600 font-black">#{idx + 1}</span>
                      <p className={`text-sm ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}`}>{regra.texto}</p>
                    </div>
                    {isFounder && (
                      <button onClick={() => apagarRegra(regra.id)} className="text-neutral-500 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                    )}
                  </div>
                ))}
              </div>

              {isFounder && (
                <div className={`border rounded-2xl p-6 shadow-md transition-colors duration-300 ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-300'}`}>
                  <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-neutral-900'}`}>Adicionar Nova Regra</h3>
                  <form onSubmit={adicionarRegra} className="space-y-3">
                    <textarea required rows="2" placeholder="Texto da regra..." value={novaRegra} onChange={e => setNovaRegra(e.target.value)} className={`w-full border rounded-lg p-3 text-sm outline-none ${darkMode ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-neutral-50 border-neutral-300 text-black'}`}></textarea>
                    <button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-6 rounded-xl text-sm flex items-center space-x-2"><Plus className="w-4 h-4"/><span>Adicionar Regra</span></button>
                  </form>
                </div>
              )}
            </div>
          )}

          {activeTab === 'cargos' && (
            <div className="space-y-6">
              <h2 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-neutral-900'}`}>HIERARQUIA DE CARGOS DA GANG</h2>

              {isFounder && (
                <div className={`border rounded-2xl p-6 space-y-4 shadow-xl transition-colors duration-300 ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-300'}`}>
                  <h3 className="text-lg font-bold text-red-500 flex items-center space-x-2">
                    <Plus className="w-5 h-5 bg-red-600 text-white rounded-md p-0.5" />
                    <span>Adicionar Novo Cargo</span>
                  </h3>
                  <form onSubmit={adicionarNovoCargo} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input required type="text" placeholder="Nome do Cargo..." value={novoCargoNome} onChange={e => setNovoCargoNome(e.target.value)} className={`border rounded-lg p-3 text-sm outline-none ${darkMode ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-neutral-50 border-neutral-300 text-black'}`} />
                    <select value={novaCategoriaCargo} onChange={e => setNovaCategoriaCargo(e.target.value)} className={`border rounded-lg p-3 text-sm outline-none ${darkMode ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-neutral-50 border-neutral-300 text-black'}`}>
                      {categoriasBase.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl flex items-center justify-center space-x-2"><Plus className="w-5 h-5"/><span>Criar Cargo</span></button>
                  </form>
                </div>
              )}

              <div className="space-y-6">
                {categoriasCargos.map((cat, i) => (
                  <div key={i} className={`border rounded-2xl p-6 space-y-4 shadow-md transition-colors duration-300 ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-300'}`}>
                    <h3 className="text-lg font-bold text-red-500 border-b border-neutral-800 pb-2">{cat.categoria}</h3>
                    <div className="flex flex-wrap gap-2">
                      {cat.cargos.map((c, j) => {
                        const customObj = cargosCustom.find(item => item.nome === c);
                        return (
                          <div key={j} className={`border px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-2 ${getCargoColorStyle(c)}`}>
                            <span>{c}</span>
                            {isFounder && customObj && (
                              <button onClick={() => apagarCargoCustom(customObj.id)} className="text-neutral-500 hover:text-red-500 ml-1"><Trash2 className="w-3.5 h-3.5"/></button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'admin' && isSuportOrAdmin && (
            <div className="space-y-6">
              
              {/* NAVEGAÇÃO ENTRE SUB-ABAS DE ADMIN */}
              <div className={`flex border-b border-neutral-800 space-x-4 pb-2`}>
                <button 
                  onClick={() => setAdminSubTab('membros')} 
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold transition ${adminSubTab === 'membros' ? 'bg-red-600 text-white shadow-md' : 'text-neutral-400 hover:bg-neutral-800'}`}
                >
                  <Users className="w-4 h-4"/>
                  <span>Gestão Geral de Membros</span>
                </button>
                <button 
                  onClick={() => setAdminSubTab('candidaturas')} 
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold transition relative ${adminSubTab === 'candidaturas' ? 'bg-red-600 text-white shadow-md' : 'text-neutral-400 hover:bg-neutral-800'}`}
                >
                  <UserCheck className="w-4 h-4"/>
                  <span>Candidaturas Pendentes</span>
                  {totalPendentes > 0 && (
                    <span className="bg-amber-500 text-black font-black text-[10px] px-2 py-0.5 rounded-full ml-1">{totalPendentes}</span>
                  )}
                </button>
              </div>

              {/* DASHBOARD RESUMO */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`border p-4 rounded-xl flex items-center space-x-3 shadow-md transition-colors duration-300 ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-300'}`}>
                  <div className="p-2.5 bg-emerald-950/60 border border-emerald-800 rounded-xl text-emerald-400"><Users className="w-5 h-5"/></div>
                  <div><p className="text-[10px] text-neutral-400 font-bold uppercase">Membros Ativos</p><p className={`text-xl font-black ${darkMode ? 'text-white' : 'text-neutral-900'}`}>{totalAtivos}</p></div>
                </div>
                <div className={`border p-4 rounded-xl flex items-center space-x-3 shadow-md transition-colors duration-300 ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-300'}`}>
                  <div className="p-2.5 bg-amber-950/60 border border-amber-800 rounded-xl text-amber-400"><Clock className="w-5 h-5"/></div>
                  <div><p className="text-[10px] text-neutral-400 font-bold uppercase">Pendentes</p><p className={`text-xl font-black ${darkMode ? 'text-white' : 'text-neutral-900'}`}>{totalPendentes}</p></div>
                </div>
                <div className={`border p-4 rounded-xl flex items-center space-x-3 shadow-md transition-colors duration-300 ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-300'}`}>
                  <div className="p-2.5 bg-red-950/60 border border-red-800 rounded-xl text-red-400"><AlertCircle className="w-5 h-5"/></div>
                  <div><p className="text-[10px] text-neutral-400 font-bold uppercase">Warnings Ativos</p><p className={`text-xl font-black ${darkMode ? 'text-white' : 'text-neutral-900'}`}>{totalWarnings}</p></div>
                </div>
                <div className={`border p-4 rounded-xl flex items-center space-x-3 shadow-md transition-colors duration-300 ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-300'}`}>
                  <div className="p-2.5 bg-purple-950/60 border border-purple-800 rounded-xl text-purple-400"><Crown className="w-5 h-5"/></div>
                  <div><p className="text-[10px] text-neutral-400 font-bold uppercase">Founders / Staff</p><p className={`text-xl font-black ${darkMode ? 'text-white' : 'text-neutral-900'}`}>{totalFounders}</p></div>
                </div>
              </div>

              {/* SUB-ABA: GESTÃO DE MEMBROS */}
              {adminSubTab === 'membros' && (
                <div className="space-y-4">
                  {/* BARRA DE PESQUISA E FILTROS */}
                  <div className={`border rounded-2xl p-3 flex flex-col md:flex-row gap-3 justify-between items-center shadow-md transition-colors duration-300 ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-300'}`}>
                    <div className={`flex-1 w-full flex items-center space-x-2 border rounded-xl px-3 py-1.5 ${darkMode ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-100 border-neutral-300'}`}>
                      <Search className="w-4 h-4 text-neutral-500" />
                      <input type="text" placeholder="Pesquisar por Nome In-Game, ID, Motivo..." value={busca} onChange={e => setBusca(e.target.value)} className={`bg-transparent text-xs outline-none w-full ${darkMode ? 'text-white' : 'text-black'}`} />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                      <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className={`text-xs rounded-xl p-2 outline-none border ${darkMode ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-neutral-100 border-neutral-300 text-black'}`}>
                        <option value="todos">Todos os Estados</option>
                        <option value="aprovado">Aprovados</option>
                        <option value="pendente">Pendentes</option>
                        <option value="reprovado">Reprovados</option>
                      </select>
                      <select value={filtroCargo} onChange={e => setFiltroCargo(e.target.value)} className={`text-xs rounded-xl p-2 outline-none border ${darkMode ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-neutral-100 border-neutral-300 text-black'}`}>
                        <option value="todos">Todos os Cargos</option>
                        {cargosDisponiveis.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <button onClick={exportarMembrosJSON} className="bg-neutral-800 hover:bg-neutral-700 text-white p-2 rounded-xl text-xs font-bold flex items-center space-x-1" title="Exportar Dados">
                        <Download className="w-4 h-4"/>
                      </button>
                    </div>
                  </div>

                  {/* AÇÕES EM MASSA */}
                  {membrosSelecionados.length > 0 && (
                    <div className="bg-red-950/80 border border-red-800 rounded-xl p-3 flex items-center justify-between">
                      <span className="text-xs font-bold text-red-200">{membrosSelecionados.length} membro(s) selecionado(s)</span>
                      <div className="flex gap-2">
                        <button onClick={() => acaoEmMassaCargo('Warning 1', true)} className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1 rounded-lg text-xs font-bold">+ Warning 1</button>
                        <button onClick={() => acaoEmMassaCargo('Ban Temporário', true)} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-xs font-bold">+ Ban Temp</button>
                        <button onClick={() => setMembrosSelecionados([])} className="text-xs text-neutral-400 hover:text-white underline">Cancelar</button>
                      </div>
                    </div>
                  )}

                  {/* TABELA COMPACTA REFORMULADA */}
                  <div className={`border rounded-2xl p-4 overflow-x-auto shadow-md transition-colors duration-300 ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-300'}`}>
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className={`border-b ${darkMode ? 'border-neutral-800 text-neutral-400' : 'border-neutral-200 text-neutral-600'}`}>
                          <th className="pb-2 w-6">
                            <button onClick={selecionarTodosVisiveis} className="text-neutral-500 hover:text-white">
                              {membrosSelecionados.length === membrosFiltrados.length && membrosFiltrados.length > 0 ? <CheckSquare className="w-3.5 h-3.5 text-red-500"/> : <Square className="w-3.5 h-3.5"/>}
                            </button>
                          </th>
                          <th className="pb-2">Membro</th>
                          <th className="pb-2">ID / Idade</th>
                          <th className="pb-2">Estado</th>
                          <th className="pb-2">Cargos Atribuidos</th>
                          <th className="pb-2 text-center">Gerir Cargos</th>
                          <th className="pb-2 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${darkMode ? 'divide-neutral-800' : 'divide-neutral-200'}`}>
                        {membrosFiltrados.map(u => {
                          const isSelected = membrosSelecionados.includes(u.uid);
                          const menuAberto = cargoMenuAberto === u.uid;

                          return (
                            <tr key={u.uid} className={isSelected ? (darkMode ? 'bg-red-950/20' : 'bg-red-50') : ''}>
                              <td className="py-2.5">
                                <button onClick={() => alternarSelecaoMembro(u.uid)} className="text-neutral-500 hover:text-white">
                                  {isSelected ? <CheckSquare className="w-3.5 h-3.5 text-red-500"/> : <Square className="w-3.5 h-3.5"/>}
                                </button>
                              </td>
                              <td className="py-2.5 font-bold">
                                <div className="flex items-center space-x-2">
                                  {u.fotoPerfil ? (
                                    <img src={u.fotoPerfil} alt={u.nomeIngame} className="w-7 h-7 rounded-full object-cover border border-red-600" />
                                  ) : (
                                    <div className="w-7 h-7 rounded-full bg-red-950 border border-red-800 flex items-center justify-center font-bold text-red-500 text-[10px] uppercase">{u.nomeIngame?.[0]}</div>
                                  )}
                                  <div>
                                    <span className={darkMode ? 'text-white' : 'text-neutral-900'}>{u.nomeIngame || 'Membro'}</span>
                                    <div className="text-[9px] text-neutral-500">{u.nomeReal || u.email}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-2.5 text-neutral-400">
                                <span className="font-bold text-white">ID: {u.idIngame || '-'}</span> | {u.idade ? `${u.idade} anos` : '-'}
                              </td>
                              <td className="py-2.5">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${u.status === 'aprovado' ? 'bg-emerald-950 text-emerald-400' : u.status === 'pendente' ? 'bg-amber-950 text-amber-400' : 'bg-red-950 text-red-400'}`}>{u.status}</span>
                              </td>

                              {/* CARGOS COMPACTOS */}
                              <td className="py-2.5">
                                <div className="flex flex-wrap gap-1 max-w-xs">
                                  {u.roles?.map((r, idx) => (
                                    <span key={idx} className={`text-[9px] border px-1.5 py-0.5 rounded-md font-semibold ${getCargoColorStyle(r)}`}>{r}</span>
                                  ))}
                                </div>
                              </td>

                              {/* BOTÃO COMPACTO PARA ATRIBUIR CARGOS VIA DROPDOWN */}
                              <td className="py-2.5 text-center relative">
                                <button 
                                  onClick={() => setCargoMenuAberto(menuAberto ? null : u.uid)}
                                  className="bg-neutral-800 hover:bg-neutral-700 text-white font-bold p-1.5 rounded-lg text-[10px] inline-flex items-center space-x-1"
                                >
                                  <Plus className="w-3.5 h-3.5 text-red-500"/>
                                  <span>Cargos</span>
                                </button>

                                {menuAberto && (
                                  <div className="absolute right-0 top-10 w-64 bg-neutral-900 border border-neutral-700 rounded-xl p-3 shadow-2xl z-50 text-left max-h-64 overflow-y-auto space-y-2">
                                    <div className="flex justify-between items-center border-b border-neutral-800 pb-1">
                                      <span className="text-[10px] font-bold text-neutral-400 uppercase">Atribuir / Remover Cargo</span>
                                      <button onClick={() => setCargoMenuAberto(null)} className="text-neutral-500 hover:text-white"><XCircle className="w-3.5 h-3.5"/></button>
                                    </div>
                                    {categoriasCargos.map((cat, cIdx) => (
                                      <div key={cIdx} className="space-y-1">
                                        <p className="text-[9px] font-bold text-red-500 uppercase">{cat.categoria}</p>
                                        <div className="flex flex-wrap gap-1">
                                          {cat.cargos.map(c => {
                                            const ativo = u.roles?.includes(c);
                                            return (
                                              <button 
                                                key={c}
                                                onClick={() => alternarCargoMembro(u.uid, c, u.roles)}
                                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition ${ativo ? 'bg-red-600 text-white border-red-500' : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-600'}`}
                                              >
                                                {ativo ? '✓ ' : '+ '}{c}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>

                              <td className="py-2.5 text-right space-x-1">
                                <button onClick={() => alternarDestaqueMembro(u.uid, u.emDestaque)} className={`p-1 rounded-lg border ${u.emDestaque ? 'bg-amber-950 border-amber-500 text-amber-400' : 'bg-neutral-950 border-neutral-800 text-neutral-500 hover:text-white'}`}>
                                  <Star className="w-3.5 h-3.5 fill-current" />
                                </button>
                                <button onClick={() => { setMembroModalAudit(u); setNotaEdicao(u.notasInternas || ''); }} className="bg-neutral-800 hover:bg-neutral-700 text-white p-1 rounded-lg inline-flex items-center" title="Ver Perfil & Audit Log">
                                  <History className="w-3.5 h-3.5 text-amber-500"/>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SUB-ABA: CANDIDATURAS PENDENTES */}
              {adminSubTab === 'candidaturas' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-amber-500 flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-amber-500"/>
                    <span>Candidaturas a Aguardar Avaliação ({candidaturasPendentes.length})</span>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {candidaturasPendentes.map(cand => (
                      <div key={cand.uid} className={`border p-5 rounded-2xl space-y-3 relative shadow-md transition-colors duration-300 ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-300'}`}>
                        <div className="flex items-center space-x-3 border-b border-neutral-800 pb-3">
                          {cand.fotoPerfil ? (
                            <img src={cand.fotoPerfil} alt={cand.nomeIngame} className="w-12 h-12 rounded-full object-cover border border-amber-500" />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-amber-950 border border-amber-600 flex items-center justify-center font-bold text-amber-400 uppercase">{cand.nomeIngame?.[0]}</div>
                          )}
                          <div>
                            <h4 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-neutral-900'}`}>{cand.nomeIngame || 'Candidato'}</h4>
                            <p className="text-xs text-neutral-400">Nome Real: {cand.nomeReal || cand.email} • ID: {cand.idIngame || 'N/A'}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs text-neutral-300">
                          <p>Idade: <strong className="text-white">{cand.idade || '-'}</strong></p>
                          <p>Kills: <strong className="text-white">{cand.kills || '-'}</strong></p>
                          <p className="col-span-2">Tempo de Cidade: <strong className="text-white">{cand.tempoCidade || '-'}</strong></p>
                        </div>

                        {cand.bio && <p className="text-xs text-neutral-400 italic">Bio: "{cand.bio}"</p>}
                        {cand.motivo && (
                          <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800/80 text-xs text-neutral-300">
                            <span className="font-bold text-amber-500 block mb-1">Motivo de entrada:</span>
                            "{cand.motivo}"
                          </div>
                        )}

                        <div className="flex space-x-3 pt-2">
                          <button onClick={() => atualizarStatusCandidato(cand.uid, 'aprovado', ['01 Member´s'])} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center space-x-1">
                            <Check className="w-4 h-4"/><span>Aprovar Membro</span>
                          </button>
                          <button onClick={() => atualizarStatusCandidato(cand.uid, 'reprovado', ['01 Visitant'])} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center space-x-1">
                            <XCircle className="w-4 h-4"/><span>Reprovar</span>
                          </button>
                        </div>
                      </div>
                    ))}

                    {candidaturasPendentes.length === 0 && (
                      <div className={`col-span-2 border p-8 rounded-2xl text-center space-y-2 ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-300'}`}>
                        <Check className="w-12 h-12 text-emerald-500 mx-auto" />
                        <h4 className="font-bold text-white">Sem Candidaturas Pendentes</h4>
                        <p className="text-xs text-neutral-400">Todas as candidaturas submetidas já foram avaliadas pela equipa.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          )}
        </main>
      </div>

      {/* MODAL AUDIT LOG & NOTAS INTERNAS */}
      {membroModalAudit && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`border max-w-2xl w-full rounded-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto ${darkMode ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-neutral-300 text-black'}`}>
            <div className={`flex justify-between items-start border-b pb-4 ${darkMode ? 'border-neutral-800' : 'border-neutral-200'}`}>
              <div className="flex items-center space-x-3">
                {membroModalAudit.fotoPerfil ? (
                  <img src={membroModalAudit.fotoPerfil} alt={membroModalAudit.nomeIngame} className="w-12 h-12 rounded-full object-cover border border-red-600" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-red-950 border border-red-800 flex items-center justify-center font-bold text-red-500 uppercase">{membroModalAudit.nomeIngame?.[0]}</div>
                )}
                <div>
                  <h3 className="text-xl font-bold">{membroModalAudit.nomeIngame || 'Membro'}</h3>
                  <p className="text-xs text-neutral-400">Real: {membroModalAudit.nomeReal || membroModalAudit.email} • ID: {membroModalAudit.idIngame || 'N/A'}</p>
                  {membroModalAudit.bio && <p className="text-xs text-amber-400 italic mt-1">"{membroModalAudit.bio}"</p>}
                </div>
              </div>
              <button onClick={() => setMembroModalAudit(null)} className="text-neutral-500 hover:text-white"><XCircle className="w-6 h-6"/></button>
            </div>

            {/* Estatísticas Rápidas */}
            <div className={`grid grid-cols-3 gap-3 p-4 rounded-xl text-center border ${darkMode ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-100 border-neutral-200'}`}>
              <div><p className="text-[10px] text-neutral-500 uppercase font-bold">Data de Entrada</p><p className="text-xs font-bold">{membroModalAudit.dataEntrada || 'N/A'}</p></div>
              <div><p className="text-[10px] text-neutral-500 uppercase font-bold">Cargos Ativos</p><p className="text-xs font-bold text-emerald-400">{membroModalAudit.roles?.length || 0}</p></div>
              <div><p className="text-[10px] text-neutral-500 uppercase font-bold">Estado Atual</p><p className="text-xs font-bold text-amber-500 uppercase">{membroModalAudit.status}</p></div>
            </div>

            {/* Notas Internas Privadas */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-amber-500 flex items-center space-x-2">
                <StickyNote className="w-4 h-4"/><span>Notas Internas (Privado para Staff/Owner)</span>
              </label>
              <textarea rows="3" value={notaEdicao} onChange={e => setNotaEdicao(e.target.value)} placeholder="Anotações de comportamento, avisos ou lembretes..." className={`w-full border rounded-xl p-3 text-xs outline-none focus:border-amber-500 ${darkMode ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-neutral-50 border-neutral-300 text-black'}`}></textarea>
              <button onClick={() => guardarNotaInterna(membroModalAudit.uid)} className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-1.5 px-4 rounded-lg text-xs">Guardar Nota</button>
            </div>

            {/* Audit Log */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold flex items-center space-x-2"><History className="w-4 h-4 text-red-500"/><span>Histórico de Ações (Audit Log)</span></h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {membroModalAudit.auditLog?.map((log, idx) => (
                  <div key={idx} className={`border p-3 rounded-xl text-xs space-y-1 ${darkMode ? 'bg-neutral-950 border-neutral-800/60' : 'bg-neutral-100 border-neutral-200'}`}>
                    <div className="flex justify-between text-neutral-400 font-mono text-[10px]">
                      <span>{log.data}</span>
                      <span className="text-red-400 font-bold">{log.autor}</span>
                    </div>
                    <p className="font-bold">{log.acao}</p>
                    <p className="text-neutral-400">{log.detalhe}</p>
                  </div>
                ))}
                {(!membroModalAudit.auditLog || membroModalAudit.auditLog.length === 0) && (
                  <p className="text-xs text-neutral-500 italic">Sem histórico de ações registado.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
