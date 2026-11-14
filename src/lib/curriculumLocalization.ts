type SubjectNames = {
  id: string
  en: string
  idAliases?: string[]
  enAliases?: string[]
}

const SUBJECTS: SubjectNames[] = [
  { id: 'Matematika', en: 'Mathematics', enAliases: ['math', 'maths'] },
  { id: 'Bahasa Indonesia', en: 'Indonesian Language', enAliases: ['indonesian'] },
  { id: 'Bahasa Inggris', en: 'English', enAliases: ['english language'] },
  {
    id: 'IPA',
    en: 'Natural Science',
    idAliases: ['ilmu pengetahuan alam', 'ipa terpadu'],
    enAliases: ['science', 'natural sciences'],
  },
  {
    id: 'IPS',
    en: 'Social Studies',
    idAliases: ['ilmu pengetahuan sosial', 'ips terpadu'],
    enAliases: ['social science', 'social sciences'],
  },
  {
    id: 'PPKN',
    en: 'Civics',
    idAliases: ['pendidikan kewarganegaraan', 'pendidikan pancasila dan kewarganegaraan'],
    enAliases: ['civic education'],
  },
  { id: 'Pendidikan Pancasila', en: 'Pancasila Education' },
  {
    id: 'PJOK',
    en: 'Physical Education',
    idAliases: ['pendidikan jasmani', 'penjaskes', 'pendidikan jasmani olahraga dan kesehatan'],
    enAliases: ['pe', 'physical education and health'],
  },
  {
    id: 'Seni Budaya',
    en: 'Arts & Culture',
    idAliases: ['seni budaya dan prakarya'],
    enAliases: ['arts and culture', 'art and culture'],
  },
  { id: 'Prakarya', en: 'Crafts & Entrepreneurship', enAliases: ['crafts and entrepreneurship'] },
  { id: 'Informatika', en: 'Informatics', enAliases: ['computer science', 'ict'] },
  {
    id: 'Pendidikan Agama',
    en: 'Religious Education',
    idAliases: ['agama', 'pendidikan agama dan budi pekerti'],
    enAliases: ['religion', 'religious studies'],
  },
  { id: 'Sejarah', en: 'History' },
  { id: 'Geografi', en: 'Geography' },
  { id: 'Ekonomi', en: 'Economics' },
  { id: 'Sosiologi', en: 'Sociology' },
  { id: 'Fisika', en: 'Physics' },
  { id: 'Kimia', en: 'Chemistry' },
  { id: 'Biologi', en: 'Biology' },
]

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, ' ')
}

// Build the lookup once. `side` remembers which language the stored name was written in.
const LOOKUP = new Map<string, { entry: SubjectNames; side: 'id' | 'en' }>()
for (const entry of SUBJECTS) {
  for (const key of [entry.id, ...(entry.idAliases ?? [])]) {
    LOOKUP.set(normalize(key), { entry, side: 'id' })
  }
  for (const key of [entry.en, ...(entry.enAliases ?? [])]) {
    LOOKUP.set(normalize(key), { entry, side: 'en' })
  }
}

export function localizeSubjectName(name: string, language: 'en' | 'id'): string {
  const hit = LOOKUP.get(normalize(name))
  if (!hit) return name // unknown or teacher-made subject: show exactly as stored

  if (language === 'id') {
    // Already Indonesian? Leave it exactly as the teacher typed it.
    return hit.side === 'id' ? name : hit.entry.id
  }
  return hit.entry.en
}