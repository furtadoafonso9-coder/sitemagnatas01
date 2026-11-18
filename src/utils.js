import { DEFAULT_AVATAR } from './constants';

export function formatDate(value) {
  if (!value) return '—';
  if (typeof value === 'string') return value;
  try {
    const date = value?.toDate ? value.toDate() : new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-PT');
  } catch {
    return '—';
  }
}

export function formatDateTime(value) {
  if (!value) return '—';
  try {
    const date = value?.toDate ? value.toDate() : new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('pt-PT');
  } catch {
    return '—';
  }
}

export function getRoleColor(role) {
  const value = String(role?.color || '').toLowerCase();
  if (value.includes('red') || value.includes('vermelho')) return 'red';
  if (value.includes('amber') || value.includes('gold') || value.includes('dourado')) return 'amber';
  if (value.includes('blue') || value.includes('azul')) return 'blue';
  if (value.includes('emerald') || value.includes('green') || value.includes('verde')) return 'green';
  if (value.includes('purple') || value.includes('roxo')) return 'purple';
  if (value.includes('cyan') || value.includes('ciano')) return 'cyan';
  if (value.includes('pink') || value.includes('rose') || value.includes('rosa')) return 'pink';
  if (value.includes('orange')) return 'orange';
  if (value.includes('teal')) return 'teal';
  if (value.includes('indigo')) return 'indigo';
  return 'slate';
}

export function getMemberName(member) {
  return member?.nomeInGame || member?.username || member?.email || 'Membro sem nome';
}

export function matchesMember(member, term) {
  if (!term.trim()) return true;
  const value = term.trim().toLowerCase();
  const searchable = [
    member?.username,
    member?.nomeInGame,
    member?.discordTag,
    member?.idInGame,
    member?.email,
    member?.estado,
    ...(member?.roles || [])
  ].filter(Boolean).join(' ').toLowerCase();
  return searchable.includes(value);
}
