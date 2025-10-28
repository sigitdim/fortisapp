import SetupTabs from './_components/SetupTabs';

export const dynamic = 'force-dynamic';

export default function SetupPage(){
  return (
    <div className="max-w-7xl mx-auto p-6 md:p-8">
      <SetupTabs />
    </div>
  );
}
