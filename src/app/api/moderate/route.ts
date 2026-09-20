import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }

    if (!process.env.SIGHTENGINE_API_USER || !process.env.SIGHTENGINE_API_SECRET) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const formData = await req.formData()
    const file = formData.get('file') as File
    const userHandle = formData.get('handle') as string || 'anonymous'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Call Sightengine API
    const sightengineFormData = new FormData()
    sightengineFormData.append('media', new Blob([buffer], { type: file.type }), file.name)
    sightengineFormData.append('models', 'nudity-2.1,gore-2.0')
    sightengineFormData.append('api_user', process.env.SIGHTENGINE_API_USER)
    sightengineFormData.append('api_secret', process.env.SIGHTENGINE_API_SECRET)

    const aiRes = await fetch('https://api.sightengine.com/1.0/check.json', {
      method: 'POST',
      body: sightengineFormData,
    })

    if (!aiRes.ok) {
      console.error('Sightengine API Error:', await aiRes.text())
      throw new Error('Sightengine API request failed')
    }

    const aiData = await aiRes.json()
    
    // Print full response to your terminal so we can see the exact scores
    console.log('Sightengine Full Response:', JSON.stringify(aiData, null, 2))

    if (aiData.status === 'success') {
      const nudity = aiData.nudity || {}
      
      // Aggressive catch: triggers if raw, partial, erotica, or sexual activity is > 20% (0.2)
      const isNsfw = 
        (nudity.raw ?? 0) > 0.2 || 
        (nudity.partial ?? 0) > 0.2 || 
        (nudity.erotica ?? 0) > 0.2 ||
        (nudity.sexual_activity ?? 0) > 0.2 ||
        (nudity.sexual_display ?? 0) > 0.2

      if (isNsfw) {
        return NextResponse.json(
          { allowed: false, error: 'Image flagged as inappropriate (NSFW).' },
          { status: 422 }
        )
      }
    }

    // Upload safely to Supabase Storage if clean
    const fileExt = file.name.split('.').pop()
    const fileName = `${userHandle}-${Date.now()}.${fileExt}`
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) throw uploadError

    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName)

    return NextResponse.json({ 
      allowed: true, 
      url: publicUrlData.publicUrl 
    })

  } catch (error) {
    console.error('Moderation/Upload error:', error)
    return NextResponse.json({ error: 'Failed to process image' }, { status: 500 })
  }
}