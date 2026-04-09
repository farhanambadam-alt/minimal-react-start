import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { usePartner } from '@/contexts/PartnerContext';
import {
  mockServices, minsToTime12, minsToTime, timeToMins,
  OPEN_TIME, CLOSE_TIME, PPM,
  type Appointment,
} from '@/data/partnerMockData';
import ActionDrawer from '@/components/partner/ActionDrawer';
import {
  Plus, Clock, Smartphone, User, Coffee, Check, Minus,
  AlertTriangle, X, ChevronLeft, ChevronRight, CalendarDays,
} from 'lucide-react';

/* ── Duration Dial ── */
const DurationDial = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => {
  const dialRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleUpdate = (clientX: number, clientY: number) => {
    if (!dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const angle = Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI) + 90;
    const norm = angle < 0 ? angle + 360 : angle;
    const mins = Math.max(15, Math.round((norm / 360) * 180 / 5) * 5);
    onChange(mins);
  };

  const rotation = (value / 180) * 360;

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        ref={dialRef}
        className="relative w-28 h-28 rounded-full border-4 border-border bg-card cursor-pointer select-none"
        onMouseMove={e => isDragging && handleUpdate(e.clientX, e.clientY)}
        onMouseDown={() => setIsDragging(true)}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
        onTouchMove={e => isDragging && handleUpdate(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchStart={() => setIsDragging(true)}
        onTouchEnd={() => setIsDragging(false)}
      >
        {[0, 30, 60, 90, 120, 150].map(m => {
          const a = (m / 180) * 360 - 90;
          const rad = a * (Math.PI / 180);
          const x = 50 + 38 * Math.cos(rad);
          const y = 50 + 38 * Math.sin(rad);
          return <span key={m} className="absolute text-[8px] text-muted-foreground font-medium" style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)' }}>{m}</span>;
        })}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-1 h-10 origin-bottom rounded-full bg-primary" style={{ transform: `rotate(${rotation}deg)`, transformOrigin: 'bottom center', position: 'absolute', bottom: '50%' }} />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-foreground">{value}</span>
          <span className="text-[9px] text-muted-foreground font-medium">MINS</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={() => onChange(Math.max(15, value - 5))} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-foreground active:scale-90"><Minus className="w-3.5 h-3.5" /></button>
        <span className="text-sm font-semibold text-foreground w-14 text-center">{value} min</span>
        <button onClick={() => onChange(value + 5)} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-foreground active:scale-90"><Plus className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
};

/* ── Cancel Reasons ── */
const CANCEL_REASONS = [
  'Customer delayed',
  'Customer cancelled',
  'No-show',
  'Staff unavailable',
  'Other',
] as const;

/* ── Min card height so all elements are visible ── */
const MIN_CARD_PX = 110;

/* ── Date helpers ── */
const formatDateLabel = (d: Date) => {
  const today = new Date();
  const diff = Math.round((d.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0)) / 86400000);
  const base = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  if (diff === 0) return `Today · ${base}`;
  if (diff === -1) return `Yesterday · ${base}`;
  if (diff === 1) return `Tomorrow · ${base}`;
  return base;
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/* ── Collision-free layout: compute visual top/height avoiding overlaps ── */
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

    // Push down if overlapping with previous card
    const top = Math.max(naturalTop, maxBottom + 2);
    slots.push({ id: booking.id, visualTop: top, visualHeight: height, booking });
    maxBottom = top + height;
  }
  return slots;
};

