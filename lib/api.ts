export const API_BASE=(process.env.NEXT_PUBLIC_API_URL||"https://api.fortislab.id").replace(/\/+$/,"");
export const OWNER_ID=process.env.NEXT_PUBLIC_OWNER_ID||"f6269e9a-bc6d-4f8b-aa45-08affc769e5a";
type Method="GET"|"POST"|"PUT"|"DELETE";
export async function apiFetch<T=any>(path:string,{method="GET",body}:{method?:Method;body?:any}={}){const r=await fetch(`${API_BASE}${path}`,{method,headers:{"Content-Type":"application/json","x-owner-id":OWNER_ID},cache:"no-store",...(body?{body:JSON.stringify(body)}:{})});if(!r.ok){throw new Error(`API ${method} ${path} -> ${r.status} ${r.statusText}`)}try{return await r.json() as T}catch{return null as unknown as T}}
export async function tryPaths<T=any>(paths:string[],opts?:{method?:Method;body?:any;pick?:(j:any)=>any}):Promise<T>{const errs:string[]=[];for(const p of paths){try{const j:any=await apiFetch<any>(p,opts);const payload=opts?.pick?opts.pick(j):j?.data??j;if(payload!==undefined&&payload!==null)return payload as T}catch(e:any){errs.push(`${p}: ${e.message}`)}}throw new Error(`All endpoints failed:\n${errs.join("\n")}`)}
export const api={get:<T=any>(p:string)=>apiFetch<T>(p),post:<T=any>(p:string,b?:any)=>apiFetch<T>(p,{method:"POST",body:b}),put:<T=any>(p:string,b?:any)=>apiFetch<T>(p,{method:"PUT",body:b}),delete:<T=any>(p:string)=>apiFetch<T>(p,{method:"DELETE"})};
export async function fetchProdukList(){return await tryPaths<any[]>(["/produk","/products","/setup/produk"],{pick:(j)=>j?.data??j})}
export default {API_BASE,OWNER_ID,apiFetch,tryPaths,api,fetchProdukList};
