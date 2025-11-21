"use client";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import confetti from 'canvas-confetti';
import { createClient } from '@supabase/supabase-js';
import { User, Building, Skull, Trophy, Settings, Save } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'example-key';
const supabase = createClient(supabaseUrl, supabaseKey);

type Player = { 
  id: string; 
  name: string; 
  company?: string;
  avatar_url?: string;
  status: 'alive' | 'whammed'; 
  whammed_at: string; 
};

export default function GroupPage() {
  const params = useParams();
  const slug = params.slug;
  const [groupName, setGroupName] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  
  // Join / Edit Form State
  const [formData, setFormData] = useState({ name: '', company: '', avatar_url: '' });
  const [isEditing, setIsEditing] = useState(false);

  // Load Data
  const fetchGroupData = async () => {
    const { data: group } = await supabase.from('groups').select('name').eq('slug', slug).single();
    if (group) setGroupName(group.name);
    const { data: p } = await supabase.from('players').select('*').eq('group_slug', slug).order('whammed_at', { ascending: false, nullsFirst: true });
    if (p) setPlayers(p);
  };

  useEffect(() => {
    const storedId = localStorage.getItem(`wham_player_${slug}`);
    if (storedId) setMyPlayerId(storedId);
    fetchGroupData();

    const channel = supabase.channel('realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => fetchGroupData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [slug]);

  // Pre-fill form if editing
  useEffect(() => {
    if (myPlayerId && players.length > 0) {
      const me = players.find(p => p.id === myPlayerId);
      if (me) setFormData({ name: me.name, company: me.company || '', avatar_url: me.avatar_url || '' });
    }
  }, [myPlayerId, players, isEditing]);

  const handleJoinOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    if (myPlayerId) {
      // Update existing profile
      await supabase.from('players').update({ 
        name: formData.name, 
        company: formData.company, 
        avatar_url: formData.avatar_url 
      }).eq('id', myPlayerId);
      setIsEditing(false);
    } else {
      // Join new
      const { data } = await supabase.from('players').insert([{ 
        group_slug: slug, 
        name: formData.name, 
        company: formData.company,
        avatar_url: formData.avatar_url 
      }]).select().single();
      
      if (data) {
        localStorage.setItem(`wham_player_${slug}`, data.id);
        setMyPlayerId(data.id);
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
    }
    fetchGroupData();
  };

  const iGotWhammed = async () => {
    if (!confirm("Are you sure? There is no going back.")) return;
    await supabase.from('players').update({ status: 'whammed', whammed_at: new Date() }).eq('id', myPlayerId);
  };

  const survivors = players.filter(p => p.status === 'alive');
  const fallen = players.filter(p => p.status === 'whammed');
  const me = players.find(p => p.id === myPlayerId);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-xs font-bold text-indigo-500 uppercase tracking-widest">Whamageddon</h2>
            <h1 className="text-3xl md:text-5xl font-black text-slate-900">{groupName || 'Loading...'}</h1>
          </div>
          <button onClick={() => {navigator.clipboard.writeText(window.location.href); alert('Copied!');}} className="bg-white px-4 py-2 rounded-full text-sm font-bold shadow-sm hover:shadow-md transition-all">
            Share Link 🔗
          </button>
        </div>

        {/* ACTION AREA */}
        <div className="mb-12">
          {!myPlayerId || isEditing ? (
            <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-xl shadow-indigo-100/50">
              <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                {isEditing ? <Settings className="text-slate-400"/> : <User className="text-indigo-500"/>} 
                {isEditing ? 'Edit Profile' : 'Join the Game'}
              </h3>
              
              <form onSubmit={handleJoinOrUpdate} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Your Name</label>
                    <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 font-semibold outline-none focus:border-indigo-400" 
                      value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. John Doe" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Company / Dept</label>
                    <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 font-semibold outline-none focus:border-indigo-400" 
                      value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} placeholder="e.g. Sales" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Profile Picture URL (Optional)</label>
                  <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-sm outline-none focus:border-indigo-400" 
                    value={formData.avatar_url} onChange={e => setFormData({...formData, avatar_url: e.target.value})} placeholder="https://..." />
                  <p className="text-xs text-slate-400 mt-1">Tip: Right-click your LinkedIn photo and 'Copy Image Address'</p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all">
                    {isEditing ? 'Save Changes' : 'Join Game'}
                  </button>
                  {isEditing && <button type="button" onClick={() => setIsEditing(false)} className="px-6 py-3 bg-slate-100 rounded-xl font-bold text-slate-500">Cancel</button>}
                </div>
              </form>
            </div>
          ) : (
            // STATUS CARD
            <div className={`relative overflow-hidden rounded-3xl p-8 text-center border-2 ${me?.status === 'alive' ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-100 border-slate-200'}`}>
              
              <button onClick={() => setIsEditing(true)} className="absolute top-4 right-4 p-2 bg-white/50 hover:bg-white rounded-full transition-all">
                <Settings size={18} className="text-slate-500" />
              </button>

              {me?.status === 'alive' ? (
                <>
                  <div className="inline-block p-3 bg-emerald-100 rounded-full text-emerald-600 mb-4"><Trophy size={32} /></div>
                  <h3 className="text-3xl font-black text-emerald-800 mb-1">You are Safe</h3>
                  <p className="text-emerald-600 mb-6 font-medium">Don't let your guard down.</p>
                  <button onClick={iGotWhammed} className="bg-white text-rose-500 hover:bg-rose-50 border-2 border-rose-200 px-8 py-3 rounded-xl font-bold transition-all">
                    I Heard It! (Report Defeat)
                  </button>
                </>
              ) : (
                <>
                  <div className="inline-block p-3 bg-slate-200 rounded-full text-slate-500 mb-4"><Skull size={32} /></div>
                  <h3 className="text-3xl font-black text-slate-600 mb-1">You are Out</h3>
                  <p className="text-slate-400">Fallen on {new Date(me?.whammed_at || '').toLocaleDateString()}</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* ROSTER */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Alive Column */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-emerald-500 font-bold uppercase tracking-wider text-xs mb-6 flex justify-between">
              <span>Survivors</span> <span className="bg-emerald-100 px-2 py-0.5 rounded-full">{survivors.length}</span>
            </h3>
            <div className="space-y-4">
              {survivors.map(p => (
                <div key={p.id} className="flex items-center gap-4">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} className="w-10 h-10 rounded-full object-cover border-2 border-emerald-200" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">{p.name.charAt(0)}</div>
                  )}
                  <div>
                    <div className="font-bold text-slate-700">{p.name}</div>
                    {p.company && <div className="text-xs text-slate-400 flex items-center gap-1"><Building size={10}/> {p.company}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dead Column */}
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
            <h3 className="text-rose-400 font-bold uppercase tracking-wider text-xs mb-6 flex justify-between">
              <span>Whamhalla</span> <span className="bg-rose-100 px-2 py-0.5 rounded-full">{fallen.length}</span>
            </h3>
            <div className="space-y-4 opacity-70 grayscale">
              {fallen.map(p => (
                <div key={p.id} className="flex items-center gap-4">
                   {p.avatar_url ? (
                    <img src={p.avatar_url} className="w-10 h-10 rounded-full object-cover border-2 border-slate-300" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold">💀</div>
                  )}
                  <div>
                    <div className="font-bold text-slate-600 line-through">{p.name}</div>
                    <div className="text-xs text-slate-400">{new Date(p.whammed_at).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
