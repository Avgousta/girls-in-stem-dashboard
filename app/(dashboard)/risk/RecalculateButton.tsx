'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { RefreshCw, Loader2 } from 'lucide-react';

export default function RecalculateButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleClick = async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/v1/risk/recalculate', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Recalculation failed');
      const count = json.data?.recalculated ?? 0;
      toast.success(`Risk scores updated for ${count} learner${count !== 1 ? 's' : ''}`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleClick} disabled={loading}
      className="btn-secondary text-xs flex items-center gap-1.5">
      {loading
        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
        : <RefreshCw className="w-3.5 h-3.5" />}
      {loading ? 'Recalculating…' : 'Recalculate Now'}
    </button>
  );
}
