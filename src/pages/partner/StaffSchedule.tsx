import { usePartner } from '@/contexts/PartnerContext';
import { mockServices, minsToTime12, timeToMins } from '@/data/partnerMockData';
import StatusBadge from '@/components/partner/StatusBadge';

const StaffSchedule = () => {
  const { staffAppointments } = usePartner();

  const sorted = [...staffAppointments].sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
  const hours = Array.from({ length: 12 }, (_, i) => `${String(i + 8).padStart(2, '0')}:00`);

  return (
    <div className="flex flex-col gap-4 p-4 pb-safe">
      <h1 className="text-xl font-heading font-bold text-foreground">Today's Schedule</h1>

      <div className="relative flex flex-col gap-0">
        {hours.map(hour => {
          const hourNum = parseInt(hour);
          const appts = sorted.filter(a => parseInt(a.scheduledTime.split(':')[0]) === hourNum);
          return (
            <div key={hour} className="flex gap-3 min-h-[52px]">
              <span className="text-[10px] text-muted-foreground w-10 pt-1 shrink-0">{hour}</span>
              <div className="flex-1 border-l border-border pl-3 pb-2">
                {appts.map(a => {
                  const serviceNames = a.serviceIds.map(sid => mockServices.find(s => s.id === sid)?.name).filter(Boolean);
                  return (
                    <div key={a.id} className="bg-card rounded-lg p-2.5 card-shadow mb-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground">{a.clientName}</p>
                        <StatusBadge status={a.status} />
                      </div>
                      <p className="text-xs text-muted-foreground">{minsToTime12(timeToMins(a.scheduledTime))} · {serviceNames.join(', ')} · {a.duration}min</p>
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

export default StaffSchedule;
