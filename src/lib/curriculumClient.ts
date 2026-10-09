import type { CurriculumSubject } from '@/src/lib/teacherContent'

async function readError(response: Response, fallback: string): Promise<string> {
  try {
    const result: unknown = await response.json()
    if (typeof result === 'object' && result !== null && 'error' in result && typeof result.error === 'string') {
      return result.error
    }
  } catch (error) {
    console.error('Failed to read an API error response.', error)
  }
  return fallback
}

export async function loadCurriculum(view?: 'teacher'): Promise<CurriculumSubject[]> {
  const url = view ? `/api/curriculum?view=${view}` : '/api/curriculum'
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) throw new Error(await readError(response, 'Could not load curriculum.'))
  const result: unknown = await response.json()
  if (typeof result !== 'object' || result === null || !('subjects' in result) || !Array.isArray(result.subjects)) {
    throw new Error('The server returned invalid curriculum data.')
  }
  return result.subjects as CurriculumSubject[]
}

export async function saveCurriculum(subjects: CurriculumSubject[]): Promise<void> {
  const response = await fetch('/api/curriculum', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subjects }),
  })
  if (!response.ok) throw new Error(await readError(response, 'Could not save curriculum.'))
}

export async function saveNodeProgress(nodeId: string, score?: number): Promise<void> {
  const response = await fetch('/api/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nodeId, ...(score === undefined ? {} : { score }) }),
  })
  if (!response.ok) throw new Error(await readError(response, 'Could not save learning progress.'))
}
