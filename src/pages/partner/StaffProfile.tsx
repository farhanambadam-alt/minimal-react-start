import { useState, useMemo } from 'react';
import { usePartner } from '@/contexts/PartnerContext';
import { mockServices } from '@/data/partnerMockData';
import {
  Star, Check, Camera, Image as ImageIcon, Trash2, History, Users,
  Calendar, ChevronLeft, ChevronRight, Filter, Clock, Smartphone, User,
} from 'lucide-react';

type Tab = 'overview' | 'reviews' | 'gallery' | 'logs';

const StaffProfile = () => {
  const { activeStaff, staffAppointments, getStaffLogs } = usePartner();
  const [tab, setTab] = useState<Tab>('overview');
  const [logDate, setLogDate] = useState<string>(''); // '' = today/all
  const [galleryIdx, setGalleryIdx] = useState(0);

  if (!activeStaff) return null;

  const allLogs = getStaffLogs(activeStaff.id);
  const completed = staffAppointments.filter(a => a.status === 'completed').length;
  const remaining = staffAppointments.filter(a => a.status === 'waiting' || a.status === 'serving').length;
  const reliability = activeStaff.bookingsCompleted > 0
    ? Math.round(((activeStaff.bookingsCompleted - activeStaff.noShows) / activeStaff.bookingsCompleted) * 100)
    : 100;

  const ratingCounts = [5, 4, 3, 2, 1].map(r => ({
    stars: r,
    count: activeStaff.reviews.filter(rev => rev.rating === r).length,
  }));
  const totalReviews = activeStaff.reviews.length;
  const galleryReviews = activeStaff.reviews.filter(r => r.beforeImage || r.afterImage);

  // Filtered logs
  const today = new Date().toISOString().split('T')[0];
  const filteredLogs = useMemo(() => {
    if (!logDate) return allLogs; // show all
    return allLogs.filter(l => l.date === logDate);
  }, [allLogs, logDate]);

  const totalEarned = filteredLogs.reduce((s, l) => s + l.price, 0);

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <Users className="w-3.5 h-3.5" /> },
    { key: 'reviews', label: 'Reviews', icon: <Star className="w-3.5 h-3.5" /> },
    { key: 'gallery', label: 'Gallery', icon: <Camera className="w-3.5 h-3.5" /> },
    { key: 'logs', label: 'Logs', icon: <History className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Profile card */}
      <div className="flex flex-col items-center bg-card p-5 border-b border-border">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center text-3xl mb-2">
          {activeStaff.avatar}
        </div>
        <p className="text-lg font-heading font-bold text-foreground">{activeStaff.name}</p>
        <p className="text-xs text-muted-foreground capitalize">{activeStaff.role}</p>
        <div className="flex items-center gap-1 mt-1.5 text-amber-500">
          <Star className="w-4 h-4 fill-current" />
          <span className="text-sm font-bold">{activeStaff.rating}</span>
          <span className="text-xs text-muted-foreground ml-1">({totalReviews} reviews)</span>
        </div>
        {/* Quick stats */}
        <div className="flex gap-4 mt-3">
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{activeStaff.bookingsCompleted}</p>
            <p className="text-[10px] text-muted-foreground">Completed</p>
          </div>
          <div className="w-px bg-border" />
          <div className="text-center">
            <p className="text-lg font-bold text-primary">{reliability}%</p>
            <p className="text-[10px] text-muted-foreground">Reliability</p>
          </div>
          <div className="w-px bg-border" />
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{completed}</p>
            <p className="text-[10px] text-muted-foreground">Today</p>
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex bg-secondary/50 p-1 mx-4 mt-3 rounded-xl gap-0.5">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1 ${
              tab === t.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 p-4 flex flex-col gap-3">
        {tab === 'overview' && (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-card rounded-xl p-3 card-shadow">
                <p className="text-[10px] text-muted-foreground uppercase">Rating</p>
                <div className="flex items-center gap-1 mt-1">
                  <p className="text-xl font-bold text-foreground">{activeStaff.rating}</p>
                  <Star className="w-4 h-4 text-amber-500 fill-current" />
                </div>
              </div>
              <div className="bg-card rounded-xl p-3 card-shadow">
                <p className="text-[10px] text-muted-foreground uppercase">Reliability</p>
                <p className="text-xl font-bold text-primary mt-1">{reliability}%</p>
              </div>
              <div className="bg-card rounded-xl p-3 card-shadow">
                <p className="text-[10px] text-muted-foreground uppercase">No-Shows</p>
                <p className="text-xl font-bold text-destructive mt-1">{activeStaff.noShows}</p>
              </div>
              <div className="bg-card rounded-xl p-3 card-shadow">
                <p className="text-[10px] text-muted-foreground uppercase">Remaining</p>
                <p className="text-xl font-bold text-foreground mt-1">{remaining}</p>
              </div>
            </div>

            {/* Monthly clients chart */}
            <div className="bg-card rounded-xl p-4 card-shadow">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Monthly Clients</p>
              </div>
              <div className="flex items-end gap-1.5 h-24">
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((m, i) => {
                  const val = [28, 35, 32, 40, 38, activeStaff.bookingsCompleted][i];
                  const max = 80;
                  const pct = (val / max) * 100;
                  return (
                    <div key={m} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[8px] text-muted-foreground font-medium">{val}</span>
                      <div className="w-full rounded-t-md bg-primary/15 relative" style={{ height: `${pct}%` }}>
                        <div className="absolute inset-0 bg-primary/60 rounded-t-md" />
                      </div>
                      <span className="text-[9px] text-muted-foreground">{m}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rating breakdown */}
            <div className="bg-card rounded-xl p-4 card-shadow">
              <p className="text-sm font-semibold text-foreground mb-3">Rating Breakdown</p>
              {ratingCounts.map(r => (
                <div key={r.stars} className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs text-foreground w-8 flex items-center gap-0.5">{r.stars}<Star className="w-2.5 h-2.5 text-amber-500 fill-current" /></span>
                  <div className="flex-1 h-2.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: totalReviews > 0 ? `${(r.count / totalReviews) * 100}%` : '0%' }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground w-6 text-right">{r.count}</span>
                </div>
              ))}
            </div>

            {/* Today summary */}
            <div className="bg-card rounded-xl p-4 card-shadow">
              <p className="text-sm font-semibold text-foreground mb-1">Today's Progress</p>
              <p className="text-xs text-muted-foreground mb-2">{completed} completed · {remaining} remaining</p>
              <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(completed + remaining) > 0 ? (completed / (completed + remaining)) * 100 : 0}%` }} />
              </div>
            </div>
          </>
        )}

        {tab === 'reviews' && (
          <div className="flex flex-col gap-2">
            {activeStaff.reviews.length === 0 ? (
              <div className="bg-card rounded-xl p-6 card-shadow text-center">
                <Star className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No reviews yet</p>
              </div>
            ) : (
              activeStaff.reviews.map(r => (
                <div key={r.id} className="bg-card rounded-xl p-4 card-shadow">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-foreground">
                        {r.clientName.charAt(0)}
                      </div>
                      <p className="text-sm font-medium text-foreground">{r.clientName}</p>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < r.rating ? 'text-amber-500 fill-current' : 'text-border'}`} />
                      ))}
                    </div>
                  </div>
                  {r.serviceTags && (
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {r.serviceTags.map((tag, i) => (
                        <span key={i} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">{tag}</span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground leading-relaxed">{r.comment}</p>
                  <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {r.date}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'gallery' && (
          <div className="flex flex-col gap-3">
            {galleryReviews.length === 0 ? (
              <div className="bg-card rounded-xl p-8 card-shadow text-center">
                <Camera className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">No before/after photos yet</p>
                <p className="text-xs text-muted-foreground mt-1">Photos are uploaded by customers from the customer app</p>
              </div>
            ) : (
              <>
                {/* Featured gallery card with navigation */}
                <div className="bg-card rounded-2xl overflow-hidden card-shadow">
                  <div className="relative">
                    <div className="flex">
                      <div className="flex-1 aspect-[3/4] bg-gradient-to-br from-secondary to-muted flex flex-col items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground mt-1 font-medium">Before</span>
                      </div>
                      <div className="w-px bg-border" />
                      <div className="flex-1 aspect-[3/4] bg-gradient-to-br from-primary/10 to-primary/5 flex flex-col items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-primary/40" />
                        <span className="text-[10px] text-primary/60 mt-1 font-medium">After</span>
                      </div>
                    </div>
                    {galleryReviews.length > 1 && (
                      <>
                        <button onClick={() => setGalleryIdx(Math.max(0, galleryIdx - 1))} className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-background/80 flex items-center justify-center" disabled={galleryIdx === 0}>
                          <ChevronLeft className="w-4 h-4 text-foreground" />
                        </button>
                        <button onClick={() => setGalleryIdx(Math.min(galleryReviews.length - 1, galleryIdx + 1))} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-background/80 flex items-center justify-center" disabled={galleryIdx === galleryReviews.length - 1}>
                          <ChevronRight className="w-4 h-4 text-foreground" />
                        </button>
                      </>
                    )}
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-foreground">{galleryReviews[galleryIdx]?.clientName}</p>
                      <p className="text-[10px] text-muted-foreground">{galleryReviews[galleryIdx]?.date}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">{galleryIdx + 1}/{galleryReviews.length}</span>
                      <button className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Thumbnail grid */}
                <div className="grid grid-cols-3 gap-2">
                  {galleryReviews.map((r, i) => (
                    <button
                      key={r.id}
                      onClick={() => setGalleryIdx(i)}
                      className={`aspect-square rounded-xl bg-gradient-to-br from-secondary to-muted flex items-center justify-center border-2 transition-all ${
                        i === galleryIdx ? 'border-primary shadow-md' : 'border-transparent'
                      }`}
                    >
                      <ImageIcon className="w-5 h-5 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'logs' && (
          <div className="flex flex-col gap-3">
            {/* Quick filters */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLogDate('')}
                className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${
                  !logDate ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setLogDate(today)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                  logDate === today ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                }`}
              >
                <Clock className="w-3 h-3" /> Today
              </button>
              <div className="ml-auto flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="date"
                  value={logDate}
                  onChange={e => setLogDate(e.target.value)}
                  className="bg-secondary rounded-lg px-2 py-1.5 text-[11px] text-foreground w-28"
                />
              </div>
            </div>

            {/* Summary bar */}
            <div className="flex items-center justify-between bg-card rounded-xl p-3 card-shadow">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">{filteredLogs.length} services</span>
              </div>
              <span className="text-sm font-bold text-foreground">₹{totalEarned.toLocaleString('en-IN')}</span>
            </div>

            {/* Log list */}
            {filteredLogs.length === 0 ? (
              <div className="bg-card rounded-xl p-6 card-shadow text-center">
                <History className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No logs {logDate ? `for ${logDate}` : 'yet'}</p>
              </div>
            ) : (
              filteredLogs.slice().reverse().map(log => {
                const serviceNames = log.serviceIds.map(sid => mockServices.find(s => s.id === sid)?.name).filter(Boolean);
                return (
                  <div key={log.id} className="bg-card rounded-xl p-3 card-shadow">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-foreground">
                          {log.clientName.charAt(0)}
                        </div>
                        <p className="text-sm font-medium text-foreground">{log.clientName}</p>
                      </div>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${
                        log.type === 'online' ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400' : 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400'
                      }`}>
                        {log.type === 'online' ? <Smartphone className="w-2.5 h-2.5" /> : <User className="w-2.5 h-2.5" />}
                        {log.type === 'online' ? 'Online' : 'Walk-in'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {serviceNames.map((n, i) => (
                        <span key={i} className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded">{n}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" /> {log.duration}min</span>
                      <span className="font-semibold text-foreground">₹{log.price}</span>
                      <span>{new Date(log.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="text-[9px]">{log.date}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffProfile;
