'use client'
import { createContext, useContext } from 'react'
import { useIsTWA } from '@/hooks/useIsTWA'

const TWAContext = createContext(false)
export const useTWA = () => useContext(TWAContext)

export default function TWAProvider({ children }: { children: React.ReactNode }) {
  const isTWA = useIsTWA()
  return <TWAContext.Provider value={isTWA}>{children}</TWAContext.Provider>
}
