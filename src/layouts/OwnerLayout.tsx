import { Outlet } from 'react-router-dom';
import TopSwitcher from '@/components/partner/TopSwitcher';
import OwnerBottomNav from '@/components/partner/OwnerBottomNav';

const OwnerLayout = () => (
  <div className="flex flex-col h-full">
    <TopSwitcher />
    <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="max-w-lg mx-auto">
        <Outlet />
      </div>
    </div>
    <OwnerBottomNav />
  </div>
);

export default OwnerLayout;
