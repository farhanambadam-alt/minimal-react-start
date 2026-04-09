import { useState } from 'react';
import { Volume2, ChevronRight, Bell, Clock, DollarSign, CreditCard, Shield, HelpCircle, Instagram, Youtube, Plus, Trash2, GripVertical } from 'lucide-react';

interface SocialItem {
  id: string;
  type: 'instagram' | 'youtube';
  url: string;
  addedDate: string;
}

const initialSocial: SocialItem[] = [
  { id: 'sm1', type: 'instagram', url: 'https://www.instagram.com/p/example1', addedDate: '2025-03-01' },
  { id: 'sm2', type: 'instagram', url: 'https://www.instagram.com/p/example2', addedDate: '2025-03-05' },
  { id: 'sm3', type: 'youtube', url: 'https://www.youtube.com/shorts/example1', addedDate: '2025-03-10' },
  { id: 'sm4', type: 'youtube', url: 'https://www.youtube.com/shorts/example2', addedDate: '2025-03-15' },
];

const OwnerMenu = () => {
  const [testPlayed, setTestPlayed] = useState(false);
  const [socialMedia, setSocialMedia] = useState<SocialItem[]>(initialSocial);
  const [newInstaUrl, setNewInstaUrl] = useState('');
  const [newYtUrl, setNewYtUrl] = useState('');

  const playSignature = () => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain).connect(ctx.destination);
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15);
    osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
    setTestPlayed(true);
  };

  const addSocial = (type: 'instagram' | 'youtube') => {
    const url = type === 'instagram' ? newInstaUrl : newYtUrl;
    if (!url.trim()) return;
    setSocialMedia(prev => [...prev, { id: `sm${Date.now()}`, type, url: url.trim(), addedDate: new Date().toISOString().split('T')[0] }]);
    if (type === 'instagram') setNewInstaUrl('');
    else setNewYtUrl('');
  };

  const removeSocial = (id: string) => setSocialMedia(prev => prev.filter(s => s.id !== id));

  const instaPosts = socialMedia.filter(s => s.type === 'instagram');
  const ytVideos = socialMedia.filter(s => s.type === 'youtube');

  const menuItems = [
    { label: 'Notifications', desc: 'Push, sound & alert preferences', icon: Bell, color: 'text-amber-500' },
    { label: 'Business Hours', desc: 'Set operating hours for each day', icon: Clock, color: 'text-emerald-500' },
    { label: 'Pricing & Packages', desc: 'Manage combo deals & pricing', icon: DollarSign, color: 'text-blue-500' },
    { label: 'Payment Settings', desc: 'UPI, card & cash preferences', icon: CreditCard, color: 'text-purple-500' },
    { label: 'Privacy & Security', desc: 'PIN, data & access controls', icon: Shield, color: 'text-rose-500' },
    { label: 'Help & Support', desc: 'FAQs, contact & feedback', icon: HelpCircle, color: 'text-teal-500' },
  ];

  return (
    <div className="flex flex-col gap-5 p-4 pb-safe">
      <h1 className="text-xl font-heading font-bold text-foreground">Settings</h1>

      {/* Audio Signature */}
      <div className="bg-card rounded-2xl p-4 card-shadow">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm font-semibold text-foreground">Audio Signature</p>
            <p className="text-xs text-muted-foreground">Plays on check-in events</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center">
            <Volume2 className="w-4 h-4 text-emerald-500" />
          </div>
        </div>
        <button onClick={playSignature} className="w-full btn-themed py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1">
          <Volume2 className="w-3 h-3" /> Test Audio Signature
        </button>
        {testPlayed && <p className="text-[10px] text-emerald-500 mt-1 text-center">✓ Audio played successfully</p>}
      </div>

      {/* Social Media Gallery */}
      <div className="bg-card rounded-2xl p-4 card-shadow">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Instagram className="w-4 h-4 text-pink-500" />
              <p className="text-sm font-semibold text-foreground">Instagram Posts ({instaPosts.length})</p>
            </div>
          </div>
          <div className="flex gap-2 mb-2">
            <input value={newInstaUrl} onChange={e => setNewInstaUrl(e.target.value)} placeholder="Paste Instagram URL..." className="flex-1 bg-secondary rounded-lg px-3 py-2 text-xs text-foreground outline-none" />
            <button onClick={() => addSocial('instagram')} className="bg-gradient-to-r from-pink-500 to-rose-400 text-white px-3 py-2 rounded-lg text-xs font-bold">Add</button>
          </div>
          {instaPosts.map(post => (
            <div key={post.id} className="flex items-center gap-2 py-2 border-b border-border last:border-0">
              <GripVertical className="w-3 h-3 text-muted-foreground shrink-0" />
              <Instagram className="w-3.5 h-3.5 text-pink-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground truncate">{post.url}</p>
                <p className="text-[10px] text-muted-foreground">Added {post.addedDate}</p>
              </div>
              <button onClick={() => removeSocial(post.id)} className="p-1 text-destructive shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Youtube className="w-4 h-4 text-red-500" />
              <p className="text-sm font-semibold text-foreground">YouTube Videos ({ytVideos.length})</p>
            </div>
          </div>
          {ytVideos.map(video => (
            <div key={video.id} className="flex items-center gap-2 py-2 border-b border-border last:border-0">
              <GripVertical className="w-3 h-3 text-muted-foreground shrink-0" />
              <Youtube className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground truncate">{video.url}</p>
                <p className="text-[10px] text-muted-foreground">Added {video.addedDate}</p>
              </div>
              <button onClick={() => removeSocial(video.id)} className="p-1 text-destructive shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Menu items */}
      <div className="flex flex-col gap-1">
        {menuItems.map(item => (
          <button key={item.label} className="flex items-center gap-3 bg-card rounded-xl p-4 card-shadow">
            <item.icon className={`w-5 h-5 ${item.color} shrink-0`} />
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default OwnerMenu;
