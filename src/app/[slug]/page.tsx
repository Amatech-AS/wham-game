"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import { createClient } from '@supabase/supabase-js';
import { User, Building, Skull, Trophy, Settings, ArrowLeft, Image as ImageIcon } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'example-key';
const supabase = createClient(supabaseUrl, supabaseKey);

type Player = { id: string; user_id?: string; name: string; company?: string; avatar_url?: string; secret_pin?: string; status: 'alive' | 'whammed'; whammed_at: string; };

export default function GroupPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug;
  
  const [groupName, setGroupName] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [globalUserId, setGlobalUserId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({ name: '', company: '', avatar_url: '', pin: '' });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    let uid = localStorage.getItem('wham_global_user_id');
    if (!uid) { uid = crypto.randomUUID(); localStorage.setItem('wham_global_user_id', uid || ''); }
    setGlobalUserId(uid);
  }, []);

  const fetchGroupData = async () => {
    const { data: group } = await supabase.from('groups').select('name').eq('slug', slug).single();
    if (group) setGroupName(group.name);
    
    const { data: p } = await supabase.from('players').select('*').eq('group_slug', slug).order('whammed_at', { ascending: false, nullsFirst: true });
    if (p) {
      setPlayers(p);
      const uid = localStorage.getItem('wham_global_user_id');
      const me = p.find(player => player.user_id === uid);
      if (me) setMyPlayerId(me.id);
    }
  };

  useEffect(() => {
    fetchGroupData();
    const channel = supabase.channel('realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => fetchGroupData()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [slug, globalUserId]);

  useEffect(() => {
    if (myPlayerId && players.length > 0) {
      const me = players.find(p => p.id === myPlayerId);
      if (me) setFormData({ name: me.name, company: me.company || '', avatar_url: me.avatar_url || '', pin: me.secret_pin || '' });
    }
  }, [myPlayerId, players, isEditing]);

  const handleJoinOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.pin) { alert("Navn og PIN er påkrevd!"); return; }
    const uid = localStorage.getItem('wham_global_user_id');

    if (myPlayerId) {
      await supabase.from('players').update({ name: formData.name, company: formData.company, avatar_url: formData.avatar_url, secret_pin: formData.pin }).eq('id', myPlayerId);
      setIsEditing(false);
    } else {
      const { data: existingUser } = await supabase.from('players').select('status').eq('user_id', uid).eq('status', 'whammed').limit(1);
      const initialStatus = (existingUser && existingUser.length > 0) ? 'whammed' : 'alive';
      
      const { data } = await supabase.from('players').insert([{ 
        group_slug: slug, user_id: uid, name: formData.name, company: formData.company, avatar_url: formData.avatar_url, secret_pin: formData.pin, status: initialStatus, whammed_at: (initialStatus === 'whammed' ? new Date() : null)
      }]).select().single();
      
      if (data) {
        setMyPlayerId(data.id);
        if (initialStatus === 'alive') confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#ec4899', '#10b981', '#06b6d4'] });
      }
    }
    fetchGroupData();
  };

  const iGotWhammed = async () => {
    if (!confirm("Er du sikker? Dette vil markere deg som UTE i alle gruppene dine.")) return;
    const uid = localStorage.getItem('wham_global_user_id');
    await supabase.from('players').update({ status: 'whammed', whammed_at: new Date() }).eq('user_id', uid);
  };

  const survivors = players.filter(p => p.status === 'alive');
  const fallen = players.filter(p => p.status === 'whammed');
  const me = players.find(p => p.id === myPlayerId);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-end mb-8">
          <div>
             <button onClick={() => router.push('/')} className="flex items-center gap-2 text-slate-500 hover:text-emerald-600 transition-colors font-bold text-xs uppercase tracking-wider mb-4">
              <ArrowLeft size={14} /> Tilbake
            </button>
            <h2 className="text-xs font-black italic text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-cyan-500 uppercase tracking-widest mb-1 -skew-x-6">Whamageddon</h2>
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">{groupName || 'Laster...'}</h1>
          </div>
          <button onClick={() => {navigator.clipboard.writeText(window.location.href); alert('Link kopiert!');}} className="bg-white px-4 py-2 rounded-full text-sm font-bold shadow-sm hover:shadow-md transition-all text-emerald-600">Del Link 🔗</button>
        </div>

        <div className="mb-12">
          {!myPlayerId || isEditing ? (
            <div className="bg-white border border-emerald-100 p-8 rounded-3xl shadow-xl shadow-emerald-100/50">
              <h3 className="text-2xl font-bold text-emerald-800 mb-6 flex items-center gap-2">
                {isEditing ? <Settings className="text-slate-400"/> : <User className="text-emerald-500"/>} 
                {isEditing ? 'Rediger Profil' : 'Bli med i denne gruppen'}
              </h3>
              <form onSubmit={handleJoinOrUpdate} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Ditt Navn</label>
                    <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 font-semibold outline-none focus:border-emerald-400" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="f.eks. Ola Nordmann" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Hemmelig PIN (4 Tall)</label>
                    <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 font-semibold outline-none focus:border-emerald-400" value={formData.pin} onChange={e => setFormData({...formData, pin: e.target.value})} placeholder="1234" maxLength={4} required />
                    <p className="text-[10px] text-slate-500 mt-1 bg-slate-100 p-2 rounded">
                      <strong>Hvorfor PIN?</strong> Siden vi ikke bruker passord, trenger du denne koden hvis du vil logge inn på mobilen din senere.
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Firma / Avdeling</label>
                  <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 font-semibold outline-none focus:border-emerald-400" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} placeholder="f.eks. Salg" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-2">
                    Profilbilde URL (Valgfritt) <ImageIcon size={12} />
                  </label>
                  <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-sm outline-none focus:border-emerald-400" value={formData.avatar_url} onChange={e => setFormData({...formData, avatar_url: e.target.value})} placeholder="https://..." />
                  <p className="text-[10px] text-slate-400 mt-1 italic">
                    Tips: Høyreklikk på profilbildet ditt på LinkedIn eller Facebook og velg "Kopier bildeadresse" (Copy Image Address). Lim inn her.
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-200 transition-all">
                    {isEditing ? 'Lagre Endringer' : 'Bli Med'}
                  </button>
                  {isEditing && <button type="button" onClick={() => setIsEditing(false)} className="px-6 py-3 bg-slate-100 rounded-xl font-bold text-slate-500">Avbryt</button>}
                </div>
              </form>
            </div>
          ) : (
            <div className={`relative overflow-hidden rounded-3xl p-8 text-center border-2 ${me?.status === 'alive' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-200'}`}>
              <button onClick={() => setIsEditing(true)} className="absolute top-4 right-4 p-2 bg-white/50 hover:bg-white rounded-full transition-all"><Settings size={18} className="text-slate-500" /></button>
              {me?.status === 'alive' ? (
                <>
                  <div className="inline-block p-3 bg-emerald-100 rounded-full text-emerald-600 mb-4"><Trophy size={32} /></div>
                  <h3 className="text-3xl font-black text-emerald-800 mb-1">Du er Trygg (enn så lenge)</h3>
                  <p className="text-emerald-600 mb-6 font-medium">Hold deg unna radioen!</p>
                  <button onClick={iGotWhammed} className="bg-white text-red-600 hover:bg-red-50 border-2 border-red-200 px-8 py-3 rounded-xl font-bold transition-all shadow-sm hover:shadow-md">JEG HØRTE DEN! 😭</button>
                </>
              ) : (
                <>
                  <div className="inline-block p-3 bg-red-200 rounded-full text-red-600 mb-4"><Skull size={32} /></div>
                  <h3 className="text-3xl font-black text-red-700 mb-1">Du er Ute!</h3>
                  <p className="text-red-500">Du røk ut den {new Date(me?.whammed_at || '').toLocaleDateString()}</p>
                  <p className="text-xs text-red-400 mt-2 font-bold uppercase tracking-wide">Dette gjelder alle dine grupper</p>
                </>
              )}
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-emerald-600 font-bold uppercase tracking-wider text-xs mb-6 flex justify-between">
              <span>Overlevende</span> <span className="bg-emerald-100 px-2 py-0.5 rounded-full">{survivors.length}</span>
            </h3>
            <div className="space-y-4">
              {survivors.map(p => (
                <div key={p.id} className="flex items-center gap-4">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} className="w-10 h-10 rounded-full object-cover border-2 border-emerald-200" onError={(e) => {e.currentTarget.style.display='none'}} />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">{p.name.charAt(0)}</div>
                  )}
                  <div><div className="font-bold text-slate-700">{p.name}</div>{p.company && <div className="text-xs text-slate-400 flex items-center gap-1"><Building size={10}/> {p.company}</div>}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
            <h3 className="text-red-500 font-bold uppercase tracking-wider text-xs mb-6 flex justify-between">
              <span>Whamhalla (Ute)</span> <span className="bg-red-100 px-2 py-0.5 rounded-full">{fallen.length}</span>
            </h3>
            <div className="space-y-4 opacity-70 grayscale">
              {fallen.map(p => (
                <div key={p.id} className="flex items-center gap-4">
                   {p.avatar_url ? (
                    <img src={p.avatar_url} className="w-10 h-10 rounded-full object-cover border-2 border-slate-300" onError={(e) => {e.currentTarget.style.display='none'}} />
                   ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold">💀</div>
                   )}
                  <div><div className="font-bold text-slate-600 line-through">{p.name}</div><div className="text-xs text-slate-400">{new Date(p.whammed_at).toLocaleDateString()}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
