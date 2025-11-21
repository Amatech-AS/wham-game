"use client";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import confetti from 'canvas-confetti';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'example-key';
const supabase = createClient(supabaseUrl, supabaseKey);

type Player = { id: string; name: string; status: 'alive' | 'whammed'; whammed_at: string; };

export default function GroupPage() {
  const params = useParams();
  const slug = params.slug;
  const [groupName, setGroupName] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    const storedId = localStorage.getItem(`wham_player_${slug}`);
    if (storedId) setMyPlayerId(storedId);

    const fetchGroupData = async () => {
      const { data: group } = await supabase.from('groups').select('name').eq('slug', slug).single();
      if (group) setGroupName(group.name);
      const { data: p } = await supabase.from('players').select('*').eq('group_slug', slug).order('whammed_at', { ascending: false, nullsFirst: true });
      if (p) setPlayers(p);
    };
    fetchGroupData();
    const channel = supabase.channel('realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => fetchGroupData()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [slug]);

  const joinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;
    const { data } = await supabase.from('players').insert([{ group_slug: slug, name: newName }]).select().single();
    if (data) {
      localStorage.setItem(`wham_player_${slug}`, data.id);
      setMyPlayerId(data.id);
      setNewName('');
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
  };

  const iGotWhammed = async () => {
    if (!confirm("Are you sure? Once you admit defeat, there is no going back.")) return;
    await supabase.from('players').update({ status: 'whammed', whammed_at: new Date() }).eq('id', myPlayerId);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Link copied to clipboard!');
  };

  const survivors = players.filter(p => p.status === 'alive');
  const fallen = players.filter(p => p.status === 'whammed');
  const me = players.find(p => p.id === myPlayerId);

  return (
    <main className="min-h-screen bg-white text-slate-800 p-4 md:p-8 font-sans">
      <div className="max-w-3xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-10 gap-4">
          <div>
            <h2 className="text-xs text-blue-500 font-bold tracking-widest uppercase mb-1">Whamageddon Group</h2>
            <h1 className="text-4xl font-black text-slate-900">{groupName || 'Loading...'}</h1>
          </div>
          <button onClick={copyLink} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-full text-sm font-bold transition-colors">
            Copy Invite Link 🔗
          </button>
        </div>

        {/* MY STATUS CARD */}
        {!myPlayerId ? (
          // Join Form
          <div className="bg-blue-50 border-2 border-blue-100 p-8 rounded-3xl mb-10 text-center shadow-sm">
            <h3 className="text-2xl font-bold text-blue-900 mb-2">Join the Challenge</h3>
            <p className="text-blue-600/70 mb-6">Enter your name to join the leaderboard.</p>
            <form onSubmit={joinGame} className="flex flex-col md:flex-row gap-3 max-w-md mx-auto">
              <input 
                className="flex-1 bg-white border-2 border-blue-200 rounded-xl p-4 focus:border-blue-500 outline-none text-lg font-medium text-slate-700"
                placeholder="Your Name"
                value={newName}
                onChange={e => setNewName(e.target.value)}
              />
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all">
                Join Game
              </button>
            </form>
          </div>
        ) : (
          // Active Player View
          me?.status === 'alive' ? (
            <div className="bg-emerald-50 border-2 border-emerald-100 p-8 rounded-3xl mb-10 text-center shadow-sm relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-3xl font-black text-emerald-800 mb-2">You are Safe 🎄</h3>
                <p className="text-emerald-600 mb-8 font-medium">Stay vigilant. Avoid "Last Christmas".</p>
                <button 
                  onClick={iGotWhammed}
                  className="bg-white border-2 border-rose-200 text-rose-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 text-lg font-bold py-4 px-8 rounded-2xl transition-all w-full md:w-auto"
                >
                  I heard it! (Report Defeat) 😭
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-100 border-2 border-slate-200 p-8 rounded-3xl mb-10 text-center">
              <h3 className="text-2xl font-bold text-slate-500 mb-2">You are Out</h3>
              <p className="text-slate-400">Whammed on {new Date(me?.whammed_at || '').toLocaleDateString()}</p>
            </div>
          )
        )}

        {/* LEADERBOARD */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Survivors */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xl shadow-slate-200/50">
            <h3 className="text-emerald-500 font-black uppercase tracking-wider text-sm mb-6 flex justify-between items-center">
              <span>Survivors</span>
              <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs">{survivors.length}</span>
            </h3>
            <ul className="space-y-3">
              {survivors.map(p => (
                <li key={p.id} className="flex items-center gap-3 font-bold text-slate-700">
                  <span className="w-3 h-3 bg-emerald-400 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.5)]"></span>
                  {p.name}
                </li>
              ))}
              {survivors.length === 0 && <li className="text-slate-400 italic text-sm">No survivors left...</li>}
            </ul>
          </div>

          {/* Fallen */}
          <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6">
            <h3 className="text-rose-400 font-black uppercase tracking-wider text-sm mb-6 flex justify-between items-center">
              <span>The Fallen</span>
              <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-xs">{fallen.length}</span>
            </h3>
            <ul className="space-y-3">
              {fallen.map(p => (
                <li key={p.id} className="flex items-center justify-between text-slate-400 text-sm">
                  <span className="flex items-center gap-2 line-through decoration-rose-300 decoration-2">
                    <span>💀</span> {p.name}
                  </span>
                  <span className="text-xs opacity-60 bg-slate-200 px-2 py-1 rounded">{new Date(p.whammed_at).getDate()}/{new Date(p.whammed_at).getMonth() + 1}</span>
                </li>
              ))}
              {fallen.length === 0 && <li className="text-slate-400 italic text-sm">Everyone is still standing.</li>}
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
