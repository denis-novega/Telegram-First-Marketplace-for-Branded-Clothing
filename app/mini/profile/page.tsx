// app/mini/profile/page.tsx
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import LoginViaTelegram from '@/components/mini/LoginViaTelegram'
import { admin } from '@/lib/supabase-admin'

export default async function MiniProfileEntry() {
  const ck = cookies()
  const pid = ck.get('tg_pid')?.value || ck.get('tg_pid_v2')?.value || null

  if (pid) {
    const { data: prof } = await admin
      .from('profiles')
      .select('id')
      .eq('id', pid)
      .maybeSingle()

    if (prof?.id) {
      redirect('/mini/profile/me')
    } else {
      redirect('/api/logout?next=/mini/profile')
    }
  }

  // не авторизован → экран авторизации в том же стиле
  return (
    <div className="px-4 py-8 space-y-3">
      <div className="text-lg font-semibold">Авторизация</div>
      <div className="text-sm text-zinc-400">
        Войдите, чтобы сохранять избранное и управлять объявлениями. Если вы открыли мини-приложение из бота, Telegram ID будет определён автоматически.
      </div>
      <LoginViaTelegram />
    </div>
  )
}
