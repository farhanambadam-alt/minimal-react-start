import { useState, useMemo } from 'react';
import { usePartner } from '@/contexts/PartnerContext';
import { mockServices, timeToMins, minsToTime12 } from '@/data/partnerMockData';
import StatusBadge from '@/components/partner/StatusBadge';
import { Calendar, Clock, Filter, ChevronDown } from 'lucide-react';

const OwnerBookings = () => {
  const { appointments, staff } = usePartner();
  const today = new Date().toISOString().split('T')[0];
  const [filterDate, setFilterDate] = useState<string>(today);
  const [filterStaff, setFilterStaff] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let result = [...appointments];
    if (filterDate) result = result.filter(a => a.date === filterDate);
    if (filterStaff !== 'all') result = result.filter(a => a.staffId === filterStaff);
    return result.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
  }, [appointments, filterDate, filterStaff]);

  const hours = Array.from({ length: 13 }, (_, i) => `${String(i + 8).padStart(2, '0')}:00`);

  const completedCount = filtered.filter(a => a.status === 'completed').length;
  const totalCount = filtered.length;

  return (
    <div className="flex flex-col gap-3 p-4 pb-safe">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-heading font-bold text-foreground">Bookings</h1>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1 bg-secondary px-3 py-1.5 rounded-full text-xs font-semibold text-muted-foreground"
        >
          <Filter className="w-3 h-3" /> Filters <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2">
        <button
          onClick={() => { setFilterDate(today); setFilterStaff('all'); }}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${
            filterDate === today && filterStaff === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
          }`}
        >
          <Clock className="w-3 h-3" /> Today
        </button>
        <button
          onClick={() => { setFilterDate(''); setFilterStaff('all'); }}
          className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${
            !filterDate ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
          }`}
        >
          All
        </button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="bg-card rounded-xl p-3 card-shadow flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="date"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              className="flex-1 bg-secondary rounded-lg px-3 py-2 text-sm text-foreground"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase font-medium mb-1 block">Staff</label>
            <select
              value={filterStaff}
              onChange={e => setFilterStaff(e.target.value)}
              className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-foreground"
            >
              <option value="all">All Staff</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="bg-card rounded-xl p-3 card-shadow flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{completedCount} completed of {totalCount}</span>
        <div className="flex-1 mx-3 h-1.5 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }} />
        </div>
        <span className="text-xs font-semibold text-foreground">{totalCount}</span>
      </div>

      {/* Timeline */}
      <div className="relative flex flex-col gap-0">
        {hours.map(hour => {
          const hourNum = parseInt(hour);
          const appts = filtered.filter(a => parseInt(a.scheduledTime.split(':')[0]) === hourNum);
          return (
            <div key={hour} className="flex gap-3 min-h-[44px]">
              <span className="text-[10px] text-muted-foreground w-10 pt-1 shrink-0 text-right">{hour}</span>
              <div className="flex-1 border-l pl-3 pb-1 border-border">
                {appts.map(a => {
                  const serviceNames = a.serviceIds.map(sid => mockServices.find(s => s.id === sid)?.name).filter(Boolean);
                  const staffMember = staff.find(s => s.id === a.staffId);
                  return (
                    <div key={a.id} className="bg-card rounded-lg p-2.5 card-shadow mb-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground">{a.clientName}</p>
                        <StatusBadge status={a.status} />
                      </div>
                      <p className="text-xs text-muted-foreground">{minsToTime12(timeToMins(a.scheduledTime))} · {serviceNames.join(', ')} · {staffMember?.name}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OwnerBookings;
