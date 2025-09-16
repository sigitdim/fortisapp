"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

export default function Page() {
  const [bahan, setBahan] = useState<any[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase.from("bahan").select("*")
      if (error) {
        console.error(error)
      } else {
        setBahan(data || [])
      }
    }

    fetchData()
  }, [])

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Setup Bahan</h1>
      <ul>
        {bahan.map((item) => (
          <li key={item.id}>
            {item.nama_bahan} - {item.satuan}
          </li>
        ))}
      </ul>
    </div>
  )
}
