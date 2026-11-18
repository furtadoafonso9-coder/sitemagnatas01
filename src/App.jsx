import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { auth, db } from './firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  arrayUnion,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc
} from 'firebase/firestore';

import { DEFAULT_ROLES, ROLE_COLORS, NAV_ITEMS, DEFAULT_AVATAR, PERMISSION_GROUPS } from './constants';
import { formatDateTime, getRoleColor, getMemberName, matchesMember } from './utils';

/* -------------------------------------------------------------------------- */
/* MAGNATAS 01! — COMMUNITY PORTAL (VERSÃO ATUALIZADA)                       */
/* -------------------------------------------------------------------------- */

function StatusPill({ status }) {
  const labels = {
    aprovado: 'Aprovado',
    pendente_analise: 'Em análise',
    pendente_candidatura: 'Pendente',
    rejeitado: 'Rejeitado',
    ex_membro: 'Ex-membro',
    banido: 'Banido'
  };
  const tone = status === 'aprovado' ? 'green' : status === 'banido' || status === 'rejeitado' ? 'red' : status === 'pendente_analise' ? 'amber' : 'gray';
  return <span className={`status-pill ${tone}`}>{labels[status] || status || 'Sem estado'}</span>;
}

function RoleBadge({ role, allRoles }) {
  const found = allRoles.find(item => item.name === role);
  return <span className={`role-badge ${getRoleColor(found)}`}>{role}</span>;
}

function Avatar({ member, size = 'md' }) {
  return <img className={`avatar avatar-${size}`} src={member?.avatar || DEFAULT_AVATAR} alt={`Avatar de ${getMemberName(member)}`} onError={event => { event.currentTarget.src = DEFAULT_AVATAR; }} />;
}

function StatCard({ label, value, detail, icon, tone = 'red' }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}>{icon}</div>
      <div className="stat-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        {detail && <small>{detail}</small>}
      </div>
    </div>
  );
}

