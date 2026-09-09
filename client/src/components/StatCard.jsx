import { Card } from './ui';

export default function StatCard({ label, value, hint, tone = 'brand' }) {
  const tones = {
    brand: 'text-brand-700',
    accent: 'text-accent-600',
    red: 'text-red-600',
    slate: 'text-slate-700',
  };
  return (
    <Card className="p-5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${tones[tone]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </Card>
  );
}
