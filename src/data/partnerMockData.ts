// ── Salon Owner & Staff App — Mock Data ──

export interface StaffMember {
  id: string;
  name: string;
  initials: string;
  avatar: string;
  role: string;
  status: 'free' | 'busy';
  busySince?: number;
  earnings: { today: number; week: number; month: number };
  bookingsCompleted: number;
  noShows: number;
  rating: number;
  reviews: Review[];
  isOwner?: boolean;
}

export interface Review {
  id: string;
  clientName: string;
  rating: number;
  comment: string;
  date: string;
  serviceTags?: string[];
  beforeImage?: string;
  afterImage?: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
}

export interface SalonService {
  id: string;
  name: string;
  category: string;
  categoryId: string;
  duration: number;
  price: number;
  gender: 'male' | 'female' | 'unisex';
}

export interface ServicePackage {
  id: string;
  name: string;
  serviceIds: string[];
  totalValue: number;
  bundlePrice: number;
  validityDays: number;
  weekdaysOnly: boolean;
  commissionPercent: number;
  createdAt: string;
}

export interface Appointment {
  id: string;
  clientName: string;
  clientPhone: string;
  bookingCount: number;
  noShowCount: number;
  staffId: string;
  serviceIds: string[];
  date: string;
  scheduledTime: string; // "HH:MM" 24h
  duration: number;
  price: number;
  status: 'waiting' | 'serving' | 'completed' | 'cancelled';
  type: 'online' | 'walkin';
  queueNo: number;
  startedAt?: number;
  completedAt?: number;
}

export interface BreakInfo {
  startMins: number;
  endMins: number;
}

export interface FinancialSummary {
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  fundsAvailable: number;
  nextPayoutDate: string;
  payoutHistory: { date: string; amount: number }[];
}

// ── Time helpers ──
export const timeToMins = (timeStr: string): number => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m || 0);
};

