'use client';
import { createClient } from '@/lib/supabase/client';
import { LogOut } from 'lucide-react';

export default function StudentLogout() {
  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };
  return (
    <button onClick={handleLogout}
      className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
      <LogOut className="w-4 h-4 text-white/70" />
    </button>
  );
}
