"use client";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import confetti from 'canvas-confetti';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

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
    }
  };

  const iGotWhammed = async () => {
    if (!confirm("Sure?")) return;
    await supabase.from('players').update({ status: 'whammed', whammed_at: new Date() }).eq('id', myPlayerId);
  };

  const survivors = players.filter(p => p.status === 'alive');
  const fallen = players.filter(p => p.status === 'whammed');
  const me = players.find(p => p.id === myPlayerId);

  return (
    <main className="min-h-screen bg-slate-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-8">{groupName}</h1>
      {!myPlayerId ? (
        <form onSubmit={joinGame} className="mb-8 flex gap-2">
          <input className="text-black p-2 rounded" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Your Name" />
          <button className="bg-blue-600 px-4 py-2 rounded">Join</button>
        </form>
      ) : (
        me?.status === 'alive' ? 
        <button onClick={iGotWhammed} className="bg-red-600 w-full py-4 rounded font-bold text-xl mb-8">I LOST!</button> :
        <div className="bg-red-900/50 p-4 rounded mb-8 text-center">You are out.</div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div><h3 className="text-green-400 font-bold">Alive ({survivors.length})</h3>{survivors.map(p => <div key={p.id}>{p.name}</div>)}</div>
        <div><h3 className="text-red-500 font-bold">Out ({fallen.length})</h3>{fallen.map(p => <div key={p.id}>💀 {p.name}</div>)}</div>
      </div>
    </main>
  );
}
