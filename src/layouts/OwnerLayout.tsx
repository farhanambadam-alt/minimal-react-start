import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import OwnerBottomNav from '@/components/partner/OwnerBottomNav';
import { Users } from 'lucide-react';

const OwnerLayout = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="max-w-lg mx-auto">
          <Outlet />
        </div>
      </div>

      {/* Floating Staff Mode button */}
      <button
        onClick={() => navigate('/staff')}
        className="fixed bottom-20 right-4 z-40 w-12 h-12 rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 flex items-center justify-center active:scale-90 transition-transform"
        aria-label="Switch to Staff Mode"
      >
        <Users className="w-5 h-5" />
      </button>

      <OwnerBottomNav />
    </div>
  );
};

export default OwnerLayout;
