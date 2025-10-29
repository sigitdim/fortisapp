'use client'
// @ts-nocheck
import React from 'react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, AreaChart, Area
} from 'recharts'

type LineDef = { dataKey: string; name?: string }

export default function ChartClient({
  data, xKey, lines = [], height = 260, type = 'line'
}: { data: any[]; xKey: string; lines?: LineDef[]; height?: number; type?: 'line'|'bar'|'area' }) {
  if (!Array.isArray(data)) return null
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        {type === 'bar' ? (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} /><YAxis /><Tooltip /><Legend />
            {lines.map((l,i)=><Bar key={i} dataKey={l.dataKey} name={l.name||l.dataKey} />)}
          </BarChart>
        ) : type === 'area' ? (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} /><YAxis /><Tooltip /><Legend />
            {lines.map((l,i)=><Area key={i} dataKey={l.dataKey} name={l.name||l.dataKey} />)}
          </AreaChart>
        ) : (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} /><YAxis /><Tooltip /><Legend />
            {lines.map((l,i)=><Line key={i} dataKey={l.dataKey} name={l.name||l.dataKey} />)}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}
