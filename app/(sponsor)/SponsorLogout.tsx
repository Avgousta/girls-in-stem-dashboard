'use client';
import { createClient } from '@/lib/supabase/client';
import { LogOut } from 'lucide-react';

export default function SponsorLogout() {
  return (
    <button onClick={async () => {
      await createClient().auth.signOut();
      window.location.href = '/login';
    }}
      className="flex items-center gap-1.5 text-sm px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
      style={{ color: 'rgba(240,238,255,0.5)' }}>
      <LogOut className="w-4 h-4" />
      <span className="hidden sm:inline">Sign out</span>
    </button>
  );
}
