"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// The safe connection
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'example-key';
const supabase = createClient(supabaseUrl, supabaseKey);

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
    <main className="min-h-screen bg-white text-slate-800 flex flex-col items-center justify-center p-6 font-sans">
      {/* Header Section */}
      <div className="text-center mb-10">
        <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-teal-400 mb-4 tracking-tighter">
          WHAMAGEDDON
        </h1>
        <p className="text-slate-400 text-lg font-medium">
          Survival of the fittest. <span className="text-blue-500">Dec 1st - 24th.</span>
        </p>
      </div>

      {/* Card Section */}
      <form onSubmit={createGroup} className="w-full max-w-md bg-white p-8 rounded-3xl shadow-2xl shadow-blue-100 border border-slate-100 transition-all hover:shadow-blue-200">
        <div className="mb-6">
          <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Group Name</label>
          <input 
            type="text" 
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="e.g. Marketing Team"
            className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-400 focus:bg-white outline-none text-lg font-semibold text-slate-700 transition-all placeholder:text-slate-300"
            required
          />
        </div>
        
        <button 
          disabled={loading} 
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/30 transition-all transform active:scale-95"
        >
          {loading ? 'Creating...' : 'Start New Game'}
        </button>
      </form>
    </main>
  );
}
