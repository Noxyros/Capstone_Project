const getStorageKey = (chapterId: string) => `questly_completed_nodes:${chapterId}`

export function getCompletedNodeIds(chapterId: string): string[] {
  const stored = localStorage.getItem(getStorageKey(chapterId))
  if (!stored) return []

  try {
    const parsed: unknown = JSON.parse(stored)
    if (Array.isArray(parsed) && parsed.every((nodeId) => typeof nodeId === 'string')) {
      return parsed
    }
    console.error('Stored node progress has an invalid format.')
  } catch (error) {
    console.error('Failed to read stored node progress.', error)
  }

  return []
}

export function markNodeCompleted(chapterId: string, nodeId: string): void {
  const completedNodeIds = new Set(getCompletedNodeIds(chapterId))
  completedNodeIds.add(nodeId)
  localStorage.setItem(getStorageKey(chapterId), JSON.stringify([...completedNodeIds]))
}
