'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowser } from '@/lib/supabase'

const supabase = getSupabaseBrowser()

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleLogin = async () => {
      const { error } = await supabase.auth.getSession()

      if (error) {
        alert('Ошибка авторизации')
      } else {
        router.replace('/') // 👈 возвращаем на главную после успешного входа
      }
    }

    handleLogin()
  }, [])

  return (
    <div className="pt-20">
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p>⏳ Входим в аккаунт...</p>
      </div>
    </div>
  )
}
