import type { Metadata } from 'next'
import HeaderWrapper from '../HeaderWrapper'

export const metadata: Metadata = {
  title: 'Эхо — core',
  description: 'Маркетплейс для перепродажи вещей',
}

export default function CoreLayout({ children }: { children: React.ReactNode }) {
  const year = new Date().getFullYear()
  return (
    <div className="min-h-dvh bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <HeaderWrapper />
      <main id="content">{children}</main>
      <footer className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        © {year} Эхо
      </footer>
    </div>
  )
}
