export function rowsToCsv(rows: any[]): string {
  if (!rows?.length) return '';
  const headers = Object.keys(rows[0] ?? {});
  const lines = [headers.join(',')];
  for (const r of rows) {
    const line = headers.map(h => {
      const v = (r as any)?.[h];
      const s = v == null ? '' : String(v).replace(/"/g, '""');
      return `"${s}"`;
    }).join(',');
    lines.push(line);
  }
  return lines.join('\n');
}

export function downloadCsvFromRows(rows: any[], filename: string) {
  const csv = rowsToCsv(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
