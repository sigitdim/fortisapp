import SetupTable from './_components/SetupTable';

export const dynamic = 'force-dynamic';

export default function SetupPage(){
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Setup Awal</h1>

      <section>
        <h2 className="text-xl font-medium mb-3">Bahan</h2>
        <SetupTable resource="bahan" />
      </section>

      <section>
        <h2 className="text-xl font-medium mb-3">Overhead</h2>
        <SetupTable resource="overhead" />
      </section>

      <section>
        <h2 className="text-xl font-medium mb-3">Tenaga Kerja</h2>
        <SetupTable resource="tenaga-kerja" />
      </section>
    </div>
  );
}
