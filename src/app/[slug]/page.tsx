"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import { createClient } from '@supabase/supabase-js';
import QRCode from 'react-qr-code';
import { User, Building, Skull, Trophy, Settings, ArrowLeft, Image as ImageIcon, QrCode, Lock, Trash2, HeartPulse, Award, AlertTriangle, X } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'example-key';
const supabase = createClient(supabaseUrl, supabaseKey);

type Player = { id: string; user_id?: string; name: string; company?: string; avatar_url?: string; secret_pin?: string; status: 'alive' | 'whammed'; whammed_at: string; death_reason?: string };

export default function GroupPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug;
  
  const [groupName, setGroupName] = useState('');
  const [groupPassword, setGroupPassword] = useState<string | null>(null);
  const [groupCreatorId, setGroupCreatorId] = useState<string | null>(null);
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [globalUserId, setGlobalUserId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({ name: '', company: '', avatar_url: '', pin: '', passwordAttempt: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);

  // NYE STATES FOR DØDS-MODAL
  const [showDeathModal, setShowDeathModal] = useState(false);
  const [deathReason, setDeathReason] = useState('');
  const [isDying, setIsDying] = useState(false);

  useEffect(() => {
    let uid = localStorage.getItem('wham_global_user_id');
    if (!uid) { uid = crypto.randomUUID(); localStorage.setItem('wham_global_user_id', uid || ''); }
    setGlobalUserId(uid);

    const today = new Date();
    if (today.getMonth() === 11 && today.getDate() > 24) setGameFinished(true);
  }, []);

  const fetchGroupData = async () => {
    const { data: group } = await supabase.from('groups').select('name, password, creator_id').eq('slug', slug).single();
    if (group) {
        setGroupName(group.name);
        setGroupPassword(group.password);
        setGroupCreatorId(group.creator_id);
    }
    
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
      if (me) setFormData({ ...formData, name: me.name, company: me.company || '', avatar_url: me.avatar_url || '', pin: me.secret_pin || '' });
    }
  }, [myPlayerId, players, isEditing]);

  const handleJoinOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.pin) { alert("Navn og PIN er påkrevd!"); return; }
    
    if (!myPlayerId && groupPassword && groupPassword !== formData.passwordAttempt) {
        alert("Feil Gruppepassord!");
        return;
    }

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

  // 1. Åpne modalen i stedet for prompt
  const openDeathModal = () => {
    setDeathReason('');
    setShowDeathModal(true);
  };

  // 2. Bekreft død (kjøres når man trykker bekreft i modalen)
  const confirmDeath = async () => {
    if (!deathReason) {
        alert("Du må nesten fortelle oss hvordan det skjedde...");
        return;
    }
    setIsDying(true);
    const uid = localStorage.getItem('wham_global_user_id');
    
    // Oppdater i databasen
    await supabase.from('players')
      .update({ status: 'whammed', whammed_at: new Date(), death_reason: deathReason })
      .eq('user_id', uid);
      
    setIsDying(false);
    setShowDeathModal(false);
  };

  const isAdmin = globalUserId && groupCreatorId && globalUserId === groupCreatorId;

  const adminRevive = async (playerId: string) => {
      if(!confirm("Er du sikker på at du vil gjenopplive denne spilleren?")) return;
      await supabase.from('players').update({ status: 'alive', whammed_at: null, death_reason: null }).eq('id', playerId);
  };

  const adminDelete = async (playerId: string) => {
      if(!confirm("Er du sikker på at du vil slette denne spilleren helt?")) return;
      await supabase.from('players').delete().eq('id', playerId);
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
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                {groupName || 'Laster...'}
                {groupPassword && <Lock size={24} className="text-slate-300" />}
            </h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowQR(true)} className="bg-white p-3 rounded-full text-slate-600 shadow-sm hover:shadow-md transition-all"><QrCode size={20} /></button>
            <button onClick={() => {navigator.clipboard.writeText(window.location.href); alert('Link kopiert!');}} className="bg-white px-4 py-2 rounded-full text-sm font-bold shadow-sm hover:shadow-md transition-all text-emerald-600">Del Link 🔗</button>
          </div>
        </div>

        {/* --- MODALS --- */}

        {/* QR MODAL */}
        {showQR && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200" onClick={() => setShowQR(false)}>
                <div className="bg-white p-8 rounded-3xl max-w-sm w-full text-center relative" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setShowQR(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X /></button>
                    <h3 className="text-2xl font-bold mb-6">Scan for å bli med</h3>
                    <div className="bg-white p-4 inline-block rounded-xl border-4 border-emerald-500">
                        <QRCode value={window.location.href} size={200} />
                    </div>
                    <p className="mt-6 text-slate-500">Print denne ut og heng den i resepsjonen!</p>
                </div>
            </div>
        )}

        {/* DEATH MODAL (Den nye kule popupen) */}
        {showDeathModal && (
            <div className="fixed inset-0 bg-red-900/90 flex items-center justify-center z-50 p-4 animate-in zoom-in-95 duration-300">
                <div className="bg-slate-900 border-4 border-red-500 p-8 rounded-3xl max-w-md w-full text-center shadow-2xl relative overflow-hidden">
                    {/* Bakgrunns-effekt */}
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none"></div>
                    
                    <div className="relative z-10">
                        <div className="bg-red-500 text-slate-900 inline-block p-4 rounded-full mb-6 shadow-[0_0_30px_rgba(239,68,68,0.6)]">
                            <Skull size={48} />
                        </div>
                        
                        <h2 className="text-4xl font-black text-white mb-2 tracking-tighter uppercase glitch-text">GAME OVER</h2>
                        <p className="text-red-200 font-bold mb-6 text-lg">Du har blitt Whammet!</p>
                        
                        <div className="text-left bg-slate-800 p-4 rounded-xl border border-slate-700 mb-6">
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Hvordan skjedde det?</label>
                            <input 
                                autoFocus
                                className="w-full bg-slate-900 border border-slate-600 text-white p-3 rounded-lg focus:border-red-500 outline-none placeholder:text
