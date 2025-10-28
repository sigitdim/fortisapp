'use client';
import { useState } from 'react';
import SetupTable from './SetupTable';
import BomCogsCard from './BomCogsCard';

type TabKey = 'bahan'|'overhead'|'tenaga-kerja'|'bom';

const TAB_LABEL: Record<TabKey,string> = {
  bahan: 'Bahan',
  overhead: 'Overhead',
  'tenaga-kerja': 'Tenaga Kerja',
  bom: 'BOM & COGS',
};

export default function SetupTabs(){
  const [tab, setTab] = useState<TabKey>('bahan');

  const TabButton = ({k}:{k:TabKey}) => (
    <button
      onClick={()=>setTab(k)}
      className={[
        'px-4 py-2 rounded-full border transition',
        tab===k ? 'bg-black text-white border-black' : 'bg-white hover:bg-gray-50'
      ].join(' ')}
    >
      {TAB_LABEL[k]}
    </button>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold">Setup Awal</h1>
        <p className="text-gray-500">Bahan, Overhead, Tenaga Kerja &amp; BOM/COGS.</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 bg-white border rounded-2xl p-2">
        <TabButton k="bahan" />
        <TabButton k="overhead" />
        <TabButton k="tenaga-kerja" />
        <TabButton k="bom" />
      </div>

      {/* Content */}
      <div className="pb-28">
        {tab==='bahan' && <SetupTable resource="bahan" title="Bahan" />}
        {tab==='overhead' && <SetupTable resource="overhead" title="Overhead" />}
        {tab==='tenaga-kerja' && <SetupTable resource="tenaga-kerja" title="Tenaga Kerja" />}
        {tab==='bom' && <BomCogsCard />}
      </div>
    </div>
  );
}
