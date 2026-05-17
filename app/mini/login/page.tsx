// app/mini/login/page.tsx
'use client' // 👈 добавляем — теперь страница рендерится как Client Component

import LoginViaTelegram from '@/components/mini/LoginViaTelegram'

export default function Page() {
  return (
    <div className="p-4">
      <h1 className="text-lg mb-3">Вход</h1>
      <LoginViaTelegram />
    </div>
  )
}
