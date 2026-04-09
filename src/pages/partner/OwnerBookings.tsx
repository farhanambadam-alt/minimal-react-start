import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { usePartner } from '@/contexts/PartnerContext';
import {
  mockServices, timeToMins, minsToTime12,
  OPEN_TIME, CLOSE_TIME, PPM,
  type Appointment,
} from '@/data/partnerMockData';
import StatusBadge from '@/components/partner/StatusBadge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Calendar, Clock, Filter, ChevronDown, ChevronLeft, ChevronRight,
  Check, X, Smartphone, User, AlertTriangle,
} from 'lucide-react';

/* ── Min card height so all elements fit in 15-min slots ── */
const MIN_CARD_PX = 110;

/* ── Collision-free layout ── */
interface LayoutSlot {
  id: string;
  visualTop: number;
  visualHeight: number;
  booking: Appointment;
}

const computeLayout = (bookings: Appointment[], timelineStartMins: number): LayoutSlot[] => {
  const sorted = [...bookings].sort((a, b) => timeToMins(a.scheduledTime) - timeToMins(b.scheduledTime));
  const slots: LayoutSlot[] = [];
  let maxBottom = 0;
  for (const booking of sorted) {
    const bStart = timeToMins(booking.scheduledTime);
    const naturalTop = (bStart - timelineStartMins) * PPM;
    const height = Math.max(booking.duration * PPM, MIN_CARD_PX);
    const top = Math.max(naturalTop, maxBottom + 2);
    slots.push({ id: booking.id, visualTop: top, visualHeight: height, booking });
    maxBottom = top + height;
  }
  return slots;
};

/* ── Date helpers ── */
const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const getDayLabel = (d: Date, today: Date) => {
  const diff = Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date(today).setHours(0, 0, 0, 0)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === -1) return 'Yesterday';
  if (diff === 1) return 'Tomorrow';
  return d.toLocaleDateString('en-IN', { weekday: 'short' });
};

/* ── Node color helper ── */
const getNodeStyle = (status: Appointment['status']) => {
  switch (status) {
    case 'serving': return { bg: 'bg-blue-500', ring: 'ring-blue-200 dark:ring-blue-900' };
    case 'completed': return { bg: 'bg-emerald-500', ring: 'ring-emerald-200 dark:ring-emerald-900' };
    case 'cancelled': return { bg: 'bg-destructive', ring: 'ring-red-200 dark:ring-red-900' };
    default: return { bg: 'bg-amber-400', ring: 'ring-amber-200 dark:ring-amber-900' };
  }
};

const getTrackColor = (status: Appointment['status']) => {
  switch (status) {
    case 'completed': return 'bg-emerald-400/60';
    case 'cancelled': return 'bg-destructive/40';
    case 'serving': return 'bg-blue-400/60';
    default: return 'bg-border/40';
  }
};