/* ── Main Floor Component ── */
const StaffFloor = () => {
  const {
    activeStaff, staffAppointments, completeService, startService,
    addWalkIn, breaks, setBreak, clearBreak, getNextAvailableSlot,
    updateAppointmentStatus,
  } = usePartner();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [wiDrawerOpen, setWiDrawerOpen] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [manualDuration, setManualDuration] = useState(30);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [cancelDrawerOpen, setCancelDrawerOpen] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (timelineRef.current) {
      const nowMins = currentTime.getHours() * 60 + currentTime.getMinutes();
      const scrollTo = Math.max(0, (nowMins - OPEN_TIME) * PPM - 100);
      timelineRef.current.scrollTop = scrollTo;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStaff?.id]);

  const shiftDate = useCallback((dir: -1 | 1) => {
    setSelectedDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + dir);
      return d;
    });
  }, []);

  const barberId = activeStaff?.id ?? '';

  const nextSlot = useMemo(() => {
    if (!wiDrawerOpen || !barberId) return null;
    return getNextAvailableSlot(barberId, manualDuration);
  }, [wiDrawerOpen, barberId, manualDuration, getNextAvailableSlot]);

  if (!activeStaff) return null;

  const breakData = breaks[barberId];
  const nowMins = currentTime.getHours() * 60 + currentTime.getMinutes();
  const isOnBreak = breakData && nowMins < breakData.endMins && nowMins >= breakData.startMins;
  const isToday = isSameDay(selectedDate, new Date());
  const selectedDateStr = selectedDate.toISOString().split('T')[0];

  const dayBookings = staffAppointments.filter(a => a.date === selectedDateStr);
  const allBookings = [...dayBookings].sort((a, b) => timeToMins(a.scheduledTime) - timeToMins(b.scheduledTime));

  const earliestStart = allBookings.reduce((min, b) => {
    const s = timeToMins(b.scheduledTime);
    return s < min ? s : min;
  }, OPEN_TIME);
  const latestEnd = allBookings.reduce((max, b) => {
    const end = timeToMins(b.scheduledTime) + b.duration;
    return end > max ? end : max;
  }, CLOSE_TIME);

  const timelineStartMins = Math.min(OPEN_TIME, earliestStart);
  const timelineEndMins = Math.max(CLOSE_TIME, latestEnd + 30, isToday ? nowMins + 60 : CLOSE_TIME);

  const layoutSlots = computeLayout(allBookings, timelineStartMins);
  const lastSlotBottom = layoutSlots.length > 0
    ? layoutSlots[layoutSlots.length - 1].visualTop + layoutSlots[layoutSlots.length - 1].visualHeight
    : 0;

  const naturalHeight = (timelineEndMins - timelineStartMins) * PPM;
  const totalHeight = Math.max(naturalHeight, lastSlotBottom + 40);

  const nowOffset = (nowMins - timelineStartMins) * PPM;

  const handleAddWalkIn = () => {
    const svcs = mockServices.filter(s => selectedServices.includes(s.id));
    const price = svcs.reduce((acc, s) => acc + s.price, 0);
    addWalkIn(barberId, walkInName, selectedServices, manualDuration, price);
    setWiDrawerOpen(false);
    setWalkInName('');
    setSelectedServices([]);
    setManualDuration(30);
  };

  const handleCancelRequest = (id: string) => {
    setCancelTargetId(id);
    setCancelDrawerOpen(true);
  };

  const handleCancelConfirm = (reason: string) => {
    if (cancelTargetId) {
      updateAppointmentStatus(cancelTargetId, 'cancelled');
    }
    setCancelDrawerOpen(false);
    setCancelTargetId(null);
  };

  const waitingQueue = allBookings.filter(a => a.status === 'waiting').sort((a, b) => a.queueNo - b.queueNo);

  // Hour marks
  const firstHour = Math.floor(timelineStartMins / 60);
  const lastHour = Math.ceil(timelineEndMins / 60);
  const hours = Array.from({ length: lastHour - firstHour + 1 }, (_, i) => (firstHour + i) * 60);

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

  return (
    <div className="flex flex-col h-full bg-background">
      {/* ── Date Chips + Controls Header ── */}
      <div className="bg-card border-b border-border px-3 py-2">
        {/* Clock + Status row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isOnBreak ? 'bg-amber-500' : activeStaff.status === 'free' ? 'bg-emerald-500' : 'bg-destructive'}`} />
            <span className="text-[10px] text-muted-foreground font-medium">
              {isOnBreak ? 'ON BREAK' : activeStaff.status === 'free' ? 'Available' : 'Busy'}
            </span>
          </div>
          <div className="flex items-center gap-1 text-primary">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-xs font-bold font-mono tabular-nums">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Date Chips - horizontal scrollable week */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {dateChips.map(chip => (
            <button
              key={chip.key}
              onClick={() => setSelectedDate(chip.date)}
              className={`flex flex-col items-center min-w-[40px] px-2 py-1.5 rounded-xl text-center transition-all ${
                chip.isSelected
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : chip.isToday
                    ? 'bg-primary/15 text-primary'
                    : 'bg-secondary/60 text-muted-foreground hover:bg-secondary'
              }`}
            >
              <span className="text-[9px] font-medium uppercase leading-none">{chip.dayName}</span>
              <span className="text-sm font-bold leading-tight">{chip.dayNum}</span>
              <span className="text-[8px] leading-none opacity-70">{chip.month}</span>
            </button>
          ))}
          {/* Manual date input */}
          <div className="flex items-center ml-1">
            <input
              type="date"
              value={selectedDate.toISOString().split('T')[0]}
              onChange={e => {
                const d = new Date(e.target.value + 'T00:00:00');
                if (!isNaN(d.getTime())) setSelectedDate(d);
              }}
              className="bg-secondary/60 rounded-lg px-2 py-1.5 text-[10px] text-foreground w-[100px] h-[52px]"
            />
          </div>
        </div>

        {/* Break + Walk-in controls */}
        <div className="flex items-center gap-2 mt-2">
          {isOnBreak ? (
            <button onClick={() => clearBreak(barberId)} className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/30 px-3 py-1.5 rounded-full font-medium">
              <Coffee className="w-3 h-3" /> Break ends {minsToTime12(breakData!.endMins)} · End now
            </button>
          ) : (
            <div className="flex gap-1.5">
              {[15, 30, 45].map(d => (
                <button key={d} onClick={() => setBreak(barberId, d)} className="flex items-center gap-1 text-[11px] text-muted-foreground bg-secondary px-2.5 py-1.5 rounded-full font-medium hover:bg-secondary/80">
                  <Coffee className="w-3 h-3" /> {d}m
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => setWiDrawerOpen(true)}
            className="ml-auto flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-1.5 rounded-full text-[11px] font-bold active:scale-95 transition-transform"
          >
            <Plus className="w-3.5 h-3.5" /> Walk-in
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div ref={timelineRef} className="flex-1 overflow-y-auto">
        <div className="relative ml-14 mr-4" style={{ height: `${totalHeight}px` }}>
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

          {/* Before hours shading */}
          {timelineStartMins < OPEN_TIME && (
            <div
              className="absolute left-0 right-0 bg-amber-500/5"
              style={{ top: 0, height: `${(OPEN_TIME - timelineStartMins) * PPM}px` }}
            >
              <span className="absolute left-1 top-1 text-[9px] text-amber-500 font-bold">BEFORE HOURS</span>
            </div>
          )}

          {/* Hour grid lines */}
          {hours.map(hourMins => {
            if (hourMins < timelineStartMins || hourMins > timelineEndMins) return null;
            const top = (hourMins - timelineStartMins) * PPM;
            const isOvertime = hourMins >= CLOSE_TIME;
            const isBeforeOpen = hourMins < OPEN_TIME;
            return (
              <React.Fragment key={`h-${hourMins}`}>
                <div className="absolute left-0 right-0 border-t border-border/60" style={{ top: `${top}px` }}>
                  <span className={`absolute -left-14 -top-2.5 text-[10px] font-medium w-12 text-right ${isOvertime || isBeforeOpen ? 'text-amber-500' : 'text-muted-foreground'}`}>
                    {minsToTime12(hourMins).replace(':00 ', ' ')}
                  </span>
                </div>
                {hourMins + 30 < timelineEndMins && (
                  <div className="absolute left-0 right-0 border-t border-dashed border-border/30" style={{ top: `${top + 30 * PPM}px` }}>
                    <span className="absolute -left-14 -top-2.5 text-[9px] text-muted-foreground/50 w-12 text-right">
                      {minsToTime12(hourMins + 30).replace(' ', '\n')}
                    </span>
                  </div>
                )}
              </React.Fragment>
            );
          })}

          {/* Overtime zone */}
          {timelineEndMins > CLOSE_TIME && (
            <div
              className="absolute left-0 right-0 bg-amber-500/8 border-t-2 border-amber-500/40"
              style={{ top: `${(CLOSE_TIME - timelineStartMins) * PPM}px`, height: `${(timelineEndMins - CLOSE_TIME) * PPM}px` }}
            >
              <span className="absolute left-1 top-1 text-[9px] text-amber-500 font-bold uppercase tracking-wider">⚠ Overtime Zone</span>
            </div>
          )}

          {/* Break block */}
          {breakData && (
            <div
              className="absolute left-1 right-0 bg-amber-500/15 border-l-4 border-amber-500 rounded-r-lg flex items-center gap-2 px-3"
              style={{
                top: `${(breakData.startMins - timelineStartMins) * PPM}px`,
                height: `${(breakData.endMins - breakData.startMins) * PPM}px`,
              }}
            >
              <Coffee className="w-4 h-4 text-amber-600" />
              <div>
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Break</p>
                <p className="text-[10px] text-amber-600/70">{minsToTime12(breakData.startMins)} – {minsToTime12(breakData.endMins)}</p>
              </div>
            </div>
          )}

          {/* ── Booking cards (collision-free) ── */}
          {layoutSlots.map(slot => {
            const booking = slot.booking;
            const bStart = timeToMins(booking.scheduledTime);
            const bEnd = bStart + booking.duration;
            const isOvertime = bEnd > CLOSE_TIME;
            const isOvertimeStart = bStart >= CLOSE_TIME;
            const isBeforeOpen = bStart < OPEN_TIME;
            const isSmall = slot.visualHeight <= MIN_CARD_PX + 10;
            const isExpanded = expandedCardId === booking.id;

            const serviceNames = booking.serviceIds
              .map(sid => mockServices.find(s => s.id === sid)?.name)
              .filter(Boolean);

            const bookingOvertime = booking.status === 'serving' && nowMins > bEnd;
            const nodeStyle = getNodeStyle(booking.status);

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
                : isOvertimeStart || isBeforeOpen
                  ? 'bg-amber-50 dark:bg-amber-950/20'
                  : 'bg-card';

            const cardHeight = isExpanded ? 'auto' : `${slot.visualHeight}px`;

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
                  style={{ height: isExpanded ? 'auto' : cardHeight, minHeight: isExpanded ? 'auto' : undefined }}
                >
                  <div className={`p-2 h-full flex flex-col ${isExpanded ? '' : 'overflow-hidden'}`}>
                    {/* Row 1: Tags - compact for small cards */}
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

                    {/* Row 2: Name + time inline for compact layout */}
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-xs font-bold truncate ${booking.status === 'completed' ? 'text-muted-foreground line-through' : booking.status === 'cancelled' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                        {booking.clientName}
                      </p>
                      <span className="text-[9px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                        {minsToTime12(bStart)}–{minsToTime12(bEnd)} · ₹{booking.price}
                      </span>
                    </div>

                    {/* Row 3: Services */}
                    <div className="flex flex-wrap gap-0.5 mt-0.5">
                      {(isExpanded ? serviceNames : serviceNames.slice(0, 2)).map((name, i) => (
                        <span key={i} className="text-[9px] text-muted-foreground bg-secondary px-1 py-px rounded leading-none">{name}</span>
                      ))}
                      {!isExpanded && serviceNames.length > 2 && (
                        <span className="text-[9px] text-primary font-semibold px-1 py-px leading-none">+{serviceNames.length - 2}</span>
                      )}
                    </div>

                    {/* Action buttons - always visible */}
                    {booking.status === 'serving' && (
                      <button onClick={(e) => { e.stopPropagation(); completeService(booking.id); }} className="mt-1 w-full flex items-center justify-center gap-1 bg-emerald-600 text-white py-1.5 rounded-lg text-[10px] font-bold active:scale-95 transition-transform">
                        <Check className="w-3 h-3" /> COMPLETE
                      </button>
                    )}
                    {booking.status === 'waiting' && (
                      <div className="flex gap-1 mt-1">
                        <button onClick={(e) => { e.stopPropagation(); startService(booking.id); }} className="flex-1 flex items-center justify-center gap-1 bg-foreground text-background py-1.5 rounded-lg text-[10px] font-bold active:scale-95 transition-transform">
                          START
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleCancelRequest(booking.id); }} className="flex items-center justify-center px-2 py-1.5 rounded-lg bg-destructive/10 text-destructive active:scale-95 transition-transform">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
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
      </div>

      {/* Walk-In Drawer */}
      <ActionDrawer open={wiDrawerOpen} onClose={() => setWiDrawerOpen(false)} title="Add Walk-in" description={`Queue position #${staffAppointments.length + 1}`}>
        <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
          {waitingQueue.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Current Queue</p>
              <div className="flex flex-col gap-1.5">
                {waitingQueue.map(a => (
                  <div key={a.id} className="flex items-center justify-between bg-secondary rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-foreground">#{a.queueNo}</span>
                      <span className="text-xs text-foreground">{a.clientName}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">~{minsToTime12(timeToMins(a.scheduledTime))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-xl p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Estimated Start</p>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {nextSlot !== null ? minsToTime12(nextSlot) : 'No slots available'}
            </p>
            {nextSlot !== null && (
              <p className="text-xs text-muted-foreground mt-1">
                End: {minsToTime12(nextSlot + manualDuration)}
                {nextSlot + manualDuration > CLOSE_TIME && <span className="text-amber-500 font-bold ml-1">(Overtime)</span>}
                {nextSlot < OPEN_TIME && <span className="text-amber-500 font-bold ml-1">(Before hours)</span>}
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Customer Name</label>
            <input value={walkInName} onChange={e => setWalkInName(e.target.value)} placeholder="Enter client name" className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary" />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Service Duration</label>
            <DurationDial value={manualDuration} onChange={setManualDuration} />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Select Services</label>
            <div className="grid grid-cols-2 gap-2">
              {mockServices.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedServices(p => p.includes(s.id) ? p.filter(x => x !== s.id) : [...p, s.id])}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedServices.includes(s.id) ? 'border-primary bg-primary/10 text-foreground' : 'border-border bg-card text-muted-foreground'
                  }`}
                >
                  <p className="text-xs font-semibold">{s.name}</p>
                  <p className="text-[10px]">₹{s.price} · {s.duration}m</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <button onClick={handleAddWalkIn} disabled={nextSlot === null} className="w-full mt-4 bg-emerald-600 text-white py-3.5 rounded-xl font-bold text-sm active:scale-95 transition-transform disabled:opacity-30 flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" /> ADD TO QUEUE
        </button>
      </ActionDrawer>

      {/* Cancel Reason Drawer */}
      <ActionDrawer open={cancelDrawerOpen} onClose={() => setCancelDrawerOpen(false)} title="Cancel Appointment" description="Select a reason for cancellation">
        <div className="flex flex-col gap-2">
          {CANCEL_REASONS.map(reason => (
            <button
              key={reason}
              onClick={() => handleCancelConfirm(reason)}
              className="w-full text-left px-4 py-3 rounded-xl bg-secondary hover:bg-destructive/10 text-sm font-medium text-foreground transition-colors active:scale-[0.98]"
            >
              {reason}
            </button>
          ))}
        </div>
      </ActionDrawer>
    </div>
  );
};

export default StaffFloor;
