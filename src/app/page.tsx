"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// WE CREATE SUPABASE RIGHT HERE. NO IMPORTS.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function Home() {
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const slug = groupName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random() * 1000);

    const { error } = await supabase.from('groups').insert([{ name: groupName, slug: slug }]);

    if (!error) {
      router.push(`/${slug}`);
    } else {
      alert('Error creating group');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-6xl font-black text-red-500 mb-2">WHAMAGEDDON</h1>
      <p className="text-slate-400 mb-8">Survival of the fittest.</p>
      <form onSubmit={createGroup} className="w-full max-w-md bg-slate-800 p-8 rounded-xl border border-slate-700">
        <input 
          type="text" 
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="Group Name"
          className="w-full p-3 rounded bg-slate-900 border border-slate-600 mb-4"
          required
        />
        <button disabled={loading} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded">
          {loading ? 'Creating...' : 'Start'}
        </button>
      </form>
    </main>
  );
}
