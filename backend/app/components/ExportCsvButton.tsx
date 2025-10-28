'use client';
type Row = Record<string, any>;

function toCsv(rows: Row[]): string {
  if (!rows.length) return '';
  const headers = Array.from(new Set(rows.flatMap(r => Object.keys(r))));
  const escape = (v:any) => {
    if (v===null || v===undefined) return '';
    const s = String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g,'""')}"`;
    return s;
  };
  const lines = [
    headers.join(','),
    ...rows.map(r => headers.map(h => escape(r[h])).join(','))
  ];
  return lines.join('\n');
}

export default function ExportCsvButton({ filename='export.csv', rows }:{ filename?:string; rows: Row[] }){
  function download(){
    const csv = toCsv(rows||[]);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <button onClick={download} className="px-3 py-1.5 rounded border hover:bg-gray-50 text-sm">
      Export CSV
    </button>
  );
}
