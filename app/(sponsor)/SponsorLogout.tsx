'use client';
import { createClient } from '@/lib/supabase/client';
import { LogOut } from 'lucide-react';

export default function SponsorLogout() {
  return (
    <button onClick={async () => {
      await createClient().auth.signOut();
      window.location.href = '/login';
    }}
      className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
      <LogOut className="w-4 h-4" />
      <span className="hidden sm:inline">Sign out</span>
    </button>
  );
}
