export const PRESET_AVATARS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=Questly1',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Questly2',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Questly3',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Questly4',
]

export function isAllowedAvatarUrl(value: string, userId: string): boolean {
  if (PRESET_AVATARS.includes(value)) return true

  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!projectUrl) return false

  try {
    const avatarUrl = new URL(value)
    const storageOrigin = new URL(projectUrl).origin
    const userAvatarPath = `/storage/v1/object/public/avatars/${userId}/`
    const fileName = avatarUrl.pathname.startsWith(userAvatarPath)
      ? avatarUrl.pathname.slice(userAvatarPath.length)
      : ''
    return avatarUrl.origin === storageOrigin
      && !avatarUrl.search
      && !avatarUrl.hash
      && /^[a-f0-9-]{36}\.(?:jpg|png|webp)$/i.test(fileName)
  } catch {
    return false
  }
}
