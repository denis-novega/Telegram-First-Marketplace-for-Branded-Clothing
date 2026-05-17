'use client'
import TWAProvider, { useTWA } from '@/providers/TWAProvider'
import { MiniShell } from '@/components/shells/MiniShell'
import { SiteShell } from '@/components/shells/SiteShell'

function Switch({ children }: { children: React.ReactNode }) {
  const isTWA = useTWA()
  return isTWA ? <MiniShell>{children}</MiniShell> : <SiteShell>{children}</SiteShell>
}

export default function TWAClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <TWAProvider>
      <Switch>{children}</Switch>
    </TWAProvider>
  )
}
