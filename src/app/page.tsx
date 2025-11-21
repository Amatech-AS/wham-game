"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Users, ArrowRight, Building2 } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'example-key';
const supabase = createClient(supabaseUrl, supabaseKey);

type Group = { id: string; name: string; slug: string; created_at: string };

export default function Home() {
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeGroups, setActiveGroups] = useState<Group[]>([]);
  const router = useRouter();

  // Fetch all active groups on load
  useEffect(() => {
    const fetchGroups = async () => {
      const { data } = await supabase.from('groups').select('*').order('created_at', { ascending: false });
      if (data) setActiveGroups(data);
    };
    fetchGroups();
  }, []);

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
    <main className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      <div className="max-w-5xl mx-auto p-6">
        
        {/* Hero Section */}
        <div className="text-center py-16">
          <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500 mb-4 tracking-tighter">
            WHAMAGEDDON
          </h1>
          <p className="text-slate-500 text-xl">
            Survival of the fittest. <span className="text-indigo-500 font-bold">Dec 1st - 24th.</span>
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-start">
          
          {/* CREATE CARD */}
          <div className="bg-white p-8 rounded-3xl shadow-xl shadow-indigo-100 border border-indigo-50">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Building2 className="text-indigo-500" /> Start New Group
            </h2>
            <form onSubmit={createGroup}>
              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Group Name (Company/Dept)</label>
                <input 
                  type="text" 
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. The Accounting Team"
                  className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-400 outline-none font-semibold transition-all"
                  required
                />
              </div>
              <button disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-200">
                {loading ? 'Creating...' : 'Create & Start'}
              </button>
            </form>
          </div>

          {/* ACTIVE TEAMS LIST */}
          <div>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-slate-700">
              <Users className="text-purple-500" /> Active Teams
            </h2>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {activeGroups.map(group => (
                <div 
                  key={group.id} 
                  onClick={() => router.push(`/${group.slug}`)}
                  className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-purple-400 hover:shadow-md cursor-pointer transition-all flex justify-between items-center"
                >
                  <div>
                    <h3 className="font-bold text-lg text-slate-800 group-hover:text-purple-600 transition-colors">{group.name}</h3>
                    <p className="text-xs text-slate-400">Joined {new Date(group.created_at).toLocaleDateString()}</p>
                  </div>
                  <ArrowRight className="text-slate-300 group-hover:text-purple-500 transition-transform group-hover:translate-x-1" />
                </div>
              ))}
              {activeGroups.length === 0 && <p className="text-slate-400 italic">No active groups yet.</p>}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
