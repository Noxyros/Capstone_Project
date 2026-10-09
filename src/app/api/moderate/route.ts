import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authenticateAppUser } from '@/src/lib/auth/server'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const STRICT_SCORE_THRESHOLD = 0.05
const EXPOSED_CHEST_THRESHOLD = 0.02

type JsonRecord = Record<string, unknown>

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasScoreAbove(value: unknown, threshold: number): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value > threshold
}

function violatesStudentImagePolicy(nudity: JsonRecord): boolean {
  const exposureScores = [
    'raw',
    'partial',
    'erotica',
    'sexual_activity',
    'sexual_display',
    'very_suggestive',
    'suggestive',
  ]
  if (exposureScores.some((field) => hasScoreAbove(nudity[field], STRICT_SCORE_THRESHOLD))) {
    return true
  }

  const classes = nudity.suggestive_classes
  if (!isRecord(classes) || typeof classes.male_chest !== 'number') {
    throw new Error('Sightengine response is missing required exposed-body classifications.')
  }

  const appearanceClasses = [
    'bikini',
    'lingerie',
    'male_chest',
    'male_underwear',
    'female_underwear',
    'swimwear_male',
    'swimwear_one_piece',
    'visibly_undressed',
  ]
  if (appearanceClasses.some((field) => hasScoreAbove(classes[field], STRICT_SCORE_THRESHOLD))) {
    return true
  }

  const chestCategories = classes.male_chest_categories
  if (isRecord(chestCategories) && [
    'slightly_revealing',
    'revealing',
    'very_revealing',
  ].some((field) => hasScoreAbove(chestCategories[field], EXPOSED_CHEST_THRESHOLD))) {
    return true
  }

  return false
}

export async function POST(req: Request) {
  const authentication = await authenticateAppUser()
  if (!authentication.appUser) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status })
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Avatar storage is not configured.')
    return NextResponse.json({ error: 'Image upload is not configured.' }, { status: 503 })
  }
  if (!process.env.SIGHTENGINE_API_USER || !process.env.SIGHTENGINE_API_SECRET) {
    console.error('Sightengine image moderation is not configured.')
    return NextResponse.json({ error: 'Image moderation is not configured.' }, { status: 503 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Upload must be a valid form submission.' }, { status: 400 })
  }
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Choose an image to upload.' }, { status: 400 })
  }
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Upload a JPEG, PNG, or WebP image.' }, { status: 415 })
  }
  if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: 'Image must be smaller than 5 MB.' }, { status: 413 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const sightengineFormData = new FormData()
  sightengineFormData.append('media', new Blob([buffer], { type: file.type }), 'avatar')
  sightengineFormData.append('models', 'nudity-2.1,gore-2.0')
  sightengineFormData.append('api_user', process.env.SIGHTENGINE_API_USER)
  sightengineFormData.append('api_secret', process.env.SIGHTENGINE_API_SECRET)

  try {
    const aiRes = await fetch('https://api.sightengine.com/1.0/check.json', {
      method: 'POST',
      body: sightengineFormData,
      signal: AbortSignal.timeout(20_000),
    })
    if (!aiRes.ok) {
      console.error('Sightengine moderation request failed.', aiRes.status)
      return NextResponse.json({ error: 'Image moderation is temporarily unavailable. Please try again.' }, { status: 502 })
    }

    const moderationResult: unknown = await aiRes.json()
    if (!isRecord(moderationResult) || moderationResult.status !== 'success' || !isRecord(moderationResult.nudity)) {
      console.error('Sightengine returned an unsuccessful or incomplete moderation result.')
      return NextResponse.json({ error: 'Image moderation could not verify this image. Please try another.' }, { status: 502 })
    }

    if (violatesStudentImagePolicy(moderationResult.nudity)) {
      return NextResponse.json(
        { allowed: false, error: 'This image does not meet Questly’s student avatar guidelines.' },
        { status: 422 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    const extension = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp'
    const fileName = `${authentication.appUser.id}/${crypto.randomUUID()}.${extension}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) throw uploadError

    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName)

    return NextResponse.json({ allowed: true, url: publicUrlData.publicUrl })
  } catch (error) {
    console.error('Avatar moderation or upload failed.', error)
    return NextResponse.json({ error: 'Could not process this image. Please try again.' }, { status: 502 })
  }
}