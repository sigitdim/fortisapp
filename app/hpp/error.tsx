"use client";

export default function HppError(props: { error: any; reset: () => void }) {
  console.error("[/hpp] error boundary:", props.error);
  return (
    <div
      style={{
        margin: 24,
        padding: 16,
        border: "2px solid #ef4444",
        borderRadius: 12,
        background: "#fff1f2",
        color: "#991b1b",
      }}
    >
      <div style={{ fontWeight: 800, marginBottom: 8 }}>HPP runtime error</div>
      <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
        {String(props.error?.message || props.error)}
      </pre>
      <button
        onClick={props.reset}
        style={{
          marginTop: 8,
          padding: "8px 12px",
          borderRadius: 10,
          background: "#ef4444",
          color: "#fff",
          border: 0,
          cursor: "pointer",
        }}
      >
        Coba muat ulang
      </button>
    </div>
  );
}
