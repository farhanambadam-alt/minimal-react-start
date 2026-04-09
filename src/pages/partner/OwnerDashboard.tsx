import { usePartner } from '@/contexts/PartnerContext';
import { mockFinancials } from '@/data/partnerMockData';
import { TrendingUp, Wallet, Clock } from 'lucide-react';
const OwnerDashboard = () => {
  const { staff, appointments } = usePartner();
  const fin = mockFinancials;

  const activeCount = staff.filter(s => s.status === 'busy').length;
  const todayCompleted = appointments.filter(a => a.status === 'completed').length;
  const todayTotal = appointments.length;

  return (
    <div className="flex flex-col gap-4 p-4 pb-safe">
      <h1 className="text-xl font-heading font-bold text-foreground">Dashboard</h1>

      {/* Floor status */}
      <div className="bg-card rounded-2xl p-4 card-shadow">
        <p className="text-xs text-muted-foreground mb-2">Floor Status</p>
        <div className="flex items-center gap-3 overflow-x-auto">
          {staff.map(s => (
            <div key={s.id} className="flex flex-col items-center gap-1 shrink-0">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 bg-secondary ${
                s.status === 'busy' ? 'border-destructive' : 'border-emerald-500'
              }`}>
                {s.avatar}
              </div>
              <span className="text-[10px] text-muted-foreground">{s.name}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">{activeCount} busy · {staff.length - activeCount} free</p>
      </div>

      {/* Financial cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card rounded-xl p-4 card-shadow">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span className="text-[10px] text-muted-foreground">Today</span>
          </div>
          <p className="text-xl font-bold text-foreground">₹{fin.todayRevenue.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-card rounded-xl p-4 card-shadow">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-[10px] text-muted-foreground">This Month</span>
          </div>
          <p className="text-xl font-bold text-foreground">₹{fin.monthRevenue.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-card rounded-xl p-4 card-shadow">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-amber-500" />
            <span className="text-[10px] text-muted-foreground">Available</span>
          </div>
          <p className="text-xl font-bold text-foreground">₹{fin.fundsAvailable.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-card rounded-xl p-4 card-shadow">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Next Payout</span>
          </div>
          <p className="text-sm font-bold text-foreground">{fin.nextPayoutDate}</p>
        </div>
      </div>

      {/* Bookings summary */}
      <div className="bg-card rounded-xl p-4 card-shadow">
        <p className="text-sm font-semibold text-foreground mb-1">Today's Bookings</p>
        <p className="text-xs text-muted-foreground">{todayCompleted} completed of {todayTotal} total</p>
        <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${todayTotal > 0 ? (todayCompleted / todayTotal) * 100 : 0}%` }} />
        </div>
      </div>

    </div>
  );
};

export default OwnerDashboard;
