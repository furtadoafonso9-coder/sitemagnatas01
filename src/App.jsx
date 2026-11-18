import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
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

// V1 + V2: catálogo inicial para manter os cargos que já existiam.
// Os cargos novos e as alterações são guardados na coleção Firestore "roles".
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
