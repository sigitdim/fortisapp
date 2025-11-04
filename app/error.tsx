"use client";
export default function GlobalError({ error, reset }: { error: any; reset: () => void }) {
  console.error("[GLOBAL ERROR]", error);
  return (
    <html>
      <body>
        <div style={{padding:16, background:"#FEF2F2", color:"#991B1B", fontFamily:"ui-sans-serif"}}>
          <div style={{fontWeight:800, marginBottom:8}}>Aplikasi mengalami error</div>
          <div style={{whiteSpace:"pre-wrap", wordBreak:"break-word"}}>{String(error?.message || error)}</div>
          <button
            onClick={() => reset()}
            style={{marginTop:12, padding:"8px 12px", borderRadius:8, background:"#DC2626", color:"#fff", fontWeight:700}}
          >
            Muat ulang
          </button>
        </div>
      </body>
    </html>
  );
}
