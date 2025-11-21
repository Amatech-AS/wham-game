"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Users, ArrowRight, Building2, Timer, Globe } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'example-key';
const supabase = createClient(supabaseUrl, supabaseKey);

type Group = { id: string; name: string; slug: string; created_at: string };

export default function Home() {
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeGroups, setActiveGroups] = useState<Group[]>([]);
  const [stats, setStats] = useState({ total: 0, alive: 0 });
  const [daysLeft, setDaysLeft] = useState(0);
  const router = useRouter();

  useEffect(() => {
    // 1. Create Global User ID if missing
    let userId = localStorage.getItem('wham_global_user_id');
    if (!userId) {
      userId = crypto.randomUUID();
      localStorage.setItem('wham_global_user_id', userId);
    }

    // 2. Calculate Days Left until Dec 24
    const today = new Date();
    const end = new Date(today.getFullYear(), 11, 24); // Month is 0-indexed (11 = Dec)
    if (today.getMonth() === 11 && today.getDate() > 24) end.setFullYear(end.getFullYear() + 1);
    const diff = end.getTime() - today.getTime();
    setDaysLeft(Math.ceil(diff / (1000 * 3600 * 24)));

    // 3. Fetch Data
    const fetchData = async () => {
      const { data: groups } = await supabase.from('groups').select('*').order('created_at', { ascending: false });
      if (groups) setActiveGroups(groups);

      // Call the custom SQL function for stats
      const { data: statData, error } = await supabase.rpc('get_global_stats');
      if (statData && !error) setStats(statData);
    };
    fetchData();
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
        <div className="text-center py-12 md:py-16">
          <h1 className="text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500 mb-4 tracking-tighter">
            WHAMAGEDDON
          </h1>
          
          {/* Stats Bar */}
          <div className="flex flex-wrap justify-center gap-4 md:gap-8 mt-8 mb-8">
            <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-3">
              <Timer className="text-indigo-500" />
              <div className="text-left">
                <div className="text-xs font-bold text-slate-400 uppercase">Time Remaining</div>
                <div className="text-xl font-black text-slate-700">{daysLeft} Days</div>
              </div>
            </div>
            <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-3">
              <Globe className="text-emerald-500" />
              <div className="text-left">
                <div className="text-xs font-bold text-slate-400 uppercase">Global Survivors</div>
                <div className="text-xl font-black text-slate-700">
                  <span className="text-emerald-600">{stats.alive}</span> <span className="text-slate-300">/</span> {stats.total}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-start">
          
          {/* CREATE CARD */}
          <div className="bg-white p-8 rounded-3xl shadow-xl shadow-indigo-100 border border-indigo-50">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Building2 className="text-indigo-500" /> Start New Group
            </h2>
            <form onSubmit={createGroup}>
              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Group Name</label>
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
