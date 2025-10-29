// app/components/ErrorBoundary.tsx
'use client'
import React from 'react'

type Props = { children: React.ReactNode, fallback?: React.ReactNode }

export default class ErrorBoundary extends React.Component<Props, { hasError: boolean; msg?: string }> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError(err: unknown) {
    return { hasError: true, msg: err instanceof Error ? err.message : 'Unknown error' }
  }
  componentDidCatch(err: any, info: any) {
    console.error('[ErrorBoundary]', err, info)
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="p-4 rounded-xl border border-red-300 bg-red-50 text-red-700">
          <div className="font-semibold">Terjadi error pada komponen ini.</div>
          <div className="text-sm opacity-80">Detail: {this.state.msg}</div>
        </div>
      )
    }
    return this.props.children
  }
}
