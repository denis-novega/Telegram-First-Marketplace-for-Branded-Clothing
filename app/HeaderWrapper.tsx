'use client'

import dynamic from 'next/dynamic'

// Ленивый импорт настоящего Header, который работает с Supabase и хуками
const Header = dynamic(() => import('@/components/Header'), { ssr: false })

export default function HeaderWrapper() {
  return <Header />
}
