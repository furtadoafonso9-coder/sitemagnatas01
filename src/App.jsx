import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  query,
  orderBy,
  addDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';

const PERMISSION_GROUPS = [
  { title: 'Membros', items: [
    ['members.view', 'Consultar membros'],
    ['members.edit', 'Editar dados dos membros'],
    ['members.highlight', 'Destacar membros'],
    ['members.remove', 'Remover membros'],
    ['members.assign_roles', 'Atribuir cargos aos membros']
  ]},
  { title: 'Candidaturas', items: [
    ['applications.view', 'Consultar candidaturas'],
    ['applications.review', 'Aprovar e rejeitar candidaturas']
  ]},
  { title: 'Moderação', items: [
    ['punishments.view', 'Consultar punições'],
    ['punishments.apply', 'Aplicar punições'],
    ['punishments.revoke', 'Revogar punições']
  ]},
  { title: 'Informação confidencial', items: [
    ['notes.view', 'Consultar notas internas'],
    ['notes.create', 'Adicionar notas internas']
  ]},
  { title: 'Conteúdo da comunidade', items: [
    ['notices.manage', 'Publicar e eliminar avisos da Staff'],
    ['rules.manage', 'Gerir regras'],
    ['clothes.manage', 'Gerir roupas e kits'],
    ['radio.manage', 'Gerir frequências de rádio']
  ]},
  { title: 'Administração', items: [
    ['logs.view', 'Consultar logs administrativos'],
    ['roles.manage', 'Criar, editar e eliminar cargos'],
    ['permissions.manage', 'Gerir permissões dos cargos']
  ]}
];

const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap(group => group.items.map(item => item[0]));
const OWNER_PERMISSIONS = ALL_PERMISSION_KEYS;

