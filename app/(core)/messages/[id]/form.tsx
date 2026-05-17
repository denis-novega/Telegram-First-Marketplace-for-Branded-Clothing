'use client'

import { useState } from 'react'

export default function MessageForm({ threadId }: { threadId: string }) {
  const [text, setText] = useState('')

  const sendMessage = async () => {
    if (!text) return
    await fetch('/api/send-message', {
      method: 'POST',
      body: JSON.stringify({ threadId, content: text }),
    })
    setText('')
    window.location.reload() // временно, позже — real-time
  }

  return (
    <div className="flex gap-2">
      <input
        value={text}
        onChange={e => setText(e.target.value)}
        className="border p-2 rounded flex-1"
        placeholder="Сообщение..."
      />
      <button onClick={sendMessage} className="bg-black text-white px-4 py-2 rounded">
        Отправить
      </button>
    </div>
  )
}
