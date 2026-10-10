export type AppRole = 'STUDENT' | 'TEACHER' | 'ADMIN'

export interface AppProfile {
  id: string
  email: string
  name: string | null
  handle: string | null
  avatarUrl: string | null
  role: AppRole
  streak: number
  totalXp: number
  weeklyXp: number
  gems: number
  hearts: number
  maxHearts: number
  superMode: boolean
  doubleXpUntil: string | null
  doubleGemsUntil: string | null
  doubleGemsPausedAt: string | null
  streakFreezeCount: number
  createdAt: string
  rank: number
  activityDates: string[]
}

export interface GameStatePatch {
  gems?: number
  hearts?: number
  superMode?: boolean
  doubleXpUntil?: string | null
  doubleGemsUntil?: string | null
  doubleGemsPausedAt?: string | null
  streakFreezeCount?: number
}

export interface ProfileIdentityPatch {
  name: string
  handle: string
  avatarUrl: string | null
}

export function isGameStatePatch(value: unknown): value is GameStatePatch {
  if (typeof value !== 'object' || value === null) return false
  const fields: (keyof GameStatePatch)[] = [
    'gems',
    'hearts',
    'superMode',
    'doubleXpUntil',
    'doubleGemsUntil',
    'doubleGemsPausedAt',
    'streakFreezeCount',
  ]
  const hasField = fields.some((field) => field in value)
  return hasField
    && (!('gems' in value) || typeof value.gems === 'number')
    && (!('hearts' in value) || typeof value.hearts === 'number')
    && (!('superMode' in value) || typeof value.superMode === 'boolean')
    && (!('doubleXpUntil' in value) || typeof value.doubleXpUntil === 'string' || value.doubleXpUntil === null)
    && (!('doubleGemsUntil' in value) || typeof value.doubleGemsUntil === 'string' || value.doubleGemsUntil === null)
    && (!('doubleGemsPausedAt' in value) || typeof value.doubleGemsPausedAt === 'string' || value.doubleGemsPausedAt === null)
    && (!('streakFreezeCount' in value) || typeof value.streakFreezeCount === 'number')
}

export function isProfileIdentityPatch(value: unknown): value is ProfileIdentityPatch {
  return typeof value === 'object'
    && value !== null
    && 'name' in value && typeof value.name === 'string'
    && 'handle' in value && typeof value.handle === 'string'
    && 'avatarUrl' in value && (typeof value.avatarUrl === 'string' || value.avatarUrl === null)
}

export function isAppProfile(value: unknown): value is AppProfile {
  return typeof value === 'object'
    && value !== null
    && 'id' in value && typeof value.id === 'string'
    && 'email' in value && typeof value.email === 'string'
    && 'name' in value && (typeof value.name === 'string' || value.name === null)
    && 'handle' in value && (typeof value.handle === 'string' || value.handle === null)
    && 'avatarUrl' in value && (typeof value.avatarUrl === 'string' || value.avatarUrl === null)
    && 'role' in value && (value.role === 'STUDENT' || value.role === 'TEACHER' || value.role === 'ADMIN')
    && 'streak' in value && typeof value.streak === 'number'
    && 'totalXp' in value && typeof value.totalXp === 'number'
    && 'weeklyXp' in value && typeof value.weeklyXp === 'number'
    && 'gems' in value && typeof value.gems === 'number'
    && 'hearts' in value && typeof value.hearts === 'number'
    && 'maxHearts' in value && typeof value.maxHearts === 'number'
    && 'superMode' in value && typeof value.superMode === 'boolean'
    && 'doubleXpUntil' in value && (typeof value.doubleXpUntil === 'string' || value.doubleXpUntil === null)
    && 'doubleGemsUntil' in value && (typeof value.doubleGemsUntil === 'string' || value.doubleGemsUntil === null)
    && 'doubleGemsPausedAt' in value && (typeof value.doubleGemsPausedAt === 'string' || value.doubleGemsPausedAt === null)
    && 'streakFreezeCount' in value && typeof value.streakFreezeCount === 'number'
    && 'createdAt' in value && typeof value.createdAt === 'string'
    && 'rank' in value && typeof value.rank === 'number'
    && 'activityDates' in value && Array.isArray(value.activityDates) && value.activityDates.every((date) => typeof date === 'string')
}