const DEFAULT_ROLES = [
  { id: 'legacy_homem', name: 'HOMEM', color: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400', permissions: [] },
  { id: 'legacy_streamer', name: 'STREAMER', color: 'bg-pink-500/10 border-pink-500/30 text-pink-400', permissions: [] },
  { id: 'legacy_staff_athos_pvp', name: 'STAFF ATHOS PVP', color: 'bg-blue-500/10 border-blue-500/30 text-blue-400', permissions: ['members.view','applications.view','applications.review','punishments.view','punishments.apply','punishments.revoke','notes.view','notes.create','notices.manage','logs.view'] },
  { id: 'legacy_suport', name: 'SUPORT', color: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400', permissions: ['members.view','members.remove','members.assign_roles','applications.view','applications.review','punishments.view','punishments.apply','punishments.revoke','notes.view','notes.create','notices.manage','logs.view'] },
  { id: 'legacy_dev', name: '01 DEV', color: 'bg-amber-500/10 border-amber-500/30 text-amber-400', permissions: ['members.view','logs.view'] },
  { id: 'legacy_owner', name: 'OWNER', color: 'bg-purple-500/10 border-purple-500/30 text-purple-400', permissions: OWNER_PERMISSIONS, protected: true },
  { id: 'legacy_mulher', name: 'MULHER', color: 'bg-rose-500/10 border-rose-500/30 text-rose-400', permissions: [] },
  { id: 'legacy_founder', name: '01 Founder´s', color: 'bg-purple-600/10 border-purple-600/30 text-purple-300', permissions: OWNER_PERMISSIONS, protected: true },
  { id: 'legacy_conta_alt', name: 'CONTA ALT', color: 'bg-zinc-700/20 border-zinc-700/40 text-zinc-400', permissions: [] },
  { id: 'legacy_member', name: '01 Member´s', color: 'bg-emerald-600/10 border-emerald-600/30 text-emerald-300', permissions: ['members.view'] },
  { id: 'legacy_leader', name: '01 Leader´s', color: 'bg-amber-600/10 border-amber-600/30 text-amber-300', permissions: ['members.view','members.edit','members.highlight','members.remove','applications.view','applications.review','punishments.view','punishments.apply','punishments.revoke','notes.view','notes.create','notices.manage','rules.manage','clothes.manage','radio.manage','logs.view'] },
  { id: 'legacy_resp_manager', name: 'Resp. Manager´s', color: 'bg-blue-600/10 border-blue-600/30 text-blue-300', permissions: ['members.view','members.edit','members.highlight','applications.view','applications.review','logs.view'] },
  { id: 'legacy_resp_member', name: 'Resp. Member´s', color: 'bg-teal-600/10 border-teal-600/30 text-teal-300', permissions: ['members.view','members.highlight'] },
  { id: 'legacy_visitant', name: '01 Visitant', color: 'bg-orange-500/10 border-orange-500/30 text-orange-400', permissions: [] },
  { id: 'legacy_pvp_player', name: 'PVP Player', color: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400', permissions: [] }
];

const ROLE_COLORS = [
  { label: 'Vermelho', value: 'bg-red-500/10 border-red-500/30 text-red-400' },
  { label: 'Dourado', value: 'bg-amber-500/10 border-amber-500/30 text-amber-400' },
  { label: 'Azul', value: 'bg-blue-500/10 border-blue-500/30 text-blue-400' },
  { label: 'Verde', value: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' },
  { label: 'Roxo', value: 'bg-purple-500/10 border-purple-500/30 text-purple-400' },
  { label: 'Ciano', value: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' },
  { label: 'Rosa', value: 'bg-pink-500/10 border-pink-500/30 text-pink-400' },
  { label: 'Cinzento', value: 'bg-zinc-700/20 border-zinc-700/40 text-zinc-400' }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [userDoc, setUserDoc] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [currentView, setCurrentView] = useState('base');
  const [subTabBase, setSubTabBase] = useState('ativos');
  const [adminTab, setAdminTab] = useState('candidaturas');

  const [isRegistering, setIsRegistering] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');

  const [usersList, setUsersList] = useState([]);
  const [roupas, setRoupas] = useState([]);
  const [regras, setRegras] = useState([]);
  const [radiosList, setRadiosList] = useState([]);
  const [logsList, setLogsList] = useState([]);
  const [avisosStaff, setAvisosStaff] = useState([]);
  const [customRoles, setCustomRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [roleForm, setRoleForm] = useState({ name: '', description: '', color: ROLE_COLORS[0].value, permissions: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRoleModalUser, setActiveRoleModalUser] = useState(null);
  
  const [modalRevocar, setModalRevocar] = useState(null);

  // Forms
  const [formCandidatura, setFormCandidatura] = useState({ idade: '', nomeInGame: '', discordTag: '', idInGame: '', killsAtual: '', tempoCidade: '', motivo: '' });
  const [formPerfil, setFormPerfil] = useState({ avatar: '', biografia: '' });
  const [formRoupa, setFormRoupa] = useState({ nome: '', numero: '', imagem: '' });
  const [formRegra, setFormRegra] = useState({ titulo: '', descricao: '', ordem: 1 });
  const [formRadio, setFormRadio] = useState({ titulo: '', frequencia: '', info: '' });
  const [formAviso, setFormAviso] = useState({ titulo: '', mensagem: '', importancia: 'Normal' });
  const [formPunicao, setFormPunicao] = useState({ targetUserId: '', tipo: 'Warning 1', tempo: '', motivo: '' });
  const [formNota, setFormNota] = useState({ targetUserId: '', texto: '' });

  useEffect(() => {
    const savedUser = localStorage.getItem('magnatas_email_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        fetchUserDocument(parsed.uid);
      } catch (e) {
        localStorage.removeItem('magnatas_email_user');
      }
    }
    setAuthLoading(false);
  }, []);

  const fetchUserDocument = async (uid) => {
    try {
      const userRef = doc(db, 'users', uid);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserDoc(data);
        setFormPerfil({ avatar: data.avatar || '', biografia: data.biografia || '' });
      }
    } catch (err) { console.error(err); }
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
    const unsubRadios = onSnapshot(collection(db, 'radios'), (snap) => {
      let rads = [];
      snap.forEach(d => rads.push({ id: d.id, ...d.data() }));
      setRadiosList(rads);
    });
    const qRegras = query(collection(db, 'regras'), orderBy('ordem', 'asc'));
    const unsubRegras = onSnapshot(qRegras, (snap) => {
      let reg = [];
      snap.forEach(d => reg.push({ id: d.id, ...d.data() }));
      setRegras(reg);
    });
    const qAvisos = query(collection(db, 'avisos_staff'), orderBy('timestamp', 'desc'));
    const unsubAvisos = onSnapshot(qAvisos, (snap) => {
      let avs = [];
      snap.forEach(d => avs.push({ id: d.id, ...d.data() }));
      setAvisosStaff(avs);
    });
    const qLogs = query(collection(db, 'logs'), orderBy('timestamp', 'desc'));
    const unsubLogs = onSnapshot(qLogs, (snap) => {
      let l = [];
      snap.forEach(d => l.push({ id: d.id, ...d.data() }));
      setLogsList(l);
    });
    const unsubRoles = onSnapshot(collection(db, 'roles'), (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setCustomRoles(list);
    });

    return () => {
      unsubUser(); unsubUsers(); unsubRoupas(); unsubRadios(); unsubRegras(); unsubAvisos(); unsubLogs(); unsubRoles();
    };
  }, [user]);

  const currentUsername = userDoc?.username || user?.email || 'Utilizador';

  const addLog = async (acao, detalhe) => {
    try {
      await addDoc(collection(db, 'logs'), {
        autor: currentUsername,
        acao,
        detalhe,
        timestamp: new Date().toLocaleString(),
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.error('Não foi possível registar a ação:', e);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!emailInput.trim() || !passwordInput) {
      setAuthError('Preenche o e-mail e a palavra-passe.');
      return;
    }

    try {
      const cleanId = emailInput.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
      const userRef = doc(db, 'users', cleanId);
      const docSnap = await getDoc(userRef);

      if (isRegistering) {
        if (!usernameInput.trim()) {
          setAuthError('Indica um nome de utilizador.');
          return;
        }
        if (docSnap.exists()) {
          setAuthError('Já existe uma conta com este e-mail.');
          return;
        }
        const newUser = {
          uid: cleanId,
          username: usernameInput.trim(),
          email: emailInput.trim().toLowerCase(),
          password: passwordInput,
          avatar: 'https://cdn.discordapp.com/embed/avatars/0.png',
          biografia: 'Sem biografia definida.',
          estado: 'pendente_candidatura',
          roles: ["01 Member´s", 'HOMEM'],
          destacado: false,
          ausente: false,
          punicoes: [],
          notasInternas: [],
          createdAt: serverTimestamp()
        };
        await setDoc(userRef, newUser);
        setUser(newUser);
        setUserDoc(newUser);
        localStorage.setItem('magnatas_email_user', JSON.stringify(newUser));
      } else {
        if (!docSnap.exists()) {
          setAuthError('Conta não encontrada.');
          return;
        }
        const data = docSnap.data();
        if (data.password && data.password !== passwordInput) {
          setAuthError('Palavra-passe incorreta.');
          return;
        }
        setUser(data);
        setUserDoc(data);
        localStorage.setItem('magnatas_email_user', JSON.stringify(data));
      }
    } catch (err) {
      setAuthError(`Erro de autenticação: ${err.message}`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('magnatas_email_user');
    setUser(null);
    setUserDoc(null);
  };

  const allRoles = DEFAULT_ROLES.map(base => { const saved = customRoles.find(role => role.name === base.name); return saved ? { ...base, ...saved, protected: Boolean(base.protected || saved.protected) } : base; })
    .concat(customRoles.filter(role => !DEFAULT_ROLES.some(base => base.name === role.name)));
  const userRoles = userDoc?.roles || [];
  const isFounder = userRoles.includes("01 Founder´s") || userRoles.includes('OWNER');
  const userPermissionSet = new Set(
    allRoles.filter(role => userRoles.includes(role.name)).flatMap(role => role.permissions || [])
  );
  
  const hasPermission = (permission) => isFounder || userPermissionSet.has(permission);
  const hasAnyPermission = (permissions) => permissions.some(permission => hasPermission(permission));
  const canManageRoles = hasPermission('roles.manage') && hasPermission('permissions.manage');
  const isSupport = isFounder || hasAnyPermission([
    'applications.view', 'applications.review', 'members.edit', 'members.remove',
    'members.assign_roles', 'punishments.view', 'punishments.apply', 'punishments.revoke',
    'notes.view', 'notes.create', 'notices.manage', 'rules.manage', 'clothes.manage',
    'radio.manage', 'logs.view', 'roles.manage', 'permissions.manage'
  ]);

  const handleFileUpload = (e, callback) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => callback(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSavePerfil = async (e) => {
    e.preventDefault();
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      avatar: formPerfil.avatar || userDoc?.avatar,
      biografia: formPerfil.biografia
    });
    alert("Perfil atualizado com sucesso!");
  };

  const handleSubmitCandidatura = async (e) => {
    e.preventDefault();
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, { ...formCandidatura, estado: 'pendente_analise' });
    alert("Candidatura submetida com sucesso!");
  };

  const handleResetCandidatura = async () => {
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, { estado: 'pendente_candidatura' });
  };

  const handleAprovarCandidatura = async (targetUser) => {
    if (!hasPermission('applications.review')) return alert('Não tens permissão para aprovar candidaturas.');
    await updateDoc(doc(db, 'users', targetUser.id), { estado: 'aprovado' });
    await addLog("Aprovação", `Aprovou a candidatura de ${targetUser.username}`);
  };

  const handleReprovarCandidatura = async (targetUser) => {
    if (!hasPermission('applications.review')) return alert('Não tens permissão para rejeitar candidaturas.');
    await updateDoc(doc(db, 'users', targetUser.id), { estado: 'rejeitado' });
    await addLog("Reprovação", `Reprovou a candidatura de ${targetUser.username}`);
  };

  const handleEditMember = async (targetUser) => {
    if (!hasPermission('members.edit')) return alert('Não tens permissão para editar membros.');
    const nomeInGame = window.prompt('Nome In-Game:', targetUser.nomeInGame || '');
    if (nomeInGame === null) return;
    const discordTag = window.prompt('Nome/Tag do Discord:', targetUser.discordTag || '');
    if (discordTag === null) return;
    const idInGame = window.prompt('ID In-Game:', targetUser.idInGame || '');
    if (idInGame === null) return;
    try {
      await updateDoc(doc(db, 'users', targetUser.id), {
        nomeInGame: nomeInGame.trim(),
        discordTag: discordTag.trim(),
        idInGame: idInGame.trim()
      });
      await addLog('Membros', `Editou os dados de ${targetUser.username}`);
    } catch (err) {
      alert(`Não foi possível editar o membro: ${err.message}`);
    }
  };

  const handleToggleHighlight = async (targetUser) => {
    if (!hasPermission('members.highlight')) return alert('Não tens permissão para destacar membros.');
    await updateDoc(doc(db, 'users', targetUser.id), { destacado: !targetUser.destacado });
    await addLog('Membros', `${targetUser.destacado ? 'Removeu destaque de' : 'Destacou'} ${targetUser.username}`);
  };

  const handleKickMembro = async (targetUser) => {
    if (!hasPermission('members.remove')) return alert('Não tens permissão para remover membros.');
    const motivoKick = prompt(`Motivo do kick para ${targetUser.username}:`, "Reestruturação / Inatividade");
    if (!motivoKick) return;

    const avisoKick = {
      id: Date.now(),
      tipo: "Kick da Gang",
      tempo: "Imediato",
      motivo: motivoKick,
      aplicadoPor: currentUsername,
      data: new Date().toLocaleDateString()
    };

    const punicoesAtuais = targetUser.punicoes || [];

    await updateDoc(doc(db, 'users', targetUser.id), {
      estado: 'ex_membro',
      punicoes: [...punicoesAtuais, avisoKick]
    });

    await addLog("Kick", `Kikou ${targetUser.username} da gang. Motivo: ${motivoKick}`);
    alert(`Membro ${targetUser.username} transferido para ex-membros!`);
  };

  const handleAdicionarNota = async (e) => {
    e.preventDefault();
    if (!hasPermission('notes.create') || !formNota.targetUserId || !formNota.texto) return;
    const target = usersList.find(u => u.id === formNota.targetUserId);
    if (!target) return;

    const novaNota = {
      id: Date.now(),
      texto: formNota.texto,
      autor: currentUsername,
      data: new Date().toLocaleString()
    };

    const notasAtuais = target.notasInternas || [];
    await updateDoc(doc(db, 'users', target.id), {
      notasInternas: [...notasAtuais, novaNota]
    });

    setFormNota({ targetUserId: '', texto: '' });
    alert("Nota interna adicionada com sucesso!");
  };

  const handleAddRoupa = async (e) => {
    e.preventDefault();
    if (!hasPermission('clothes.manage')) return alert('Não tens permissão para gerir roupas e kits.');
    await addDoc(collection(db, 'roupas'), formRoupa);
    setFormRoupa({ nome: '', numero: '', imagem: '' });
    await addLog("Roupas", `Adicionou kit ${formRoupa.nome}`);
  };

  const handleDeleteRoupa = async (id) => {
    if (!hasPermission('clothes.manage')) return;
    await deleteDoc(doc(db, 'roupas', id));
  };

  const handleAddRadio = async (e) => {
    e.preventDefault();
    if (!hasPermission('radio.manage')) return;
    await addDoc(collection(db, 'radios'), formRadio);
    setFormRadio({ titulo: '', frequencia: '', info: '' });
    await addLog("Rádio", `Adicionou/Editar rádio ${formRadio.titulo}`);
  };

  const handleDeleteRadio = async (id) => {
    if (!hasPermission('radio.manage')) return;
    await deleteDoc(doc(db, 'radios', id));
    await addLog("Rádio", "Eliminou uma frequência de rádio");
  };

  const handleAddRegra = async (e) => {
    e.preventDefault();
    if (!hasPermission('rules.manage')) return;
    await addDoc(collection(db, 'regras'), { ...formRegra, ordem: Number(formRegra.ordem) });
    setFormRegra({ titulo: '', descricao: '', ordem: regras.length + 1 });
    await addLog("Regras", `Adicionou a regra: ${formRegra.titulo}`);
  };

  const handleDeleteRegra = async (id) => {
    if (!hasPermission('rules.manage')) return;
    await deleteDoc(doc(db, 'regras', id));
  };

  const handleAddAvisoStaff = async (e) => {
    e.preventDefault();
    if (!hasPermission('notices.manage')) return;
    await addDoc(collection(db, 'avisos_staff'), {
      ...formAviso,
      autor: currentUsername,
      timestamp: new Date().toLocaleString()
    });
    setFormAviso({ titulo: '', mensagem: '', importancia: 'Normal' });
    alert("Aviso publicado com sucesso!");
  };

  const handleDeleteAviso = async (id) => {
    if (!hasPermission('notices.manage')) return;
    await deleteDoc(doc(db, 'avisos_staff', id));
  };

  const handleAplicarPunicao = async (e) => {
    e.preventDefault();
    if (!hasPermission('punishments.apply')) return alert('Não tens permissão para aplicar punições.');
    if (!formPunicao.targetUserId) return alert("Seleciona um membro!");
    const target = usersList.find(u => u.id === formPunicao.targetUserId);
    if (!target) return;

    const novaPunicao = {
      id: Date.now(),
      tipo: formPunicao.tipo,
      tempo: formPunicao.tempo,
      motivo: formPunicao.motivo,
      aplicadoPor: currentUsername,
      data: new Date().toLocaleDateString()
    };

    const punicoesAtuais = target.punicoes || [];
    let novoEstado = target.estado;
    if (formPunicao.tipo.includes("Ban")) novoEstado = "banido";

    await updateDoc(doc(db, 'users', target.id), {
      punicoes: [...punicoesAtuais, novaPunicao],
      estado: novoEstado
    });

    alert("Punição aplicada com sucesso!");
    await addLog("Punição", `Aplicou ${formPunicao.tipo} a ${target.username}`);
    setFormPunicao({ targetUserId: '', tipo: 'Warning 1', tempo: '', motivo: '' });
  };

  const executarRevogacao = async (acaoDestino) => {
    if (!hasPermission('punishments.revoke')) return alert('Não tens permissão para revogar punições.');
    if (!modalRevocar) return;
    const { targetUser, punicaoId } = modalRevocar;

    if (punicaoId === 'BAN_OU_ESTADO') {
      const possuiBanAtivo = (targetUser.punicoes || []).some(p => String(p.tipo || '').toLowerCase().includes('ban'));
      if (possuiBanAtivo) return alert('Remove primeiro a punição de ban correspondente antes de alterar o estado.');
      const novoEstado = acaoDestino === 'entrar' ? 'aprovado' : 'pendente_candidatura';
      await updateDoc(doc(db, 'users', targetUser.id), { estado: novoEstado });
      await addLog("Revogação", `Revogou estado de ${targetUser.username} (${acaoDestino === 'entrar' ? 'Entrou diretamente' : 'Fez nova candidatura'})`);
    } else {
      const novasPunicoes = (targetUser.punicoes || []).filter(p => p.id !== punicaoId);
      let novoEstado = targetUser.estado;
      if (acaoDestino === 'entrar' && targetUser.estado === 'banido') novoEstado = 'aprovado';
      
      await updateDoc(doc(db, 'users', targetUser.id), {
        punicoes: novasPunicoes,
        estado: novoEstado
      });
      await addLog("Revogação", `Removeu castigo de ${targetUser.username}`);
    }

    setModalRevocar(null);
    alert("Castigo revogado com sucesso!");
  };

  const handleToggleRole = async (targetId, roleName) => {
    if (!hasPermission('members.assign_roles')) return alert('Não tens permissão para atribuir cargos.');
    const target = usersList.find(u => u.id === targetId);
    if (!target) return;
    const role = allRoles.find(item => item.name === roleName);
    if (!role) return;
    if (!isFounder && role.permissions?.some(permission => !userPermissionSet.has(permission))) return alert('Não podes atribuir um cargo com permissões superiores às tuas.');
    if (targetId === user.uid && !isFounder) return alert('Não podes alterar os teus próprios cargos.');
    if (role.protected && !isFounder) return alert('Este cargo está protegido e só pode ser atribuído pela liderança máxima.');
    const roles = target.roles || [];
    const updated = roles.includes(roleName) ? roles.filter(r => r !== roleName) : [...roles, roleName];
    await updateDoc(doc(db, 'users', targetId), { roles: updated });
    await addLog('Cargos', `${roles.includes(roleName) ? 'Removeu' : 'Atribuiu'} o cargo ${roleName} a ${target.username}`);
  };

  const openRoleEditor = (role = null) => {
    if (!canManageRoles) return alert('Não tens permissão para gerir cargos e permissões.');
    setSelectedRoleId(role?.id || null);
    setRoleForm({
      name: role?.name || '',
      description: role?.description || '',
      color: role?.color || ROLE_COLORS[0].value,
      permissions: role?.permissions || []
    });
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();
    if (!canManageRoles) return alert('Não tens permissão para gerir cargos.');
    const cleanName = roleForm.name.trim();
    if (!cleanName) return alert('Indica o nome do cargo.');
    if (allRoles.some(role => role.name.toLowerCase() === cleanName.toLowerCase() && role.id !== selectedRoleId)) {
      return alert('Já existe um cargo com esse nome.');
    }
    const selectedRole = allRoles.find(role => role.id === selectedRoleId);
    if (selectedRole?.protected && !isFounder) return alert('Não podes alterar um cargo protegido.');
    if (selectedRole && cleanName !== selectedRole.name && usersList.some(member => (member.roles || []).includes(selectedRole.name))) {
      return alert('Não podes mudar o nome de um cargo enquanto estiver atribuído a membros. Remove primeiro o cargo desses membros.');
    }
    if (!isFounder && roleForm.permissions.some(permission => !userPermissionSet.has(permission))) {
      return alert('Só podes atribuir permissões que já possuis.');
    }

    const payload = {
      name: cleanName,
      description: roleForm.description.trim(),
      color: roleForm.color,
      permissions: roleForm.permissions,
      protected: Boolean(selectedRole?.protected),
      updatedAt: serverTimestamp(),
      updatedBy: currentUsername
    };

    try {
      if (selectedRoleId) {
        await setDoc(doc(db, 'roles', selectedRoleId), payload, { merge: true });
      } else {
        await addDoc(collection(db, 'roles'), { ...payload, createdAt: serverTimestamp(), createdBy: currentUsername });
      }
      await addLog('Gestão de cargos', `${selectedRoleId ? 'Atualizou' : 'Criou'} o cargo ${cleanName}`);
      setSelectedRoleId(null);
      setRoleForm({ name: '', description: '', color: ROLE_COLORS[0].value, permissions: [] });
      alert('Cargo guardado com sucesso.');
    } catch (err) {
      console.error(err);
      alert(`Não foi possível guardar o cargo: ${err.message}`);
    }
  };

  const handleDeleteRole = async (role) => {
    if (!canManageRoles) return alert('Não tens permissão para eliminar cargos.');
    if (role.protected || DEFAULT_ROLES.some(item => item.name === role.name)) {
      return alert('Os cargos base do sistema não podem ser eliminados. Podes ajustar as permissões, se tiveres autorização.');
    }
    if (usersList.some(member => (member.roles || []).includes(role.name))) {
      return alert('Este cargo ainda está atribuído a membros. Retira-o primeiro de todos os membros.');
    }
    if (!window.confirm(`Tens a certeza de que pretendes eliminar o cargo ${role.name}?`)) return;
    try {
      await deleteDoc(doc(db, 'roles', role.id));
      await addLog('Gestão de cargos', `Eliminou o cargo ${role.name}`);
    } catch (err) {
      alert(`Não foi possível eliminar o cargo: ${err.message}`);
    }
  };

  const toggleRolePermission = (permission) => {
    setRoleForm(current => ({
      ...current,
      permissions: current.permissions.includes(permission)
        ? current.permissions.filter(item => item !== permission)
        : [...current.permissions, permission]
    }));
  };

  if (authLoading) {
    return <div className="min-h-screen bg-[#07080a] text-zinc-300 flex items-center justify-center">A verificar sessão...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#07080a] text-zinc-100 flex flex-col justify-center items-center p-6 font-sans">
        <div className="max-w-md w-full bg-[#101216] border border-zinc-800/80 rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 text-red-500 rounded-2xl mx-auto flex items-center justify-center text-3xl font-black shadow-lg">🛡️</div>
            <h1 className="text-2xl font-black tracking-wider text-white">MAGNATAS 01!</h1>
            <p className="text-xs text-red-500 uppercase font-extrabold tracking-widest">Portal de Acesso Oficial</p>
          </div>
          {authError && <div role="alert" className="bg-red-950/50 border border-red-800/60 text-red-300 rounded-xl p-3 text-xs">{authError}</div>}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {isRegistering && (
              <input type="text" placeholder="Nome de Utilizador" value={usernameInput} onChange={e => setUsernameInput(e.target.value)} className="w-full bg-zinc-900/90 border border-zinc-800 p-3.5 rounded-xl text-xs text-white focus:border-red-500 outline-none transition" required />
            )}
            <input type="email" placeholder="E-mail" value={emailInput} onChange={e => setEmailInput(e.target.value)} className="w-full bg-zinc-900/90 border border-zinc-800 p-3.5 rounded-xl text-xs text-white focus:border-red-500 outline-none transition" required />
            <input type="password" placeholder="Palavra-passe" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} className="w-full bg-zinc-900/90 border border-zinc-800 p-3.5 rounded-xl text-xs text-white focus:border-red-500 outline-none transition" required />
            <button type="submit" className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-red-600/20 transition">
              {isRegistering ? 'Criar Conta' : 'Iniciar Sessão'}
            </button>
          </form>
          <div className="text-center">
            <button type="button" onClick={() => setIsRegistering(!isRegistering)} className="text-xs text-zinc-400 hover:text-red-400 font-semibold transition">
              {isRegistering ? 'Já tens conta? Iniciar Sessão' : 'Criar nova conta'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (userDoc?.estado === 'pendente_candidatura' || userDoc?.estado === 'pendente_analise' || userDoc?.estado === 'rejeitado' || userDoc?.estado === 'ex_membro' || userDoc?.estado === 'banido') {
    return (
      <div className="min-h-screen bg-[#07080a] text-zinc-100 p-6 flex items-center justify-center font-sans">
        <div className="max-w-xl w-full bg-[#101216] border border-zinc-800/80 rounded-2xl p-8 space-y-6 shadow-2xl">
          <div className="flex justify-between items-center border-b border-zinc-800/80 pb-4">
            <h1 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <span>🛡️</span> 
              {userDoc?.estado === 'pendente_analise' && 'Candidatura em Análise'}
              {userDoc?.estado === 'rejeitado' && 'Candidatura Rejeitada'}
              {userDoc?.estado === 'ex_membro' && 'Registo de Ex-Membro'}
              {userDoc?.estado === 'banido' && 'Conta Banida'}
              {userDoc?.estado === 'pendente_candidatura' && 'Formulário de Candidatura'}
            </h1>
            <button onClick={handleLogout} className="text-xs bg-red-950/60 text-red-400 border border-red-800/50 px-3 py-1.5 rounded-xl font-bold hover:bg-red-900/60 transition">Sair</button>
          </div>

          {userDoc?.estado === 'pendente_analise' && (
            <div className="space-y-4 text-center py-6">
              <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl mx-auto flex items-center justify-center text-3xl font-black shadow-lg">⏳</div>
              <h2 className="text-base font-black text-white">Candidatura submetida com sucesso!</h2>
              <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
                A tua candidatura está a ser analisada pela Staff dos Magnatas 01!. Aguarda a aprovação para teres acesso total ao painel.
              </p>
            </div>
          )}

          {(userDoc?.estado === 'rejeitado' || userDoc?.estado === 'ex_membro') && (
            <div className="space-y-6 text-center py-4">
              <div className="bg-zinc-900/80 border border-zinc-800 p-6 rounded-2xl space-y-3 text-left">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{userDoc?.estado === 'rejeitado' ? '❌' : '🥾'}</span>
                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-wider">
                      {userDoc?.estado === 'rejeitado' ? 'Candidatura Não Aprovada' : 'Registo de Ex-Membro'}
                    </h3>
                    <p className="text-[11px] text-zinc-400">Podes submeter um novo formulário para entrar na gang.</p>
                  </div>
                </div>
                <p className="text-xs text-zinc-300 pt-3 border-t border-zinc-800 leading-relaxed">
                  {userDoc?.estado === 'rejeitado' 
                    ? 'A tua última candidatura não atingiu os critérios exigidos pela liderança. Preenche novamente com atenção.'
                    : 'Foste desligado anteriormente da gang. Podes candidatar-te novamente para reintegrar o plantel.'}
                </p>
              </div>
              <button 
                onClick={handleResetCandidatura}
                className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-red-600/20 transition flex items-center justify-center gap-2"
              >
                <span>🔄</span> Tentar Nova Candidatura
              </button>
            </div>
          )}

          {userDoc?.estado === 'banido' && (
            <div className="space-y-4 text-center py-6">
              <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 text-red-500 rounded-2xl mx-auto flex items-center justify-center text-3xl font-black shadow-lg">🚫</div>
              <h2 className="text-base font-black text-white">A tua conta encontra-se banida.</h2>
              <p className="text-xs text-zinc-400">Contacta o suporte administrativo para mais informações sobre o teu castigo.</p>
            </div>
          )}

          {userDoc?.estado === 'pendente_candidatura' && (
            <form onSubmit={handleSubmitCandidatura} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="Idade" value={formCandidatura.idade} onChange={e => setFormCandidatura({...formCandidatura, idade: e.target.value})} className="bg-zinc-900/90 border border-zinc-800 p-3.5 rounded-xl text-xs text-white focus:border-red-500 outline-none" required />
                <input type="text" placeholder="Nome In-Game" value={formCandidatura.nomeInGame} onChange={e => setFormCandidatura({...formCandidatura, nomeInGame: e.target.value})} className="bg-zinc-900/90 border border-zinc-800 p-3.5 rounded-xl text-xs text-white focus:border-red-500 outline-none" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="Nome do Discord (ex: user#0000)" value={formCandidatura.discordTag} onChange={e => setFormCandidatura({...formCandidatura, discordTag: e.target.value})} className="bg-zinc-900/90 border border-zinc-800 p-3.5 rounded-xl text-xs text-white focus:border-red-500 outline-none" required />
                <input type="number" placeholder="ID In-Game" value={formCandidatura.idInGame} onChange={e => setFormCandidatura({...formCandidatura, idInGame: e.target.value})} className="bg-zinc-900/90 border border-zinc-800 p-3.5 rounded-xl text-xs text-white focus:border-red-500 outline-none" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="Kills Atuais" value={formCandidatura.killsAtual} onChange={e => setFormCandidatura({...formCandidatura, killsAtual: e.target.value})} className="bg-zinc-900/90 border border-zinc-800 p-3.5 rounded-xl text-xs text-white focus:border-red-500 outline-none" />
                <input type="text" placeholder="Tempo de Cidade" value={formCandidatura.tempoCidade} onChange={e => setFormCandidatura({...formCandidatura, tempoCidade: e.target.value})} className="bg-zinc-900/90 border border-zinc-800 p-3.5 rounded-xl text-xs text-white focus:border-red-500 outline-none" />
              </div>
              <textarea placeholder="Motivo de entrada para a gang..." value={formCandidatura.motivo} onChange={e => setFormCandidatura({...formCandidatura, motivo: e.target.value})} className="w-full bg-zinc-900/90 border border-zinc-800 p-3.5 rounded-xl text-xs text-white h-24 focus:border-red-500 outline-none resize-none" required></textarea>
              <button type="submit" className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-red-600/20 transition">Submeter Candidatura</button>
            </form>
          )}
        </div>
      </div>
    );
  }

  const membrosBase = usersList.filter(m => {
    const matchesSearch = (m.nomeInGame || '').toLowerCase().includes(searchQuery.toLowerCase()) || (m.username || '').toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (subTabBase === 'ativos') return m.estado === 'aprovado' && !m.ausente;
    if (subTabBase === 'destaque') return m.destacado;
    if (subTabBase === 'ausentes') return m.ausente === true;
    if (subTabBase === 'ex_membros') return m.estado === 'ex_membro';
    if (subTabBase === 'banidos') return m.estado === 'banido' || m.estado === 'rejeitado';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#07080a] text-zinc-200 font-sans flex relative selection:bg-red-500 selection:text-white">
      
      {modalRevocar && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#101216] border border-zinc-800 p-8 rounded-3xl max-w-md w-full space-y-6 shadow-2xl">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl mx-auto flex items-center justify-center text-2xl font-black">✨</div>
              <h3 className="text-base font-black text-white uppercase tracking-wider">Revogar Castigo / Ban</h3>
              <p className="text-xs text-zinc-400">Escolhe o comportamento para o utilizador <strong>{modalRevocar.targetUser.username}</strong>:</p>
            </div>
            <div className="space-y-3">
              <button 
                onClick={() => executarRevogacao('entrar')}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2"
              >
                <span>✅</span> Entrar diretamente na Gang
              </button>
              <button 
                onClick={() => executarRevogacao('candidatura')}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-amber-600/20 transition flex items-center justify-center gap-2"
              >
                <span>📝</span> Fazer nova candidatura
              </button>
              <button 
                onClick={() => setModalRevocar(null)}
                className="w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <aside className="w-72 bg-[#101216] border-r border-zinc-800/80 flex flex-col justify-between hidden md:flex sticky top-0 h-screen z-20 shadow-xl">
        <div>
          <div className="p-6 border-b border-zinc-800/80 flex items-center gap-3">
            <div className="w-9 h-9 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-center font-black text-red-500 shadow-md">🛡️</div>
            <div>
              <h2 className="text-sm font-black tracking-wider text-white">MAGNATAS 01!</h2>
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Portal da Comunidade</span>
            </div>
          </div>
          <nav className="p-4 space-y-1.5 text-xs font-bold">
            <button onClick={() => setCurrentView('base')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${currentView === 'base' ? 'bg-red-500/10 border border-red-500/30 text-red-400 font-extrabold shadow-sm' : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200'}`}><span>👥</span> Base da Comunidade</button>
            <button onClick={() => setCurrentView('roupas')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${currentView === 'roupas' ? 'bg-red-500/10 border border-red-500/30 text-red-400 font-extrabold shadow-sm' : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200'}`}><span>👕</span> Roupas & Kits</button>
            <button onClick={() => setCurrentView('radio')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${currentView === 'radio' ? 'bg-red-500/10 border border-red-500/30 text-red-400 font-extrabold shadow-sm' : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200'}`}><span>📡</span> Frequências Rádio</button>
            <button onClick={() => setCurrentView('discord')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${currentView === 'discord' ? 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 font-extrabold shadow-sm' : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200'}`}><span>💬</span> Discord da Comunidade</button>
            <button onClick={() => setCurrentView('avisos')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${currentView === 'avisos' ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400 font-extrabold shadow-sm' : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200'}`}><span>📢</span> Avisos da Staff</button>
            <button onClick={() => setCurrentView('regras')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${currentView === 'regras' ? 'bg-red-500/10 border border-red-500/30 text-red-400 font-extrabold shadow-sm' : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200'}`}><span>📖</span> Regras Oficiais</button>
            <button onClick={() => setCurrentView('cargos')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${currentView === 'cargos' ? 'bg-red-500/10 border border-red-500/30 text-red-400 font-extrabold shadow-sm' : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200'}`}><span>🎖️</span> Lista de Cargos</button>
            <button onClick={() => setCurrentView('meusavisos')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${currentView === 'meusavisos' ? 'bg-red-500/10 border border-red-500/30 text-red-400 font-extrabold shadow-sm' : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200'}`}><span>⚠️</span> Meus Avisos / Punições</button>
            <button onClick={() => setCurrentView('perfil')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${currentView === 'perfil' ? 'bg-red-500/10 border border-red-500/30 text-red-400 font-extrabold shadow-sm' : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200'}`}><span>👤</span> Meu Perfil & Discord</button>
          </nav>
        </div>

        {isSupport && (
          <div className="p-4">
            <button onClick={() => setCurrentView('admin')} className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20 transition">
              <span>⚙️</span> Painel Admin & Staff
            </button>
          </div>
        )}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-20 border-b border-zinc-800/80 bg-[#101216]/80 backdrop-blur-md px-8 flex justify-between items-center sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h1 className="font-black text-xs uppercase tracking-widest text-zinc-300">MAGNATAS 01! <span className="text-zinc-600 mx-2">/</span> <span className="text-red-500">{currentView}</span></h1>
          </div>
          <button onClick={handleLogout} className="text-xs bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-red-400 hover:border-red-500/40 px-4 py-2 rounded-xl font-bold transition">🚪 Sair da Conta</button>
        </header>

        <main className="p-8 space-y-6 flex-1 overflow-y-auto">

          {currentView === 'base' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-4 overflow-x-auto">
                <button onClick={() => setSubTabBase('ativos')} className={`px-4 py-2.5 rounded-xl text-xs font-bold transition ${subTabBase === 'ativos' ? 'bg-red-600 text-white shadow-md' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}>👥 Ativos ({usersList.filter(u => u.estado === 'aprovado' && !u.ausente).length})</button>
                <button onClick={() => setSubTabBase('destaque')} className={`px-4 py-2.5 rounded-xl text-xs font-bold transition ${subTabBase === 'destaque' ? 'bg-amber-600 text-white shadow-md' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}>⭐ Em Destaque ({usersList.filter(u => u.destacado).length})</button>
                <button onClick={() => setSubTabBase('ausentes')} className={`px-4 py-2.5 rounded-xl text-xs font-bold transition ${subTabBase === 'ausentes' ? 'bg-purple-600 text-white shadow-md' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}>💤 Ausentes ({usersList.filter(u => u.ausente).length})</button>
                <button onClick={() => setSubTabBase('ex_membros')} className={`px-4 py-2.5 rounded-xl text-xs font-bold transition ${subTabBase === 'ex_membros' ? 'bg-blue-600 text-white shadow-md' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}>🥾 Ex-Membros ({usersList.filter(u => u.estado === 'ex_membro').length})</button>
                <button onClick={() => setSubTabBase('banidos')} className={`px-4 py-2.5 rounded-xl text-xs font-bold transition ${subTabBase === 'banidos' ? 'bg-red-950 text-red-400 border border-red-800/60 shadow-md' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}>🚫 Banidos ({usersList.filter(u => u.estado === 'banido' || u.estado === 'rejeitado').length})</button>
              </div>

              <input type="text" placeholder="Pesquisar membros por nome ou in-game..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-[#101216] border border-zinc-800/80 px-4 py-3.5 rounded-xl text-xs text-white focus:border-red-500 outline-none transition shadow-sm" />

              <div className="bg-[#101216] border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800/80 text-zinc-400 bg-zinc-900/40">
                      <th className="p-4 font-extrabold uppercase">Membro</th>
                      <th className="p-4 font-extrabold uppercase">ID In-Game</th>
                      <th className="p-4 font-extrabold uppercase">Estado</th>
                      <th className="p-4 font-extrabold uppercase">Cargos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {membrosBase.map(m => (
                      <tr key={m.id} className="hover:bg-zinc-900/40 transition">
                        <td className="p-4 flex items-center gap-3">
                          <img src={m.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"} className="w-9 h-9 rounded-xl border border-zinc-700/80 object-cover shadow-sm" />
                          <div>
                            <span className="font-black text-white block">{m.nomeInGame || m.username} {m.destacado && '⭐'}</span>
                            <span className="text-[10px] text-zinc-400">@{m.username} {m.discordTag && `• ${m.discordTag}`}</span>
                          </div>
                        </td>
                        <td className="p-4 text-zinc-300 font-bold">ID: {m.idInGame || 'N/A'}</td>
                        <td className="p-4"><span className="px-2.5 py-1 rounded-lg text-[10px] uppercase font-extrabold bg-zinc-900 border border-zinc-700/60 text-zinc-300">{m.estado}</span></td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {(m.roles || []).map(r => <span key={r} className="px-2 py-0.5 rounded-md bg-zinc-900/80 border border-zinc-800 text-[10px] text-zinc-300">{r}</span>)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {currentView === 'roupas' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-black text-white uppercase tracking-wider">Roupas & Kits Oficiais</h2>
              </div>
              {hasPermission('clothes.manage') && (
                <form onSubmit={handleAddRoupa} className="bg-[#101216] border border-zinc-800/80 p-6 rounded-2xl space-y-4 shadow-xl">
                  <h3 className="text-xs font-black text-red-500 uppercase tracking-wider">Adicionar Novo Kit / Roupa (Owner)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input type="text" placeholder="Nome do Kit" value={formRoupa.nome} onChange={e => setFormRoupa({...formRoupa, nome: e.target.value})} className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl text-xs text-white focus:border-red-500 outline-none" required />
                    <input type="text" placeholder="Número no Vestuário (ex: #145)" value={formRoupa.numero} onChange={e => setFormRoupa({...formRoupa, numero: e.target.value})} className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl text-xs text-white focus:border-red-500 outline-none" required />
                    <input type="url" placeholder="Link da Imagem (URL)" value={formRoupa.imagem} onChange={e => setFormRoupa({...formRoupa, imagem: e.target.value})} className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl text-xs text-white focus:border-red-500 outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 font-bold block mb-1">Ou carregar foto do Computador (PC):</label>
                    <input type="file" accept="image/*" onChange={e => handleFileUpload(e, (res) => setFormRoupa({...formRoupa, imagem: res}))} className="text-xs text-zinc-400 bg-zinc-900 p-2.5 rounded-xl w-full border border-zinc-800" />
                  </div>
                  <button type="submit" className="bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-3 rounded-xl text-xs uppercase tracking-wider shadow-md shadow-red-600/20 transition">Guardar Kit</button>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {roupas.map(item => (
                  <div key={item.id} className="bg-[#101216] border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl space-y-3 group">
                    <img src={item.imagem || "https://cdn.discordapp.com/embed/avatars/0.png"} className="w-full h-52 object-cover group-hover:scale-105 transition duration-500" />
                    <div className="p-5 flex justify-between items-center">
                      <div>
                        <h4 className="font-black text-white text-sm">{item.nome}</h4>
                        <span className="inline-block bg-red-500/10 text-red-400 border border-red-500/30 text-xs font-black px-3 py-1 rounded-lg mt-2">
                          NÚMERO: #{item.numero}
                        </span>
                      </div>
                      {hasPermission('clothes.manage') && <button onClick={() => handleDeleteRoupa(item.id)} className="text-xs bg-red-950/60 text-red-400 border border-red-800/50 px-3 py-2 rounded-xl font-bold hover:bg-red-900/60 transition">Remover</button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentView === 'radio' && (
            <div className="space-y-6">
              <h2 className="text-lg font-black text-white uppercase tracking-wider">Frequências de Rádio Oficiais</h2>
              {hasPermission('radio.manage') && (
                <form onSubmit={handleAddRadio} className="bg-[#101216] border border-zinc-800/80 p-6 rounded-2xl space-y-4 max-w-xl shadow-xl">
                  <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider">Gerir Frequência Rádio</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="Título (ex: Rádio Assalto)" value={formRadio.titulo} onChange={e => setFormRadio({...formRadio, titulo: e.target.value})} className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl text-xs text-white focus:border-amber-500 outline-none" required />
                    <input type="text" placeholder="Frequência (ex: 100.0)" value={formRadio.frequencia} onChange={e => setFormRadio({...formRadio, frequencia: e.target.value})} className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl text-xs text-white focus:border-amber-500 outline-none" required />
                  </div>
                  <input type="text" placeholder="Informação / Nota sobre a frequência..." value={formRadio.info} onChange={e => setFormRadio({...formRadio, info: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl text-xs text-white focus:border-amber-500 outline-none" required />
                  <button type="submit" className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-6 py-3 rounded-xl text-xs uppercase tracking-wider shadow-md shadow-amber-600/20 transition">Publicar Rádio</button>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {radiosList.map(rad => (
                  <div key={rad.id} className="bg-[#101216] border border-zinc-800/80 p-6 rounded-2xl flex justify-between items-start shadow-xl">
                    <div className="space-y-1.5">
                      <h3 className="text-sm font-black text-red-500 uppercase tracking-wide">📡 {rad.titulo}: <span className="text-white font-extrabold">{rad.frequencia} MHz</span></h3>
                      <p className="text-xs text-zinc-400 leading-relaxed">{rad.info}</p>
                    </div>
                    {hasPermission('radio.manage') && (
                      <button onClick={() => handleDeleteRadio(rad.id)} className="text-xs bg-red-950/60 text-red-400 border border-red-800/50 px-3 py-1.5 rounded-xl font-bold hover:bg-red-900/60 transition">
                        Eliminar
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentView === 'discord' && (
            <div className="max-w-2xl mx-auto space-y-6 text-center py-6">
              <div className="bg-[#101216] border border-zinc-800/80 p-10 rounded-3xl space-y-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="w-20 h-20 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-2xl mx-auto flex items-center justify-center text-4xl shadow-lg">💬</div>
                <div className="space-y-2">
                  <h2 className="text-xl font-black text-white uppercase tracking-wider">Discord Oficial Magnatas 01!</h2>
                  <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
                    Junta-te ao nosso servidor oficial do Discord para comunicação em call, avisos importantes, suporte prioritário e eventos da gang.
                  </p>
                </div>
                <div className="pt-4">
                  <a href="https://discord.gg" target="_blank" rel="noreferrer" className="inline-flex items-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black px-8 py-4 rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition">
                    <span>🔗</span> Entrar no Discord Oficial
                  </a>
                </div>
              </div>
            </div>
          )}

          {currentView === 'avisos' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-black text-white uppercase tracking-wider">📢 Mural de Avisos da Staff</h2>
              </div>

              {hasPermission('notices.manage') && (
                <form onSubmit={handleAddAvisoStaff} className="bg-[#101216] border border-zinc-800/80 p-6 rounded-2xl space-y-4 shadow-xl">
                  <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider">Publicar Novo Aviso Oficial</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="Título do Aviso" value={formAviso.titulo} onChange={e => setFormAviso({...formAviso, titulo: e.target.value})} className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl text-xs text-white focus:border-amber-500 outline-none" required />
                    <select value={formAviso.importancia} onChange={e => setFormAviso({...formAviso, importancia: e.target.value})} className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl text-xs text-white focus:border-amber-500 outline-none">
                      <option value="Normal">Normal</option>
                      <option value="Importante">Importante</option>
                      <option value="Urgente">🚨 Urgente</option>
                    </select>
                  </div>
                  <textarea placeholder="Mensagem detalhada do aviso..." value={formAviso.mensagem} onChange={e => setFormAviso({...formAviso, mensagem: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl text-xs text-white h-24 focus:border-amber-500 outline-none resize-none" required></textarea>
                  <button type="submit" className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-6 py-3 rounded-xl text-xs uppercase tracking-wider shadow-md shadow-amber-600/20 transition">Publicar Aviso</button>
                </form>
              )}

              <div className="space-y-4">
                {avisosStaff.length === 0 ? (
                  <div className="bg-[#101216] border border-zinc-800/80 p-8 rounded-2xl text-center text-zinc-500 text-xs shadow-xl">Sem avisos da staff publicados no momento.</div>
                ) : (
                  avisosStaff.map(aviso => (
                    <div key={aviso.id} className={`bg-[#101216] border p-6 rounded-2xl space-y-3 shadow-xl ${aviso.importancia === 'Urgente' ? 'border-red-500/50 bg-red-950/10' : 'border-zinc-800/80'}`}>
                      <div className="flex justify-between items-center border-b border-zinc-800/80 pb-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${aviso.importancia === 'Urgente' ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'}`}>
                            {aviso.importancia}
                          </span>
                          <h3 className="text-sm font-black text-white">{aviso.titulo}</h3>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-bold">{aviso.timestamp}</span>
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed">{aviso.mensagem}</p>
                      <div className="flex justify-between items-center pt-2 text-[10px] text-zinc-500">
                        <span>Por: <strong className="text-zinc-400">{aviso.autor}</strong></span>
                        {hasPermission('notices.manage') && (
                          <button onClick={() => handleDeleteAviso(aviso.id)} className="text-red-400 hover:text-red-300 font-bold">Apagar Aviso</button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {currentView === 'regras' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <h2 className="text-lg font-black text-white uppercase tracking-wider">Regras Oficiais do Servidor</h2>
              {hasPermission('rules.manage') && (
                <form onSubmit={handleAddRegra} className="bg-[#101216] border border-zinc-800/80 p-6 rounded-2xl space-y-4 shadow-xl">
                  <h3 className="text-xs font-black text-red-500 uppercase tracking-wider">Adicionar Nova Regra (Owner)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="Título da Regra" value={formRegra.titulo} onChange={e => setFormRegra({...formRegra, titulo: e.target.value})} className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl text-xs text-white focus:border-red-500 outline-none" required />
                    <input type="number" placeholder="Ordem de Exibição" value={formRegra.ordem} onChange={e => setFormRegra({...formRegra, ordem: e.target.value})} className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl text-xs text-white focus:border-red-500 outline-none" required />
                  </div>
                  <textarea placeholder="Descrição detalhada da regra..." value={formRegra.descricao} onChange={e => setFormRegra({...formRegra, descricao: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl text-xs text-white h-24 focus:border-red-500 outline-none resize-none" required></textarea>
                  <button type="submit" className="bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-3 rounded-xl text-xs uppercase tracking-wider shadow-md shadow-red-600/20 transition">Publicar Regra</button>
                </form>
              )}

              <div className="space-y-4">
                {regras.map((r, i) => (
                  <div key={r.id} className="bg-[#101216] border border-zinc-800/80 p-6 rounded-2xl flex justify-between items-start space-x-4 shadow-xl">
                    <div className="space-y-1.5">
                      <h4 className="font-black text-white text-sm">#{i+1}. {r.titulo}</h4>
                      <p className="text-xs text-zinc-300 leading-relaxed">{r.descricao}</p>
                    </div>
                    {hasPermission('rules.manage') && (
                      <button onClick={() => handleDeleteRegra(r.id)} className="text-xs bg-red-950/60 text-red-400 border border-red-800/50 px-3 py-1.5 rounded-xl font-bold hover:bg-red-900/60 transition shrink-0">
                        Remover
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentView === 'cargos' && (
            <div className="space-y-6">
              <h2 className="text-lg font-black text-white uppercase tracking-wider">Lista Completa de Cargos do Servidor</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {allRoles.map(role => (
                  <div key={role.name} className="bg-[#101216] border border-zinc-800/80 p-5 rounded-2xl flex justify-between items-center shadow-xl">
                    <span className={`px-3 py-1.5 rounded-xl text-xs font-black border uppercase tracking-wide ${role.color}`}>{role.name}</span>
                    <span className="text-xs bg-zinc-900 px-3 py-1 rounded-full text-zinc-400 font-bold border border-zinc-800">
                      {usersList.filter(u => (u.roles || []).includes(role.name)).length} membros
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentView === 'meusavisos' && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <h2 className="text-lg font-black text-white flex items-center gap-2 uppercase tracking-wider">⚠️ Meus Avisos / Histórico de Punições</h2>
              
              {userDoc?.punicoes && userDoc.punicoes.length > 0 ? (
                <div className="space-y-4">
                  {userDoc.punicoes.map((p, idx) => (
                    <div key={idx} className="bg-[#101216] border border-red-900/40 p-6 rounded-2xl space-y-2.5 shadow-xl">
                      <div className="flex justify-between items-center border-b border-zinc-800/80 pb-3">
                        <span className="text-xs font-black text-red-400 uppercase tracking-wider">{p.tipo}</span>
                        <span className="text-[10px] text-zinc-500 font-bold">{p.data}</span>
                      </div>
                      <p className="text-xs text-zinc-300"><strong>Motivo:</strong> {p.motivo}</p>
                      <p className="text-xs text-zinc-400"><strong>Duração:</strong> {p.tempo || 'N/A'}</p>
                      <p className="text-[10px] text-zinc-500 pt-1">Aplicado por: <strong className="text-zinc-400">{p.aplicadoPor}</strong></p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 bg-emerald-950/20 border border-emerald-900/40 rounded-2xl text-emerald-400 text-xs font-bold text-center shadow-xl">
                  ✓ Excelente! Não tens avisos ou punições registadas no teu perfil.
                </div>
              )}
            </div>
          )}

          {currentView === 'perfil' && (
            <div className="max-w-xl mx-auto bg-[#101216] border border-zinc-800/80 p-8 rounded-2xl space-y-6 shadow-2xl">
              <div className="flex items-center gap-4 border-b border-zinc-800/80 pb-6">
                <img src={formPerfil.avatar || userDoc?.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"} className="w-16 h-16 rounded-2xl border-2 border-red-500/60 object-cover shadow-md" />
                <div>
                  <h3 className="text-base font-black text-white">{userDoc?.nomeInGame || userDoc?.username || user.email}</h3>
                  <p className="text-xs text-zinc-400">@{userDoc?.username || user.email} {userDoc?.discordTag && `• ${userDoc.discordTag}`}</p>
                  <p className="text-[10px] text-red-500 font-bold mt-1 uppercase tracking-wider">{user.email}</p>
                </div>
              </div>

              <form onSubmit={handleSavePerfil} className="space-y-4">
                <div>
                  <label className="text-xs text-zinc-400 font-bold block mb-1">URL do Avatar (Link de Imagem):</label>
                  <input type="url" placeholder="https://..." value={formPerfil.avatar} onChange={e => setFormPerfil({...formPerfil, avatar: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl text-xs text-white focus:border-red-500 outline-none" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 font-bold block mb-1">Ou Carregar foto do Computador (PC):</label>
                  <input type="file" accept="image/*" onChange={e => handleFileUpload(e, (res) => setFormPerfil({...formPerfil, avatar: res}))} className="text-xs text-zinc-400 bg-zinc-900 p-2.5 rounded-xl w-full border border-zinc-800" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 font-bold block mb-1">Biografia Pessoal</label>
                  <textarea placeholder="Escreve a tua biografia..." value={formPerfil.biografia} onChange={e => setFormPerfil({...formPerfil, biografia: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl text-xs text-white h-24 focus:border-red-500 outline-none resize-none"></textarea>
                </div>
                <button type="submit" className="w-full bg-red-600 hover:bg-red-500 text-white font-extrabold py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-red-600/20 transition">Guardar Alterações do Perfil</button>
              </form>
            </div>
          )}

          {currentView === 'admin' && isSupport && (
            <div className="space-y-6">
              <div className="flex gap-2 border-b border-zinc-800/80 pb-4 overflow-x-auto">
                {hasPermission('applications.view') && <button onClick={() => setAdminTab('candidaturas')} className={`px-4 py-2.5 rounded-xl text-xs font-bold transition ${adminTab === 'candidaturas' ? 'bg-amber-600 text-white shadow-md' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}>⏳ Candidaturas</button>}
                {hasPermission('members.view') && <button onClick={() => setAdminTab('cargos')} className={`px-4 py-2.5 rounded-xl text-xs font-bold transition ${adminTab === 'cargos' ? 'bg-amber-600 text-white shadow-md' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}>🎖️ Gestão de Membros</button>}
                {hasPermission('punishments.view') && <button onClick={() => setAdminTab('punicoes')} className={`px-4 py-2.5 rounded-xl text-xs font-bold transition ${adminTab === 'punicoes' ? 'bg-red-600 text-white shadow-md' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}>⚠️ Punições & Revogações</button>}
                {hasPermission('notes.view') && <button onClick={() => setAdminTab('notas')} className={`px-4 py-2.5 rounded-xl text-xs font-bold transition ${adminTab === 'notas' ? 'bg-indigo-600 text-white shadow-md' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}>📝 Notas Internas</button>}
                {hasPermission('logs.view') && <button onClick={() => setAdminTab('logs')} className={`px-4 py-2.5 rounded-xl text-xs font-bold transition ${adminTab === 'logs' ? 'bg-purple-600 text-white shadow-md' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}>📜 Logs</button>}
                {canManageRoles && <button onClick={() => { setAdminTab('roles'); openRoleEditor(null); }} className={`px-4 py-2.5 rounded-xl text-xs font-bold transition ${adminTab === 'roles' ? 'bg-rose-600 text-white shadow-md' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}>🛡️ Cargos & Permissões</button>}
              </div>

              {adminTab === 'candidaturas' && hasPermission('applications.view') && (
                <div className="space-y-4">
                  {usersList.filter(u => u.estado === 'pendente_analise').length === 0 ? (
                    <div className="bg-[#101216] border border-zinc-800/80 p-10 rounded-2xl text-center text-zinc-500 text-xs shadow-xl">Sem candidaturas pendentes de análise.</div>
                  ) : (
                    usersList.filter(u => u.estado === 'pendente_analise').map(cand => (
                      <div key={cand.id} className="bg-[#101216] border border-amber-500/30 p-6 rounded-2xl flex justify-between items-center shadow-xl">
                        <div className="space-y-1">
                          <h4 className="font-black text-white text-sm">{cand.username} <span className="text-zinc-400 text-xs font-normal">({cand.discordTag || 'Sem Discord'})</span></h4>
                          <p className="text-xs text-zinc-400"><strong>In-Game:</strong> {cand.nomeInGame || 'N/A'} | <strong>ID:</strong> {cand.idInGame} | <strong>Idade:</strong> {cand.idade}</p>
                          <p className="text-xs text-zinc-300 pt-1"><strong>Motivo:</strong> {cand.motivo}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          {hasPermission('applications.review') && <button onClick={() => handleAprovarCandidatura(cand)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition">Aprovar</button>}
                          {hasPermission('applications.review') && <button onClick={() => handleReprovarCandidatura(cand)} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-red-600/20 transition">Reprovar</button>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {adminTab === 'cargos' && hasPermission('members.view') && (
                <div className="bg-[#101216] border border-zinc-800/80 rounded-2xl overflow-visible shadow-2xl">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800/80 text-zinc-400 bg-zinc-900/40">
                        <th className="p-4 font-extrabold uppercase">Membro / Jogador</th>
                        <th className="p-4 font-extrabold uppercase">Cargos Atuais</th>
                        <th className="p-4 font-extrabold uppercase text-center">Atribuir / Gerir Cargos</th>
                        <th className="p-4 font-extrabold uppercase text-center">Ação Staff</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {usersList.filter(u => u.estado === 'aprovado').map(m => (
                        <tr key={m.id} className="hover:bg-zinc-900/40 transition">
                          <td className="p-4 font-bold text-white">
                            {m.nomeInGame || m.username} <span className="text-zinc-500 text-[10px] block">@{m.username} {m.discordTag && `• ${m.discordTag}`}</span>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-1">
                              {(m.roles || []).map(r => <span key={r} className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300">{r}</span>)}
                            </div>
                          </td>
                          <td className="p-4 text-center relative">
                            {hasPermission('members.assign_roles') && <button onClick={() => setActiveRoleModalUser(activeRoleModalUser === m.id ? null : m.id)} className="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-3.5 py-2 rounded-xl text-[11px] font-bold hover:bg-amber-500/20 transition">
                              + Gerir Cargos
                            </button>}
                            {hasPermission('members.assign_roles') && activeRoleModalUser === m.id && (
                              <div className="absolute right-12 top-14 w-64 bg-[#14161b] border border-zinc-700/80 rounded-2xl p-4 shadow-2xl z-50 text-left space-y-1.5 max-h-60 overflow-y-auto">
                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-2 pb-1 border-b border-zinc-800">Cargos Disponíveis</span>
                                {allRoles.map(r => {
                                  const has = (m.roles || []).includes(r.name);
                                  return (
                                    <button key={r.name} onClick={() => handleToggleRole(m.id, r.name)} className={`w-full text-left px-3 py-2 rounded-xl text-[11px] font-bold flex justify-between items-center transition ${has ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'}`}>
                                      <span>{r.name}</span><span>{has ? '✓' : '+'}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex flex-wrap justify-center gap-2">
                              {hasPermission('members.edit') && <button onClick={() => handleEditMember(m)} className="bg-blue-950/60 hover:bg-blue-900 text-blue-300 border border-blue-800/60 px-3 py-2 rounded-xl font-bold text-[11px]">Editar</button>}
                              {hasPermission('members.highlight') && <button onClick={() => handleToggleHighlight(m)} className="bg-amber-950/60 hover:bg-amber-900 text-amber-300 border border-amber-800/60 px-3 py-2 rounded-xl font-bold text-[11px]">{m.destacado ? 'Retirar destaque' : 'Destacar'}</button>}
                              {hasPermission('members.remove') && <button onClick={() => handleKickMembro(m)} className="bg-red-950/60 hover:bg-red-900 text-red-400 border border-red-800/60 px-3 py-2 rounded-xl font-bold text-[11px]">Kick</button>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {adminTab === 'punicoes' && hasPermission('punishments.view') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {hasPermission('punishments.apply') && <form onSubmit={handleAplicarPunicao} className="bg-[#101216] border border-zinc-800/80 p-8 rounded-2xl space-y-4 shadow-xl">
                    <h3 className="text-sm font-black text-red-500 uppercase tracking-wider">Aplicar Punição / Castigo</h3>
                    <select value={formPunicao.targetUserId} onChange={e => setFormPunicao({...formPunicao, targetUserId: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl text-xs text-white focus:border-red-500 outline-none" required>
                      <option value="">Seleciona o membro...</option>
                      {usersList.map(u => <option key={u.id} value={u.id}>{u.nomeInGame || u.username} (@{u.username})</option>)}
                    </select>
                    <select value={formPunicao.tipo} onChange={e => setFormPunicao({...formPunicao, tipo: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl text-xs text-white focus:border-red-500 outline-none">
                      <option value="Warning 1">Warning 1</option>
                      <option value="Warning 2">Warning 2</option>
                      <option value="Muted">Mute Temporário</option>
                      <option value="Ban Temporário">Ban Temporário</option>
                      <option value="Ban Perma">Ban Permanente</option>
                    </select>
                    <input type="text" placeholder="Duração (ex: 3 dias / Permanente)" value={formPunicao.tempo} onChange={e => setFormPunicao({...formPunicao, tempo: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl text-xs text-white focus:border-red-500 outline-none" required />
                    <textarea placeholder="Motivo detalhado da punição..." value={formPunicao.motivo} onChange={e => setFormPunicao({...formPunicao, motivo: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl text-xs text-white h-24 focus:border-red-500 outline-none resize-none" required></textarea>
                    <button type="submit" className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-red-600/20 transition">Aplicar Punição</button>
                  </form>}

                  <div className="bg-[#101216] border border-zinc-800/80 p-8 rounded-2xl space-y-4 shadow-xl">
                    <h3 className="text-sm font-black text-emerald-400 uppercase tracking-wider">Revogar Castigos, Bans e Ex-Membros</h3>
                    <p className="text-xs text-zinc-400">Lista de jogadores com restrições ou castigos ativos:</p>
                    
                    <div className="space-y-4 max-h-[32rem] overflow-y-auto pr-2">
                      {usersList.filter(u => (u.punicoes && u.punicoes.length > 0) || u.estado === 'banido' || u.estado === 'ex_membro').length === 0 ? (
                        <div className="text-xs text-zinc-500 bg-zinc-900/60 p-8 rounded-2xl text-center border border-zinc-800">Nenhum castigo ou banimento ativo.</div>
                      ) : (
                        usersList.filter(u => (u.punicoes && u.punicoes.length > 0) || u.estado === 'banido' || u.estado === 'ex_membro').map(punished => (
                          <div key={punished.id} className="bg-zinc-900/90 p-5 rounded-2xl border border-zinc-800/80 space-y-3 shadow-md">
                            <div className="flex justify-between items-center border-b border-zinc-800/80 pb-3">
                              <div>
                                <h4 className="font-extrabold text-white text-xs">{punished.nomeInGame || punished.username}</h4>
                                <span className="text-[10px] text-red-400 uppercase font-black tracking-wider">ESTADO: {punished.estado}</span>
                              </div>
                              {hasPermission('punishments.revoke') && <button 
                                onClick={() => setModalRevocar({ targetUser: punished, punicaoId: 'BAN_OU_ESTADO' })}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl uppercase tracking-wider shadow-md shadow-emerald-600/20 transition"
                              >
                                Revogar Estado
                              </button>}
                            </div>
                            {punished.punicoes && punished.punicoes.length > 0 && (
                              <div className="space-y-2 pt-1">
                                {punished.punicoes.map((p) => (
                                  <div key={p.id} className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-zinc-800 text-[11px]">
                                    <div>
                                      <strong className="text-red-400 uppercase font-black">{p.tipo}:</strong> <span className="text-zinc-300">{p.motivo}</span>
                                    </div>
                                    {hasPermission('punishments.revoke') && <button 
                                      onClick={() => setModalRevocar({ targetUser: punished, punicaoId: p.id })}
                                      className="bg-red-950/80 hover:bg-red-900 text-red-400 border border-red-800/60 px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase transition"
                                    >
                                      Revogar
                                    </button>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {adminTab === 'notas' && hasPermission('notes.view') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {hasPermission('notes.create') && <form onSubmit={handleAdicionarNota} className="bg-[#101216] border border-zinc-800/80 p-8 rounded-2xl space-y-4 shadow-xl">
                    <h3 className="text-sm font-black text-indigo-400 uppercase tracking-wider">Adicionar Nota Interna a Membro</h3>
                    <select value={formNota.targetUserId} onChange={e => setFormNota({...formNota, targetUserId: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl text-xs text-white focus:border-indigo-500 outline-none" required>
                      <option value="">Seleciona o membro...</option>
                      {usersList.map(u => <option key={u.id} value={u.id}>{u.nomeInGame || u.username} (@{u.username})</option>)}
                    </select>
                    <textarea placeholder="Escreve a nota confidencial da staff..." value={formNota.texto} onChange={e => setFormNota({...formNota, texto: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl text-xs text-white h-32 focus:border-indigo-500 outline-none resize-none" required></textarea>
                    <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/20 transition">Guardar Nota Interna</button>
                  </form>}

                  {hasPermission('notes.view') && <div className="bg-[#101216] border border-zinc-800/80 p-8 rounded-2xl space-y-4 shadow-xl">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Notas Registadas por Membro</h3>
                    <div className="space-y-4 max-h-[32rem] overflow-y-auto pr-2">
                      {usersList.filter(u => u.notasInternas && u.notasInternas.length > 0).length === 0 ? (
                        <div className="text-xs text-zinc-500 bg-zinc-900/60 p-8 rounded-2xl text-center border border-zinc-800">Sem notas internas registadas.</div>
                      ) : (
                        usersList.filter(u => u.notasInternas && u.notasInternas.length > 0).map(u => (
                          <div key={u.id} className="bg-zinc-900/90 p-5 rounded-2xl border border-zinc-800/80 space-y-3">
                            <h4 className="font-extrabold text-white text-xs">{u.nomeInGame || u.username}</h4>
                            <div className="space-y-2">
                              {u.notasInternas.map(nota => (
                                <div key={nota.id} className="bg-black/40 p-3 rounded-xl border border-zinc-800 text-[11px] space-y-1">
                                  <p className="text-zinc-300">{nota.texto}</p>
                                  <div className="flex justify-between items-center text-[10px] text-zinc-500 pt-1 border-t border-zinc-800/60">
                                    <span>Staff: <strong className="text-zinc-400">{nota.autor}</strong></span>
                                    <span>{nota.data}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>}
                </div>
              )}

              {adminTab === 'roles' && canManageRoles && (
                <div className="grid grid-cols-1 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)] gap-6">
                  <section className="bg-[#101216] border border-zinc-800/80 rounded-2xl p-6 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-wider">Cargos existentes</h3>
                        <p className="text-xs text-zinc-500 mt-1">Cargos antigos e cargos criados nesta versão.</p>
                      </div>
                      <button type="button" onClick={() => openRoleEditor(null)} className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-3 py-2 rounded-xl">+ Criar</button>
                    </div>
                    <div className="space-y-2">
                      {allRoles.map(role => (
                        <div key={role.id} className="flex items-center gap-2 bg-zinc-900/70 border border-zinc-800 rounded-xl p-3">
                          <button type="button" onClick={() => openRoleEditor(role)} className="min-w-0 flex-1 text-left">
                            <span className={`inline-flex px-2.5 py-1 rounded-lg border text-[11px] font-black ${role.color || ROLE_COLORS[0].value}`}>{role.name}</span>
                            <span className="block text-[10px] text-zinc-500 mt-1">{(role.permissions || []).length} permissões {role.protected ? '• protegido' : ''}</span>
                          </button>
                          {!role.protected && !DEFAULT_ROLES.some(item => item.name === role.name) && (
                            <button type="button" onClick={() => handleDeleteRole(role)} className="text-red-400 hover:text-red-300 text-xs px-2 py-1">Eliminar</button>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>

                  <form onSubmit={handleSaveRole} className="bg-[#101216] border border-zinc-800/80 rounded-2xl p-6 space-y-5 shadow-xl">
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-wider">{selectedRoleId ? 'Editar cargo' : 'Criar novo cargo'}</h3>
                      <p className="text-xs text-zinc-500 mt-1">Define a identificação do cargo e as ações que os seus membros podem executar.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-zinc-400 font-bold mb-1.5">Nome do cargo</label>
                        <input value={roleForm.name} disabled={Boolean(selectedRoleId && DEFAULT_ROLES.some(role => role.id === selectedRoleId))} onChange={e => setRoleForm({ ...roleForm, name: e.target.value })} placeholder="Ex.: Manager" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-xs text-white outline-none focus:border-red-500" required />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 font-bold mb-1.5">Cor do cargo</label>
                        <select value={roleForm.color} onChange={e => setRoleForm({ ...roleForm, color: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-xs text-white outline-none">
                          {ROLE_COLORS.map(color => <option key={color.value} value={color.value}>{color.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 font-bold mb-1.5">Descrição</label>
                      <textarea value={roleForm.description} onChange={e => setRoleForm({ ...roleForm, description: e.target.value })} placeholder="Explica a função deste cargo..." className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-xs text-white h-20 resize-y outline-none focus:border-red-500" />
                    </div>
                    <div className="border-t border-zinc-800 pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-red-400 uppercase tracking-wider">Permissões do cargo</h4>
                        <span className="text-[10px] text-zinc-500">{roleForm.permissions.length} selecionadas</span>
                      </div>
                      {PERMISSION_GROUPS.map(group => (
                        <div key={group.title} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-2">
                          <h5 className="text-[11px] font-black text-zinc-200 uppercase tracking-wider">{group.title}</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {group.items.map(([key, label]) => {
                              const checked = roleForm.permissions.includes(key);
                              const allowedToGrant = isFounder || userPermissionSet.has(key);
                              return (
                                <label key={key} className={`flex items-start gap-2 text-xs ${allowedToGrant ? 'text-zinc-300' : 'text-zinc-600'}`}>
                                  <input type="checkbox" checked={checked} disabled={!allowedToGrant} onChange={() => toggleRolePermission(key)} className="mt-0.5 accent-red-500" />
                                  <span>{label}{!allowedToGrant && <small className="block text-[10px]">Não tens esta permissão para a atribuir.</small>}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    {allRoles.find(role => role.id === selectedRoleId)?.protected && !isFounder && (
                      <p className="text-xs text-amber-300 bg-amber-950/30 border border-amber-800/50 rounded-xl p-3">Este cargo é protegido. Apenas Owner/Founder pode alterar as suas permissões.</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <button type="submit" className="bg-red-600 hover:bg-red-500 text-white font-bold px-5 py-3 rounded-xl text-xs uppercase tracking-wider">Guardar cargo</button>
                      <button type="button" onClick={() => openRoleEditor(null)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold px-5 py-3 rounded-xl text-xs">Limpar formulário</button>
                    </div>
                  </form>
                </div>
              )}

              {adminTab === 'logs' && hasPermission('logs.view') && (
                <div className="bg-[#101216] border border-zinc-800/80 p-6 rounded-2xl space-y-3 max-h-[30rem] overflow-y-auto shadow-xl">
                  {logsList.map(l => (
                    <div key={l.id} className="text-xs p-3.5 bg-zinc-900/80 rounded-xl flex justify-between items-center border border-zinc-800/80">
                      <div><strong className="text-red-400 font-extrabold">[{l.acao}]</strong> <span className="text-white font-bold">{l.autor}:</span> <span className="text-zinc-300">{l.detalhe}</span></div>
                      <span className="text-[10px] text-zinc-500 font-bold shrink-0 ml-4">{l.timestamp}</span>
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
