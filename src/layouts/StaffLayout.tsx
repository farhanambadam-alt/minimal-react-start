import { useState } from 'react';
import { usePartner } from '@/contexts/PartnerContext';
import TopSwitcher from '@/components/partner/TopSwitcher';
import StaffFloor from '@/pages/partner/StaffFloor';
import StaffProfile from '@/pages/partner/StaffProfile';
import StaffSwitcher from '@/components/partner/StaffSwitcher';
import { List, User } from 'lucide-react';

const StaffLayout = () => {
  const { activeStaffId } = usePartner();
  const [view, setView] = useState<'today' | 'profile'>('today');

  if (!activeStaffId) return (
    <>
      <TopSwitcher />
      <StaffSwitcher />
    </>
  );

  return (
    <div className="flex flex-col h-full">
      <TopSwitcher />
      <div className="flex-1 overflow-hidden">
        {view === 'today' ? <StaffFloor /> : <StaffProfile />}
      </div>
      {/* Bottom toggle */}
      <nav className="flex items-center justify-around bg-card/90 backdrop-blur-md border-t border-border px-2 pb-[max(var(--inset-bottom),8px)] pt-2">
        <button
          onClick={() => setView('today')}
          className={`flex flex-col items-center gap-0.5 px-6 py-1.5 rounded-xl transition-colors ${view === 'today' ? 'text-primary' : 'text-muted-foreground'}`}
        >
          <List className="w-5 h-5" />
          <span className="text-[10px] font-medium">Today</span>
        </button>
        <button
          onClick={() => setView('profile')}
          className={`flex flex-col items-center gap-0.5 px-6 py-1.5 rounded-xl transition-colors ${view === 'profile' ? 'text-primary' : 'text-muted-foreground'}`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] font-medium">Profile</span>
        </button>
      </nav>
    </div>
  );
};

export default StaffLayout;
