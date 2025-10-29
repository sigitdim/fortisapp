'use client';

import React from 'react';
import Link from 'next/link';

export default function RegisterPage() {
  return (
    <main className="p-6 max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Daftar Akun</h1>

      <form className="space-y-3 bg-white rounded-2xl shadow p-4">
        <div className="grid gap-2">
          <label className="text-sm text-gray-600">Email</label>
          <input
            type="email"
            className="border rounded-lg px-3 py-2"
            placeholder="you@example.com"
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm text-gray-600">Password</label>
          <input
            type="password"
            className="border rounded-lg px-3 py-2"
            placeholder="••••••••"
          />
        </div>
        <button type="button" className="w-full bg-black text-white rounded-lg px-3 py-2 hover:opacity-90">
          Daftar
        </button>
      </form>

      <p className="text-sm text-gray-600">
        Sudah punya akun?{' '}
        <Link href="/login" className="underline">Login</Link>
      </p>
    </main>
  );
}