export const minsToTime = (mins: number): string => {
  const h = Math.floor(mins / 60);
  const m = Math.floor(mins % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const minsToTime12 = (mins: number): string => {
  let h = Math.floor(mins / 60);
  const m = Math.floor(mins % 60);
  const period = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  if (h > 12) h -= 12;
  return `${h}:${String(m).padStart(2, '0')} ${period}`;
};

export const OPEN_TIME = 9 * 60;
export const CLOSE_TIME = 21 * 60;
export const SLOT_INTERVAL = 30;
export const PPM = 7; // pixels per minute

// ── Categories ──
export const mockCategories: ServiceCategory[] = [
  { id: 'cat1', name: 'Hair' },
  { id: 'cat2', name: 'Grooming' },
  { id: 'cat3', name: 'Skin' },
  { id: 'cat4', name: 'Wellness' },
  { id: 'cat5', name: 'Nails' },
];

// ── Staff ──
export const mockStaff: StaffMember[] = [
  {
    id: 's1', name: 'Arjun', initials: 'AS', avatar: '💇‍♂️', role: 'Senior Stylist',
    status: 'free', earnings: { today: 840, week: 4200, month: 18500 },
    bookingsCompleted: 48, noShows: 1, rating: 4.8,
    reviews: [
      { id: 'r1', clientName: 'Rahul S.', rating: 5, comment: 'Best haircut ever! Very professional.', date: '2025-06-01', serviceTags: ['Skin Fade', 'Beard Trim'], beforeImage: 'before', afterImage: 'after' },
      { id: 'r2', clientName: 'Amit K.', rating: 4, comment: 'Good service, slight wait.', date: '2025-05-28', serviceTags: ['Haircut'] },
      { id: 'r3', clientName: 'Vikram P.', rating: 5, comment: 'Amazing beard work!', date: '2025-05-25', serviceTags: ['Beard Trim'], beforeImage: 'before', afterImage: 'after' },
    ],
  },
  {
    id: 's2', name: 'Binod', initials: 'BK', avatar: '💇‍♀️', role: 'Barber',
    status: 'busy', busySince: Date.now() - 25 * 60000, earnings: { today: 0, week: 3800, month: 14200 },
    bookingsCompleted: 72, noShows: 0, rating: 4.9,
    reviews: [
      { id: 'r4', clientName: 'Sneha I.', rating: 5, comment: 'Perfect coloring every time!', date: '2025-06-02', serviceTags: ['Hair Color'] },
    ],
  },
  {
    id: 's3', name: 'Divya', initials: 'DN', avatar: '💆‍♂️', role: 'Master Stylist',
    status: 'free', earnings: { today: 0, week: 3200, month: 12800 },
    bookingsCompleted: 35, noShows: 2, rating: 4.6,
    reviews: [],
  },
];

// ── Services ──
export const mockServices: SalonService[] = [
  { id: 'sv1', name: 'Haircut', category: 'Hair', categoryId: 'cat1', duration: 30, price: 250, gender: 'unisex' },
  { id: 'sv2', name: 'Beard Trim', category: 'Grooming', categoryId: 'cat2', duration: 20, price: 150, gender: 'male' },
  { id: 'sv3', name: 'Skin Fade', category: 'Hair', categoryId: 'cat1', duration: 45, price: 400, gender: 'male' },
  { id: 'sv4', name: 'Facial', category: 'Skin', categoryId: 'cat3', duration: 45, price: 500, gender: 'unisex' },
  { id: 'sv5', name: 'Hair Color', category: 'Hair', categoryId: 'cat1', duration: 60, price: 800, gender: 'unisex' },
  { id: 'sv6', name: 'Head Massage', category: 'Wellness', categoryId: 'cat4', duration: 30, price: 300, gender: 'unisex' },
  { id: 'sv7', name: 'Keratin Treatment', category: 'Hair', categoryId: 'cat1', duration: 120, price: 5000, gender: 'female' },
  { id: 'sv8', name: 'Manicure', category: 'Nails', categoryId: 'cat5', duration: 30, price: 800, gender: 'female' },
];

// ── Packages ──
export const mockPackages: ServicePackage[] = [
  {
    id: 'p1', name: 'Complete Makeover',
    serviceIds: ['sv1', 'sv5', 'sv4'],
    totalValue: 1550, bundlePrice: 1350, validityDays: 180, weekdaysOnly: true,
    commissionPercent: 35, createdAt: '2025-05-01',
  },
  {
    id: 'p2', name: 'Groom\'s Special',
    serviceIds: ['sv1', 'sv2', 'sv6'],
    totalValue: 700, bundlePrice: 550, validityDays: 30, weekdaysOnly: false,
    commissionPercent: 12, createdAt: '2025-04-15',
  },
];

// ── Today's appointments ──
const today = new Date().toISOString().split('T')[0];
export const mockAppointments: Appointment[] = [
  {
    id: 'a1', clientName: 'Rahul M.', clientPhone: '9876543210', bookingCount: 3, noShowCount: 0,
    staffId: 's1', serviceIds: ['sv3', 'sv2'], date: today, scheduledTime: '10:00', duration: 45,
    price: 400, status: 'serving', type: 'online', queueNo: 1, startedAt: Date.now() - 20 * 60000,
  },
  {
    id: 'a2', clientName: 'Amit Singh', clientPhone: '9876543211', bookingCount: 1, noShowCount: 0,
    staffId: 's1', serviceIds: ['sv1'], date: today, scheduledTime: '11:00', duration: 30,
    price: 250, status: 'waiting', type: 'online', queueNo: 2,
  },
  {
    id: 'a3', clientName: 'Sneha Iyer', clientPhone: '9876543213', bookingCount: 8, noShowCount: 0,
    staffId: 's2', serviceIds: ['sv5', 'sv4'], date: today, scheduledTime: '10:30', duration: 90,
    price: 1300, status: 'serving', type: 'online', queueNo: 1, startedAt: Date.now() - 30 * 60000,
  },
  {
    id: 'a4', clientName: 'Vikram Patel', clientPhone: '9876543212', bookingCount: 2, noShowCount: 1,
    staffId: 's3', serviceIds: ['sv4'], date: today, scheduledTime: '12:00', duration: 45,
    price: 500, status: 'waiting', type: 'walkin', queueNo: 1,
  },
];

// ── Financial ──
export const mockFinancials: FinancialSummary = {
  todayRevenue: 4200,
  weekRevenue: 28500,
  monthRevenue: 112000,
  fundsAvailable: 45200,
  nextPayoutDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
  payoutHistory: [
    { date: '2025-06-01', amount: 42000 },
    { date: '2025-05-15', amount: 38500 },
    { date: '2025-05-01', amount: 41200 },
  ],
};

export const OWNER_PIN = '1234';
