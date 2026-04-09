import { Outlet, useNavigate } from 'react-router-dom';
import PartnerBottomNav from '@/components/partner/PartnerBottomNav';
import { LayoutDashboard, CalendarDays, TrendingUp, Users, Menu } from 'lucide-react';
import type { PartnerTab } from '@/components/partner/PartnerBottomNav';

const ownerTabs: PartnerTab[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/owner' },
  { icon: CalendarDays, label: 'Bookings', path: '/owner/bookings' },
  { icon: TrendingUp, label: 'Growth', path: '/owner/growth' },
  { icon: Users, label: 'Staff', path: '/owner/staff' },
  { icon: Menu, label: 'Menu', path: '/owner/menu' },
];

const OwnerLayout = () => {
  const navigate = useNavigate();

  return (
    <div className="relative flex flex-col h-full">
      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="max-w-lg mx-auto pb-24">
          <Outlet />
        </div>
      </div>

      {/* Floating Staff Mode toggle */}
      <button
        onClick={() => navigate('/staff')}
        className="absolute bottom-[88px] right-4 z-[51] w-12 h-12 rounded-full flex items-center justify-center active:scale-90 transition-transform"
        style={{
          background: 'linear-gradient(135deg, hsl(152, 60%, 45%) 0%, hsl(160, 55%, 38%) 100%)',
          boxShadow: '0 4px 20px -2px hsla(152, 60%, 45%, 0.5), 0 2px 8px -1px hsla(152, 55%, 38%, 0.3)',
        }}
        aria-label="Switch to Staff Mode"
      >
        <Users className="w-5 h-5 text-white" />
      </button>

      {/* Bottom Nav (same glassmorphic style as customer app) */}
      <PartnerBottomNav tabs={ownerTabs} />
    </div>
  );
};

export default OwnerLayout;
