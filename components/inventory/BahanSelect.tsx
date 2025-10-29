'use client'
import React from 'react'
export default function BahanSelect(props:{ value?: string; onChange?: (id:string)=>void }) {
  return (
    <select
      className="border rounded p-2 text-sm"
      value={props.value||''}
      onChange={e=>props.onChange?.(e.target.value)}
    >
      <option value="">-- pilih bahan --</option>
    </select>
  )
}
