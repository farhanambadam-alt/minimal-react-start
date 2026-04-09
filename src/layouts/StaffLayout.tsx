import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePartner } from '@/contexts/PartnerContext';
import StaffFloor from '@/pages/partner/StaffFloor';
import StaffProfile from '@/pages/partner/StaffProfile';
import { CalendarDays, User, Crown, Lock } from 'lucide-react';
import { OWNER_PIN } from '@/data/partnerMockData';

const STAFF_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-pink-500', 'bg-teal-500',
];

const StaffLayout = () => {
  const { staff, activeStaffId, setActiveStaff } = usePartner();
  const navigate = useNavigate();
  const [view, setView] = useState<'schedule' | 'profile'>('schedule');
  const [pinModal, setPinModal] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);

  // Auto-select first staff if none selected
  if (!activeStaffId && staff.length > 0) {
    setActiveStaff(staff[0].id);
  }

  const handleOwnerAccess = useCallback(() => {
    setPinModal(true);
    setPin('');
    setPinError(false);
  }, []);

  const handlePinSubmit = () => {
    if (pin === OWNER_PIN) {
      setPinModal(false);
      navigate('/owner');
    } else {
      setPinError(true);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* ── Header: Staff Switcher ── */}
      <div className="bg-card border-b border-border px-3 pt-[max(var(--inset-top,0px),8px)] pb-2">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {staff.map((s, idx) => {
            const isActive = s.id === activeStaffId;
            const colorClass = STAFF_COLORS[idx % STAFF_COLORS.length];
            return (
              <button
                key={s.id}
                onClick={() => setActiveStaff(s.id)}
                className={`flex flex-col items-center gap-1 min-w-[56px] transition-all ${
                  isActive ? 'scale-105' : 'opacity-60'
                }`}
              >
                <div className="relative">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white ${colorClass} ${
                      isActive ? 'ring-2 ring-primary ring-offset-2 ring-offset-card' : ''
                    }`}
                  >
                    {s.initials}
                  </div>
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${
                      s.status === 'free' ? 'bg-emerald-500' : 'bg-destructive'
                    }`}
                  />
                </div>
                <span className={`text-[10px] font-medium truncate max-w-[56px] ${
                  isActive ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {s.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-hidden">
        {view === 'schedule' ? <StaffFloor /> : <StaffProfile />}
      </div>

      {/* ── Floating Owner Button ── */}
      <button
        onClick={handleOwnerAccess}
        className="fixed bottom-20 right-4 z-40 w-12 h-12 rounded-full bg-amber-500 text-white shadow-lg shadow-amber-500/30 flex items-center justify-center active:scale-90 transition-transform"
        aria-label="Owner Dashboard"
      >
        <Crown className="w-5 h-5" />
      </button>

      {/* ── Bottom Nav ── */}
      <nav className="flex items-center justify-around bg-card/95 backdrop-blur-md border-t border-border px-4 pb-[max(var(--inset-bottom),8px)] pt-2">
        <button
          onClick={() => setView('schedule')}
          className={`flex flex-col items-center gap-0.5 px-6 py-1.5 rounded-xl transition-colors ${
            view === 'schedule' ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <CalendarDays className={`w-5 h-5 ${view === 'schedule' ? 'stroke-[2.2]' : ''}`} />
          <span className="text-[10px] font-medium">Schedule</span>
        </button>
        <button
          onClick={() => setView('profile')}
          className={`flex flex-col items-center gap-0.5 px-6 py-1.5 rounded-xl transition-colors ${
            view === 'profile' ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <User className={`w-5 h-5 ${view === 'profile' ? 'stroke-[2.2]' : ''}`} />
          <span className="text-[10px] font-medium">Profile</span>
        </button>
      </nav>

      {/* ── Owner PIN Modal ── */}
      {pinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setPinModal(false)}>
          <div className="bg-card rounded-2xl p-6 w-[280px] shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center">
                <Lock className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-sm font-semibold text-foreground">Owner Access</p>
              <p className="text-xs text-muted-foreground text-center">Enter PIN to access owner dashboard</p>
              <input
                type="password"
                maxLength={4}
                value={pin}
                onChange={e => { setPin(e.target.value); setPinError(false); }}
                onKeyDown={e => e.key === 'Enter' && handlePinSubmit()}
                placeholder="••••"
                className="w-full text-center text-2xl tracking-[0.5em] bg-secondary rounded-xl px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
              {pinError && <p className="text-xs text-destructive">Incorrect PIN</p>}
              <button
                onClick={handlePinSubmit}
                disabled={pin.length < 4}
                className="w-full bg-amber-500 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 active:scale-95 transition-transform"
              >
                Unlock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffLayout;