const OwnerBookings = () => {
  const { appointments, staff, getStaffLogs } = usePartner();
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const [selectedStaffId, setSelectedStaffId] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState(today);
  const [showDateInput, setShowDateInput] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const timelineRef = useRef<HTMLDivElement>(null);
  const dateScrollRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Generate date range: 7 days before and after today
  const dateRange = useMemo(() => {
    const dates: Date[] = [];
    for (let i = -7; i <= 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayStr]);

  const selectedDateStr = selectedDate.toISOString().split('T')[0];
  const isToday = isSameDay(selectedDate, today);

  // Filter appointments
  const filtered = useMemo(() => {
    let result = [...appointments];
    result = result.filter(a => a.date === selectedDateStr);
    if (selectedStaffId !== 'all') result = result.filter(a => a.staffId === selectedStaffId);
    if (filterStatus !== 'all') result = result.filter(a => a.status === filterStatus);
    return result.sort((a, b) => timeToMins(a.scheduledTime) - timeToMins(b.scheduledTime));
  }, [appointments, selectedDateStr, selectedStaffId, filterStatus]);

  // Stats
  const completedCount = filtered.filter(a => a.status === 'completed').length;
  const servingCount = filtered.filter(a => a.status === 'serving').length;
  const waitingCount = filtered.filter(a => a.status === 'waiting').length;
  const totalCount = filtered.length;

  // Timeline layout
  const nowMins = currentTime.getHours() * 60 + currentTime.getMinutes();

  const earliestStart = filtered.reduce((min, b) => {
    const s = timeToMins(b.scheduledTime);
    return s < min ? s : min;
  }, OPEN_TIME);
  const latestEnd = filtered.reduce((max, b) => {
    const end = timeToMins(b.scheduledTime) + b.duration;
    return end > max ? end : max;
  }, CLOSE_TIME);

  const timelineStartMins = Math.min(OPEN_TIME, earliestStart);
  const timelineEndMins = Math.max(CLOSE_TIME, latestEnd + 30, isToday ? nowMins + 60 : CLOSE_TIME);

  const layoutSlots = computeLayout(filtered, timelineStartMins);
  const lastSlotBottom = layoutSlots.length > 0
    ? layoutSlots[layoutSlots.length - 1].visualTop + layoutSlots[layoutSlots.length - 1].visualHeight
    : 0;
  const naturalHeight = (timelineEndMins - timelineStartMins) * PPM;
  const totalHeight = Math.max(naturalHeight, lastSlotBottom + 40);
  const nowOffset = (nowMins - timelineStartMins) * PPM;

  // Hour marks
  const firstHour = Math.floor(timelineStartMins / 60);
  const lastHour = Math.ceil(timelineEndMins / 60);
  const hours = Array.from({ length: lastHour - firstHour + 1 }, (_, i) => (firstHour + i) * 60);

  // Service logs for selected staff
  const staffLogs = useMemo(() => {
    if (selectedStaffId === 'all') {
      return staff.flatMap(s => getStaffLogs(s.id));
    }
    return getStaffLogs(selectedStaffId);
  }, [selectedStaffId, staff, getStaffLogs]);

  // Scroll to today in date strip
  useEffect(() => {
    if (dateScrollRef.current) {
      const todayEl = dateScrollRef.current.querySelector('[data-today="true"]');
      if (todayEl) {
        todayEl.scrollIntoView({ inline: 'center', behavior: 'smooth' });
      }
    }
  }, []);

  // Scroll timeline to NOW
  useEffect(() => {
    if (timelineRef.current && isToday) {
      const scrollTo = Math.max(0, nowOffset - 100);
      timelineRef.current.scrollTop = scrollTo;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDateStr, selectedStaffId]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 pt-3 pb-2">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-heading font-bold text-foreground">Bookings</h1>
          <div className="flex items-center gap-1 text-primary">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-xs font-bold font-mono tabular-nums">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Staff Selector Bar */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
          <button
            onClick={() => setSelectedStaffId('all')}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl shrink-0 transition-all ${
              selectedStaffId === 'all'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-secondary text-muted-foreground'
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center text-sm font-bold">
              All
            </div>
            <span className="text-[10px] font-semibold">Everyone</span>
          </button>
          {staff.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedStaffId(s.id)}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl shrink-0 transition-all ${
                selectedStaffId === s.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-secondary text-muted-foreground'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-base border-2 ${
                s.status === 'busy' ? 'border-destructive' : 'border-emerald-500'
              } bg-card`}>
                {s.avatar}
              </div>
              <span className="text-[10px] font-semibold">{s.name}</span>
            </button>
          ))}
        </div>

        {/* Date Navigation Strip */}
        <div className="flex items-center gap-1 mt-1">
          <button onClick={() => setShowDateInput(!showDateInput)} className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 shrink-0">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <div ref={dateScrollRef} className="flex gap-1 overflow-x-auto flex-1 scrollbar-none py-1">
            {dateRange.map(d => {
              const dateStr = d.toISOString().split('T')[0];
              const isSelected = dateStr === selectedDateStr;
              const isTodayDate = isSameDay(d, today);
              return (
                <button
                  key={dateStr}
                  data-today={isTodayDate ? 'true' : undefined}
                  onClick={() => setSelectedDate(new Date(d))}
                  className={`flex flex-col items-center px-2.5 py-1 rounded-lg shrink-0 transition-all min-w-[44px] ${
                    isSelected
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : isTodayDate
                        ? 'bg-primary/15 text-primary ring-1 ring-primary/30'
                        : 'bg-secondary/60 text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  <span className="text-[9px] font-medium leading-tight">{getDayLabel(d, today)}</span>
                  <span className="text-sm font-bold leading-tight">{d.getDate()}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Date input field */}
        {showDateInput && (
          <div className="mt-1.5 flex items-center gap-2">
            <input
              type="date"
              value={selectedDateStr}
              onChange={e => {
                const d = new Date(e.target.value + 'T00:00:00');
                if (!isNaN(d.getTime())) setSelectedDate(d);
              }}
              className="flex-1 bg-secondary rounded-lg px-3 py-2 text-sm text-foreground"
            />
          </div>
        )}

        {/* Quick filters */}
        <div className="flex items-center gap-1.5 mt-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors ${
              filterStatus === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
            }`}
          >
            All ({totalCount})
          </button>
          <button
            onClick={() => setFilterStatus('waiting')}
            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors ${
              filterStatus === 'waiting' ? 'bg-amber-500 text-white' : 'bg-secondary text-muted-foreground'
            }`}
          >
            Waiting ({waitingCount})
          </button>
          <button
            onClick={() => setFilterStatus('serving')}
            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors ${
              filterStatus === 'serving' ? 'bg-blue-500 text-white' : 'bg-secondary text-muted-foreground'
            }`}
          >
            Serving ({servingCount})
          </button>
          <button
            onClick={() => setFilterStatus('completed')}
            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors ${
              filterStatus === 'completed' ? 'bg-emerald-500 text-white' : 'bg-secondary text-muted-foreground'
            }`}
          >
            Done ({completedCount})
          </button>
        </div>

        {/* Summary bar */}
        <div className="flex items-center gap-2 mt-2 bg-secondary/60 rounded-lg px-3 py-1.5">
          <span className="text-[10px] text-muted-foreground">{completedCount}/{totalCount} completed</span>
          <div className="flex-1 h-1.5 bg-background rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }} />
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div ref={timelineRef} className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Calendar className="w-10 h-10 mb-2 opacity-40" />
            <p className="text-sm font-medium">No bookings found</p>
            <p className="text-xs mt-1">Try a different date or staff member</p>
          </div>
        ) : (
          <div className="relative ml-14 mr-4 mt-2" style={{ height: `${totalHeight}px` }}>
            {/* Default timeline track */}
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-border/40" />

            {/* Colored track segments per booking */}
            {layoutSlots.map(slot => (
              <div
                key={`track-${slot.id}`}
                className={`absolute left-0 w-0.5 ${getTrackColor(slot.booking.status)} transition-colors`}
                style={{ top: `${slot.visualTop}px`, height: `${slot.visualHeight}px` }}
              />
            ))}

            {/* Hour grid lines */}
            {hours.map(hourMins => {
              if (hourMins < timelineStartMins || hourMins > timelineEndMins) return null;
              const top = (hourMins - timelineStartMins) * PPM;
              return (
                <React.Fragment key={`h-${hourMins}`}>
                  <div className="absolute left-0 right-0 border-t border-border/60" style={{ top: `${top}px` }}>
                    <span className="absolute -left-14 -top-2.5 text-[10px] font-medium w-12 text-right text-muted-foreground">
                      {minsToTime12(hourMins).replace(':00 ', ' ')}
                    </span>
                  </div>
                  {hourMins + 30 < timelineEndMins && (
                    <div className="absolute left-0 right-0 border-t border-dashed border-border/30" style={{ top: `${top + 30 * PPM}px` }}>
                      <span className="absolute -left-14 -top-2.5 text-[9px] text-muted-foreground/50 w-12 text-right">
                        {minsToTime12(hourMins + 30)}
                      </span>
                    </div>
                  )}
                </React.Fragment>
              );
            })}

            {/* Booking cards */}
            {layoutSlots.map(slot => {
              const booking = slot.booking;
              const bStart = timeToMins(booking.scheduledTime);
              const bEnd = bStart + booking.duration;
              const isSmall = slot.visualHeight <= MIN_CARD_PX + 10;
              const isExpanded = expandedCardId === booking.id;
              const staffMember = staff.find(s => s.id === booking.staffId);
              const serviceNames = booking.serviceIds
                .map(sid => mockServices.find(s => s.id === sid)?.name)
                .filter(Boolean);
              const nodeStyle = getNodeStyle(booking.status);
              const bookingOvertime = booking.status === 'serving' && nowMins > bEnd;

              const borderColor = booking.status === 'completed'
                ? 'border-l-emerald-400'
                : booking.status === 'cancelled'
                  ? 'border-l-destructive'
                  : booking.type === 'online'
                    ? 'border-l-blue-500'
                    : 'border-l-green-500';

              const bgColor = booking.status === 'completed'
                ? 'bg-muted/50'
                : booking.status === 'cancelled'
                  ? 'bg-destructive/5'
                  : 'bg-card';

              return (
                <div key={booking.id} className="absolute left-0 right-0" style={{ top: `${slot.visualTop}px`, zIndex: isExpanded ? 30 : 10 }}>
                  {/* Timeline node */}
                  <div className="absolute left-0 top-3 -translate-x-1/2 z-10">
                    <div className={`w-4 h-4 rounded-full ${nodeStyle.bg} ring-2 ${nodeStyle.ring} flex items-center justify-center`}>
                      {booking.status === 'completed' && <Check className="w-2.5 h-2.5 text-white" />}
                      {booking.status === 'cancelled' && <X className="w-2.5 h-2.5 text-white" />}
                      {booking.status === 'serving' && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                    </div>
                  </div>

                  {/* Card */}
                  <div
                    onClick={() => isSmall && setExpandedCardId(isExpanded ? null : booking.id)}
                    className={`ml-4 ${bgColor} rounded-xl border border-border border-l-4 ${borderColor} shadow-sm transition-all duration-200 ${
                      isSmall ? 'cursor-pointer' : ''
                    } ${isExpanded ? 'shadow-lg ring-1 ring-primary/20' : 'overflow-hidden'}`}
                    style={{ height: isExpanded ? 'auto' : `${slot.visualHeight}px`, minHeight: isExpanded ? 'auto' : undefined }}
                  >
                    <div className={`p-2 h-full flex flex-col ${isExpanded ? '' : 'overflow-hidden'}`}>
                      {/* Row 1: Tags */}
                      <div className="flex flex-wrap items-center gap-0.5 mb-0.5">
                        <span className="text-[8px] font-bold bg-foreground/10 text-foreground px-1 py-px rounded-full leading-none">#{booking.queueNo}</span>
                        <span className={`text-[8px] font-medium px-1 py-px rounded-full flex items-center gap-px leading-none ${
                          booking.type === 'online' ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400' : 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400'
                        }`}>
                          {booking.type === 'online' ? <Smartphone className="w-2 h-2" /> : <User className="w-2 h-2" />}
                          {booking.type === 'online' ? 'Online' : 'Walk-in'}
                        </span>
                        {booking.status === 'serving' && (
                          <span className="text-[8px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 px-1 py-px rounded-full animate-pulse leading-none">Serving</span>
                        )}
                        {booking.status === 'waiting' && (
                          <span className="text-[8px] font-medium bg-secondary text-muted-foreground px-1 py-px rounded-full leading-none">Waiting</span>
                        )}
                        {booking.status === 'completed' && (
                          <span className="text-[8px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-1 py-px rounded-full flex items-center gap-0.5 leading-none">
                            <Check className="w-2 h-2" /> Finished
                          </span>
                        )}
                        {booking.status === 'cancelled' && (
                          <span className="text-[8px] font-bold bg-destructive/15 text-destructive px-1 py-px rounded-full flex items-center gap-0.5 leading-none">
                            <X className="w-2 h-2" /> Cancelled
                          </span>
                        )}
                        {bookingOvertime && (
                          <span className="text-[8px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-1 py-px rounded-full flex items-center gap-0.5 leading-none">
                            <AlertTriangle className="w-2 h-2" /> OT
                          </span>
                        )}
                      </div>

                      {/* Row 2: Name + time + staff */}
                      <div className="flex items-center justify-between gap-1">
                        <p className={`text-xs font-bold truncate ${booking.status === 'completed' || booking.status === 'cancelled' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                          {booking.clientName}
                        </p>
                        <span className="text-[9px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                          {minsToTime12(bStart)}–{minsToTime12(bEnd)}
                        </span>
                      </div>

                      {/* Staff name (when viewing all) */}
                      {selectedStaffId === 'all' && staffMember && (
                        <p className="text-[9px] text-primary font-medium">{staffMember.avatar} {staffMember.name}</p>
                      )}

                      {/* Row 3: Services as #hashtags */}
                      <div className="flex flex-wrap gap-0.5 mt-0.5">
                        {(isExpanded ? serviceNames : serviceNames.slice(0, 2)).map((name, i) => (
                          <span key={i} className="text-[9px] font-bold text-primary bg-primary/10 px-1 py-px rounded leading-none">
                            #{name}
                          </span>
                        ))}
                        {!isExpanded && serviceNames.length > 2 && (
                          <span className="text-[9px] text-primary font-semibold px-1 py-px leading-none">+{serviceNames.length - 2}</span>
                        )}
                      </div>

                      {/* Price */}
                      <span className="text-[9px] font-semibold text-foreground mt-0.5">₹{booking.price}</span>

                      {/* Expand hint */}
                      {isSmall && !isExpanded && serviceNames.length > 2 && (
                        <span className="text-[8px] text-primary font-medium mt-auto">Tap to expand</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* NOW indicator */}
            {isToday && nowMins >= timelineStartMins && nowMins <= timelineEndMins && (
              <div className="absolute left-0 right-0 z-20 flex items-center pointer-events-none" style={{ top: `${nowOffset}px` }}>
                <div className="relative -ml-1.5">
                  <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
                  <div className="absolute inset-0 w-3 h-3 rounded-full bg-destructive/40 animate-ping" />
                </div>
                <div className="flex-1 h-[2px] bg-destructive" />
                <span className="text-[9px] font-bold text-destructive ml-1 bg-background px-1.5 py-0.5 rounded-full shadow-sm border border-destructive/20">NOW</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Service Logs Footer */}
      {staffLogs.length > 0 && (
        <div className="border-t border-border bg-card px-4 py-2">
          <p className="text-[10px] text-muted-foreground font-medium mb-1">
            Completed Logs ({staffLogs.length})
          </p>
          <ScrollArea className="max-h-[120px]">
            <div className="flex flex-col gap-1 pr-2">
              {staffLogs.slice().reverse().slice(0, 5).map(log => {
                const svcNames = log.serviceIds.map(sid => mockServices.find(sv => sv.id === sid)?.name).filter(Boolean);
                return (
                  <div key={log.id} className="flex items-center justify-between bg-secondary rounded-lg px-2.5 py-1.5">
                    <div>
                      <p className="text-[10px] font-medium text-foreground">{log.clientName}</p>
                      <p className="text-[9px] text-muted-foreground">{svcNames.join(', ')} · {log.duration}min</p>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600">₹{log.price}</span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default OwnerBookings;
