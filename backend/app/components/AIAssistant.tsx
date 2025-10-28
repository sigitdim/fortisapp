'use client';
import { useEffect, useState } from 'react';
import { api } from '@/app/lib/api';

export default function AIAssistant(){
  const [open, setOpen] = useState(false);
  const [text, setText] = useState<string>('Siap bantu. Klik “Analisis” buat rekomendasi harga & margin.');
  const [loading, setLoading] = useState(false);

  async function analyze(){
    try{
      setLoading(true);
      // jika BE ada: /ai/suggest ; fallback dummy kalau 404
      const r = await api('/ai/suggest').catch(()=>({ data: { message:
        'Perkiraan: 12 produk di bawah target margin. Naikkan harga 3–5% pada 5 item dengan elastisitas rendah. Turunkan biaya bahan (supplier B) untuk 2 item tertinggi HPP.'
      }}));
      const msg = r?.data?.message ?? 'Tidak ada rekomendasi.';
      setText(String(msg));
    }finally{ setLoading(false); }
  }

  useEffect(()=>{ if(open) analyze(); }, [open]);

  return (
    <>
      <button
        onClick={()=>setOpen(true)}
        className="fixed bottom-5 right-5 z-40 shadow-lg px-4 py-2 rounded-full bg-black text-white hover:opacity-90">
        AI Assistant
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center sm:justify-center">
          <div className="bg-white w-full sm:w-[560px] sm:rounded-2xl p-4 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="text-lg font-semibold">AI Assistant</div>
              <button onClick={()=>setOpen(false)} className="px-3 py-1 rounded border hover:bg-gray-50 text-sm">Close</button>
            </div>
            <div className="mt-3 text-sm whitespace-pre-wrap leading-6">
              {loading ? 'Menganalisis…' : text}
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button onClick={analyze} className="px-3 py-1.5 rounded border hover:bg-gray-50 text-sm">
                {loading ? 'Analisis…' : 'Analisis Ulang'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
