"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Users, ArrowRight, Building2, Timer, Globe, Smartphone, Info, AlertTriangle } from 'lucide-react';

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
    let userId = localStorage.getItem('wham_global_user_id');
    if (!userId) {
      userId = crypto.randomUUID();
      localStorage.setItem('wham_global_user_id', userId);
    }

    const today = new Date();
    const end = new Date(today.getFullYear(), 11, 24);
    if (today.getMonth() === 11 && today.getDate() > 24) end.setFullYear(end.getFullYear() + 1);
    const diff = end.getTime() - today.getTime();
    setDaysLeft(Math.ceil(diff / (1000 * 3600 * 24)));

    const fetchData = async () => {
      const { data: groups } = await supabase
        .from('groups')
        .select('*')
        .order('name', { ascending: true });
      
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
    else { alert('Feil ved opprettelse av gruppe'); setLoading(false); }
  };

  const handleSync = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSyncMsg('');

    const { data } = await supabase.from('players')
      .select('user_id')
      .eq('name', syncName)
      .eq('secret_pin', syncPin)
      .limit(1)
      .single();

    if (data && data.user_id) {
      localStorage.setItem('wham_global_user_id', data.user_id);
      setSyncMsg('Suksess! Enhet synkronisert.');
      setTimeout(() => {
        setShowSync(false);
        window.location.reload();
      }, 1000);
    } else {
      setSyncMsg('Fant ingen bruker med det navnet og PIN-koden.');
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-20">
      <div className="max-w-5xl mx-auto p-6">
        
        {/* Hero Section */}
        <div className="text-center py-12 md:py-16 relative">
          
          {/* 
             80s STYLE LOGO 
             - Skråstilt (italic / -rotate-2)
             - Neon farger (Pink / Cyan)
             - Drop Shadow for dybde
          */}
          <h1 className="text-5xl sm:text-6xl md:text-8xl font-black italic tracking-tighter -rotate-2 transform text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 drop-shadow-[4px_4px_0px_rgba(0,0,0,0.15)] mb-6 break-words p-2">
            WHAMAGEDDON
          </h1>
          
          {/* Sync Button med Tooltip */}
          <div className="absolute top-0 right-0 md:top-4 md:right-4 group relative">
            <button onClick={() => setShowSync(!showSync)} className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-white px-4 py-2 rounded-full hover:bg-slate-100 transition-all border border-slate-200 shadow-sm z-20 relative">
              <Smartphone size={14} className="text-purple-500" /> {showSync ? 'Lukk' : 'Synkroniser'}
            </button>
            
            {/* Tooltip boks */}
            {!showSync && (
              <div className="absolute right-0 top-10 w-48 bg-slate-800 text-white text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 shadow-xl">
                Har du byttet mobil eller PC? Bruk denne for å hente tilbake profilen din.
              </div>
            )}
          </div>

          {/* SYNC MODAL */}
          {showSync && (
            <div className="max-w-md mx-auto mb-8 bg-white p-6 rounded-2xl shadow-lg border border-purple-100 animate-in fade-in slide-in-from-top-4 relative z-30">
              <h3 className="text-lg font-bold mb-2 text-slate-800">Synkroniser denne enheten</h3>
              <p className="text-sm text-slate-500 mb-4">Skriv inn Navn og PIN-kode fra din gamle enhet.</p>
              <form onSubmit={handleSync} className="flex gap-2 flex-col">
                <input placeholder="Ditt Navn" className="p-3 border rounded-xl bg-slate-50 focus:border-purple-500 outline-none" value={syncName} onChange={e=>setSyncName(e.target.value)} required />
                <input placeholder="4-Sifret PIN" className="p-3 border rounded-xl bg-slate-50 focus:border-purple-500 outline-none" value={syncPin} onChange={e=>setSyncPin(e.target.value)} required maxLength={4} />
                <button disabled={loading} className="bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-xl font-bold transition-colors">
                  {loading ? 'Søker...' : 'Hent Min Profil'}
                </button>
                {syncMsg && <p className={`text-sm font-bold ${syncMsg.includes('Suksess') ? 'text-green-600' : 'text-red-500'}`}>{syncMsg}</p>}
              </form>
            </div>
          )}
        </div>

        {/* RULES CARD */}
        <div className="max-w-3xl mx-auto mb-12 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row gap-6 items-start">
            <div className="bg-red-50 p-3 rounded-full text-red-500 shrink-0">
                <AlertTriangle size={24} />
            </div>
            <div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Slik er reglene:</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                    Målet er å overleve helt frem til julaften <strong>uten</strong> å høre originalversjonen av <em>"Wham! - Last Christmas"</em>. 
                    Dersom du hører sangen – enten det er på radioen, i en heis, på et kjøpesenter eller en venn spiller den – da er du <strong>ute</strong>!
                    (Cover-versjoner teller ikke).
                </p>
            </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex flex-col-reverse md:grid md:grid-cols-2 gap-12 items-start">
          
          {/* CREATE CARD (Grønn/Positiv) */}
          <div className="bg-white p-8 rounded-3xl shadow-xl shadow-emerald-100 border border-emerald-50 w-full">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-emerald-800">
              <Building2 className="text-emerald-500" /> Opprett Ny Gruppe
            </h2>
            <form onSubmit={createGroup}>
              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Gruppenavn (Firma/Avdeling)</label>
                <input 
                  type="text" 
                  value={groupName} 
                  onChange={(e) => setGroupName(e.target.value)} 
                  placeholder="f.eks. Regnskap Team A" 
                  className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-emerald-400 outline-none font-semibold transition-all" 
                  required 
                />
              </div>
              <button disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-emerald-200 hover:shadow-emerald-300">
                {loading ? 'Oppretter...' : 'Start Spillet'}
              </button>
            </form>
          </div>

          {/* ACTIVE GROUPS LIST */}
          <div className="w-full">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-slate-700">
              <Users className="text-pink-500" /> Aktive Grupper
            </h2>
            
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {activeGroups.map(group => (
                <div 
                  key={group.id} 
                  onClick={() => router.push(`/${group.slug}`)} 
                  className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-pink-300 hover:shadow-md cursor-pointer transition-all flex justify-between items-center"
                >
                  <div>
                    <h3 className="font-bold text-lg text-slate-800 group-hover:text-pink-600 transition-colors">{group.name}</h3>
                    <p className="text-xs text-slate-400">Opprettet {new Date(group.created_at).toLocaleDateString()}</p>
                  </div>
                  <ArrowRight className="text-slate-300 group-hover:text-pink-500 transition-transform group-hover:translate-x-1" />
                </div>
              ))}
              {activeGroups.length === 0 && <p className="text-slate-400 italic">Ingen aktive grupper enda.</p>}
            </div>
          </div>

        </div>

        {/* STATS BAR */}
        <div className="mt-16 border-t border-slate-200 pt-12">
          <div className="flex flex-wrap justify-center gap-4 md:gap-8">
            <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-3">
              <Timer className="text-pink-500" />
              <div className="text-left">
                <div className="text-xs font-bold text-slate-400 uppercase">Tid Igjen</div>
                <div className="text-xl font-black text-slate-700">{daysLeft} Dager</div>
              </div>
            </div>
            <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-3">
              <Globe className="text-emerald-500" />
              <div className="text-left">
                <div className="text-xs font-bold text-slate-400 uppercase">Globale Overlevende</div>
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
