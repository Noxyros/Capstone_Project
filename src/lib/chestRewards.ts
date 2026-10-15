export type ChestBonusItem = 'DOUBLE_XP' | 'STREAK_FREEZE' | 'HEART_REFILL'

const KNOWN_CHEST_ITEMS: Record<string, ChestBonusItem> = {
  'g7-math-integers-treasure': 'DOUBLE_XP',
  'g7-math-algebra-treasure': 'STREAK_FREEZE',
  'g7-math-geometry-treasure': 'DOUBLE_XP',
  'g7-math-statistics-probability-treasure': 'HEART_REFILL',
}

export function getChestBonusItem(nodeId: string): ChestBonusItem {
  if (KNOWN_CHEST_ITEMS[nodeId]) {
    return KNOWN_CHEST_ITEMS[nodeId]
  }
  let hash = 0
  for (let i = 0; i < nodeId.length; i++) {
    hash = (hash * 31 + nodeId.charCodeAt(i)) | 0
  }
  const items: ChestBonusItem[] = ['DOUBLE_XP', 'STREAK_FREEZE', 'HEART_REFILL']
  return items[Math.abs(hash) % items.length]
}

export interface BonusItemMeta {
  code: ChestBonusItem
  title: { en: string; id: string }
  desc: { en: string; id: string }
  badge: { en: string; id: string }
  color: string
  bg: string
  border: string
}

export const CHEST_BONUS_DETAILS: Record<ChestBonusItem, BonusItemMeta> = {
  DOUBLE_XP: {
    code: 'DOUBLE_XP',
    title: { en: 'Double XP Boost (15 Mins)', id: 'Bonus 2x XP (15 Menit)' },
    desc: { en: 'All lesson & quiz XP doubled for 15 minutes!', id: 'XP pelajaran & kuis digandakan selama 15 menit!' },
    badge: { en: '⚡ 2X XP (15m)', id: '⚡ 2X XP (15m)' },
    color: 'text-amber-500',
    bg: 'bg-amber-100',
    border: 'border-amber-200',
  },
  STREAK_FREEZE: {
    code: 'STREAK_FREEZE',
    title: { en: 'Streak Freeze', id: 'Pembeku Streak' },
    desc: { en: 'Protects your streak if you miss a study day.', id: 'Melindungi streak-mu jika terlewat satu hari belajar.' },
    badge: { en: '❄️ +1 Streak Freeze', id: '❄️ +1 Pembeku Streak' },
    color: 'text-sky-500',
    bg: 'bg-sky-100',
    border: 'border-sky-200',
  },
  HEART_REFILL: {
    code: 'HEART_REFILL',
    title: { en: 'Full Heart Refill', id: 'Isi Ulang Penuh Nyawa' },
    desc: { en: 'All 5 hearts restored to maximum capacity!', id: 'Semua 5 nyawa terisi penuh seketika!' },
    badge: { en: '💖 Max Hearts Restored', id: '💖 Nyawa Penuh Terisi' },
    color: 'text-rose-500',
    bg: 'bg-rose-100',
    border: 'border-rose-200',
  },
}

