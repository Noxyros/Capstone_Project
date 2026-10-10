export function localizeSubjectName(name: string, language: 'en' | 'id'): string {
  const normalized = name.trim().toLocaleLowerCase()
  if (normalized === 'mathematics' || normalized === 'matematika') {
    return language === 'id' ? 'Matematika' : 'Mathematics'
  }
  return name
}
