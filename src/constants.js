export const PERMISSION_GROUPS = [
  { title: 'Comunidade', items: [
    ['members.view', 'Consultar membros'],
    ['members.edit', 'Editar dados dos membros'],
    ['members.highlight', 'Destacar membros'],
    ['members.remove', 'Remover membros'],
    ['members.assign_roles', 'Atribuir e remover cargos']
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
  { title: 'Conteúdo', items: [
    ['notices.manage', 'Gerir avisos da Staff'],
    ['rules.manage', 'Gerir regras'],
    ['clothes.manage', 'Gerir roupas e kits'],
    ['radio.manage', 'Gerir frequências de rádio'],
    ['events.manage', 'Criar e gerir eventos']
  ]},
  { title: 'Administração', items: [
    ['logs.view', 'Consultar logs administrativos'],
    ['roles.manage', 'Criar, editar e eliminar cargos'],
    ['permissions.manage', 'Gerir permissões dos cargos']
  ]}
];

export const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap(group => group.items.map(item => item[0]));
export const OWNER_PERMISSIONS = ALL_PERMISSION_KEYS;

export const DEFAULT_ROLES = [
  { id: 'legacy_homem', name: 'HOMEM', color: 'emerald', permissions: [] },
  { id: 'legacy_streamer', name: 'STREAMER', color: 'pink', permissions: [] },
  { id: 'legacy_staff_athos_pvp', name: 'STAFF ATHOS PVP', color: 'blue', permissions: ['members.view','applications.view','applications.review','punishments.view','punishments.apply','punishments.revoke','notes.view','notes.create','notices.manage','logs.view'] },
  { id: 'legacy_suport', name: 'SUPORT', color: 'cyan', permissions: ['members.view','members.remove','members.assign_roles','applications.view','applications.review','punishments.view','punishments.apply','punishments.revoke','notes.view','notes.create','notices.manage','logs.view'] },
  { id: 'legacy_dev', name: '01 DEV', color: 'amber', permissions: ['members.view','logs.view'] },
  { id: 'legacy_owner', name: 'OWNER', color: 'purple', permissions: OWNER_PERMISSIONS, protected: true },
  { id: 'legacy_mulher', name: 'MULHER', color: 'rose', permissions: [] },
  { id: 'legacy_founder', name: '01 Founder´s', color: 'purple', permissions: OWNER_PERMISSIONS, protected: true },
  { id: 'legacy_conta_alt', name: 'CONTA ALT', color: 'slate', permissions: [] },
  { id: 'legacy_member', name: '01 Member´s', color: 'green', permissions: ['members.view'] },
  { id: 'legacy_leader', name: '01 Leader´s', color: 'amber', permissions: ['members.view','members.edit','members.highlight','members.remove','members.assign_roles','applications.view','applications.review','punishments.view','punishments.apply','punishments.revoke','notes.view','notes.create','notices.manage','rules.manage','clothes.manage','radio.manage','events.manage','logs.view'] },
  { id: 'legacy_resp_manager', name: 'Resp. Manager´s', color: 'blue', permissions: ['members.view','members.edit','members.highlight','applications.view','applications.review','logs.view'] },
  { id: 'legacy_resp_member', name: 'Resp. Member´s', color: 'teal', permissions: ['members.view','members.highlight'] },
  { id: 'legacy_visitant', name: '01 Visitant', color: 'orange', permissions: [] },
  { id: 'legacy_pvp_player', name: 'PVP Player', color: 'indigo', permissions: [] }
];

export const ROLE_COLORS = [
  { label: 'Vermelho', value: 'red' },
  { label: 'Dourado', value: 'amber' },
  { label: 'Azul', value: 'blue' },
  { label: 'Verde', value: 'green' },
  { label: 'Roxo', value: 'purple' },
  { label: 'Ciano', value: 'cyan' },
  { label: 'Rosa', value: 'pink' },
  { label: 'Cinzento', value: 'slate' }
];

export const NAV_ITEMS = [
  { section: 'Geral', items: [
    ['dashboard', '◫', 'Dashboard'],
    ['base', '♧', 'Comunidade'],
    ['avisos', '◉', 'Avisos da Staff'],
    ['calendario', '▦', 'Calendário'],
    ['notificacoes', '♢', 'Notificações']
  ]},
  { section: 'Recursos', items: [
    ['roupas', '▣', 'Roupas & Kits'],
    ['radio', '◖', 'Frequências Rádio'],
    ['discord', '◌', 'Discord'],
    ['regras', '≡', 'Regras Oficiais'],
    ['cargos', '◇', 'Lista de Cargos']
  ]},
  { section: 'Conta', items: [
    ['meusavisos', '⚑', 'Minhas Punições'],
    ['perfil', '◎', 'Meu Perfil']
  ]}
];

export const DEFAULT_AVATAR = 'https://cdn.discordapp.com/embed/avatars/0.png';
