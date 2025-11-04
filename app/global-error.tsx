"use client";

export default function GlobalError({ error, reset }: { error: any; reset: () => void }) {
  return (
    <html>
      <body>
        <div style={{ padding: 24, fontFamily: "ui-sans-serif" }}>
          <h2 style={{ fontWeight: 600, fontSize: 18, marginBottom: 8 }}>
            Terjadi error di client
          </h2>
          <pre style={{ whiteSpace: "pre-wrap", background: "#fafafa", padding: 12, borderRadius: 8, border: "1px solid #eee" }}>
            {String(error?.message || error)}
          </pre>
          <button onClick={reset} style={{ marginTop: 12, padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8 }}>
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
