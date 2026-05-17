// components/RootChrome.tsx
'use client'
import { usePathname } from 'next/navigation'
import Header from '@/components/Header'

export default function RootChrome() {
  const pathname = usePathname()
  const isMini = pathname?.startsWith('/mini')
  if (isMini) return null
  return <Header />
}