function EmptyState({ icon = '◌', title, description }) {
  return <div className="empty-state"><div className="empty-icon">{icon}</div><strong>{title}</strong><p>{description}</p></div>;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [userDoc, setUserDoc] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('magnatas_theme') === 'dark';
  });

  useEffect(() => {
    localStorage.setItem('magnatas_theme', darkMode ? 'dark' : 'light');
    if (darkMode) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }, [darkMode]);

  const [currentView, setCurrentView] = useState('dashboard');
  const [subTabBase, setSubTabBase] = useState('ativos');
  const [adminTab, setAdminTab] = useState('membros');

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
  const [notifications, setNotifications] = useState([]);
  const [events, setEvents] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [adminMemberSearch, setAdminMemberSearch] = useState('');
  const [adminMemberStatus, setAdminMemberStatus] = useState('todos');
  const [adminMemberRole, setAdminMemberRole] = useState('todos');
  const [applicationSearch, setApplicationSearch] = useState('');
  
  const [punishmentMemberSearch, setPunishmentMemberSearch] = useState('');
  const [noteMemberSearch, setNoteMemberSearch] = useState('');

  const [selectedMember, setSelectedMember] = useState(null);
  const [editingMemberModal, setEditingMemberModal] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);

  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [roleForm, setRoleForm] = useState({ name: '', description: '', color: 'red', permissions: [] });
  const [showRoleEditor, setShowRoleEditor] = useState(false);
  const [modalRevocar, setModalRevocar] = useState(null);

  const [formCandidatura, setFormCandidatura] = useState({ idade: '', nomeInGame: '', discordTag: '', idInGame: '', killsAtual: '', tempoCidade: '', motivo: '' });
  const [formPerfil, setFormPerfil] = useState({ avatar: '', biografia: '' });
  const [formRoupa, setFormRoupa] = useState({ nome: '', numero: '', imagem: '' });
  const [formRegra, setFormRegra] = useState({ titulo: '', descricao: '', ordem: 1 });
  const [formRadio, setFormRadio] = useState({ titulo: '', frequencia: '', info: '' });
  const [formAviso, setFormAviso] = useState({ titulo: '', mensagem: '', importancia: 'Normal' });
  const [formPunicao, setFormPunicao] = useState({ targetUserId: '', tipo: 'Warning 1', tempo: '', motivo: '' });
  const [formNota, setFormNota] = useState({ targetUserId: '', texto: '' });
  const [formEvento, setFormEvento] = useState({ titulo: '', descricao: '', data: '', hora: '', tipo: 'Reunião' });

  const allRoles = useMemo(() => {
    const merged = DEFAULT_ROLES.map(base => {
      const saved = customRoles.find(role => role.name === base.name);
      return saved ? { ...base, ...saved, id: saved.id || base.id, protected: Boolean(base.protected || saved.protected) } : base;
    });
    return merged.concat(customRoles.filter(role => !DEFAULT_ROLES.some(base => base.name === role.name)));
  }, [customRoles]);

  const userRoles = userDoc?.roles || [];
  const isFounder = userRoles.includes('01 Founder´s') || userRoles.includes('OWNER');
  
  const isSupportOrHigher = isFounder || userRoles.some(r => {
    const name = String(r || '').toLowerCase();
    return name.includes('support') || name.includes('suporte') || name.includes('founder') || name.includes('owner') || name.includes('admin') || name.includes('staff');
  });

  const isAdminOrStaff = isFounder || isSupportOrHigher || userRoles.some(r => {
    const name = String(r || '').toLowerCase();
    return name.includes('admin') || name.includes('staff') || name.includes('moderador') || name.includes('mod');
  });

  const userPermissionSet = useMemo(() => new Set(
    allRoles.filter(role => userRoles.includes(role.name)).flatMap(role => role.permissions || [])
  ), [allRoles, userDoc]);
  
  const hasPermission = useCallback(permission => isFounder || userPermissionSet.has(permission), [isFounder, userPermissionSet]);
  const canReadMembers = isFounder || userPermissionSet.has('members.view') || userPermissionSet.has('applications.view') || userPermissionSet.has('notes.view') || userPermissionSet.has('punishments.view') || isSupportOrHigher;
  const canReadLogs = isFounder || userPermissionSet.has('logs.view') || isSupportOrHigher;
  const currentUsername = userDoc?.username || user?.email || 'Utilizador';
  const unreadNotifications = notifications.filter(item => !(item.readBy || []).includes(user?.uid));

  const fetchUserDocument = async firebaseUser => {
    try {
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const snapshot = await getDoc(userDocRef);
      
      if (snapshot.exists()) {
        const data = snapshot.data();
        setUserDoc(data);
        setFormPerfil({ avatar: data.avatar || '', biografia: data.biografia || '' });
        setFormCandidatura(current => ({ ...current, ...Object.fromEntries(['idade','nomeInGame','discordTag','idInGame','killsAtual','tempoCidade','motivo'].map(key => [key, data[key] || ''])) }));
      } else {
        const defaultNewUser = {
          uid: firebaseUser.uid,
          username: firebaseUser.email.split('@')[0],
          email: firebaseUser.email.toLowerCase(),
          avatar: DEFAULT_AVATAR,
          biografia: 'Sem biografia definida.',
          estado: 'aprovado',
          roles: ["01 Member´s", 'HOMEM'],
          destacado: false,
          ausente: false,
          punicoes: [],
          notasInternas: [],
          createdAt: serverTimestamp()
        };
        await setDoc(userDocRef, defaultNewUser);
        setUserDoc(defaultNewUser);
      }
    } catch (error) {
      console.error('Erro ao carregar documento:', error);
      setAuthError(`Erro ao carregar dados: ${error.message}`);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async firebaseUser => {
      setUser(firebaseUser || null);
      if (firebaseUser) {
        await fetchUserDocument(firebaseUser);
      } else {
        setUserDoc(null);
      }
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return undefined;

    const unsubUser = onSnapshot(doc(db, 'users', user.uid), snapshot => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setUserDoc(data);
        setFormPerfil(current => ({ avatar: current.avatar || data.avatar || '', biografia: current.biografia || data.biografia || '' }));
      }
    });
    const unsubRoles = onSnapshot(collection(db, 'roles'), snapshot => {
      const list = [];
      snapshot.forEach(item => list.push({ id: item.id, ...item.data() }));
      setCustomRoles(list);
    });
    const unsubRoupas = onSnapshot(collection(db, 'roupas'), snapshot => setRoupas(snapshot.docs.map(item => ({ id: item.id, ...item.data() }))));
    const unsubRadios = onSnapshot(collection(db, 'radios'), snapshot => setRadiosList(snapshot.docs.map(item => ({ id: item.id, ...item.data() }))));
    const unsubRegras = onSnapshot(query(collection(db, 'regras'), orderBy('ordem', 'asc')), snapshot => setRegras(snapshot.docs.map(item => ({ id: item.id, ...item.data() }))));
    const unsubAvisos = onSnapshot(query(collection(db, 'avisos_staff'), orderBy('timestamp', 'desc')), snapshot => setAvisosStaff(snapshot.docs.map(item => ({ id: item.id, ...item.data() }))));
    const unsubNotifications = onSnapshot(query(collection(db, 'notificacoes'), orderBy('createdAt', 'desc'), limit(40)), snapshot => setNotifications(snapshot.docs.map(item => ({ id: item.id, ...item.data() }))));
    const unsubEvents = onSnapshot(collection(db, 'eventos'), snapshot => setEvents(snapshot.docs.map(item => ({ id: item.id, ...item.data() }))));

    let unsubUsers = null;
    if (canReadMembers) {
      unsubUsers = onSnapshot(collection(db, 'users'), snapshot => setUsersList(snapshot.docs.map(item => ({ id: item.id, ...item.data() }))));
    } else {
      setUsersList([]);
    }

    let unsubLogs = null;
    if (canReadLogs) {
      unsubLogs = onSnapshot(query(collection(db, 'logs'), orderBy('timestamp', 'desc'), limit(100)), snapshot => setLogsList(snapshot.docs.map(item => ({ id: item.id, ...item.data() }))));
    } else {
      setLogsList([]);
    }

    return () => {
      unsubUser(); unsubRoles(); unsubRoupas(); unsubRadios(); unsubRegras(); unsubAvisos();
      unsubNotifications(); unsubEvents();
      if (unsubUsers) unsubUsers();
      if (unsubLogs) unsubLogs();
    };
  }, [user, canReadMembers, canReadLogs]);

  const addLog = async (acao, detalhe) => {
    try {
      await addDoc(collection(db, 'logs'), {
        autor: currentUsername,
        acao,
        detalhe,
        timestamp: new Date().toLocaleString('pt-PT'),
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Erro ao registar log:', error);
    }
  };

  const createNotification = async (titulo, mensagem, tipo = 'info') => {
    try {
      await addDoc(collection(db, 'notificacoes'), {
        titulo,
        mensagem,
        tipo,
        autor: currentUsername,
        readBy: [],
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
    }
  };

  const handleEmailAuth = async event => {
    event.preventDefault();
    setAuthError('');
    const cleanEmail = emailInput.trim();
    if (!cleanEmail || !passwordInput) return setAuthError('Preenche o e-mail e a palavra-passe.');
    try {
      if (isRegistering) {
        if (!usernameInput.trim()) return setAuthError('Indica um nome de utilizador.');
        const credential = await createUserWithEmailAndPassword(auth, cleanEmail, passwordInput);
        const newUser = {
          uid: credential.user.uid,
          username: usernameInput.trim(),
          email: cleanEmail.toLowerCase(),
          avatar: DEFAULT_AVATAR,
          biografia: 'Sem biografia definida.',
          estado: 'pendente_candidatura',
          roles: ["01 Member´s", 'HOMEM'],
          destacado: false,
          ausente: false,
          punicoes: [],
          notasInternas: [],
          createdAt: serverTimestamp()
        };
        await setDoc(doc(db, 'users', credential.user.uid), newUser);
        setUserDoc(newUser);
      } else {
        await signInWithEmailAndPassword(auth, cleanEmail, passwordInput);
      }
    } catch (error) {
      const messages = {
        'auth/email-already-in-use': 'Este e-mail já tem uma conta.',
        'auth/invalid-email': 'O e-mail introduzido não é válido.',
        'auth/weak-password': 'A palavra-passe deve ter pelo menos 6 caracteres.',
        'auth/invalid-credential': 'E-mail ou palavra-passe incorretos.',
        'auth/user-not-found': 'Não existe nenhuma conta associada a este e-mail.',
        'auth/wrong-password': 'A palavra-passe está incorreta.'
      };
      setAuthError(messages[error.code] || `Erro ao autenticar: ${error.message}`);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserDoc(null);
      setCurrentView('dashboard');
    } catch (error) {
      setAuthError(`Erro ao terminar sessão: ${error.message}`);
    }
  };

  const handleFileUpload = (event, callback) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 600 * 1024) {
      window.alert('A imagem é demasiado grande. Utiliza um ficheiro até 600 KB.');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => callback(reader.result);
    reader.onerror = () => window.alert('Erro ao carregar a imagem.');
    reader.readAsDataURL(file);
  };

  const handleSavePerfil = async event => {
    event.preventDefault();
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        avatar: formPerfil.avatar || userDoc?.avatar || DEFAULT_AVATAR,
        biografia: formPerfil.biografia.trim()
      });
      await addLog('Perfil', 'Atualizou o próprio perfil.');
      window.alert('Perfil atualizado com sucesso.');
    } catch (error) {
      window.alert(`Erro ao atualizar perfil: ${error.message}`);
    }
  };

  const handleSubmitCandidatura = async event => {
    event.preventDefault();
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        ...formCandidatura,
        idade: String(formCandidatura.idade).trim(),
        idInGame: String(formCandidatura.idInGame).trim(),
        estado: 'pendente_analise',
        candidaturaAtualizadaEm: serverTimestamp()
      });
      window.alert('Candidatura submetida com sucesso.');
    } catch (error) {
      window.alert(`Erro ao submeter candidatura: ${error.message}`);
    }
  };

  const handleResetCandidatura = async () => {
    try {
      await updateDoc(doc(db, 'users', user.uid), { estado: 'pendente_candidatura' });
    } catch (error) {
      window.alert(`Erro ao reabrir candidatura: ${error.message}`);
    }
  };

  const handleAprovarCandidatura = async target => {
    if (!isAdminOrStaff && !hasPermission('applications.review')) return window.alert('Não tens permissão.');
    try {
      await updateDoc(doc(db, 'users', target.id), { estado: 'aprovado', candidaturaDecididaEm: serverTimestamp(), candidaturaDecididaPor: currentUsername });
      await addLog('Candidatura aprovada', `Aprovou ${target.username} (ID In-Game: ${target.idInGame || '—'}).`);
      await createNotification('Candidatura aprovada', `A candidatura de ${getMemberName(target)} foi aprovada.`, 'success');
    } catch (error) {
      window.alert(`Erro ao aprovar: ${error.message}`);
    }
  };

  const handleReprovarCandidatura = async target => {
    if (!isAdminOrStaff && !hasPermission('applications.review')) return window.alert('Não tens permissão.');
    try {
      await updateDoc(doc(db, 'users', target.id), { estado: 'rejeitado', candidaturaDecididaEm: serverTimestamp(), candidaturaDecididaPor: currentUsername });
      await addLog('Candidatura rejeitada', `Rejeitou ${target.username}.`);
    } catch (error) {
      window.alert(`Erro ao rejeitar: ${error.message}`);
    }
  };

  const handleOpenEditMember = target => {
    if (!isAdminOrStaff && !hasPermission('members.edit')) return window.alert('Não tens permissão.');
    setEditingMemberModal({
      ...target,
      nomeInGame: target.nomeInGame || '',
      discordTag: target.discordTag || '',
      idInGame: target.idInGame || '',
      roles: Array.isArray(target.roles) ? [...target.roles] : []
    });
  };

  const handleSaveMemberEdits = async event => {
    event.preventDefault();
    if (!editingMemberModal) return;
    try {
      await updateDoc(doc(db, 'users', editingMemberModal.id), {
        nomeInGame: editingMemberModal.nomeInGame.trim(),
        discordTag: editingMemberModal.discordTag.trim(),
        idInGame: editingMemberModal.idInGame.trim(),
        roles: editingMemberModal.roles
      });
      await addLog('Membros', `Editou os dados e cargos de ${editingMemberModal.username}.`);
      setEditingMemberModal(null);
      window.alert('Dados do membro atualizados com sucesso.');
    } catch (error) {
      window.alert(`Erro ao guardar alterações: ${error.message}`);
    }
  };

  const handleToggleMemberRole = roleName => {
    if (!editingMemberModal) return;
    const currentRoles = editingMemberModal.roles || [];
    const updatedRoles = currentRoles.includes(roleName)
      ? currentRoles.filter(r => r !== roleName)
      : [...currentRoles, roleName];
    setEditingMemberModal({ ...editingMemberModal, roles: updatedRoles });
  };

  const handleToggleHighlight = async target => {
    if (!isAdminOrStaff && !hasPermission('members.highlight')) return window.alert('Não tens permissão.');
    try {
      await updateDoc(doc(db, 'users', target.id), { destacado: !target.destacado });
      await addLog('Membros', `${target.destacado ? 'Removeu destaque de' : 'Destacou'} ${target.username}.`);
    } catch (error) {
      window.alert(`Erro ao alterar destaque: ${error.message}`);
    }
  };

  const handleKickMembro = async target => {
    if (!isAdminOrStaff && !hasPermission('members.remove')) return window.alert('Não tens permissão.');
    const motivoKick = window.prompt(`Motivo da remoção de ${target.username}:`, 'Reestruturação / Inatividade');
    if (!motivoKick?.trim()) return;
    const kick = {
      id: Date.now(), tipo: 'Kick da Comunidade', tempo: 'Imediato', motivo: motivoKick.trim(),
      aplicadoPor: currentUsername, data: new Date().toLocaleDateString('pt-PT')
    };
    try {
      await updateDoc(doc(db, 'users', target.id), { estado: 'ex_membro', punicoes: [...(target.punicoes || []), kick] });
      await addLog('Remoção de membro', `Removeu ${target.username}. Motivo: ${motivoKick.trim()}.`);
    } catch (error) {
      window.alert(`Erro ao remover membro: ${error.message}`);
    }
  };

  const handleAdicionarNota = async event => {
    event.preventDefault();
    if (!isAdminOrStaff) return window.alert('Não tens permissão.');
    if (!formNota.targetUserId || !formNota.texto.trim()) return;
    const target = usersList.find(item => item.id === formNota.targetUserId);
    if (!target) return;
    const note = { id: Date.now(), texto: formNota.texto.trim(), autor: currentUsername, data: new Date().toLocaleString('pt-PT') };
    try {
      await updateDoc(doc(db, 'users', target.id), { notasInternas: [...(target.notasInternas || []), note] });
      setFormNota({ targetUserId: '', texto: '' });
      await addLog('Nota interna', `Adicionou uma nota a ${getMemberName(target)}.`);
    } catch (error) {
      window.alert(`Erro ao guardar nota: ${error.message}`);
    }
  };

  const handleAddRoupa = async event => {
    event.preventDefault();
    if (!isAdminOrStaff && !hasPermission('clothes.manage')) return;
    try {
      await addDoc(collection(db, 'roupas'), { ...formRoupa, createdAt: serverTimestamp(), createdBy: currentUsername });
      setFormRoupa({ nome: '', numero: '', imagem: '' });
      await addLog('Roupas e kits', `Adicionou o kit ${formRoupa.nome}.`);
    } catch (error) {
      window.alert(`Erro ao guardar kit: ${error.message}`);
    }
  };

  const handleDeleteRoupa = async id => {
    if (!isAdminOrStaff && !hasPermission('clothes.manage')) return;
    try {
      await deleteDoc(doc(db, 'roupas', id));
      await addLog('Roupas e kits', 'Eliminou um kit.');
    } catch (error) {
      window.alert(`Erro ao eliminar kit: ${error.message}`);
    }
  };

  const handleAddRadio = async event => {
    event.preventDefault();
    if (!isAdminOrStaff && !hasPermission('radio.manage')) return;
    try {
      await addDoc(collection(db, 'radios'), { ...formRadio, createdAt: serverTimestamp() });
      setFormRadio({ titulo: '', frequencia: '', info: '' });
      await addLog('Rádio', `Adicionou a frequência ${formRadio.titulo}.`);
    } catch (error) {
      window.alert(`Erro ao guardar frequência: ${error.message}`);
    }
  };

  const handleDeleteRadio = async id => {
    if (!isAdminOrStaff && !hasPermission('radio.manage')) return;
    try {
      await deleteDoc(doc(db, 'radios', id));
      await addLog('Rádio', 'Eliminou uma frequência.');
    } catch (error) {
      window.alert(`Erro ao eliminar frequência: ${error.message}`);
    }
  };

  const handleAddRegra = async event => {
    event.preventDefault();
    if (!isAdminOrStaff && !hasPermission('rules.manage')) return;
    try {
      await addDoc(collection(db, 'regras'), { ...formRegra, ordem: Number(formRegra.ordem), createdAt: serverTimestamp() });
      setFormRegra({ titulo: '', descricao: '', ordem: regras.length + 1 });
      await addLog('Regras', `Adicionou a regra ${formRegra.titulo}.`);
    } catch (error) {
      window.alert(`Erro ao guardar regra: ${error.message}`);
    }
  };

  const handleDeleteRegra = async id => {
    if (!isAdminOrStaff && !hasPermission('rules.manage')) return;
    try {
      await deleteDoc(doc(db, 'regras', id));
      await addLog('Regras', 'Eliminou uma regra.');
    } catch (error) {
      window.alert(`Erro ao eliminar regra: ${error.message}`);
    }
  };

  const handleAddAvisoStaff = async event => {
    event.preventDefault();
    if (!isAdminOrStaff && !hasPermission('notices.manage')) return;
    try {
      await addDoc(collection(db, 'avisos_staff'), { ...formAviso, autor: currentUsername, timestamp: new Date().toLocaleString('pt-PT'), createdAt: serverTimestamp() });
      await createNotification(formAviso.titulo, formAviso.mensagem, formAviso.importancia === 'Urgente' ? 'urgent' : 'notice');
      setFormAviso({ titulo: '', mensagem: '', importancia: 'Normal' });
      await addLog('Avisos', `Publicou o aviso ${formAviso.titulo}.`);
    } catch (error) {
      window.alert(`Erro ao publicar aviso: ${error.message}`);
    }
  };

  const handleDeleteAviso = async id => {
    if (!isAdminOrStaff && !hasPermission('notices.manage')) return;
    try {
      await deleteDoc(doc(db, 'avisos_staff', id));
      await addLog('Avisos', 'Eliminou um aviso.');
    } catch (error) {
      window.alert(`Erro ao eliminar aviso: ${error.message}`);
    }
  };

  const handleAplicarPunicao = async event => {
    event.preventDefault();
    if (!isAdminOrStaff) return window.alert('Não tens permissão.');
    if (!formPunicao.targetUserId) return window.alert('Seleciona um membro.');
    const target = usersList.find(item => item.id === formPunicao.targetUserId);
    if (!target) return;
    const punishment = {
      id: Date.now(), tipo: formPunicao.tipo, tempo: formPunicao.tempo.trim(), motivo: formPunicao.motivo.trim(),
      aplicadoPor: currentUsername, data: new Date().toLocaleDateString('pt-PT')
    };
    const nextState = formPunicao.tipo.includes('Ban') ? 'banido' : target.estado;
    try {
      await updateDoc(doc(db, 'users', target.id), { punicoes: [...(target.punicoes || []), punishment], estado: nextState });
      await addLog('Punição', `Aplicou ${formPunicao.tipo} a ${target.username}.`);
      setFormPunicao({ targetUserId: '', tipo: 'Warning 1', tempo: '', motivo: '' });
      setPunishmentMemberSearch('');
    } catch (error) {
      window.alert(`Erro ao aplicar punição: ${error.message}`);
    }
  };

  const executarRevogacao = async acaoDestino => {
    if (!isAdminOrStaff) return window.alert('Não tens permissão.');
    if (!modalRevocar) return;
    const { targetUser, punicaoId } = modalRevocar;
    try {
      if (punicaoId === 'BAN_OU_ESTADO') {
        const hasBan = (targetUser.punicoes || []).some(item => String(item.tipo || '').toLowerCase().includes('ban'));
        if (hasBan) return window.alert('Remove primeiro a punição de ban correspondente.');
        const nextState = acaoDestino === 'entrar' ? 'aprovado' : 'pendente_candidatura';
        await updateDoc(doc(db, 'users', targetUser.id), { estado: nextState });
        await addLog('Revogação', `Alterou o estado de ${targetUser.username} para ${nextState}.`);
      } else {
        const remaining = (targetUser.punicoes || []).filter(item => item.id !== punicaoId);
        const stillBanned = remaining.some(item => String(item.tipo || '').toLowerCase().includes('ban'));
        let nextState = targetUser.estado;
        if (!stillBanned && targetUser.estado === 'banido' && acaoDestino === 'entrar') nextState = 'aprovado';
        await updateDoc(doc(db, 'users', targetUser.id), { punicoes: remaining, estado: nextState });
        await addLog('Revogação', `Removeu uma punição de ${targetUser.username}.`);
      }
      setModalRevocar(null);
    } catch (error) {
      window.alert(`Erro ao revogar: ${error.message}`);
    }
  };

  const openRoleEditor = role => {
    if (!isAdminOrStaff) return window.alert('Não tens permissão.');
    try {
      setSelectedRoleId(role?.id || null);
      setRoleForm({
        name: role?.name || '',
        description: role?.description || '',
        color: role?.color || getRoleColor(role) || 'red',
        permissions: Array.isArray(role?.permissions) ? [...role.permissions] : []
      });
      setShowRoleEditor(true);
    } catch (err) {
      console.error('Erro ao abrir editor de cargos:', err);
      window.alert('Não foi possível abrir o editor de cargos.');
    }
  };

  const handleSaveRole = async event => {
    event.preventDefault();
    if (!isAdminOrStaff) return window.alert('Não tens permissão.');
    const cleanName = roleForm.name.trim();
    if (!cleanName) return window.alert('Indica o nome do cargo.');
    if (allRoles.some(role => role.name.toLowerCase() === cleanName.toLowerCase() && role.id !== selectedRoleId)) return window.alert('Já existe um cargo com esse nome.');
    const selectedRole = allRoles.find(role => role.id === selectedRoleId);

    const payload = {
      name: cleanName,
      description: roleForm.description.trim(),
      color: roleForm.color || 'red',
      permissions: Array.isArray(roleForm.permissions) ? roleForm.permissions : [],
      protected: Boolean(selectedRole?.protected),
      updatedAt: serverTimestamp(),
      updatedBy: currentUsername
    };
    try {
      if (selectedRoleId && customRoles.some(role => role.id === selectedRoleId)) {
        await setDoc(doc(db, 'roles', selectedRoleId), payload, { merge: true });
      } else if (selectedRoleId && selectedRoleId.startsWith('legacy_')) {
        await setDoc(doc(db, 'roles', selectedRoleId), payload, { merge: true });
      } else {
        await addDoc(collection(db, 'roles'), { ...payload, createdAt: serverTimestamp(), createdBy: currentUsername });
      }
      await addLog('Gestão de cargos', `${selectedRoleId ? 'Atualizou' : 'Criou'} o cargo ${cleanName}.`);
      setShowRoleEditor(false);
      setSelectedRoleId(null);
      setRoleForm({ name: '', description: '', color: 'red', permissions: [] });
    } catch (error) {
      console.error('Erro ao guardar cargo:', error);
      window.alert(`Não foi possível guardar o cargo: ${error.message}`);
    }
  };

  const handleDeleteRole = async role => {
    if (!isAdminOrStaff) return window.alert('Não tens permissão.');
    if (role.protected || DEFAULT_ROLES.some(item => item.name === role.name)) return window.alert('Os cargos base do sistema não podem ser eliminados.');
    if (usersList.some(member => (member.roles || []).includes(role.name))) return window.alert('Este cargo ainda está atribuído a membros.');
    if (!window.confirm(`Eliminar o cargo ${role.name}?`)) return;
    try {
      await deleteDoc(doc(db, 'roles', role.id));
      await addLog('Gestão de cargos', `Eliminou o cargo ${role.name}.`);
    } catch (error) {
      window.alert(`Erro ao eliminar cargo: ${error.message}`);
    }
  };

  const toggleRolePermission = permission => {
    setRoleForm(current => ({
      ...current,
      permissions: current.permissions.includes(permission) ? current.permissions.filter(item => item !== permission) : [...current.permissions, permission]
    }));
  };

  const markNotificationRead = async notificationId => {
    if (!user?.uid) return;
    try {
      await updateDoc(doc(db, 'notificacoes', notificationId), { readBy: arrayUnion(user.uid) });
    } catch (error) {
      console.error('Erro ao marcar notificação:', error);
    }
  };

  const markAllNotificationsRead = async () => {
    for (const notification of unreadNotifications) await markNotificationRead(notification.id);
  };

  const handleAddEvento = async event => {
    event.preventDefault();
    if (!isAdminOrStaff && !hasPermission('events.manage')) return;
    if (!formEvento.titulo.trim() || !formEvento.data || !formEvento.hora) return window.alert('Preenche o título, a data e a hora.');
    try {
      await addDoc(collection(db, 'eventos'), { ...formEvento, autor: currentUsername, createdAt: serverTimestamp() });
      await createNotification('Novo evento: ' + formEvento.titulo, `${formEvento.data} às ${formEvento.hora} — ${formEvento.descricao || 'Consulta o calendário.'}`, 'event');
      await addLog('Calendário', `Criou o evento ${formEvento.titulo}.`);
      setFormEvento({ titulo: '', descricao: '', data: '', hora: '', tipo: 'Reunião' });
    } catch (error) {
      window.alert(`Erro ao criar evento: ${error.message}`);
    }
  };

  const handleDeleteEvento = async eventItem => {
    if (!isAdminOrStaff && !hasPermission('events.manage')) return;
    if (!window.confirm(`Eliminar o evento ${eventItem.titulo}?`)) return;
    try {
      await deleteDoc(doc(db, 'eventos', eventItem.id));
      await addLog('Calendário', `Eliminou o evento ${eventItem.titulo}.`);
    } catch (error) {
      window.alert(`Erro ao eliminar evento: ${error.message}`);
    }
  };

  const sortedEvents = useMemo(() => [...events].sort((a, b) => `${a.data || ''}T${a.hora || ''}`.localeCompare(`${b.data || ''}T${b.hora || ''}`)), [events]);
  const upcomingEvents = sortedEvents.filter(item => !item.data || `${item.data}T${item.hora || '23:59'}` >= new Date().toISOString().slice(0, 16));
  const pendingApplications = usersList.filter(item => item.estado === 'pendente_analise');
  const filteredAdminMembers = usersList.filter(member => {
    const matchesSearch = matchesMember(member, adminMemberSearch);
    const matchesStatus = adminMemberStatus === 'todos' || member.estado === adminMemberStatus;
    const matchesRole = adminMemberRole === 'todos' || (member.roles || []).includes(adminMemberRole);
    return matchesSearch && matchesStatus && matchesRole;
  });
  const filteredCommunityMembers = usersList.filter(member => {
    if (!matchesMember(member, searchQuery)) return false;
    if (subTabBase === 'ativos') return member.estado === 'aprovado' && !member.ausente;
    if (subTabBase === 'destaque') return Boolean(member.destacado);
    if (subTabBase === 'ausentes') return member.ausente === true;
    if (subTabBase === 'ex_membros') return member.estado === 'ex_membro';
    if (subTabBase === 'banidos') return member.estado === 'banido' || member.estado === 'rejeitado';
    return true;
  });
  const stats = {
    total: usersList.length,
    active: usersList.filter(item => item.estado === 'aprovado' && !item.ausente).length,
    absent: usersList.filter(item => item.ausente).length,
    pending: pendingApplications.length,
    punished: usersList.filter(item => (item.punicoes || []).length > 0).length
  };

  const navigate = view => {
    if (view === 'admin' && !isAdminOrStaff) {
      window.alert('Não tens permissão para aceder ao Painel Administrativo.');
      return;
    }
    setCurrentView(view);
    setMobileNavOpen(false);
    setNotificationMenuOpen(false);
  };

  const openMember = member => setSelectedMember(member);

  if (authLoading) {
    return <><style>{APP_STYLES}</style><div className="loading-screen"><div className="loading-mark">M</div><strong>MAGNATAS 01!</strong><span>A verificar sessão...</span></div></>;
  }

  if (!user) {
    return (
      <><style>{APP_STYLES}</style>
        <div className="auth-screen">
          <button className="theme-toggle-floating" onClick={() => setDarkMode(!darkMode)} title="Alternar modo escuro/claro">
            {darkMode ? '☀️' : '🌙'}
          </button>
          <div className="auth-card">
            <div className="auth-brand-mark">M</div>
            <div className="auth-eyebrow">COMMUNITY PORTAL</div>
            <h1>MAGNATAS <span>01!</span></h1>
            <p className="auth-subtitle">O teu espaço. A tua comunidade.</p>
            {authError && <div className="alert alert-error">{authError}</div>}
            <form onSubmit={handleEmailAuth} className="form-stack">
              {isRegistering && <label className="field"><span>Nome de utilizador</span><input value={usernameInput} onChange={event => setUsernameInput(event.target.value)} placeholder="Como te devemos chamar?" required /></label>}
              <label className="field"><span>E-mail</span><input type="email" value={emailInput} onChange={event => setEmailInput(event.target.value)} placeholder="teu@email.com" autoComplete="email" required /></label>
              <label className="field"><span>Palavra-passe</span><input type="password" value={passwordInput} onChange={event => setPasswordInput(event.target.value)} placeholder="A tua palavra-passe" autoComplete={isRegistering ? 'new-password' : 'current-password'} required /></label>
              <button className="button button-primary button-full" type="submit">{isRegistering ? 'Criar conta' : 'Iniciar sessão'}</button>
            </form>
            <button className="text-button auth-switch" onClick={() => { setIsRegistering(!isRegistering); setAuthError(''); }}>{isRegistering ? 'Já tens conta? Iniciar sessão' : 'Ainda não tens conta? Criar conta'}</button>
            <div className="auth-footnote">Acesso reservado aos membros da comunidade.</div>
          </div>
        </div>
      </>
    );
  }

  if (!userDoc) {
    return <><style>{APP_STYLES}</style><div className="loading-screen"><div className="loading-mark">M</div><strong>A preparar o teu perfil...</strong><span>A carregar dados do Firestore...</span><button className="button button-outline" onClick={handleLogout}>Terminar sessão</button></div></>;
  }

  const blockedStates = ['pendente_candidatura', 'pendente_analise', 'rejeitado', 'ex_membro', 'banido'];
  if (blockedStates.includes(userDoc.estado)) {
    return (
      <><style>{APP_STYLES}</style>
        <div className="auth-screen">
          <button className="theme-toggle-floating" onClick={() => setDarkMode(!darkMode)} title="Alternar modo escuro/claro">
            {darkMode ? '☀️' : '🌙'}
          </button>
          <div className="application-card">
            <div className="application-brand"><div className="brand-mark small">M</div><div><strong>MAGNATAS 01!</strong><span>Portal da Comunidade</span></div><button className="button button-quiet" onClick={handleLogout}>Sair</button></div>
            {userDoc.estado === 'pendente_analise' && <div className="application-state"><div className="state-symbol amber">◷</div><StatusPill status="pendente_analise"/><h2>Candidatura submetida</h2><p>A tua candidatura está a ser analisada pela equipa responsável.</p><div className="application-summary"><span>Nome In-Game <strong>{userDoc.nomeInGame || '—'}</strong></span><span>ID In-Game <strong>{userDoc.idInGame || 'Não indicado'}</strong></span><span>Discord <strong>{userDoc.discordTag || '—'}</strong></span></div></div>}
            {(userDoc.estado === 'rejeitado' || userDoc.estado === 'ex_membro') && <div className="application-state"><div className="state-symbol red">!</div><StatusPill status={userDoc.estado}/><h2>{userDoc.estado === 'rejeitado' ? 'Candidatura não aprovada' : 'Registo de ex-membro'}</h2><p>Podes voltar a submeter os teus dados para uma nova análise.</p><button className="button button-primary" onClick={handleResetCandidatura}>Submeter nova candidatura</button></div>}
            {userDoc.estado === 'banido' && <div className="application-state"><div className="state-symbol red">×</div><StatusPill status="banido"/><h2>Conta temporariamente indisponível</h2><p>A tua conta encontra-se banida.</p></div>}
            {userDoc.estado === 'pendente_candidatura' && <div className="application-form-wrap"><div className="auth-eyebrow">CANDIDATURA DE MEMBRO</div><h2>Faz parte dos Magnatas</h2><p>Preenche os teus dados com atenção.</p><form onSubmit={handleSubmitCandidatura} className="application-form">
              <label className="field"><span>Idade</span><input value={formCandidatura.idade} onChange={event => setFormCandidatura({ ...formCandidatura, idade: event.target.value })} required /></label>
              <label className="field"><span>Nome In-Game</span><input value={formCandidatura.nomeInGame} onChange={event => setFormCandidatura({ ...formCandidatura, nomeInGame: event.target.value })} required /></label>
              <label className="field"><span>Discord</span><input value={formCandidatura.discordTag} onChange={event => setFormCandidatura({ ...formCandidatura, discordTag: event.target.value })} placeholder="Nome do Discord" required /></label>
              <label className="field"><span>ID In-Game</span><input type="text" inputMode="numeric" value={formCandidatura.idInGame} onChange={event => setFormCandidatura({ ...formCandidatura, idInGame: event.target.value })} placeholder="ID utilizado na cidade" required /></label>
              <label className="field"><span>Kills atuais</span><input type="number" min="0" value={formCandidatura.killsAtual} onChange={event => setFormCandidatura({ ...formCandidatura, killsAtual: event.target.value })} /></label>
              <label className="field"><span>Tempo de cidade</span><input value={formCandidatura.tempoCidade} onChange={event => setFormCandidatura({ ...formCandidatura, tempoCidade: event.target.value })} placeholder="Ex.: 200 horas" /></label>
              <label className="field field-wide"><span>Porque queres entrar?</span><textarea value={formCandidatura.motivo} onChange={event => setFormCandidatura({ ...formCandidatura, motivo: event.target.value })} rows="4" required /></label>
              <button className="button button-primary field-wide" type="submit">Enviar candidatura</button>
            </form></div>}
          </div>
        </div>
      </>
    );
  }

  const pageTitle = {
    dashboard: 'Dashboard', base: 'Comunidade', roupas: 'Roupas & Kits', radio: 'Frequências Rádio', discord: 'Discord',
    avisos: 'Avisos da Staff', regras: 'Regras Oficiais', cargos: 'Lista de Cargos', meusavisos: 'Minhas Punições',
    perfil: 'Meu Perfil', calendario: 'Calendário', notificacoes: 'Notificações', admin: 'Painel Administrativo'
  }[currentView] || 'Dashboard';

  const visibleNav = NAV_ITEMS;

  return (
    <><style>{APP_STYLES}</style>
      <div className="app-shell">
        {mobileNavOpen && <button className="mobile-backdrop" aria-label="Fechar menu" onClick={() => setMobileNavOpen(false)} />}
        <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
          <div className="sidebar-brand">
            <div className="brand-mark">M</div>
            <div className="brand-copy"><strong>MAGNATAS <span>01!</span></strong><small>PORTAL DA COMUNIDADE</small></div>
            <button className="mobile-close" onClick={() => setMobileNavOpen(false)}>×</button>
          </div>
          <nav className="sidebar-nav">
            {visibleNav.map(group => <div className="nav-group" key={group.section}><div className="nav-label">{group.section}</div>{group.items.map(item => <button key={item[0]} onClick={() => navigate(item[0])} className={`nav-item ${currentView === item[0] ? 'active' : ''}`}><span className="nav-icon">{item[1]}</span><span>{item[2]}</span>{item[0] === 'notificacoes' && unreadNotifications.length > 0 && <i className="nav-count">{unreadNotifications.length}</i>}</button>)}</div>)}
            
            {isAdminOrStaff && (
              <div className="nav-group">
                <div className="nav-label">Administração</div>
                <button onClick={() => { setAdminTab('membros'); navigate('admin'); }} className={`nav-item ${currentView === 'admin' ? 'active' : ''}`}>
                  <span className="nav-icon">⚙</span><span>Painel Admin & Staff</span>
                </button>
              </div>
            )}
          </nav>
          <div className="sidebar-bottom">
            <div className="sidebar-user">
              <Avatar member={userDoc} size="sm"/>
              <div className="sidebar-user-copy"><strong>{getMemberName(userDoc)}</strong><small>{userRoles[0] || 'Membro'}</small></div>
              <button title="Terminar sessão" onClick={handleLogout}>↪</button>
            </div>
            <div className="sidebar-actions-row">
              <button className="theme-toggle-btn" onClick={() => setDarkMode(!darkMode)} title="Alternar modo escuro/claro">
                {darkMode ? '☀️ Modo Claro' : '🌙 Modo Escuro'}
              </button>
            </div>
            <div className="sidebar-version">MAGNATAS COMMUNITY · V3</div>
          </div>
        </aside>

        <main className="main-area">
          <header className="topbar">
            <div className="topbar-left"><button className="mobile-menu-button" onClick={() => setMobileNavOpen(true)}>☰</button><div><div className="breadcrumb"><span>MAGNATAS 01!</span><b>/</b><strong>{pageTitle}</strong></div><div className="page-context">Bem-vindo de volta, {getMemberName(userDoc)}.</div></div></div>
            <div className="topbar-actions">
              <button className="theme-toggle-btn topbar-theme" onClick={() => setDarkMode(!darkMode)} title="Alternar modo escuro/claro">
                {darkMode ? '☀️' : '🌙'}
              </button>
              <div className="connection-status"><i /> Sistema ativo</div>
              <button className="notification-button" onClick={() => navigate('notificacoes')} aria-label="Notificações">♢{unreadNotifications.length > 0 && <i>{unreadNotifications.length}</i>}</button>
              <button className="topbar-avatar" onClick={() => navigate('perfil')}><Avatar member={userDoc} size="xs"/><span>{userDoc.username || user.email}</span></button>
              <button className="button button-outline button-small logout-top" onClick={handleLogout}>Sair</button>
            </div>
          </header>

          <div className="content-area">
            {currentView === 'dashboard' && <section className="page-section animate-in">
              <div className="welcome-banner"><div><span className="eyebrow light">COMMUNITY OVERVIEW</span><h1>Olá, {getMemberName(userDoc).split(' ')[0]}.</h1><p>Este é o centro de informação e atividade da comunidade Magnatas 01!.</p></div><div className="welcome-mark">M<span>01!</span></div></div>
              <div className="section-heading"><div><span className="eyebrow">VISÃO GERAL</span><h2>Resumo da comunidade</h2><p>Indicadores e informações importantes num só lugar.</p></div><span className="date-chip">{new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
              
              <div className="stats-grid">
                {isSupportOrHigher && <StatCard label="Membros registados" value={stats.total} detail="Total de contas" icon="♧" tone="red"/>}
                <StatCard label="Membros ativos" value={stats.active} detail="Aprovados e disponíveis" icon="✓" tone="green"/>
                {isSupportOrHigher && <StatCard label="Candidaturas" value={stats.pending} detail="Aguardam análise" icon="◷" tone="amber"/>}
                <StatCard label="Ausentes" value={stats.absent} detail="Marcados como ausentes" icon="◌" tone="blue"/>
              </div>

              <div className="dashboard-columns"><div className="panel"><div className="panel-heading"><div><h3>Últimos comunicados</h3><p>Informações publicadas pela equipa.</p></div><button className="text-button" onClick={() => navigate('avisos')}>Ver todos →</button></div>{avisosStaff.length ? avisosStaff.slice(0, 4).map(item => <div className="feed-item" key={item.id}><div className={`feed-icon ${item.importancia === 'Urgente' ? 'urgent' : ''}`}>◉</div><div className="feed-content"><strong>{item.titulo}</strong><p>{item.mensagem}</p><small>{item.autor || 'Staff'} · {item.timestamp || formatDateTime(item.createdAt)}</small></div><span className={`priority-dot ${item.importancia === 'Urgente' ? 'urgent' : ''}`} /></div>) : <EmptyState icon="◉" title="Sem comunicados" description="Ainda não existem comunicados publicados."/>}</div>
                <div className="panel"><div className="panel-heading"><div><h3>Próximos eventos</h3><p>Reuniões e atividades agendadas.</p></div><button className="text-button" onClick={() => navigate('calendario')}>Calendário →</button></div>{upcomingEvents.slice(0, 4).map(item => <div className="event-mini" key={item.id}><div className="event-date"><strong>{item.data?.slice(8, 10) || '—'}</strong><small>{item.data ? new Date(`${item.data}T12:00:00`).toLocaleDateString('pt-PT', { month: 'short' }) : 'DATA'}</small></div><div><strong>{item.titulo}</strong><p>{item.hora || 'Hora a definir'} · {item.tipo || 'Evento'}</p></div></div>)}{upcomingEvents.length === 0 && <EmptyState icon="▦" title="Sem eventos" description="Não existem eventos futuros agendados."/>}</div></div>
              <div className="quick-links"><button onClick={() => navigate('base')}><span>♧</span><strong>Ver comunidade</strong><small>Consultar membros e cargos</small></button><button onClick={() => navigate('notificacoes')}><span>♢</span><strong>Notificações</strong><small>{unreadNotifications.length} por ler</small></button><button onClick={() => navigate('perfil')}><span>◎</span><strong>O meu perfil</strong><small>Atualizar os teus dados</small></button></div>
            </section>}

            {currentView === 'base' && <section className="page-section animate-in">
              <div className="section-heading"><div><span className="eyebrow">MEMBROS DA COMUNIDADE</span><h2>Comunidade</h2><p>Consulta os membros, os respetivos IDs In-Game e cargos.</p></div><div className="heading-actions"><span className="count-chip">{filteredCommunityMembers.length} resultados</span></div></div>
              <div className="filter-tabs">{[['ativos','Ativos'],['destaque','Em destaque'],['ausentes','Ausentes'],['ex_membros','Ex-membros'],['banidos','Banidos']].map(([key,label]) => <button key={key} className={subTabBase === key ? 'selected' : ''} onClick={() => setSubTabBase(key)}>{label}<span>{key === 'ativos' ? stats.active : key === 'destaque' ? usersList.filter(item => item.destacado).length : key === 'ausentes' ? stats.absent : key === 'ex_membros' ? usersList.filter(item => item.estado === 'ex_membro').length : usersList.filter(item => ['banido','rejeitado'].includes(item.estado)).length}</span></button>)}</div>
              <div className="panel table-panel"><div className="table-toolbar"><label className="search-box"><span>⌕</span><input value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Pesquisar por nome, Discord, cargo ou ID In-Game..."/></label><span className="toolbar-note">Pesquisa por ID incluída</span></div>
                {filteredCommunityMembers.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>Membro</th><th>Discord</th><th>ID In-Game</th><th>Estado</th><th>Cargos</th><th></th></tr></thead><tbody>{filteredCommunityMembers.map(member => <tr key={member.id}><td><button className="member-cell" onClick={() => openMember(member)}><Avatar member={member}/><span><strong>{getMemberName(member)} {member.destacado && <em>★</em>}</strong><small>@{member.username || 'sem-utilizador'}</small></span></button></td><td>{member.discordTag || '—'}</td><td><strong className="id-value">{member.idInGame || 'Não indicado'}</strong></td><td><StatusPill status={member.estado}/></td><td><div className="role-list">{(member.roles || []).slice(0, 4).map(role => <RoleBadge key={role} role={role} allRoles={allRoles}/>)}{(member.roles || []).length > 4 && <span className="more-roles">+{member.roles.length - 4}</span>}</div></td><td><button className="icon-button" title="Ver perfil" onClick={() => openMember(member)}>↗</button></td></tr>)}</tbody></table></div> : <EmptyState icon="⌕" title="Nenhum membro encontrado" description="Altera a pesquisa ou escolhe outro separador."/>}
              </div>
            </section>}

            {currentView === 'roupas' && <section className="page-section animate-in"><div className="section-heading"><div><span className="eyebrow">RECURSOS DA COMUNIDADE</span><h2>Roupas & Kits</h2><p>Consulta os conjuntos oficiais e respetivos números.</p></div></div>{isAdminOrStaff && <form className="panel form-panel" onSubmit={handleAddRoupa}><div className="panel-heading"><div><h3>Adicionar kit</h3><p>Publica um novo conjunto na biblioteca.</p></div></div><div className="form-grid"><label className="field"><span>Nome do kit</span><input value={formRoupa.nome} onChange={event => setFormRoupa({ ...formRoupa, nome: event.target.value })} required/></label><label className="field"><span>Número no vestuário</span><input value={formRoupa.numero} onChange={event => setFormRoupa({ ...formRoupa, numero: event.target.value })} placeholder="#145" required/></label><label className="field field-wide"><span>URL da imagem</span><input type="url" value={formRoupa.imagem} onChange={event => setFormRoupa({ ...formRoupa, imagem: event.target.value })} placeholder="https://..."/></label><label className="field field-wide"><span>Ou carregar imagem (até 600 KB)</span><input type="file" accept="image/*" onChange={event => handleFileUpload(event, result => setFormRoupa(current => ({ ...current, imagem: result })))}/></label></div><button className="button button-primary">Guardar kit</button></form>}<div className="resource-grid">{roupas.map(item => <article className="resource-card" key={item.id}><img src={item.imagem || DEFAULT_AVATAR} alt={item.nome} onError={event => { event.currentTarget.src = DEFAULT_AVATAR; }}/><div className="resource-card-body"><div><h3>{item.nome}</h3><span className="resource-number">N.º {item.numero}</span></div>{isAdminOrStaff && <button className="button button-danger-soft button-small" onClick={() => handleDeleteRoupa(item.id)}>Remover</button>}</div></article>)}</div>{roupas.length === 0 && <EmptyState icon="▣" title="Ainda não existem kits" description="Os kits publicados aparecerão aqui."/>}</section>}

            {currentView === 'radio' && <section className="page-section animate-in"><div className="section-heading"><div><span className="eyebrow">COMUNICAÇÃO</span><h2>Frequências Rádio</h2><p>Consulta as frequências oficiais e a sua finalidade.</p></div></div>{isAdminOrStaff && <form className="panel form-panel" onSubmit={handleAddRadio}><div className="panel-heading"><div><h3>Nova frequência</h3><p>Adiciona uma frequência para a comunidade.</p></div></div><div className="form-grid"><label className="field"><span>Título</span><input value={formRadio.titulo} onChange={event => setFormRadio({ ...formRadio, titulo: event.target.value })} placeholder="Rádio principal" required/></label><label className="field"><span>Frequência</span><input value={formRadio.frequencia} onChange={event => setFormRadio({ ...formRadio, frequencia: event.target.value })} placeholder="100.0" required/></label><label className="field field-wide"><span>Informação</span><input value={formRadio.info} onChange={event => setFormRadio({ ...formRadio, info: event.target.value })} placeholder="Informações de utilização" required/></label></div><button className="button button-primary">Publicar frequência</button></form>}<div className="resource-grid radio-grid">{radiosList.map(item => <article className="radio-card" key={item.id}><div className="radio-symbol">◖</div><div className="radio-copy"><h3>{item.titulo}</h3><strong>{item.frequencia} MHz</strong><p>{item.info}</p></div>{isAdminOrStaff && <button className="icon-button danger" onClick={() => handleDeleteRadio(item.id)} title="Eliminar frequência">×</button>}</article>)}</div>{radiosList.length === 0 && <EmptyState icon="◖" title="Sem frequências" description="As frequências adicionadas serão apresentadas aqui."/>}</section>}

            {currentView === 'discord' && <section className="page-section animate-in"><div className="discord-panel"><div className="discord-emblem">◌</div><span className="eyebrow">LIGA-TE À COMUNIDADE</span><h2>Discord Oficial</h2><p>Entra no nosso servidor para acompanhar comunicados, participar nas conversas, receber apoio e estar a par das atividades.</p><a className="button button-primary" href="https://discord.gg/MRdedT4nKd" target="_blank" rel="noreferrer">Abrir Discord oficial ↗</a><small>Servidor oficial Magnatas 01!</small></div></section>}

            {currentView === 'avisos' && <section className="page-section animate-in"><div className="section-heading"><div><span className="eyebrow">COMUNICAÇÃO OFICIAL</span><h2>Avisos da Staff</h2><p>Comunicados e informações publicados pela equipa.</p></div></div>{isAdminOrStaff && <form className="panel form-panel" onSubmit={handleAddAvisoStaff}><div className="panel-heading"><div><h3>Publicar comunicado</h3><p>O aviso também gera uma notificação interna.</p></div></div><div className="form-grid"><label className="field"><span>Título</span><input value={formAviso.titulo} onChange={event => setFormAviso({ ...formAviso, titulo: event.target.value })} required/></label><label className="field"><span>Importância</span><select value={formAviso.importancia} onChange={event => setFormAviso({ ...formAviso, importancia: event.target.value })}><option>Normal</option><option>Importante</option><option>Urgente</option></select></label><label className="field field-wide"><span>Mensagem</span><textarea rows="4" value={formAviso.mensagem} onChange={event => setFormAviso({ ...formAviso, mensagem: event.target.value })} required/></label></div><button className="button button-primary">Publicar aviso</button></form>}<div className="notice-list">{avisosStaff.map(item => <article className={`notice-card ${item.importancia === 'Urgente' ? 'notice-urgent' : ''}`} key={item.id}><div className="notice-top"><span className={`notice-tag ${item.importancia === 'Urgente' ? 'urgent' : item.importancia === 'Importante' ? 'important' : ''}`}>{item.importancia || 'Normal'}</span><small>{item.timestamp || formatDateTime(item.createdAt)}</small></div><h3>{item.titulo}</h3><p>{item.mensagem}</p><div className="notice-footer"><span>Publicado por <strong>{item.autor || 'Staff'}</strong></span>{isAdminOrStaff && <button className="text-button danger-text" onClick={() => handleDeleteAviso(item.id)}>Eliminar aviso</button>}</div></article>)}</div>{avisosStaff.length === 0 && <EmptyState icon="◉" title="Sem comunicados" description="Ainda não foram publicados avisos."/>}</section>}

            {currentView === 'regras' && <section className="page-section animate-in"><div className="section-heading"><div><span className="eyebrow">DOCUMENTAÇÃO</span><h2>Regras Oficiais</h2><p>Consulta as normas e orientações da comunidade.</p></div></div>{isAdminOrStaff && <form className="panel form-panel" onSubmit={handleAddRegra}><div className="form-grid"><label className="field"><span>Título da regra</span><input value={formRegra.titulo} onChange={event => setFormRegra({ ...formRegra, titulo: event.target.value })} required/></label><label className="field"><span>Ordem</span><input type="number" min="1" value={formRegra.ordem} onChange={event => setFormRegra({ ...formRegra, ordem: event.target.value })} required/></label><label className="field field-wide"><span>Descrição</span><textarea rows="3" value={formRegra.descricao} onChange={event => setFormRegra({ ...formRegra, descricao: event.target.value })} required/></label></div><button className="button button-primary">Adicionar regra</button></form>}<div className="rules-list">{regras.map((item, index) => <article className="rule-card" key={item.id}><span className="rule-index">{String(index + 1).padStart(2, '0')}</span><div><h3>{item.titulo}</h3><p>{item.descricao}</p></div>{isAdminOrStaff && <button className="icon-button danger" onClick={() => handleDeleteRegra(item.id)}>×</button>}</article>)}</div>{regras.length === 0 && <EmptyState icon="≡" title="Sem regras publicadas" description="As regras oficiais aparecerão aqui."/>}</section>}

            {currentView === 'cargos' && <section className="page-section animate-in"><div className="section-heading"><div><span className="eyebrow">ESTRUTURA DA COMUNIDADE</span><h2>Lista de Cargos</h2><p>Consulta os cargos e a quantidade de membros associados.</p></div>{isAdminOrStaff && <button className="button button-primary" onClick={() => { setAdminTab('cargos'); navigate('admin'); openRoleEditor(null); }}>＋ Criar cargo</button>}</div><div className="role-grid">{allRoles.map(role => <article className="role-card" key={role.id}><div className={`role-symbol ${getRoleColor(role)}`}>◇</div><div className="role-card-main"><h3>{role.name}</h3><p>{role.description || (role.protected ? 'Cargo de liderança protegido.' : 'Cargo da comunidade.')}</p><small>{usersList.filter(member => (member.roles || []).includes(role.name)).length} membros</small></div><span className={`role-badge ${getRoleColor(role)}`}>{role.protected ? 'Protegido' : 'Cargo'}</span></article>)}</div></section>}

            {currentView === 'calendario' && <section className="page-section animate-in"><div className="section-heading"><div><span className="eyebrow">AGENDA DA COMUNIDADE</span><h2>Calendário de eventos</h2><p>Reuniões, alinhamentos e atividades agendadas.</p></div></div>{isAdminOrStaff && <form className="panel form-panel" onSubmit={handleAddEvento}><div className="panel-heading"><div><h3>Adicionar evento</h3><p>Os membros recebem uma notificação interna quando publicas um evento.</p></div></div><div className="form-grid"><label className="field"><span>Nome do evento</span><input value={formEvento.titulo} onChange={event => setFormEvento({ ...formEvento, titulo: event.target.value })} required/></label><label className="field"><span>Tipo</span><select value={formEvento.tipo} onChange={event => setFormEvento({ ...formEvento, tipo: event.target.value })}><option>Reunião</option><option>Evento</option><option>Treino</option><option>Alinhamento</option><option>Outro</option></select></label><label className="field"><span>Data</span><input type="date" value={formEvento.data} onChange={event => setFormEvento({ ...formEvento, data: event.target.value })} required/></label><label className="field"><span>Hora</span><input type="time" value={formEvento.hora} onChange={event => setFormEvento({ ...formEvento, hora: event.target.value })} required/></label><label className="field field-wide"><span>Descrição</span><textarea rows="3" value={formEvento.descricao} onChange={event => setFormEvento({ ...formEvento, descricao: event.target.value })}/></label></div><button className="button button-primary">Guardar evento</button></form>}<div className="event-list">{sortedEvents.map(item => <article className="event-card" key={item.id}><div className="event-date-large"><strong>{item.data?.slice(8, 10) || '—'}</strong><span>{item.data ? new Date(`${item.data}T12:00:00`).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' }) : 'Data a definir'}</span></div><div className="event-details"><span className="notice-tag">{item.tipo || 'Evento'}</span><h3>{item.titulo}</h3><p>{item.descricao || 'Sem descrição adicional.'}</p><small>{item.hora || 'Hora a definir'} · Criado por {item.autor || 'Staff'}</small></div>{isAdminOrStaff && <button className="icon-button danger" onClick={() => handleDeleteEvento(item)}>×</button>}</article>)}</div>{sortedEvents.length === 0 && <EmptyState icon="▦" title="Calendário vazio" description="Quando forem criados eventos, aparecerão aqui."/>}</section>}

            {currentView === 'notificacoes' && <section className="page-section animate-in"><div className="section-heading"><div><span className="eyebrow">CENTRO DE ATIVIDADE</span><h2>Notificações</h2><p>Acompanha os avisos e novidades da comunidade.</p></div><button className="button button-outline" onClick={markAllNotificationsRead} disabled={unreadNotifications.length === 0}>Marcar tudo como lido</button></div><div className="notification-list">{notifications.map(item => { const read = (item.readBy || []).includes(user.uid); return <article className={`notification-card ${read ? 'read' : 'unread'}`} key={item.id}><div className="notification-symbol">{item.tipo === 'urgent' ? '!' : item.tipo === 'event' ? '▦' : '◉'}</div><div className="notification-content"><h3>{item.titulo}</h3><p>{item.mensagem}</p><small>{item.autor || 'Sistema'} · {formatDateTime(item.createdAt)}</small></div>{!read && <button className="button button-outline button-small" onClick={() => markNotificationRead(item.id)}>Marcar como lida</button>}</article>; })}</div>{notifications.length === 0 && <EmptyState icon="♢" title="Estás em dia" description="Ainda não tens notificações."/>}</section>}

            {currentView === 'meusavisos' && <section className="page-section animate-in"><div className="section-heading"><div><span className="eyebrow">CONTA E MODERAÇÃO</span><h2>Minhas Punições</h2><p>Consulta o histórico de avisos e punições associados à tua conta.</p></div></div>{userDoc.punicoes?.length ? <div className="notice-list">{[...userDoc.punicoes].reverse().map((item, index) => <article className="notice-card notice-urgent" key={item.id || index}><div className="notice-top"><span className="notice-tag urgent">{item.tipo}</span><small>{item.data || '—'}</small></div><p><strong>Motivo:</strong> {item.motivo || 'Não indicado'}</p><p><strong>Duração:</strong> {item.tempo || 'Não indicada'}</p><div className="notice-footer"><span>Aplicado por <strong>{item.aplicadoPor || 'Staff'}</strong></span></div></article>)}</div> : <EmptyState icon="✓" title="Sem punições registadas" description="Não existem avisos ou punições associados à tua conta."/>}</section>}

            {currentView === 'perfil' && <section className="page-section animate-in"><div className="section-heading"><div><span className="eyebrow">A TUA CONTA</span><h2>Meu Perfil</h2><p>Gere a informação apresentada no teu perfil.</p></div></div><div className="profile-layout"><div className="profile-card"><Avatar member={userDoc} size="xl"/><h2>{getMemberName(userDoc)}</h2><p>@{userDoc.username || user.email}</p><StatusPill status={userDoc.estado}/><div className="profile-meta"><span><small>Discord</small><strong>{userDoc.discordTag || '—'}</strong></span><span><small>ID In-Game</small><strong>{userDoc.idInGame || 'Não indicado'}</strong></span><span><small>E-mail</small><strong>{user.email}</strong></span></div><div className="role-list profile-roles">{(userDoc.roles || []).map(role => <RoleBadge key={role} role={role} allRoles={allRoles}/>)}</div></div><form className="panel form-panel profile-form" onSubmit={handleSavePerfil}><div className="panel-heading"><div><h3>Editar perfil</h3><p>Atualiza o teu avatar e a tua biografia.</p></div></div><label className="field"><span>URL do avatar</span><input type="url" value={formPerfil.avatar} onChange={event => setFormPerfil({ ...formPerfil, avatar: event.target.value })} placeholder="https://..."/></label><label className="field"><span>Carregar avatar (até 600 KB)</span><input type="file" accept="image/*" onChange={event => handleFileUpload(event, result => setFormPerfil(current => ({ ...current, avatar: result })))}/></label><label className="field"><span>Biografia</span><textarea rows="5" value={formPerfil.biografia} onChange={event => setFormPerfil({ ...formPerfil, biografia: event.target.value })}/></label><button className="button button-primary">Guardar alterações</button></form></div></section>}

            {currentView === 'admin' && isAdminOrStaff && <section className="page-section animate-in"><div className="section-heading"><div><span className="eyebrow">ACESSO RESTRITO</span><h2>Painel Administrativo</h2><p>Ferramentas de gestão de acordo com as permissões do teu cargo.</p></div><span className="admin-badge">ADMIN / STAFF</span></div><div className="admin-tabs"><button className={adminTab === 'membros' ? 'active' : ''} onClick={() => setAdminTab('membros')}>Membros</button><button className={adminTab === 'candidaturas' ? 'active' : ''} onClick={() => setAdminTab('candidaturas')}>Candidaturas <i>{pendingApplications.length}</i></button><button className={adminTab === 'punicoes' ? 'active' : ''} onClick={() => setAdminTab('punicoes')}>Punições</button><button className={adminTab === 'notas' ? 'active' : ''} onClick={() => setAdminTab('notas')}>Notas internas</button><button className={adminTab === 'cargos' ? 'active' : ''} onClick={() => setAdminTab('cargos')}>Cargos & permissões</button><button className={adminTab === 'logs' ? 'active' : ''} onClick={() => setAdminTab('logs')}>Logs</button></div>

              {adminTab === 'membros' && <div className="panel"><div className="panel-heading"><div><h3>Pesquisar e gerir membros</h3><p>Pesquisa por nome, Discord, e-mail, cargo ou ID In-Game.</p></div><span className="count-chip">{filteredAdminMembers.length} resultados</span></div><div className="admin-filters"><label className="search-box"><span>⌕</span><input value={adminMemberSearch} onChange={event => setAdminMemberSearch(event.target.value)} placeholder="Ex.: 26956, FiveM_Clips, Discord..."/></label><select value={adminMemberStatus} onChange={event => setAdminMemberStatus(event.target.value)}><option value="todos">Todos os estados</option><option value="aprovado">Aprovados</option><option value="pendente_analise">Em análise</option><option value="pendente_candidatura">Pendentes</option><option value="ex_membro">Ex-membros</option><option value="banido">Banidos</option><option value="rejeitado">Rejeitados</option></select><select value={adminMemberRole} onChange={event => setAdminMemberRole(event.target.value)}><option value="todos">Todos os cargos</option>{allRoles.map(role => <option key={role.id} value={role.name}>{role.name}</option>)}</select></div><div className="table-scroll"><table className="data-table"><thead><tr><th>Membro</th><th>Discord</th><th>ID In-Game</th><th>Estado</th><th>Cargos</th><th>Ações</th></tr></thead><tbody>{filteredAdminMembers.map(member => <tr key={member.id}><td><button className="member-cell" onClick={() => openMember(member)}><Avatar member={member}/><span><strong>{getMemberName(member)}</strong><small>@{member.username || 'sem-utilizador'}</small></span></button></td><td>{member.discordTag || '—'}</td><td><strong className="id-value">{member.idInGame || <span className="missing-value">Não indicado</span>}</strong></td><td><StatusPill status={member.estado}/></td><td><div className="role-list">{(member.roles || []).map(role => <RoleBadge key={role} role={role} allRoles={allRoles}/>)}</div></td><td><div className="row-actions"><button className="icon-button" title="Abrir perfil" onClick={() => openMember(member)}>↗</button><button className="icon-button" title="Editar dados" onClick={() => handleOpenEditMember(member)}>✎</button></div></td></tr>)}</tbody></table></div>{filteredAdminMembers.length === 0 && <EmptyState icon="⌕" title="Nenhum membro encontrado" description="Confirma o termo de pesquisa ou remove os filtros aplicados."/>}</div>}

              {adminTab === 'candidaturas' && <div className="application-admin-list">{pendingApplications.filter(member => matchesMember(member, applicationSearch)).length > 0 && <label className="search-box"><span>⌕</span><input value={applicationSearch} onChange={event => setApplicationSearch(event.target.value)} placeholder="Pesquisar candidatura por nome, Discord ou ID In-Game..."/></label>}{pendingApplications.filter(member => matchesMember(member, applicationSearch)).map(candidate => <article className="application-admin-card" key={candidate.id}><div className="application-admin-header"><div className="member-cell"><Avatar member={candidate}/><span><strong>{getMemberName(candidate)}</strong><small>@{candidate.username || 'sem-utilizador'} · {candidate.email || 'Sem e-mail'}</small></span></div><StatusPill status={candidate.estado}/></div><div className="candidate-data-grid"><span><small>Nome In-Game</small><strong>{candidate.nomeInGame || '—'}</strong></span><span className="highlight-id"><small>ID In-Game indicado</small><strong>{candidate.idInGame || 'Não indicado'}</strong></span><span><small>Discord</small><strong>{candidate.discordTag || '—'}</strong></span><span><small>Idade</small><strong>{candidate.idade || '—'}</strong></span><span><small>Kills atuais</small><strong>{candidate.killsAtual || '—'}</strong></span><span><small>Tempo de cidade</small><strong>{candidate.tempoCidade || '—'}</strong></span></div><div className="candidate-reason"><small>Motivo da candidatura</small><p>{candidate.motivo || 'Não foi indicado um motivo.'}</p></div><div className="candidate-actions"><button className="button button-outline button-small" onClick={() => openMember(candidate)}>Ver perfil completo</button><button className="button button-danger-soft button-small" onClick={() => handleReprovarCandidatura(candidate)}>Rejeitar</button><button className="button button-primary button-small" onClick={() => handleAprovarCandidatura(candidate)}>Aprovar candidatura</button></div></article>)}{pendingApplications.length === 0 && <EmptyState icon="✓" title="Sem candidaturas pendentes" description="Quando forem submetidas novas candidaturas, aparecerão aqui."/>}{pendingApplications.length > 0 && pendingApplications.filter(member => matchesMember(member, applicationSearch)).length === 0 && <EmptyState icon="⌕" title="Nenhuma candidatura encontrada" description="Experimenta pesquisar por outro nome ou ID In-Game."/>}</div>}

              {adminTab === 'punicoes' && <div className="admin-two-columns">
                <form className="panel form-panel" onSubmit={handleAplicarPunicao}>
                  <div className="panel-heading"><div><h3>Aplicar punição</h3><p>Pesquisa por nome ou ID para selecionar o membro.</p></div></div>
                  
                  <div className="field">
                    <span>Membro selecionado</span>
                    {formPunicao.targetUserId ? (
                      <div className="selected-member-pill">
                        <strong>{getMemberName(usersList.find(m => m.id === formPunicao.targetUserId))} (ID: {usersList.find(m => m.id === formPunicao.targetUserId)?.idInGame || '—'})</strong>
                        <button type="button" className="text-button danger-text" onClick={() => setFormPunicao({ ...formPunicao, targetUserId: '' })}>Alterar</button>
                      </div>
                    ) : (
                      <div className="member-search-selector">
                        <input 
                          type="text" 
                          placeholder="Pesquisar por nome ou ID in-game..." 
                          value={punishmentMemberSearch} 
                          onChange={e => setPunishmentMemberSearch(e.target.value)} 
                        />
                        <div className="member-dropdown-list">
                          {usersList
                            .filter(m => matchesMember(m, punishmentMemberSearch))
                            .slice(0, 6)
                            .map(m => (
                              <button 
                                type="button" 
                                key={m.id} 
                                className="member-dropdown-item"
                                onClick={() => {
                                  setFormPunicao({ ...formPunicao, targetUserId: m.id });
                                  setPunishmentMemberSearch('');
                                }}
                              >
                                <span>{getMemberName(m)}</span>
                                <small>ID: {m.idInGame || '—'}</small>
                              </button>
                            ))}
                          {usersList.filter(m => matchesMember(m, punishmentMemberSearch)).length === 0 && (
                            <div className="dropdown-empty">Nenhum membro encontrado</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <label className="field"><span>Tipo de punição</span><select value={formPunicao.tipo} onChange={event => setFormPunicao({ ...formPunicao, tipo: event.target.value })}><option>Warning 1</option><option>Warning 2</option><option>Muted</option><option>Ban Temporário</option><option>Ban Perma</option></select></label>
                  <label className="field"><span>Duração</span><input value={formPunicao.tempo} onChange={event => setFormPunicao({ ...formPunicao, tempo: event.target.value })} placeholder="Ex.: 3 dias / Permanente" required/></label>
                  <label className="field"><span>Motivo</span><textarea rows="4" value={formPunicao.motivo} onChange={event => setFormPunicao({ ...formPunicao, motivo: event.target.value })} required/></label>
                  <button className="button button-primary" type="submit" disabled={!formPunicao.targetUserId}>Aplicar punição</button>
                </form>

                <div className="panel"><div className="panel-heading"><div><h3>Punições e estados</h3><p>Consulta e revoga registos quando autorizado.</p></div></div><div className="punished-list">{usersList.filter(member => (member.punicoes || []).length || ['banido','ex_membro'].includes(member.estado)).map(member => <article className="punished-card" key={member.id}><div className="punished-head"><div><strong>{getMemberName(member)}</strong><small>ID In-Game: {member.idInGame || '—'} · {member.estado}</small></div><button className="button button-outline button-small" onClick={() => setModalRevocar({ targetUser: member, punicaoId: 'BAN_OU_ESTADO' })}>Gerir estado</button></div>{(member.punicoes || []).map(punishment => <div className="punishment-row" key={punishment.id}><span><strong>{punishment.tipo}</strong><small>{punishment.motivo} · {punishment.data}</small></span><button className="text-button danger-text" onClick={() => setModalRevocar({ targetUser: member, punicaoId: punishment.id })}>Revogar</button></div>)}</article>)}{usersList.every(member => !(member.punicoes || []).length && !['banido','ex_membro'].includes(member.estado)) && <EmptyState icon="✓" title="Sem punições registadas" description="Não existem membros com punições ou estados restritivos."/>}</div></div></div>}

              {adminTab === 'notas' && <div className="admin-two-columns"><form className="panel form-panel" onSubmit={handleAdicionarNota}><div className="panel-heading"><div><h3>Nova nota interna</h3><p>Notas visíveis apenas a membros autorizados da Staff.</p></div></div>
                <div className="field">
                  <span>Membro selecionado</span>
                  {formNota.targetUserId ? (
                    <div className="selected-member-pill">
                      <strong>{getMemberName(usersList.find(m => m.id === formNota.targetUserId))} (ID: {usersList.find(m => m.id === formNota.targetUserId)?.idInGame || '—'})</strong>
                      <button type="button" className="text-button danger-text" onClick={() => setFormNota({ ...formNota, targetUserId: '' })}>Alterar</button>
                    </div>
                  ) : (
                    <div className="member-search-selector">
                      <input 
                        type="text" 
                        placeholder="Pesquisar por nome ou ID in-game..." 
                        value={noteMemberSearch} 
                        onChange={e => setNoteMemberSearch(e.target.value)} 
                      />
                      <div className="member-dropdown-list">
                        {usersList
                          .filter(m => matchesMember(m, noteMemberSearch))
                          .slice(0, 6)
                          .map(m => (
                            <button 
                              type="button" 
                              key={m.id} 
                              className="member-dropdown-item"
                              onClick={() => {
                                setFormNota({ ...formNota, targetUserId: m.id });
                                setNoteMemberSearch('');
                              }}
                            >
                              <span>{getMemberName(m)}</span>
                              <small>ID: {m.idInGame || '—'}</small>
                            </button>
                          ))}
                        {usersList.filter(m => matchesMember(m, noteMemberSearch)).length === 0 && (
                          <div className="dropdown-empty">Nenhum membro encontrado</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <label className="field"><span>Nota confidencial</span><textarea rows="5" value={formNota.texto} onChange={event => setFormNota({ ...formNota, texto: event.target.value })} required/></label><button className="button button-primary" type="submit" disabled={!formNota.targetUserId}>Guardar nota</button></form><div className="panel"><div className="panel-heading"><div><h3>Notas registadas</h3><p>Organizadas por membro.</p></div></div><div className="internal-notes-list">{usersList.filter(member => member.notasInternas?.length).map(member => <article className="note-member" key={member.id}><strong>{getMemberName(member)} <small>ID {member.idInGame || '—'}</small></strong>{member.notasInternas.map(note => <div className="note-item" key={note.id}><p>{note.texto}</p><small>{note.autor} · {note.data}</small></div>)}</article>)}{usersList.every(member => !member.notasInternas?.length) && <EmptyState icon="✎" title="Sem notas internas" description="As notas adicionadas aparecerão aqui."/>}</div></div></div>}

              {adminTab === 'cargos' && <div className="roles-admin-layout"><div className="panel"><div className="panel-heading"><div><h3>Cargos existentes</h3><p>Seleciona um cargo para editar as permissões.</p></div><button className="button button-primary button-small" onClick={() => openRoleEditor(null)}>＋ Novo cargo</button></div><div className="role-admin-list">{allRoles.map(role => <div className="role-admin-row" key={role.id}><div><div className="role-list"><RoleBadge role={role.name} allRoles={allRoles}/>{role.protected && <span className="tiny-tag">Protegido</span>}</div><small>{role.description || `${(role.permissions || []).length} permissões configuradas`}</small></div><div className="row-actions"><button className="icon-button" onClick={() => openRoleEditor(role)} title="Editar cargo">✎</button>{!role.protected && !DEFAULT_ROLES.some(item => item.name === role.name) && <button className="icon-button danger" onClick={() => handleDeleteRole(role)} title="Eliminar cargo">×</button>}</div></div>)}</div></div><div className="panel role-help"><div className="help-symbol">◇</div><h3>Permissões por cargo</h3><p>As permissões são atribuídas individualmente. Um utilizador herda as permissões de todos os cargos associados à sua conta.</p><div className="help-note">Os cargos Founder e Owner estão protegidos.</div></div></div>}

              {adminTab === 'logs' && <div className="panel"><div className="panel-heading"><div><h3>Registo de atividade</h3><p>Últimas 100 ações administrativas disponíveis.</p></div></div><div className="logs-list">{logsList.map(item => <div className="log-row" key={item.id}><span className="log-dot"/><div><strong>{item.acao}</strong><p>{item.detalhe}</p><small>{item.autor}</small></div><time>{item.timestamp || formatDateTime(item.createdAt)}</time></div>)}{logsList.length === 0 && <EmptyState icon="≡" title="Sem registos" description="As ações administrativas serão registadas hierarquicamente aqui."/>}</div></div>}
            </section>}
          </div>
          <footer className="app-footer"><span>MAGNATAS 01! · COMMUNITY PORTAL</span><span>Construído para a comunidade</span></footer>
        </main>

        {notificationMenuOpen && <button className="notification-backdrop" onClick={() => setNotificationMenuOpen(false)} aria-label="Fechar notificações"/>}

        {selectedMember && (
          <div className="modal-backdrop" onClick={() => setSelectedMember(null)}>
            <div className="modal-card member-modal" onClick={event => event.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <span className="eyebrow">PERFIL DE MEMBRO</span>
                  <h2>Informações do membro</h2>
                </div>
                <button className="icon-button" onClick={() => setSelectedMember(null)}>×</button>
              </div>

              <div className="member-profile-head">
                <Avatar member={selectedMember} size="xl"/>
                <div>
                  <h2>{getMemberName(selectedMember)}</h2>
                  <p>@{selectedMember.username || 'sem-utilizador'} · {selectedMember.discordTag || 'Discord não indicado'}</p>
                  <StatusPill status={selectedMember.estado}/>
                </div>
              </div>

              <div className="member-detail-grid-clean">
                <div className="clean-field-box">
                  <small>ID In-Game</small>
                  <strong className="id-value">{selectedMember.idInGame || 'Não indicado'}</strong>
                </div>
                <div className="clean-field-box">
                  <small>Nome In-Game</small>
                  <strong>{selectedMember.nomeInGame || getMemberName(selectedMember)}</strong>
                </div>
              </div>

              <div className="member-detail-block">
                <small>Cargos do membro</small>
                <div className="role-list" style={{ marginTop: '8px' }}>
                  {(selectedMember.roles || []).length > 0 ? (
                    (selectedMember.roles || []).map(role => <RoleBadge key={role} role={role} allRoles={allRoles}/>)
                  ) : (
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Sem cargos atribuídos.</span>
                  )}
                </div>
              </div>

              <div className="member-detail-block">
                <small>Biografia</small>
                <p>{selectedMember.biografia || 'Sem biografia definida.'}</p>
              </div>

              {isAdminOrStaff && (
                <div className="modal-actions">
                  <button className="button button-outline" onClick={() => { const target = selectedMember; setSelectedMember(null); handleOpenEditMember(target); }}>Editar dados & cargos</button>
                  <button className="button button-outline" onClick={() => handleToggleHighlight(selectedMember)}>{selectedMember.destacado ? 'Remover destaque' : 'Destacar membro'}</button>
                  {selectedMember.estado === 'aprovado' && <button className="button button-danger-soft" onClick={() => handleKickMembro(selectedMember)}>Remover membro</button>}
                </div>
              )}
            </div>
          </div>
        )}

        {editingMemberModal && (
          <div className="modal-backdrop" onClick={() => setEditingMemberModal(null)}>
            <div className="modal-card" onClick={event => event.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <span className="eyebrow">EDITAR MEMBRO</span>
                  <h2>{getMemberName(editingMemberModal)}</h2>
                </div>
                <button className="icon-button" onClick={() => setEditingMemberModal(null)}>×</button>
              </div>
              <form onSubmit={handleSaveMemberEdits} className="form-stack">
                <label className="field">
                  <span>Nome In-Game</span>
                  <input value={editingMemberModal.nomeInGame} onChange={e => setEditingMemberModal({ ...editingMemberModal, nomeInGame: e.target.value })} required />
                </label>
                <label className="field">
                  <span>Nome / Tag do Discord</span>
                  <input value={editingMemberModal.discordTag} onChange={e => setEditingMemberModal({ ...editingMemberModal, discordTag: e.target.value })} />
                </label>
                <label className="field">
                  <span>ID In-Game</span>
                  <input value={editingMemberModal.idInGame} onChange={e => setEditingMemberModal({ ...editingMemberModal, idInGame: e.target.value })} />
                </label>

                <div className="field">
                  <span>Atribuir / Gerir Cargos</span>
                  <div className="role-assignment-grid" style={{ marginTop: '6px' }}>
                    {allRoles.map(role => {
                      const isAssigned = (editingMemberModal.roles || []).includes(role.name);
                      return (
                        <button
                          key={role.id || role.name}
                          type="button"
                          className={`role-assignment-option ${isAssigned ? 'assigned' : ''}`}
                          onClick={() => handleToggleMemberRole(role.name)}
                        >
                          <RoleBadge role={role.name} allRoles={allRoles} />
                          <strong>{isAssigned ? '✓' : '+'}</strong>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="button" className="button button-outline" onClick={() => setEditingMemberModal(null)}>Cancelar</button>
                  <button type="submit" className="button button-primary">Guardar alterações</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showRoleEditor && <div className="modal-backdrop" onClick={() => setShowRoleEditor(false)}><div className="modal-card role-editor-modal" onClick={event => event.stopPropagation()}><div className="modal-header"><div><span className="eyebrow">CONFIGURAÇÃO DE ACESSO</span><h2>{selectedRoleId ? 'Editar cargo' : 'Criar cargo'}</h2></div><button className="icon-button" onClick={() => setShowRoleEditor(false)}>×</button></div><form onSubmit={handleSaveRole} className="form-stack"><label className="field"><span>Nome do cargo</span><input value={roleForm.name} onChange={event => setRoleForm({ ...roleForm, name: event.target.value })} required/></label><label className="field"><span>Descrição</span><input value={roleForm.description} onChange={event => setRoleForm({ ...roleForm, description: event.target.value })} placeholder="Responsabilidades deste cargo"/></label><label className="field"><span>Cor de identificação</span><select value={roleForm.color} onChange={event => setRoleForm({ ...roleForm, color: event.target.value })}>{ROLE_COLORS.map(color => <option key={color.value} value={color.value}>{color.label}</option>)}</select></label><div className="permissions-editor"><div className="panel-heading"><div><h3>Permissões</h3><p>Seleciona o que este cargo pode fazer.</p></div><span className="count-chip">{roleForm.permissions.length} selecionadas</span></div>{Array.isArray(PERMISSION_GROUPS) && PERMISSION_GROUPS.map(group => <div className="permission-group" key={group.title}><strong>{group.title}</strong>{Array.isArray(group.items) && group.items.map(([key, label]) => <label className="permission-option" key={key}><input type="checkbox" checked={roleForm.permissions.includes(key)} onChange={() => toggleRolePermission(key)}/><span>{label}</span></label>)}</div>)}</div><div className="modal-actions"><button type="button" className="button button-outline" onClick={() => setShowRoleEditor(false)}>Cancelar</button><button className="button button-primary">Guardar cargo</button></div></form></div></div>}

        {modalRevocar && <div className="modal-backdrop" onClick={() => setModalRevocar(null)}><div className="modal-card confirm-modal" onClick={event => event.stopPropagation()}><div className="modal-header"><div><span className="eyebrow">MODERAÇÃO</span><h2>Revogar registo</h2></div><button className="icon-button" onClick={() => setModalRevocar(null)}>×</button></div><p>Como pretendes proceder com <strong>{getMemberName(modalRevocar.targetUser)}</strong>?</p><div className="modal-actions vertical"><button className="button button-primary" onClick={() => executarRevogacao('entrar')}>Remover registo e aprovar membro</button><button className="button button-outline" onClick={() => executarRevogacao('candidatura')}>Remover registo e pedir nova candidatura</button><button className="button button-quiet" onClick={() => setModalRevocar(null)}>Cancelar</button></div></div></div>}
      </div>
    </>
  );
}

const APP_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Manrope:wght@400;500;600;700;800&display=swap');

:root {
  --bg-main: #f5f6f8;
  --bg-surface: #ffffff;
  --bg-sidebar: #17181d;
  --text-main: #202127;
  --text-muted: #787c88;
  --border-color: #e8e9ed;
  --sidebar-text: #b8bac2;
  --table-head: #fafafc;
  --card-shadow: 0 3px 12px #17181d04;
}

body.dark-theme {
  --bg-main: #0d0e12;
  --bg-surface: #17181d;
  --bg-sidebar: #121317;
  --text-main: #f0f2f5;
  --text-muted: #9ba0af;
  --border-color: #272832;
  --sidebar-text: #b8bac2;
  --table-head: #1c1d24;
  --card-shadow: 0 4px 20px #00000040;
}

*{box-sizing:border-box}body{margin:0;background:var(--bg-main);color:var(--text-main);font-family:'DM Sans',system-ui,sans-serif;font-size:15px;transition:background .2s ease,color .2s ease}button,input,textarea,select{font:inherit}button{cursor:pointer}

.app-shell{min-height:100vh;display:flex;background:var(--bg-main)}
.sidebar{width:268px;flex:0 0 268px;background:var(--bg-sidebar);color:#f8f8fa;display:flex;flex-direction:column;min-height:100vh;position:sticky;top:0;height:100vh;z-index:40;border-right:1px solid var(--border-color)}
.sidebar-brand{height:82px;display:flex;align-items:center;gap:12px;padding:0 22px;border-bottom:1px solid var(--border-color)}
.brand-mark{width:40px;height:40px;border-radius:13px;background:#fff;color:#d62839;display:grid;place-items:center;font-family:Manrope,sans-serif;font-size:21px;font-weight:900;box-shadow:0 5px 20px #d6283922}
.brand-mark.small{width:36px;height:36px;font-size:18px}
.brand-copy{display:flex;flex-direction:column;gap:4px}
.brand-copy strong{font-family:Manrope,sans-serif;font-size:14px;letter-spacing:.4px;color:#fff}
.brand-copy strong span{color:#e34a57}
.brand-copy small{font-size:10px;color:#9da0aa;letter-spacing:1.35px;font-weight:800}
.sidebar-nav{padding:18px 13px 20px;overflow:auto;flex:1}
.nav-group{margin-bottom:22px}
.nav-label{padding:0 11px;margin:0 0 9px;color:#777b86;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.4px}
.nav-item{width:100%;border:1px solid transparent;background:transparent;color:var(--sidebar-text);display:flex;align-items:center;gap:12px;padding:11px 12px;border-radius:10px;text-align:left;font-size:13px;font-weight:650;transition:background .18s ease,color .18s ease,border .18s ease;margin:3px 0}
.nav-item:hover{background:#25262d;color:white}
.nav-item.active{background:#3a2025;border-color:#64323a;color:#ff9ba3}
.nav-icon{width:18px;text-align:center;font-size:16px;color:#e36a74}
.nav-count{margin-left:auto;min-width:19px;height:19px;display:grid;place-items:center;background:#d62839;color:#fff;font-size:11px;border-radius:20px;font-style:normal}
.sidebar-bottom{padding:14px;border-top:1px solid var(--border-color)}
.sidebar-user{display:flex;align-items:center;gap:10px;padding:8px 5px}
.sidebar-user-copy{min-width:0;display:flex;flex-direction:column;flex:1;gap:3px}
.sidebar-user-copy strong{font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#fff}
.sidebar-user-copy small{font-size:11px;color:#999ca6}
.sidebar-user>button{border:0;background:transparent;color:#aaa;font-size:20px}
.sidebar-actions-row{margin-top:10px;padding:0 5px}
.theme-toggle-btn{width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:#cbd0d9;padding:9px 12px;border-radius:8px;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:6px;transition:background .2s}
.theme-toggle-btn:hover{background:rgba(255,255,255,0.12);color:#fff}
.theme-toggle-floating{position:fixed;top:20px;right:20px;z-index:100;background:var(--bg-surface);border:1px solid var(--border-color);color:var(--text-main);width:42px;height:42px;border-radius:12px;display:grid;place-items:center;font-size:18px;box-shadow:0 4px 12px rgba(0,0,0,0.1)}
.sidebar-version{text-align:center;color:#656975;font-size:9px;font-weight:800;letter-spacing:1px;margin-top:10px}

.member-search-selector{position:relative;display:flex;flex-direction:column;gap:6px}
.member-dropdown-list{position:absolute;top:100%;left:0;right:0;max-height:180px;overflow-y:auto;background:var(--bg-surface);border:1px solid var(--border-color);border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,0.15);z-index:50;margin-top:4px}
.member-dropdown-item{width:100%;display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:transparent;border:0;border-bottom:1px solid var(--border-color);text-align:left;color:var(--text-main);cursor:pointer}
.member-dropdown-item:hover{background:rgba(214,40,57,0.08);color:#d62839}
.member-dropdown-item small{color:var(--text-muted);font-size:10px}
.dropdown-empty{padding:10px;text-align:center;font-size:11px;color:var(--text-muted)}
.selected-member-pill{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:var(--bg-main);border:1px solid var(--border-color);border-radius:8px;font-size:11px}

.main-area{min-width:0;flex:1;display:flex;flex-direction:column}
.topbar{height:82px;background:var(--bg-surface);border-bottom:1px solid var(--border-color);display:flex;align-items:center;justify-content:space-between;padding:0 34px;position:sticky;top:0;z-index:20;transition:background .2s,border .2s}
.topbar-left{display:flex;align-items:center;gap:14px}
.breadcrumb{display:flex;align-items:center;gap:11px;color:var(--text-muted);font-size:12px;font-weight:800;letter-spacing:.8px}
.breadcrumb b{color:var(--border-color)}
.breadcrumb strong{color:#d62839}
.page-context{font-size:11px;color:var(--text-muted);margin-top:4px}
.topbar-actions{display:flex;align-items:center;gap:15px}
.topbar-theme{width:auto!important;padding:7px 10px!important;background:var(--bg-main)!important;border-color:var(--border-color)!important;color:var(--text-main)!important}
.connection-status{font-size:11px;color:var(--text-muted);display:flex;align-items:center;gap:7px}
.connection-status i{width:8px;height:8px;border-radius:50%;background:#25a56a;box-shadow:0 0 0 4px #25a56a18}
.notification-button{width:38px;height:38px;border:1px solid var(--border-color);border-radius:10px;background:var(--bg-surface);color:var(--text-main);font-size:18px;position:relative}
.notification-button i{position:absolute;top:-5px;right:-5px;min-width:16px;height:16px;border-radius:20px;background:#d62839;color:#fff;font-style:normal;font-size:10px;display:grid;place-items:center}
.topbar-avatar{display:flex;align-items:center;gap:8px;border:0;background:transparent;color:var(--text-main);font-size:12px;font-weight:700}
.content-area{width:100%;max-width:1600px;margin:0 auto;padding:30px 34px 38px;flex:1}
.page-section{display:flex;flex-direction:column;gap:22px}
.animate-in{animation:fadeUp .32s ease both}@keyframes fadeUp{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:translateY(0)}}
.section-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:18px}
.section-heading h2{font-family:Manrope,sans-serif;font-size:27px;line-height:1.2;letter-spacing:-.9px;margin:5px 0 6px;color:var(--text-main)}
.section-heading p{margin:0;color:var(--text-muted);font-size:13px}
.eyebrow{font-size:10px;color:#d62839;font-weight:800;letter-spacing:1.45px}
.date-chip,.count-chip{border:1px solid var(--border-color);background:var(--bg-surface);border-radius:9px;padding:9px 12px;font-size:11px;color:var(--text-muted);font-weight:700;white-space:nowrap}
.welcome-banner{min-height:190px;border-radius:18px;background:linear-gradient(110deg,#24242a 0%,#33343b 65%,#48272c 100%);padding:30px 34px;color:#fff;display:flex;align-items:center;justify-content:space-between;overflow:hidden;position:relative}
.welcome-banner:after{content:'';position:absolute;width:320px;height:320px;border:1px solid #ffffff0c;border-radius:50%;right:65px;top:-160px;box-shadow:0 0 0 34px #ffffff05,0 0 0 68px #ffffff03}
.welcome-banner .eyebrow{color:#ff9da5}
.welcome-banner h1{font-family:Manrope,sans-serif;font-size:33px;letter-spacing:-1.2px;margin:9px 0 7px;color:#fff}
.welcome-banner p{font-size:13px;color:#c1c2c9;margin:0}
.welcome-mark{font-family:Manrope,sans-serif;font-size:86px;font-weight:900;color:#ffffff14;letter-spacing:-8px;margin-right:45px;z-index:1}
.welcome-mark span{color:#ef5865;font-size:27px;letter-spacing:-1px}
.stats-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
.stat-card{background:var(--bg-surface);border:1px solid var(--border-color);border-radius:14px;padding:18px;display:flex;gap:13px;align-items:flex-start;box-shadow:var(--card-shadow)}
.stat-icon{width:40px;height:40px;border-radius:11px;display:grid;place-items:center;font-size:18px;font-weight:800}
.stat-icon.red{background:#fff0f1;color:#d62839}.stat-icon.green{background:#eaf8f1;color:#239966}.stat-icon.amber{background:#fff6e8;color:#b97b1e}.stat-icon.blue{background:#edf4ff;color:#4775bd}
.stat-copy{display:flex;flex-direction:column;gap:4px}
.stat-copy span{font-size:11px;color:var(--text-muted);font-weight:650}
.stat-copy strong{font-family:Manrope,sans-serif;font-size:26px;line-height:1.1;color:var(--text-main)}
.stat-copy small{font-size:10px;color:var(--text-muted)}
.dashboard-columns{display:grid;grid-template-columns:1.35fr 1fr;gap:16px}
.panel{background:var(--bg-surface);border:1px solid var(--border-color);border-radius:14px;box-shadow:var(--card-shadow);min-width:0}
.panel-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:19px 20px;border-bottom:1px solid var(--border-color)}
.panel-heading h3{margin:0 0 4px;font-family:Manrope,sans-serif;font-size:15px;color:var(--text-main)}
.panel-heading p{margin:0;font-size:11px;color:var(--text-muted)}
.feed-item{display:flex;align-items:flex-start;gap:12px;padding:15px 20px;border-bottom:1px solid var(--border-color)}
.feed-item:last-child{border-bottom:0}
.feed-icon{width:30px;height:30px;border-radius:9px;background:#fff0f1;color:#d62839;display:grid;place-items:center;flex:0 0 auto}
.feed-icon.urgent{background:#fff0eb;color:#d24a2e}
.feed-content{min-width:0;flex:1}
.feed-content strong{font-size:12px;color:var(--text-main)}
.feed-content p{font-size:11px;color:var(--text-muted);line-height:1.55;margin:4px 0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.feed-content small{font-size:10px;color:var(--text-muted)}
.priority-dot{width:8px;height:8px;border-radius:50%;background:#e0a43d;margin-top:5px}
.priority-dot.urgent{background:#d62839}
.event-mini{display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid var(--border-color)}
.event-mini:last-child{border-bottom:0}
.event-date{width:44px;height:47px;background:#fff0f1;border-radius:9px;color:#d62839;display:flex;flex-direction:column;align-items:center;justify-content:center}
.event-date strong{font-family:Manrope,sans-serif;font-size:19px;line-height:1}
.event-date small{font-size:9px;font-weight:800;text-transform:uppercase}
.event-mini>div:last-child strong{font-size:12px;color:var(--text-main)}
.event-mini p{font-size:10px;color:var(--text-muted);margin:4px 0 0}
.quick-links{display:grid;grid-template-columns:repeat(3,1fr);gap:13px}
.quick-links button{background:var(--bg-surface);border:1px solid var(--border-color);border-radius:12px;padding:16px;display:grid;grid-template-columns:34px 1fr;grid-template-rows:auto auto;column-gap:11px;text-align:left;transition:transform .18s,border .18s}
.quick-links button:hover{transform:translateY(-2px);border-color:#e7a0a7}
.quick-links button>span{grid-row:1/3;width:34px;height:34px;background:#fff0f1;color:#d62839;border-radius:9px;display:grid;place-items:center;font-size:18px}
.quick-links strong{font-size:12px;color:var(--text-main)}
.quick-links small{font-size:10px;color:var(--text-muted);margin-top:3px}
.button{border:1px solid transparent;border-radius:9px;padding:10px 15px;font-size:12px;font-weight:750;display:inline-flex;align-items:center;justify-content:center;gap:7px;transition:transform .16s,background .16s;white-space:nowrap}
.button:disabled{opacity:.45;cursor:not-allowed}
.button:hover:not(:disabled){transform:translateY(-1px)}
.button-primary{background:#d62839;color:#fff;border-color:#d62839;box-shadow:0 4px 10px #d628391c}
.button-primary:hover:not(:disabled){background:#bd1e2e}
.button-outline{background:var(--bg-surface);color:var(--text-main);border-color:var(--border-color)}
.button-outline:hover:not(:disabled){border-color:#d62839;color:#d62839}
.button-quiet{background:var(--border-color);color:var(--text-main);border-color:var(--border-color)}
.button-danger-soft{background:#fff0f1;color:#c62535;border-color:#f3cbd0}
.button-small{padding:7px 10px;font-size:10px}
.button-full{width:100%;padding:13px}
.text-button{border:0;background:transparent;color:#d62839;font-size:11px;font-weight:800;padding:5px}
.danger-text{color:#c92535}
.mobile-menu-button,.mobile-close{display:none}
.filter-tabs,.admin-tabs{display:flex;gap:7px;overflow:auto;padding-bottom:4px}
.filter-tabs button,.admin-tabs button{border:1px solid var(--border-color);background:var(--bg-surface);color:var(--text-muted);padding:9px 12px;border-radius:9px;font-size:11px;font-weight:750;white-space:nowrap}
.filter-tabs button span{margin-left:8px;color:var(--text-muted)}
.filter-tabs button.selected{background:#d62839;border-color:#d62839;color:#fff}
.filter-tabs button.selected span{color:#ffd9dd}
.table-panel{overflow:hidden}
.table-toolbar{padding:14px 17px;display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid var(--border-color)}
.search-box{display:flex;align-items:center;gap:9px;min-width:0;flex:1;background:var(--bg-main);border:1px solid var(--border-color);border-radius:9px;padding:0 12px;color:var(--text-muted)}
.search-box:focus-within{border-color:#e18b94;box-shadow:0 0 0 3px #d6283910}
.search-box span{font-size:19px}
.search-box input{width:100%;min-width:0;border:0;outline:0;background:transparent;padding:11px 0;font-size:12px;color:var(--text-main)}
.search-box input::placeholder{color:var(--text-muted)}
.toolbar-note{font-size:10px;color:var(--text-muted)}
.table-scroll{overflow-x:auto}
.data-table{width:100%;border-collapse:collapse;text-align:left;min-width:820px}
.data-table th{background:var(--table-head);color:var(--text-muted);font-size:10px;text-transform:uppercase;letter-spacing:.7px;padding:13px 15px;font-weight:800;white-space:nowrap}
.data-table td{padding:13px 15px;border-top:1px solid var(--border-color);color:var(--text-main);font-size:11px;white-space:nowrap}
.data-table tbody tr:hover{background:rgba(214,40,57,0.03)}
.member-cell{display:flex;align-items:center;gap:10px;border:0;background:transparent;text-align:left;padding:0;color:inherit;min-width:155px}
.member-cell>span{display:flex;flex-direction:column;gap:3px}
.member-cell strong{font-size:11px;color:var(--text-main);font-weight:800}
.member-cell small{font-size:10px;color:var(--text-muted)}
.member-cell em{font-style:normal;color:#d99a24}
.avatar{object-fit:cover;flex:0 0 auto;border-radius:11px;background:var(--border-color);border:1px solid var(--border-color)}
.avatar-xs{width:26px;height:26px;border-radius:8px}.avatar-sm{width:34px;height:34px;border-radius:9px}.avatar-md{width:38px;height:38px}.avatar-xl{width:80px;height:80px;border-radius:20px}
.id-value{color:#d62839;font-size:11px}.missing-value{color:var(--text-muted);font-weight:500}
.status-pill{display:inline-flex;align-items:center;padding:5px 9px;border-radius:20px;font-size:9px;font-weight:850;text-transform:uppercase;letter-spacing:.45px;white-space:nowrap}
.status-pill.green{background:#e9f7ef;color:#238455}.status-pill.red{background:#fff0f1;color:#c32b3b}.status-pill.amber{background:#fff5e5;color:#a87520}.status-pill.gray{background:var(--border-color);color:var(--text-muted)}
.role-list{display:flex;flex-wrap:wrap;align-items:center;gap:5px}
.role-badge{display:inline-flex;padding:4px 8px;border-radius:6px;font-size:9px;font-weight:800;border:1px solid transparent;white-space:nowrap}
.role-badge.red,.role-symbol.red{background:#fff0f1;color:#c72b3a;border-color:#f5cbd0}.role-badge.amber,.role-symbol.amber{background:#fff6e8;color:#a97724;border-color:#f2dfbd}.role-badge.blue,.role-symbol.blue{background:#edf4ff;color:#4771b4;border-color:#d6e4fb}.role-badge.green,.role-symbol.green{background:#eaf7ef;color:#278454;border-color:#d0ebdc}.role-badge.purple,.role-symbol.purple{background:#f3efff;color:#7554b6;border-color:#e0d7fa}.role-badge.cyan,.role-symbol.cyan{background:#e9f8fa;color:#278696;border-color:#d0edf1}.role-badge.pink,.role-symbol.pink{background:#fff0f7;color:#b54e83;border-color:#f5d7e6}.role-badge.slate,.role-symbol.slate{background:var(--border-color);color:var(--text-main);border-color:var(--border-color)}.role-badge.orange,.role-symbol.orange{background:#fff2e9;color:#bb6b32;border-color:#f5ddca}.role-badge.teal,.role-symbol.teal{color:#348b7d;background:#e9f7f4;border-color:#cfece5}.role-badge.indigo,.role-symbol.indigo{background:#eef0ff;color:#5968ae;border-color:#d9ddfc}
.more-roles{font-size:9px;color:var(--text-muted)}
.icon-button{width:30px;height:30px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-surface);color:var(--text-main);font-size:15px;display:inline-grid;place-items:center}
.icon-button:hover{border-color:#d62839;color:#d62839}
.icon-button.danger{color:#c72b3b;background:#fff3f4}
.row-actions{display:flex;align-items:center;gap:5px}
.empty-state{padding:38px 18px;text-align:center;color:var(--text-muted)}
.empty-icon{width:44px;height:44px;margin:0 auto 11px;border-radius:13px;background:var(--border-color);color:var(--text-muted);display:grid;place-items:center;font-size:22px}
.empty-state strong{display:block;color:var(--text-main);font-size:13px}
.empty-state p{margin:6px auto 0;max-width:310px;font-size:11px;line-height:1.6}
.resource-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:15px}
.resource-card{background:var(--bg-surface);border:1px solid var(--border-color);border-radius:13px;overflow:hidden}
.resource-card>img{width:100%;height:180px;object-fit:cover;background:var(--border-color)}
.resource-card-body{padding:15px;display:flex;justify-content:space-between;align-items:center;gap:10px}
.resource-card h3,.radio-card h3{font-size:13px;margin:0 0 7px;color:var(--text-main)}
.resource-number{font-size:10px;color:#d12b3b;font-weight:800}
.radio-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
.radio-card{background:var(--bg-surface);border:1px solid var(--border-color);border-radius:13px;padding:18px;display:flex;gap:13px;align-items:flex-start}
.radio-symbol{width:40px;height:40px;background:#fff0f1;color:#d62839;border-radius:11px;display:grid;place-items:center;font-size:21px}
.radio-copy{flex:1;min-width:0}
.radio-copy strong{color:#d12b3b;font-size:14px}
.radio-copy p{font-size:11px;color:var(--text-muted);line-height:1.6;margin:7px 0 0}
.form-panel{padding:0 20px 20px}
.form-panel>.button{margin-top:16px}
.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px;margin-top:17px}
.field{display:flex;flex-direction:column;gap:6px;min-width:0}
.field>span{font-size:11px;font-weight:750;color:var(--text-main)}
.field input,.field textarea,.field select,.admin-filters select{width:100%;padding:11px 12px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-surface);color:var(--text-main);outline:0;font-size:11px;min-width:0}
.field input:focus,.field textarea:focus,.field select:focus,.admin-filters select:focus{border-color:#df8790;box-shadow:0 0 0 3px #d6283910}
.field textarea{resize:vertical;line-height:1.55}
.field input[type=file]{padding:8px}
.field-wide{grid-column:1/-1}
.notice-list{display:flex;flex-direction:column;gap:12px}
.notice-card{background:var(--bg-surface);border:1px solid var(--border-color);border-radius:13px;padding:18px 20px}
.notice-card.notice-urgent{border-left:3px solid #d62839}
.notice-top,.notice-footer{display:flex;align-items:center;justify-content:space-between;gap:10px}
.notice-top small,.notice-footer{font-size:10px;color:var(--text-muted)}
.notice-tag{display:inline-flex;background:var(--border-color);color:var(--text-main);border-radius:20px;padding:5px 9px;font-size:9px;font-weight:850;text-transform:uppercase;letter-spacing:.5px}
.notice-tag.urgent{background:#fff0f1;color:#c72b3b}.notice-tag.important{background:#fff6e8;color:#a97724}
.notice-card h3{font-size:14px;margin:12px 0 7px;color:var(--text-main)}
.notice-card p{font-size:11px;color:var(--text-muted);line-height:1.7;margin:0 0 12px;white-space:pre-wrap}
.notice-footer{border-top:1px solid var(--border-color);padding-top:10px}
.notice-footer strong{color:var(--text-main)}
.rules-list{display:flex;flex-direction:column;gap:9px}
.rule-card{background:var(--bg-surface);border:1px solid var(--border-color);border-radius:12px;padding:17px;display:flex;align-items:flex-start;gap:15px}
.rule-index{font-family:Manrope,sans-serif;color:#d62839;font-size:19px;font-weight:850}
.rule-card>div{flex:1}
.rule-card h3{font-size:13px;margin:2px 0 6px;color:var(--text-main)}
.rule-card p{font-size:11px;line-height:1.65;color:var(--text-muted);margin:0}
.role-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.role-card{background:var(--bg-surface);border:1px solid var(--border-color);border-radius:12px;padding:15px;display:flex;align-items:center;gap:12px}
.role-symbol{width:38px;height:38px;border-radius:10px;display:grid;place-items:center;font-size:19px;border:1px solid transparent}
.role-card-main{flex:1;min-width:0}
.role-card h3{font-size:12px;margin:0 0 4px;color:var(--text-main)}
.role-card p{font-size:10px;line-height:1.4;margin:0 0 4px;color:var(--text-muted)}
.role-card small{font-size:10px;color:var(--text-muted)}
.discord-panel{max-width:650px;margin:30px auto;background:var(--bg-surface);border:1px solid var(--border-color);border-radius:20px;padding:55px 35px;text-align:center;box-shadow:var(--card-shadow)}
.discord-emblem{width:72px;height:72px;border-radius:22px;background:#fff0f1;color:#d62839;display:grid;place-items:center;font-size:36px;margin:0 auto 20px}
.discord-panel h2{font:800 28px Manrope,sans-serif;margin:9px 0;color:var(--text-main)}
.discord-panel p{font-size:13px;color:var(--text-muted);line-height:1.7;max-width:450px;margin:0 auto 22px}
.discord-panel small{display:block;font-size:10px;color:var(--text-muted);margin-top:16px}
.event-list{display:flex;flex-direction:column;gap:10px}
.event-card{display:flex;align-items:center;gap:18px;background:var(--bg-surface);border:1px solid var(--border-color);border-radius:13px;padding:15px}
.event-date-large{width:68px;min-width:68px;height:72px;background:#fff0f1;border-radius:12px;color:#c72b3b;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px}
.event-date-large strong{font:850 27px Manrope,sans-serif}
.event-date-large span{font-size:9px;font-weight:800;text-transform:uppercase}
.event-details{flex:1;min-width:0}
.event-details h3{font-size:14px;margin:7px 0 4px;color:var(--text-main)}
.event-details p{font-size:11px;color:var(--text-muted);margin:0 0 6px}
.event-details small{font-size:10px;color:var(--text-muted)}
.notification-list{display:flex;flex-direction:column;gap:9px}
.notification-card{background:var(--bg-surface);border:1px solid var(--border-color);border-radius:12px;padding:15px;display:flex;align-items:center;gap:13px}
.notification-card.unread{border-left:3px solid #d62839}
.notification-card.read{opacity:.76}
.notification-symbol{width:38px;height:38px;display:grid;place-items:center;background:#fff0f1;color:#d62839;border-radius:10px;font-size:18px}
.notification-content{flex:1;min-width:0}
.notification-content h3{font-size:12px;color:var(--text-main);margin:0 0 4px}
.notification-content p{font-size:11px;color:var(--text-muted);margin:0 0 5px}
.notification-content small{font-size:10px;color:var(--text-muted)}
.profile-layout{display:grid;grid-template-columns:310px minmax(0,1fr);gap:15px;align-items:start}
.profile-card{background:var(--bg-surface);border:1px solid var(--border-color);border-radius:14px;padding:25px;text-align:center}
.profile-card .avatar{margin:0 auto 13px}
.profile-card h2{font:800 18px Manrope,sans-serif;margin:0 0 4px;color:var(--text-main)}
.profile-card>p{font-size:11px;color:var(--text-muted);margin:0 0 11px}
.profile-meta{display:flex;flex-direction:column;gap:10px;text-align:left;border-top:1px solid var(--border-color);margin-top:18px;padding-top:16px}
.profile-meta span{display:flex;justify-content:space-between;gap:10px}
.profile-meta small{color:var(--text-muted);font-size:10px}
.profile-meta strong{color:var(--text-main);font-size:10px;text-align:right;overflow-wrap:anywhere}
.profile-roles{justify-content:center;margin-top:15px}
.profile-form{padding-bottom:20px}
.profile-form .field{margin-top:14px}
.admin-badge{background:#fff0f1;color:#c72b3b;border:1px solid #f3cbd0;border-radius:20px;padding:7px 10px;font-size:9px;font-weight:850;letter-spacing:.8px}
.admin-tabs{border-bottom:1px solid var(--border-color);padding-bottom:10px}
.admin-tabs button{background:transparent;border-color:transparent;color:var(--text-muted)}
.admin-tabs button.active{background:#fff0f1;border-color:#f1c9ce;color:#c72b3b}
.admin-tabs button i{font-style:normal;background:var(--bg-surface);border-radius:20px;padding:2px 6px;margin-left:5px}
.admin-filters{display:flex;gap:9px;padding:15px 18px;border-bottom:1px solid var(--border-color)}
.admin-filters .search-box{flex:1}
.admin-filters select{width:auto;min-width:135px}
.application-admin-list{display:flex;flex-direction:column;gap:12px}
.application-admin-list>.search-box{max-width:100%}
.application-admin-card{background:var(--bg-surface);border:1px solid var(--border-color);border-radius:13px;padding:18px}
.application-admin-header{display:flex;justify-content:space-between;align-items:center;gap:12px;padding-bottom:15px;border-bottom:1px solid var(--border-color)}
.candidate-data-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding:15px 0}
.candidate-data-grid>span{background:var(--bg-main);border:1px solid var(--border-color);border-radius:9px;padding:10px;display:flex;flex-direction:column;gap:5px;min-width:0}
.candidate-data-grid small,.member-detail-grid-clean small{font-size:9px;color:var(--text-muted);font-weight:750;text-transform:uppercase;letter-spacing:.45px}
.candidate-data-grid strong{font-size:11px;color:var(--text-main);overflow-wrap:anywhere}
.candidate-data-grid .highlight-id{background:#fff0f1;border-color:#f3cbd0}
.candidate-data-grid .highlight-id strong{color:#c72b3b;font:850 14px Manrope,sans-serif}
.candidate-reason{background:var(--bg-main);border:1px solid var(--border-color);border-radius:9px;padding:12px}
.candidate-reason small{font-size:9px;color:var(--text-muted);text-transform:uppercase;font-weight:800}
.candidate-reason p{font-size:11px;color:var(--text-main);line-height:1.6;margin:6px 0 0;white-space:pre-wrap}
.candidate-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:13px}
.admin-two-columns{display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:start}
.punished-list,.internal-notes-list,.logs-list{padding:15px;display:flex;flex-direction:column;gap:9px;max-height:650px;overflow:auto}
.punished-card,.note-member{border:1px solid var(--border-color);border-radius:10px;padding:12px}
.punished-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
.punished-head>div{display:flex;flex-direction:column;gap:4px}
.punished-head strong,.note-member>strong{font-size:11px;color:var(--text-main)}
.punished-head small,.note-member>strong small{font-size:9px;color:var(--text-muted);font-weight:500}
.punishment-row{display:flex;align-items:center;justify-content:space-between;gap:10px;border-top:1px solid var(--border-color);padding:9px 0 0;margin-top:9px}
.punishment-row span{display:flex;flex-direction:column;gap:3px;min-width:0}
.punishment-row strong{font-size:10px;color:#c72b3b}
.punishment-row small{font-size:10px;color:var(--text-muted);white-space:normal}
.note-item{background:var(--bg-main);border:1px solid var(--border-color);border-radius:8px;padding:10px;margin-top:8px}
.note-item p{font-size:11px;color:var(--text-main);line-height:1.55;margin:0 0 7px}
.note-item small{font-size:9px;color:var(--text-muted)}
.roles-admin-layout{display:grid;grid-template-columns:1.4fr 1fr;gap:14px;align-items:start}
.role-admin-list{padding:8px 17px 14px}
.role-admin-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid var(--border-color)}
.role-admin-row:last-child{border-bottom:0}
.role-admin-row>div:first-child{display:flex;flex-direction:column;gap:6px}
.role-admin-row small{font-size:10px;color:var(--text-muted)}
.tiny-tag{font-size:9px;color:#9a762d;background:#fff6e8;border-radius:10px;padding:4px 6px}
.role-help{padding:24px}
.role-assignment-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
.role-assignment-option{display:flex;align-items:center;justify-content:space-between;gap:7px;padding:8px 9px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-surface);color:var(--text-main);font-size:10px}
.role-assignment-option.assigned{border-color:#efb9bf;background:#fff8f8}
.role-assignment-option:disabled{opacity:.45;cursor:not-allowed}
.role-assignment-option>strong{font-size:13px;color:#c72b3b}
.help-symbol{width:40px;height:40px;background:#fff0f1;color:#d62839;border-radius:11px;display:grid;place-items:center;font-size:22px}
.role-help h3{font-size:14px;margin:13px 0 7px}
.role-help p,.help-note{font-size:11px;line-height:1.65;color:var(--text-muted)}
.help-note{margin-top:13px;background:#fff6e8;border:1px solid #f1e6cb;border-radius:9px;padding:11px;color:#896d35}
.permission-group{border:1px solid var(--border-color);border-radius:9px;padding:12px;margin:10px 0}
.permission-group>strong{font-size:11px;color:var(--text-main)}
.permission-option{display:flex;align-items:center;gap:9px;padding:8px 0;border-top:1px solid var(--border-color);margin-top:6px;font-size:11px;color:var(--text-main)}
.permission-option input{accent-color:#d62839}
.permission-option small{margin-left:auto;color:var(--text-muted);font-size:9px}
.log-row{display:flex;align-items:flex-start;gap:11px;border-bottom:1px solid var(--border-color);padding:11px 0}
.log-row:last-child{border-bottom:0}
.log-dot{width:8px;height:8px;background:#d62839;border-radius:50%;margin-top:5px}
.log-row>div{flex:1;min-width:0}
.log-row strong{font-size:11px;color:var(--text-main)}
.log-row p{font-size:11px;color:var(--text-muted);margin:4px 0}
.log-row small,.log-row time{font-size:9px;color:var(--text-muted)}
.log-row time{white-space:nowrap}
.app-footer{border-top:1px solid var(--border-color);background:var(--bg-surface);padding:14px 34px;display:flex;justify-content:space-between;color:var(--text-muted);font-size:9px;font-weight:800;letter-spacing:.8px;transition:background .2s,border .2s}
.modal-backdrop{position:fixed;inset:0;background:#15161bc4;backdrop-filter:blur(4px);z-index:100;display:flex;align-items:center;justify-content:center;padding:18px;overflow:auto}
.modal-card{width:min(620px,100%);max-height:92vh;overflow:auto;background:var(--bg-surface);border-radius:16px;border:1px solid var(--border-color);box-shadow:0 20px 70px #0003;padding:22px;animation:fadeUp .2s ease;color:var(--text-main)}
.role-editor-modal{width:min(680px,100%)}.confirm-modal{width:min(420px,100%)}
.modal-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding-bottom:15px;border-bottom:1px solid var(--border-color);margin-bottom:18px}
.modal-header h2{font:800 20px Manrope,sans-serif;margin:5px 0 0;color:var(--text-main)}
.member-profile-head{display:flex;align-items:center;gap:15px;margin-bottom:18px}
.member-profile-head h2{font:800 18px Manrope,sans-serif;margin:0 0 5px}
.member-profile-head p{font-size:11px;color:var(--text-muted);margin:0 0 8px}
.member-detail-grid-clean{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.clean-field-box{display:flex;flex-direction:column;gap:6px;padding:11px;background:var(--bg-main);border:1px solid var(--border-color);border-radius:9px;min-width:0}
.clean-field-box small{font-size:9px;color:var(--text-muted);font-weight:750;text-transform:uppercase;letter-spacing:.45px}
.clean-field-box strong{font-size:11px;color:var(--text-main);overflow-wrap:anywhere}
.member-detail-block{border-top:1px solid var(--border-color);padding-top:14px;margin-top:14px}
.member-detail-block>small{display:block;font-size:9px;color:var(--text-muted);text-transform:uppercase;font-weight:850;letter-spacing:.7px;margin-bottom:8px}
.member-detail-block>p{font-size:11px;color:var(--text-muted);line-height:1.6;margin:0}
.modal-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px;margin-top:20px}
.modal-actions.vertical{flex-direction:column}
.modal-actions.vertical .button{width:100%}
.form-stack{display:flex;flex-direction:column;gap:13px}
.permissions-editor{max-height:48vh;overflow:auto}
.auth-screen{min-height:100vh;padding:24px;display:grid;place-items:center;background:var(--bg-main)}
.auth-card,.application-card{width:min(440px,100%);background:var(--bg-surface);border:1px solid var(--border-color);border-radius:19px;box-shadow:var(--card-shadow);padding:33px;color:var(--text-main);transition:background .2s,border .2s}
.auth-card{text-align:center}
.auth-brand-mark{width:58px;height:58px;display:grid;place-items:center;margin:0 auto 17px;border-radius:17px;background:#d62839;color:#fff;font:900 28px Manrope,sans-serif;box-shadow:0 8px 22px #d6283930}
.auth-eyebrow{color:#d62839;font-size:10px;font-weight:850;letter-spacing:1.6px}
.auth-card h1{font:900 26px Manrope,sans-serif;letter-spacing:-.8px;margin:7px 0;color:var(--text-main)}
.auth-card h1 span{color:#d62839}
.auth-subtitle{font-size:12px;color:var(--text-muted);margin:0 0 24px}
.auth-switch{margin-top:17px}
.auth-footnote{border-top:1px solid var(--border-color);margin-top:22px;padding-top:15px;font-size:10px;color:var(--text-muted)}
.alert{font-size:11px;padding:10px;border-radius:8px;margin:0 0 14px;text-align:left}
.alert-error{background:#fff0f1;color:#bd2938;border:1px solid #f1cbd0}
.loading-screen{min-height:100vh;background:var(--bg-main);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:var(--text-main)}
.loading-mark{width:48px;height:48px;background:#d62839;color:white;border-radius:14px;display:grid;place-items:center;font:900 23px Manrope,sans-serif;margin-bottom:6px}
.loading-screen span{font-size:11px;color:var(--text-muted)}
.application-card{width:min(660px,100%);padding:26px}
.application-brand{display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--border-color);padding-bottom:15px}
.application-brand>div:nth-child(2){display:flex;flex-direction:column;gap:3px;flex:1}
.application-brand strong{font-size:12px;color:var(--text-main)}
.application-brand span{font-size:9px;color:var(--text-muted)}
.application-state{text-align:center;padding:28px 8px}
.state-symbol{width:52px;height:52px;margin:0 auto 12px;border-radius:15px;display:grid;place-items:center;font-size:25px;font-weight:850}
.state-symbol.amber{background:#fff5e5;color:#b97c22}.state-symbol.red{background:#fff0f1;color:#c72b3b}
.application-state h2,.application-form-wrap h2{font:800 22px Manrope,sans-serif;margin:12px 0 7px;color:var(--text-main)}
.application-state>p,.application-form-wrap>p{font-size:12px;line-height:1.7;color:var(--text-muted);max-width:470px;margin:0 auto 17px}
.application-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:22px;text-align:left}
.application-summary span{display:flex;flex-direction:column;gap:5px;padding:10px;background:var(--bg-main);border-radius:8px;font-size:9px;color:var(--text-muted)}
.application-summary strong{font-size:11px;color:var(--text-main);overflow-wrap:anywhere}
.application-form-wrap{padding:23px 4px 4px}
.application-form-wrap>p{margin:0 0 18px}
.application-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.mobile-backdrop,.notification-backdrop{display:none}

@media(max-width:1180px){.stats-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.role-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.resource-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.content-area{padding:25px 24px}.topbar{padding:0 24px}}
@media(max-width:900px){.sidebar{position:fixed;left:0;top:0;bottom:0;transform:translateX(-102%);transition:transform .23s ease;box-shadow:12px 0 40px #0002}.sidebar.sidebar-open{transform:translateX(0)}.mobile-backdrop{display:block;position:fixed;inset:0;background:#11182788;border:0;z-index:35}.mobile-close{display:block;margin-left:auto;border:0;background:transparent;color:#fff;font-size:23px}.mobile-menu-button{display:inline-grid;place-items:center;border:1px solid var(--border-color);background:var(--bg-surface);border-radius:8px;width:34px;height:34px;color:var(--text-main)}.dashboard-columns{grid-template-columns:1fr}.profile-layout{grid-template-columns:1fr 1.4fr}.admin-two-columns,.roles-admin-layout{grid-template-columns:1fr}}
@media(max-width:640px){.topbar{height:68px;padding:0 14px}.topbar-actions{gap:8px}.connection-status,.topbar-avatar span,.logout-top{display:none}.content-area{padding:19px 13px 25px}.page-context{display:none}.breadcrumb{font-size:10px;gap:7px}.section-heading{align-items:flex-start;flex-direction:column}.section-heading h2{font-size:24px}.date-chip{white-space:normal}.welcome-banner{padding:23px 20px;min-height:165px}.welcome-banner h1{font-size:27px}.welcome-banner p{max-width:245px;font-size:11px;line-height:1.6}.welcome-mark{font-size:58px;margin-right:0}.stats-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.stat-card{padding:13px;gap:9px}.stat-icon{width:32px;height:32px;font-size:15px}.stat-copy strong{font-size:22px}.stat-copy span{font-size:10px}.stat-copy small{font-size:9px}.quick-links{grid-template-columns:1fr}.quick-links button{padding:13px}.filter-tabs{margin-right:-13px;padding-right:13px}.filter-tabs button{padding:8px 10px;font-size:10px}.table-toolbar{align-items:stretch;flex-direction:column}.toolbar-note{display:none}.resource-grid,.radio-grid,.role-grid{grid-template-columns:1fr}.resource-card>img{height:190px}.form-grid{grid-template-columns:1fr}.field-wide{grid-column:auto}.admin-filters{flex-direction:column}.admin-filters select{width:100%}.candidate-data-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.candidate-actions{flex-wrap:wrap}.candidate-actions .button{flex:1}.profile-layout{grid-template-columns:1fr}.application-form{grid-template-columns:1fr}.application-summary{grid-template-columns:1fr}.event-card{align-items:flex-start;gap:11px;padding:11px}.event-date-large{width:55px;min-width:55px;height:61px}.event-date-large strong{font-size:23px}.notification-card{align-items:flex-start;flex-wrap:wrap}.notification-card .button{margin-left:49px}.app-footer{padding:12px 14px;gap:8px;font-size:8px}.auth-card,.application-card{padding:24px 19px}.member-detail-grid-clean{grid-template-columns:repeat(2,minmax(0,1fr))}.modal-card{padding:17px}.member-profile-head .avatar{width:60px;height:60px}.modal-actions{join:stretch}.modal-actions .button{flex:1}.role-assignment-grid{grid-template-columns:1fr}.admin-tabs{margin-right:-13px;padding-right:13px}.admin-tabs button{font-size:10px;padding:8px 10px}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}
`;
