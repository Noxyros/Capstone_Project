import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { Role } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'
import { authenticateAppUser } from '@/src/lib/auth/server'

export const runtime = 'nodejs'

const BUCKET = 'lesson-materials'
const MAX_FILE_SIZE = 25 * 1024 * 1024

const FILE_TYPES = {
  pdf: { mimeType: 'application/pdf', contentType: 'material' },
  ppt: { mimeType: 'application/vnd.ms-powerpoint', contentType: 'material' },
  pptx: { mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', contentType: 'material' },
  jpg: { mimeType: 'image/jpeg', contentType: 'poster' },
  jpeg: { mimeType: 'image/jpeg', contentType: 'poster' },
  png: { mimeType: 'image/png', contentType: 'poster' },
  webp: { mimeType: 'image/webp', contentType: 'poster' },
  gif: { mimeType: 'image/gif', contentType: 'poster' },
  avif: { mimeType: 'image/avif', contentType: 'poster' },
} as const

function hasValidSignature(bytes: Uint8Array, extension: keyof typeof FILE_TYPES): boolean {
  if (extension === 'pdf') return Buffer.from(bytes.subarray(0, 1024)).includes(Buffer.from('%PDF-'))
  if (extension === 'ppt') {
    return Buffer.from(bytes.subarray(0, 8)).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))
  }
  if (extension === 'pptx') return bytes[0] === 0x50 && bytes[1] === 0x4b
  if (extension === 'png') {
    return bytes.length >= 8
      && Buffer.from(bytes.subarray(0, 8)).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  }
  if (extension === 'jpg' || extension === 'jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (extension === 'webp') {
    return bytes.length >= 12
      && Buffer.from(bytes.subarray(0, 4)).toString('ascii') === 'RIFF'
      && Buffer.from(bytes.subarray(8, 12)).toString('ascii') === 'WEBP'
  }
  if (extension === 'gif') {
    const signature = Buffer.from(bytes.subarray(0, 6)).toString('ascii')
    return signature === 'GIF87a' || signature === 'GIF89a'
  }
  return bytes.length >= 12
    && Buffer.from(bytes.subarray(4, 12)).toString('ascii').startsWith('ftyp')
    && Buffer.from(bytes.subarray(8, 12)).toString('ascii').startsWith('avi')
}

export async function POST(request: Request) {
  const authentication = await authenticateAppUser()
  if (!authentication.appUser) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status })
  }
  if (authentication.appUser.role !== Role.TEACHER && authentication.appUser.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Teacher access is required.' }, { status: 403 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Lesson material storage is not configured.')
    return NextResponse.json({ error: 'Lesson material uploads are not configured.' }, { status: 503 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Upload must be a valid form submission.' }, { status: 400 })
  }
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Choose a file to upload.' }, { status: 400 })
  }
  if (file.size === 0 || file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'Files must be between 1 byte and 25 MB.' }, { status: 413 })
  }

  const extension = file.name.split('.').pop()?.toLowerCase() as keyof typeof FILE_TYPES | undefined
  const fileType = extension ? FILE_TYPES[extension] : undefined
  if (!extension || !fileType || (file.type && file.type !== fileType.mimeType && file.type !== 'application/octet-stream')) {
    return NextResponse.json({ error: 'Use a PowerPoint, PDF, or supported image file.' }, { status: 415 })
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  if (!hasValidSignature(bytes, extension)) {
    return NextResponse.json({ error: 'The file contents do not match the selected file type.' }, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    if (listError) throw listError
    if (!buckets.some((bucket) => bucket.name === BUCKET)) {
      const { error: createError } = await supabase.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: MAX_FILE_SIZE,
        allowedMimeTypes: [...new Set(Object.values(FILE_TYPES).map((type) => type.mimeType))],
      })
      if (createError) {
        const { data: refreshedBuckets, error: refreshError } = await supabase.storage.listBuckets()
        if (refreshError || !refreshedBuckets.some((bucket) => bucket.name === BUCKET)) throw createError
      }
    }
    const path = `${authentication.appUser.id}/${randomUUID()}.${extension}`
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, bytes, {
      contentType: fileType.mimeType,
      upsert: false,
    })
    if (uploadError) throw uploadError

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    return NextResponse.json({ url: data.publicUrl, contentType: fileType.contentType })
  } catch (error) {
    console.error('Failed to upload lesson material.', error)
    return NextResponse.json({ error: 'Could not upload this lesson material. Please try again.' }, { status: 502 })
  }
}
