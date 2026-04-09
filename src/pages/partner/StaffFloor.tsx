import React, { useState, useEffect, useRef, useMemo } from 'react';
import { usePartner } from '@/contexts/PartnerContext';
import {
  mockServices, minsToTime12, minsToTime, timeToMins,
  OPEN_TIME, CLOSE_TIME, PPM,
} from '@/data/partnerMockData';
import ActionDrawer from '@/components/partner/ActionDrawer';
import {
  Plus, Clock, Smartphone, User, Coffee, Check, Minus, List,
  AlertTriangle,
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

/* ── Main Floor Component ── */
const StaffFloor = () => {
  const {
    activeStaff, staffAppointments, completeService, startService,
    addWalkIn, breaks, setBreak, clearBreak, getNextAvailableSlot,
  } = usePartner();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [wiDrawerOpen, setWiDrawerOpen] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [manualDuration, setManualDuration] = useState(30);
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

  if (!activeStaff) return null;

  const barberId = activeStaff.id;
  const breakData = breaks[barberId];
  const nowMins = currentTime.getHours() * 60 + currentTime.getMinutes();
  const isOnBreak = breakData && nowMins < breakData.endMins && nowMins >= breakData.startMins;

  const allBookings = [...staffAppointments].sort((a, b) => timeToMins(a.scheduledTime) - timeToMins(b.scheduledTime));

  // Find earliest and latest to define timeline bounds
  const earliestStart = allBookings.reduce((min, b) => {
    const s = timeToMins(b.scheduledTime);
    return s < min ? s : min;
  }, OPEN_TIME);
  const latestEnd = allBookings.reduce((max, b) => {
    const end = timeToMins(b.scheduledTime) + b.duration;
    return end > max ? end : max;
  }, CLOSE_TIME);

  const timelineStartMins = Math.min(OPEN_TIME, earliestStart);
  const timelineEndMins = Math.max(CLOSE_TIME, latestEnd + 30, nowMins + 60);
  const totalHeight = (timelineEndMins - timelineStartMins) * PPM;

  const nowOffset = (nowMins - timelineStartMins) * PPM;

  const nextSlot = useMemo(() => {
    if (!wiDrawerOpen) return null;
    return getNextAvailableSlot(barberId, manualDuration);
  }, [wiDrawerOpen, barberId, manualDuration, getNextAvailableSlot]);

  const handleAddWalkIn = () => {
    const svcs = mockServices.filter(s => selectedServices.includes(s.id));
    const price = svcs.reduce((acc, s) => acc + s.price, 0);
    addWalkIn(barberId, walkInName, selectedServices, manualDuration, price);
    setWiDrawerOpen(false);
    setWalkInName('');
    setSelectedServices([]);
    setManualDuration(30);
  };

  const waitingQueue = allBookings.filter(a => a.status === 'waiting').sort((a, b) => a.queueNo - b.queueNo);

  // Generate hour marks
  const firstHour = Math.floor(timelineStartMins / 60);
  const lastHour = Math.ceil(timelineEndMins / 60);
  const hours = Array.from({ length: lastHour - firstHour + 1 }, (_, i) => (firstHour + i) * 60);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Staff info + clock header */}
      <div className="bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-lg">
              {activeStaff.avatar}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{activeStaff.name}</p>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isOnBreak ? 'bg-amber-500' : activeStaff.status === 'free' ? 'bg-emerald-500' : 'bg-destructive'}`} />
                <span className="text-[10px] text-muted-foreground font-medium">
                  {isOnBreak ? 'ON BREAK' : activeStaff.status === 'free' ? 'AVAILABLE' : 'BUSY'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 text-primary">
            <Clock className="w-4 h-4" />
            <span className="text-base font-bold font-mono tabular-nums">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Break + Queue controls */}
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
          {/* Continuous timeline track (vertical line from start to end) */}
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-border/40" />

          {/* Salon hours shading (operational zone) */}
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
                {/* 30-min dash */}
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

          {/* Overtime zone shading */}
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

          {/* Booking cards */}
          {allBookings.map(booking => {
            const bStart = timeToMins(booking.scheduledTime);
            const bEnd = bStart + booking.duration;
            const top = (bStart - timelineStartMins) * PPM;
            const height = booking.duration * PPM;
            const isOvertime = bEnd > CLOSE_TIME;
            const isOvertimeStart = bStart >= CLOSE_TIME;
            const isBeforeOpen = bStart < OPEN_TIME;

            const serviceNames = booking.serviceIds
              .map(sid => mockServices.find(s => s.id === sid)?.name)
              .filter(Boolean);

            const bookingOvertime = booking.status === 'serving' && nowMins > bEnd;

            const borderColor = booking.status === 'completed'
              ? 'border-l-emerald-400'
              : booking.type === 'online'
                ? 'border-l-blue-500'
                : 'border-l-green-500';

            const bgColor = booking.status === 'completed'
              ? 'bg-muted/50'
              : isOvertimeStart || isBeforeOpen
                ? 'bg-amber-50 dark:bg-amber-950/20'
                : 'bg-card';

            return (
              <div
                key={booking.id}
                className={`absolute left-1 right-0 ${bgColor} rounded-xl border border-border border-l-4 ${borderColor} shadow-sm overflow-hidden`}
                style={{ top: `${top}px`, height: `${Math.max(height, 70)}px` }}
              >
                <div className="p-2.5 h-full flex flex-col">
                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mb-1">
                    <span className="text-[9px] font-bold bg-foreground/10 text-foreground px-1.5 py-0.5 rounded-full">#{booking.queueNo}</span>
                    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${
                      booking.type === 'online' ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400' : 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400'
                    }`}>
                      {booking.type === 'online' ? <Smartphone className="w-2.5 h-2.5" /> : <User className="w-2.5 h-2.5" />}
                      {booking.type === 'online' ? 'Online' : 'Walk-in'}
                    </span>
                    {booking.status === 'serving' && (
                      <span className="text-[9px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-full animate-pulse">Serving</span>
                    )}
                    {booking.status === 'waiting' && (
                      <span className="text-[9px] font-medium bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full">Waiting</span>
                    )}
                    {booking.status === 'completed' && (
                      <span className="text-[9px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <Check className="w-2.5 h-2.5" /> Done
                      </span>
                    )}
                    {bookingOvertime && (
                      <span className="text-[9px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <AlertTriangle className="w-2.5 h-2.5" /> Overtime
                      </span>
                    )}
                    {(isOvertime || isBeforeOpen) && booking.status !== 'completed' && !bookingOvertime && (
                      <span className="text-[9px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 px-1.5 py-0.5 rounded-full">OT</span>
                    )}
                  </div>

                  <p className={`text-sm font-bold ${booking.status === 'completed' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{booking.clientName}</p>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {serviceNames.map((name, i) => (
                      <span key={i} className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{name}</span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 mt-auto text-[10px] text-muted-foreground">
                    <span>{minsToTime12(bStart)} – {minsToTime12(bEnd)}</span>
                    <span>{booking.duration}min</span>
                    <span className="font-semibold">₹{booking.price}</span>
                  </div>

                  {booking.status === 'serving' && (
                    <button onClick={() => completeService(booking.id)} className="mt-1.5 w-full flex items-center justify-center gap-1.5 bg-emerald-600 text-white py-2 rounded-lg text-xs font-bold active:scale-95 transition-transform">
                      <Check className="w-3.5 h-3.5" /> COMPLETE
                    </button>
                  )}
                  {booking.status === 'waiting' && (
                    <button onClick={() => startService(booking.id)} className="mt-1.5 w-full flex items-center justify-center gap-1.5 bg-foreground text-background py-2 rounded-lg text-xs font-bold active:scale-95 transition-transform">
                      START
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Current time indicator (red line with pulsing dot) */}
          {nowMins >= timelineStartMins && nowMins <= timelineEndMins && (
            <div className="absolute left-0 right-0 z-20 flex items-center pointer-events-none" style={{ top: `${nowOffset}px` }}>
              <div className="relative -ml-1.5">
                <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
                <div className="absolute inset-0 w-3 h-3 rounded-full bg-destructive/40 animate-ping" />
              </div>
              <div className="flex-1 h-[2px] bg-destructive" />
              <span className="text-[9px] font-bold text-destructive ml-1 bg-background px-1 rounded">NOW</span>
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
    </div>
  );
};

export default StaffFloor;
