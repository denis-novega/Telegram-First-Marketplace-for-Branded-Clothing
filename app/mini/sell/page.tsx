'use client'
import { useRouter } from 'next/navigation'
import SellPageCore from '@/components/sell/SellPageCore'

export default function MiniSellPage() {
  const router = useRouter()

  return (
    <SellPageCore
      deps={{
        ensureAuthed: async () => {
          const r = await fetch('/api/me', { credentials: 'include', cache: 'no-store' })
          const j = await r.json()
          if (!j?.ok) router.replace('/mini/profile')
        },
        uploadFile: async (file) => {
          const fd = new FormData()
          fd.append('file', file)
          const r = await fetch('/api/mini/upload', {
            method: 'POST',
            credentials: 'include',
            body: fd,
          })
          const j = await r.json()
          if (!j?.ok) throw new Error(j?.error || 'UPLOAD_FAILED')
          return j.url as string
        },
        submit: async (payload) => {
          const r = await fetch('/api/mini/sell/submit', {
            method: 'POST',
            credentials: 'include',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload),
          })
          const j = await r.json()
          if (!j?.ok) throw new Error(j?.error || 'SERVER_ERROR')
        },
        onSuccessRedirect: (url) => router.replace(url),
      }}
    />
  )
}
