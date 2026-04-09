import { useState } from 'react';
import { usePartner } from '@/contexts/PartnerContext';
import { Star, Plus, MoreVertical } from 'lucide-react';
import ActionDrawer from '@/components/partner/ActionDrawer';

const OwnerStaff = () => {
  const { staff, addStaffMember } = usePartner();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', role: 'Barber', phone: '', email: '',
    avatar: '💇', specialties: '',
  });

  const avatarOptions = ['💇', '💇‍♂️', '💇‍♀️', '💆', '💆‍♂️', '💆‍♀️', '✂️', '🧔'];

  const handleAdd = () => {
    if (!form.name.trim()) return;
    addStaffMember({
      name: form.name.trim(),
      role: form.role,
      avatar: form.avatar,
      phone: form.phone,
      email: form.email,
    });
    setForm({ name: '', role: 'Barber', phone: '', email: '', avatar: '💇', specialties: '' });
    setDrawerOpen(false);
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-safe">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Staff Directory</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your team, track performance, and oversee availability.</p>
      </div>

      <button
        onClick={() => setDrawerOpen(true)}
        className="w-full py-3 rounded-xl border-2 border-dashed border-primary/40 text-primary text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/5 transition-colors"
      >
        <Plus className="w-4 h-4" /> Add Staff Member
      </button>

      <div className="flex flex-col gap-4">
        {staff.map(s => {
          const reliability = s.bookingsCompleted > 0
            ? Math.round(((s.bookingsCompleted - s.noShows) / s.bookingsCompleted) * 100)
            : 100;

          return (
            <div key={s.id} className="bg-card rounded-2xl p-4 card-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-3xl bg-secondary border-2 ${
                  s.status === 'busy' ? 'border-destructive' : 'border-emerald-500'
                }`}>
                  {s.avatar}
                </div>
                <div className="flex-1">
                  <p className="text-base font-semibold text-foreground">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.role}</p>
                </div>
                <button className="p-1 text-muted-foreground">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-secondary/50 rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground uppercase font-medium">Today</p>
                  <p className="text-lg font-bold text-foreground">₹{s.earnings.today.toLocaleString('en-IN') || '—'}</p>
                </div>
                <div className="bg-secondary/50 rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground uppercase font-medium">Week</p>
                  <p className="text-lg font-bold text-foreground">₹{(s.earnings.week / 1000).toFixed(1)}k</p>
                </div>
                <div className="bg-secondary/50 rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground uppercase font-medium">Month</p>
                  <p className="text-lg font-bold text-foreground">₹{(s.earnings.month / 1000).toFixed(1)}k</p>
                </div>
                <div className="bg-secondary/50 rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground uppercase font-medium">Reliability</p>
                  <p className="text-lg font-bold text-primary">{reliability}%</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Staff Drawer */}
      <ActionDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Add Staff Member" description="Onboard a new team member">
        <div className="flex flex-col gap-4">
          {/* Avatar picker */}
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-2 block">Choose Avatar</label>
            <div className="flex gap-2 flex-wrap">
              {avatarOptions.map(a => (
                <button
                  key={a}
                  onClick={() => setForm(f => ({ ...f, avatar: a }))}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-xl border-2 transition-all ${
                    form.avatar === a ? 'border-primary bg-primary/10 scale-110' : 'border-border bg-secondary'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1 block">Full Name *</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Arjun Sharma"
              className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1 block">Role</label>
            <select
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground"
            >
              <option>Barber</option>
              <option>Senior Stylist</option>
              <option>Master Stylist</option>
              <option>Junior Stylist</option>
              <option>Trainee</option>
              <option>Nail Technician</option>
              <option>Spa Therapist</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1 block">Phone Number</label>
            <input
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="9876543210"
              type="tel"
              className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1 block">Email (optional)</label>
            <input
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="staff@salon.com"
              type="email"
              className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <button
            onClick={handleAdd}
            disabled={!form.name.trim()}
            className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-bold text-sm active:scale-95 transition-transform disabled:opacity-30"
          >
            Add to Team
          </button>
        </div>
      </ActionDrawer>
    </div>
  );
};

export default OwnerStaff;
