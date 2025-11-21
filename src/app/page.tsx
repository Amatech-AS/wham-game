"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Users, ArrowRight, Building2, Timer, Globe, Smartphone, Check } from 'lucide-react';

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

  // Sync State
  const [showSync, setShowSync] = useState(false);
  const [syncName, setSyncName] = useState('');
  const [syncPin, setSyncPin] = useState('');
  const [syncMsg, setSyncMsg] = useState('');

  useEffect(() => {
    // 1. Create Global User ID if missing
    let userId = localStorage.getItem('wham_global_user_id');
    if (!userId) {
      userId = crypto.randomUUID();
      localStorage.setItem('wham_global_user_id', userId);
    }

    // 2. Calculate Days Left
    const today = new Date();
    const end = new Date(today.getFullYear(), 11, 24);
    if (today.getMonth() === 11 && today.getDate() > 24) end.setFullYear(end.getFullYear() + 1);
    const diff = end.getTime() - today.getTime();
    setDaysLeft(Math.ceil(diff / (1000 * 3600 * 24)));

    // 3. Fetch Data
    const fetchData = async () => {
      const { data: groups } = await supabase
        .from('groups')
        .select('*')
        .order('name', { ascending: true }); // Sort A-Z
      
      if (groups) setActiveGroups(groups);
      
      const { data: statData } = await supabase.rpc('get_global_stats');
      if (statData) setStats(statData);
    };
    fetchData();
  }, []);

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const slug = groupName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random() * 1000);
    const { error } = await supabase.from('groups').insert([{ name: groupName, slug: slug }]);
    if (!error) router.push(`/${slug}`);
    else { alert('Error creating group'); setLoading(false); }
  };

  const handleSync = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSyncMsg('');

    // Find any player with this name and PIN
    const { data } = await supabase.from('players')
      .select('user_id')
      .eq('name', syncName)
      .eq('secret_pin', syncPin)
      .limit(1)
      .single();

    if (data && data.user_id) {
      localStorage.setItem('wham_global_user_id', data.user_id);
      setSyncMsg('Success! Device Synced.');
      setTimeout(() => {
        setShowSync(false);
        window.location.reload(); // Reload to apply new ID
      }, 1000);
    } else {
      setSyncMsg('No user found with that Name & PIN.');
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-20">
      <div className="max-w-5xl mx-auto p-6">
        
        {/* Hero Section */}
        <div className="text-center py-12 md:py-16 relative">
          {/* CHANGED: Sizing classes text-4xl (mobile) -> text-5xl (tablet) -> text-7xl (desktop) */}
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500 mb-4 tracking-tighter break-words">
            WHAMAGEDDON
          </h1>
          
          {/* Sync Button */}
          <div className="absolute top-0 right-0 md:top-4 md:right-4">
            <button onClick={() => setShowSync(!showSync)} className="flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-full hover:bg-indigo-100 transition-all">
              <Smartphone size={14} /> {showSync ? 'Close Sync' : 'Sync Device'}
            </button>
          </div>

          {/* SYNC MODAL */}
          {showSync && (
            <div className="max-w-md mx-auto mb-8 bg-white p-6 rounded-2xl shadow-lg border border-indigo-100 animate-in fade-in slide-in-from-top-4">
              <h3 className="text-lg font-bold mb-2 text-indigo-900">Sync this device</h3>
              <p className="text-sm text-slate-500 mb-4">Enter your Name and PIN from your other device to link them.</p>
              <form onSubmit={handleSync} className="flex gap-2 flex-col">
                <input placeholder="Your Name" className="p-3 border rounded-xl bg-slate-50" value={syncName} onChange={e=>setSyncName(e.target.value)} required />
                <input placeholder="4-Digit PIN" className="p-3 border rounded-xl bg-slate-50" value={syncPin} onChange={e=>setSyncPin(e.target.value)} required maxLength={4} />
                <button disabled={loading} className="bg-indigo-600 text-white p-3 rounded-xl font-bold">
                  {loading ? 'Searching...' : 'Find My Profile'}
                </button>
                {syncMsg && <p className={`text-sm font-bold ${syncMsg.includes('Success') ? 'text-green-600' : 'text-red-500'}`}>{syncMsg}</p>}
              </form>
            </div>
          )}
        </div>

        {/* MAIN CONTENT */}
        <div className="flex flex-col-reverse md:grid md:grid-cols-2 gap-12 items-start">
          
          {/* CREATE CARD (Left on Desktop, Bottom on Mobile) */}
          <div className="bg-white p-8 rounded-3xl shadow-xl shadow-indigo-100 border border-indigo-50 w-full">
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

          {/* ACTIVE GROUPS LIST (Right on Desktop, Top on Mobile) */}
          <div className="w-full">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-slate-700">
              <Users className="text-purple-500" /> Active Groups
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

        {/* STATS BAR (Bottom) */}
        <div className="mt-16 border-t border-slate-200 pt-12">
          <div className="flex flex-wrap justify-center gap-4 md:gap-8">
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

      </div>
    </main>
  );
}
