'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Upload, ExternalLink } from 'lucide-react';

export default function ProjectSubmitButton({
  projectId, currentUrl,
}: { projectId: string; currentUrl: string | null }) {
  const [open,    setOpen]    = useState(false);
  const [url,     setUrl]     = useState(currentUrl || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!url.trim()) { toast.error('Enter a link to your project'); return; }
    if (!url.startsWith('http')) { toast.error('Link must start with http:// or https://'); return; }

    setLoading(true);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/submit`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ file_url: url.trim() }),
      });
      if (!res.ok) throw new Error('Failed to submit');
      toast.success('Project submitted! Your teacher will be notified.');
      setOpen(false);
      window.location.reload();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all border-2 border-dashed border-white/20 text-white/50 hover:border-blue-400 hover:text-blue-400">
      <Upload className="w-4 h-4" />
      {currentUrl ? 'Update Submission' : 'Submit Project'}
    </button>
  );

  return (
    <div className="space-y-2 bg-white/5 rounded-xl p-3 border border-white/20">
      <p className="text-xs font-semibold text-white/70">
        {currentUrl ? 'Update your submission link' : 'Submit your project'}
      </p>
      <p className="text-xs text-white/40">
        Paste a link to your project — GitHub, Google Drive, YouTube video, etc.
      </p>
      <input
        value={url} onChange={e => setUrl(e.target.value)}
        placeholder="https://github.com/yourname/project"
        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-400"
      />
      <div className="flex gap-2">
        <button onClick={handleSubmit} disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {loading ? 'Submitting…' : 'Submit'}
        </button>
        <button onClick={() => setOpen(false)}
          className="px-4 py-2 rounded-lg bg-white/10 text-white/60 text-sm hover:bg-white/20 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}
