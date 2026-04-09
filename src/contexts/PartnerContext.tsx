import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  mockStaff, mockAppointments, StaffMember, Appointment, BreakInfo,
  mockServices, timeToMins, minsToTime, OPEN_TIME, CLOSE_TIME,
} from '@/data/partnerMockData';

export interface ServiceLog {
  id: string;
  appointmentId: string;
  staffId: string;
  clientName: string;
  serviceIds: string[];
  duration: number;
  price: number;
  type: 'online' | 'walkin';
  scheduledTime: string;
  startedAt: number;
  completedAt: number;
  date: string;
}

interface PartnerState {
  activeStaffId: string | null;
  staff: StaffMember[];
  appointments: Appointment[];
  breaks: Record<string, BreakInfo | null>;
  serviceLogs: ServiceLog[];
  setActiveStaff: (id: string) => void;
  toggleStaffStatus: (id: string) => void;
  updateAppointmentStatus: (id: string, status: Appointment['status']) => void;
  completeService: (id: string) => void;
  startService: (id: string) => void;
  addWalkIn: (barberId: string, name: string, serviceIds: string[], duration: number, price: number) => string | null;
  setBreak: (staffId: string, durationMins: number) => void;
  clearBreak: (staffId: string) => void;
  getNextAvailableSlot: (barberId: string, duration: number) => number | null;
  activeStaff: StaffMember | null;
  staffAppointments: Appointment[];
  getStaffLogs: (staffId: string) => ServiceLog[];
  addStaffMember: (data: { name: string; role: string; avatar: string; phone?: string; email?: string }) => void;
}

const PartnerContext = createContext<PartnerState | null>(null);

export const usePartner = () => {
  const ctx = useContext(PartnerContext);
  if (!ctx) throw new Error('usePartner must be inside PartnerProvider');
  return ctx;
};

export const PartnerProvider = ({ children }: { children: ReactNode }) => {
  const [activeStaffId, setActiveStaffId] = useState<string | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>(mockStaff);
  const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments);
  const [breaks, setBreaks] = useState<Record<string, BreakInfo | null>>({});
  const [serviceLogs, setServiceLogs] = useState<ServiceLog[]>([]);

  const setActiveStaff = useCallback((id: string) => setActiveStaffId(id), []);

  const toggleStaffStatus = useCallback((id: string) => {
    setStaff(prev => prev.map(s =>
      s.id === id
        ? { ...s, status: s.status === 'free' ? 'busy' : 'free', busySince: s.status === 'free' ? Date.now() : undefined }
        : s
    ));
  }, []);

  const updateAppointmentStatus = useCallback((id: string, status: Appointment['status']) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  }, []);

  const completeService = useCallback((id: string) => {
    setAppointments(prev => {
      const target = prev.find(a => a.id === id);
      if (!target) return prev;
      // Log the completed service
      const log: ServiceLog = {
        id: `log-${Date.now()}`,
        appointmentId: target.id,
        staffId: target.staffId,
        clientName: target.clientName,
        serviceIds: target.serviceIds,
        duration: target.duration,
        price: target.price,
        type: target.type,
        scheduledTime: target.scheduledTime,
        startedAt: target.startedAt || Date.now(),
        completedAt: Date.now(),
        date: target.date,
      };
      setServiceLogs(logs => [...logs, log]);
      return prev.map(a => a.id === id ? { ...a, status: 'completed' as const, completedAt: Date.now() } : a);
    });
  }, []);

  const startService = useCallback((id: string) => {
    setAppointments(prev => {
      const target = prev.find(a => a.id === id);
      if (!target) return prev;
      return prev.map(a => {
        if (a.id === id) return { ...a, status: 'serving' as const, startedAt: Date.now() };
        if (a.staffId === target.staffId && a.status === 'serving') return { ...a, status: 'waiting' as const };
        return a;
      });
    });
  }, []);

  const getNextAvailableSlot = useCallback((barberId: string, duration: number): number | null => {
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const barberBookings = appointments
      .filter(b => b.staffId === barberId && b.status !== 'completed' && b.status !== 'cancelled')
      .map(b => ({ start: timeToMins(b.scheduledTime), end: timeToMins(b.scheduledTime) + b.duration }))
      .sort((a, b) => a.start - b.start);

    const breakData = breaks[barberId];
    let searchPointer = Math.max(nowMins, OPEN_TIME);

    // No hard upper limit - allow overtime
    const maxTime = 24 * 60;
    while (searchPointer + duration <= maxTime) {
      const bookingConflict = barberBookings.find(b =>
        (searchPointer >= b.start && searchPointer < b.end) ||
        (searchPointer + duration > b.start && searchPointer + duration <= b.end) ||
        (searchPointer <= b.start && searchPointer + duration >= b.end)
      );
      const breakConflict = breakData && searchPointer < breakData.endMins && searchPointer + duration > breakData.startMins;

      if (bookingConflict) {
        searchPointer = bookingConflict.end;
      } else if (breakConflict) {
        searchPointer = breakData!.endMins;
      } else {
        return searchPointer;
      }
    }
    return null;
  }, [appointments, breaks]);

  const addWalkIn = useCallback((barberId: string, name: string, serviceIds: string[], duration: number, price: number): string | null => {
    const slot = getNextAvailableSlot(barberId, duration);
    if (slot === null) return null;

    const maxQueue = appointments.filter(a => a.staffId === barberId).reduce((max, a) => Math.max(max, a.queueNo), 0);
    const newAppt: Appointment = {
      id: `w${Date.now()}`,
      clientName: name || 'Walk-in Customer',
      clientPhone: '',
      bookingCount: 0,
      noShowCount: 0,
      staffId: barberId,
      serviceIds,
      date: new Date().toISOString().split('T')[0],
      scheduledTime: minsToTime(slot),
      duration,
      price,
      status: 'waiting',
      type: 'walkin',
      queueNo: maxQueue + 1,
    };
    setAppointments(prev => [...prev, newAppt]);
    return newAppt.id;
  }, [appointments, getNextAvailableSlot]);

  const setBreak = useCallback((staffId: string, durationMins: number) => {
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    setBreaks(prev => ({ ...prev, [staffId]: { startMins: nowMins, endMins: nowMins + durationMins } }));
  }, []);

  const clearBreak = useCallback((staffId: string) => {
    setBreaks(prev => ({ ...prev, [staffId]: null }));
  }, []);

  const getStaffLogs = useCallback((staffId: string) => {
    return serviceLogs.filter(l => l.staffId === staffId);
  }, [serviceLogs]);

  const addStaffMember = useCallback((data: { name: string; role: string; avatar: string; phone?: string; email?: string }) => {
    const newStaff: StaffMember = {
      id: `s${Date.now()}`,
      name: data.name,
      initials: data.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
      avatar: data.avatar,
      role: data.role,
      status: 'free',
      earnings: { today: 0, week: 0, month: 0 },
      bookingsCompleted: 0,
      noShows: 0,
      rating: 0,
      reviews: [],
    };
    setStaff(prev => [...prev, newStaff]);
  }, []);

  const activeStaff = staff.find(s => s.id === activeStaffId) ?? null;
  const staffAppointments = appointments.filter(a => a.staffId === activeStaffId);

  return (
    <PartnerContext.Provider value={{
      activeStaffId, staff, appointments, breaks, serviceLogs, setActiveStaff, toggleStaffStatus,
      updateAppointmentStatus, completeService, startService, addWalkIn, setBreak, clearBreak,
      getNextAvailableSlot, activeStaff, staffAppointments, getStaffLogs, addStaffMember,
    }}>
      {children}
    </PartnerContext.Provider>
  );
};
