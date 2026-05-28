'use client';
import { createClient } from '@/lib/supabase/client';
import { LogOut } from 'lucide-react';

export default function TeacherLogout() {
  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };
  return (
    <button onClick={handleLogout}
      className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
      <LogOut className="w-4 h-4" />
      <span className="hidden sm:inline">Sign out</span>
    </button>
  );
}
