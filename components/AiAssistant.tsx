'use client'
import React, { useState } from 'react'

type Msg = { role: 'user' | 'assistant'; text: string; t: number }

export default function AiAssistant() {
  const [msgs, setMsgs] = useState<Msg[]>([])

  // contoh handler dummy biar komponen compile mulus
  function send(text: string) {
    const draft: Msg[] = [...msgs, { role: 'user', text, t: Date.now() }]
    setMsgs(draft)
    const reply: Msg = { role: 'assistant', text: 'AI dummy siap 🙌', t: Date.now() }
    setMsgs([...draft, reply])
  }

  // komponen minimal (UI disembunyikan supaya tidak ganggu layout)
  return <div style={{ display: 'none' }} data-ai-assistant="dummy" />
}
