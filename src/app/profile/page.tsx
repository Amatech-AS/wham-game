"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { User, Building, Settings, ArrowLeft, Save, Image as ImageIcon } from 'lucide-react';

// HARDKODEDE NØKLER
const supabaseUrl = 'https://onjaqwdyfwlzjbutuxle.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uamFxd2R5ZndsempidXR1eGxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NTcxODcsImV4cCI6MjA3OTIzMzE4N30.CW0odQLt6Cd_50wXJq4eNQGMo5jLL03YJdApxFzPyVY';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  
  const [formData, setFormData] = useState({ name: '', company: '', avatar_url: '', pin: '' });

  useEffect(() => {
    const uid = localStorage.getItem('wham_global_user_id');
    if (!uid) {
      router.push('/');
      return;
    }

    const fetchData = async () => {
      const { data } = await supabase
        .from('players')
        .select('name, company, avatar_url, secret_pin')
        .eq('user_id', uid)
        .limit(1)
        .single();
      
      if (data) {
        setFormData({
          name: data.name || '',
          company: data.company || '',
          avatar_url: data.avatar_url || '',
          pin: data.secret_pin || ''
        });
      }
    };
    fetchData();
  }, [router]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');

    const uid = localStorage.getItem('wham_global_user_id');
    if (!uid) return;

    const { error } = await supabase.from('players').update({
      name: formData.name,
      company: formData.company,
      avatar_url: formData.avatar_url,
      secret_pin: formData.pin
    }).eq('user_id', uid);

    if (!error) {
      setMsg('Profil oppdatert ✅');
    } else {
      setMsg('Noe gikk galt ❌');
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8 font-sans">
      <div className="max-w-xl mx-auto">
        
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push('/')} className="bg-white p-2 rounded-full shadow-sm hover:shadow-md transition-all text-slate-500">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-black text-slate-900">Min Profil</h1>
        </div>

        <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-xl shadow-indigo-100/50">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                <div className="bg-indigo-100 p-3 rounded-full text-indigo-600">
                    <Settings size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Rediger Informasjon</h2>
                    <p className="text-xs text-slate-400">Endringer her gjelder for alle gruppene dine.</p>
                </div>
            </div>

            <form onSubmit={handleUpdate} className="space-y-5">
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Ditt Navn</label>
                    <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 font-semibold outline-none focus:border-indigo-400 transition-colors" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">PIN (4 Tall)</label>
                    <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 font-semibold outline-none focus:border-indigo-400 transition-colors" value={formData.pin} onChange={e => setFormData({...formData, pin: e.target.value})} maxLength={4} required />
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Firma / Avdeling</label>
                <div className="relative">
                    <Building className="absolute left-3 top-3.5 text-slate-400" size={16} />
                    <input className="w-full pl-10 bg-slate-50 border-2 border-slate-100 rounded-xl p-3 font-semibold outline-none focus:border-indigo-400 transition-colors" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} />
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-2">
                Profilbilde URL <ImageIcon size={12} />
                </label>
                <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-sm outline-none focus:border-indigo-400 transition-colors" value={formData.avatar_url} onChange={e => setFormData({...formData, avatar_url: e.target.value})} placeholder="https://..." />
                
                <div className="mt-3 flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {formData.avatar_url ? (
                        <img src={formData.avatar_url} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" onError={(e) => e.currentTarget.style.display = 'none'} />
                    ) : (
                        <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-400"><User size={20} /></div>
                    )}
                    <p className="text-[10px] text-slate-500 italic flex-1">
                        Tips: Høyreklikk på profilbildet ditt på LinkedIn/Facebook, velg "Kopier bildeadresse" og lim inn her.
                    </p>
                </div>
            </div>

            <button disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2">
                <Save size={18} /> {loading ? 'Lagrer...' : 'Lagre Endringer'}
            </button>

            {msg && <p className="text-center font-bold text-emerald-600 animate-pulse">{msg}</p>}

            </form>
        </div>
      </div>
    </main>
  );
}
