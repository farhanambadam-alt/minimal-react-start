import { useState } from 'react';
import { usePartner } from '@/contexts/PartnerContext';
import { mockFinancials, mockServices } from '@/data/partnerMockData';
import { TrendingUp, Wallet, Clock, History, ChevronDown, ChevronUp } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const OwnerDashboard = () => {
  const { staff, appointments, getStaffLogs } = usePartner();
  const [expandedStaff, setExpandedStaff] = useState<string | null>(null);
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

      {/* Per-staff logs - scrollable */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <History className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Staff Service Logs</h2>
        </div>
        <div className="flex flex-col gap-2">
          {staff.map(s => {
            const logs = getStaffLogs(s.id);
            const isExpanded = expandedStaff === s.id;
            const totalEarned = logs.reduce((sum, l) => sum + l.price, 0);
            return (
              <div key={s.id}>
                <button
                  onClick={() => setExpandedStaff(isExpanded ? null : s.id)}
                  className="w-full flex items-center justify-between bg-card rounded-xl p-3 card-shadow"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{s.avatar}</span>
                    <div className="text-left">
                      <span className="text-sm font-medium text-foreground">{s.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">{logs.length} completed</span>
                        {logs.length > 0 && <span className="text-[10px] font-medium text-emerald-600">₹{totalEarned.toLocaleString('en-IN')}</span>}
                      </div>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
                {isExpanded && (
                  <ScrollArea className="max-h-[200px] mt-1.5 ml-2">
                    <div className="flex flex-col gap-1.5 pr-2">
                      {logs.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-3 text-center bg-secondary rounded-lg">No completed services yet</p>
                      ) : (
                        logs.slice().reverse().map(log => {
                          const serviceNames = log.serviceIds.map(sid => mockServices.find(sv => sv.id === sid)?.name).filter(Boolean);
                          return (
                            <div key={log.id} className="bg-secondary rounded-lg p-2.5">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-medium text-foreground">{log.clientName}</p>
                                <span className="text-[10px] font-semibold text-foreground">₹{log.price}</span>
                              </div>
                              <p className="text-[10px] text-muted-foreground">{serviceNames.join(', ')} · {log.duration}min</p>
                              <p className="text-[10px] text-muted-foreground">{new Date(log.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboard;
