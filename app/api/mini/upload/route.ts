// app/api/mini/upload/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { admin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ====== LIMITS ======
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/jpg',
])

// ====== HELPERS ======
function sanitizeFilename(name: string) {
  return name
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 120)
}

function bad(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status })
}

// ====== HANDLER ======
export async function POST(req: Request) {
  try {
    // 1️⃣ AUTH — строго по tg_pid
    const jar = await cookies()
    const pid = jar.get('tg_pid')?.value

    if (!pid || !/^[a-zA-Z0-9_-]{8,}$/.test(pid)) {
      return bad(401, 'UNAUTHORIZED')
    }

    // 2️⃣ CONTENT-TYPE CHECK
    const ct = req.headers.get('content-type') || ''
    if (!ct.startsWith('multipart/form-data')) {
      return bad(415, 'UNSUPPORTED_CONTENT_TYPE')
    }

    // 3️⃣ PARSE FORM
    const form = await req.formData()
    const file = form.get('file')

    if (!(file instanceof File)) {
      return bad(400, 'NO_FILE')
    }

    // 4️⃣ SIZE LIMIT
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return bad(413, 'FILE_TOO_LARGE')
    }

    // 5️⃣ MIME TYPE ALLOWLIST
    if (!ALLOWED_MIME.has(file.type)) {
      return bad(415, 'UNSUPPORTED_FILE_TYPE')
    }

    // 6️⃣ SAFE PATH (NO USER CONTROL)
    const safeName = sanitizeFilename(file.name || 'upload')
    const objectPath = `${pid}/${Date.now()}-${safeName}`

    // 7️⃣ UPLOAD (NO UPSERT)
    const { error: uploadError } = await admin.storage
      .from('product-images')
      .upload(objectPath, file, {
        contentType: file.type,
        upsert: false,
        cacheControl: '3600',
      })

    if (uploadError) {
      console.error('[mini/upload] storage error', uploadError)
      return bad(500, 'UPLOAD_FAILED')
    }

    // 8️⃣ PUBLIC URL (или signed URL, если сменишь бакет)
    const { data } = admin.storage
      .from('product-images')
      .getPublicUrl(objectPath)

    if (!data?.publicUrl) {
      return bad(500, 'URL_ERROR')
    }

    return NextResponse.json({
      ok: true,
      path: objectPath,
      url: data.publicUrl,
    })
  } catch (err: any) {
    console.error('[mini/upload] fatal', err)
    return bad(500, 'SERVER_ERROR')
  }
}
