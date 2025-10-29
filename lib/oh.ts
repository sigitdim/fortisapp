export function ohToNum(v:any){ if(typeof v==="number"&&Number.isFinite(v))return v; if(v==null)return 0;
  const s=String(v).replace(/[^\d.,-]/g,""); const n=parseFloat(s.replace(/\./g,"").replace(/,/g,"."));
  return Number.isFinite(n)?n:0;
}
export function ohBiaya(row:any){
  return ohToNum(row?.biaya_bulanan ?? row?.biaya ?? row?.biaya_per_periode ?? row?.nilai ?? row?.amount ?? row?.price ?? row?.cost ?? 0);
}
