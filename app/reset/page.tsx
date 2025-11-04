'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function ResetPage() {
  const [password, setPassword] = useState(''); const [msg, setMsg] = useState(''); const router = useRouter();
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setMsg(error.message);
    else { setMsg('Password diperbarui. Silakan login.'); setTimeout(()=>router.push('/login'), 1200); }
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={handleReset} className="bg-white shadow-md rounded-2xl p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold mb-4 text-center">Reset Password</h1>
        <input type="password" placeholder="Password baru" value={password} onChange={(e)=>setPassword(e.target.value)}
          required className="border rounded-lg w-full px-3 py-2 mb-4"/>
        <button type="submit" className="bg-blue-600 text-white py-2 rounded-lg w-full">Ubah Password</button>
        {msg && <p className="text-sm text-center text-gray-600 mt-3">{msg}</p>}
      </form>
    </div>
  );
}
