import { useState } from 'react';
import { usePartner } from '@/contexts/PartnerContext';
import { mockServices, mockCategories, mockPackages, ServicePackage, ServiceCategory, SalonService } from '@/data/partnerMockData';
import ActionDrawer from '@/components/partner/ActionDrawer';
import { Plus, Package, ChevronRight, Check, Pencil, Trash2, FolderPlus } from 'lucide-react';

const OwnerGrowth = () => {
  const [packages, setPackages] = useState<ServicePackage[]>(mockPackages);
  const [categories, setCategories] = useState<ServiceCategory[]>(mockCategories);
  const [services, setServices] = useState<SalonService[]>(mockServices);
  const [activeTab, setActiveTab] = useState<'services' | 'packages'>('services');

  // Package builder
  const [building, setBuilding] = useState(false);
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [form, setForm] = useState({ name: '', price: '', validity: '30', weekdaysOnly: false, commission: '10' });

  // Category/service creation
  const [catDrawer, setCatDrawer] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [svcDrawer, setSvcDrawer] = useState(false);
  const [svcForm, setSvcForm] = useState({ name: '', categoryId: '', duration: '30', price: '', gender: 'unisex' as 'male' | 'female' | 'unisex' });

  const totalValue = selected.reduce((sum, id) => sum + (services.find(s => s.id === id)?.price ?? 0), 0);

  const handleCreatePackage = () => {
    const pkg: ServicePackage = {
      id: `p${Date.now()}`,
      name: form.name,
      serviceIds: selected,
      totalValue,
      bundlePrice: Number(form.price) || totalValue,
      validityDays: Number(form.validity),
      weekdaysOnly: form.weekdaysOnly,
      commissionPercent: Number(form.commission),
      createdAt: new Date().toISOString().split('T')[0],
    };
    setPackages(prev => [...prev, pkg]);
    setBuilding(false);
    setStep(0);
    setSelected([]);
    setForm({ name: '', price: '', validity: '30', weekdaysOnly: false, commission: '10' });
  };

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    setCategories(prev => [...prev, { id: `cat${Date.now()}`, name: newCatName.trim() }]);
    setNewCatName('');
    setCatDrawer(false);
  };

  const handleAddService = () => {
    if (!svcForm.name.trim() || !svcForm.categoryId || !svcForm.price) return;
    const cat = categories.find(c => c.id === svcForm.categoryId);
    const newSvc: SalonService = {
      id: `sv${Date.now()}`,
      name: svcForm.name.trim(),
      category: cat?.name || '',
      categoryId: svcForm.categoryId,
      duration: Number(svcForm.duration) || 30,
      price: Number(svcForm.price),
      gender: svcForm.gender,
    };
    setServices(prev => [...prev, newSvc]);
    setSvcForm({ name: '', categoryId: '', duration: '30', price: '', gender: 'unisex' });
    setSvcDrawer(false);
  };

  const deletePackage = (id: string) => setPackages(prev => prev.filter(p => p.id !== id));

  // Group services by category
  const groupedServices = categories.map(cat => ({
    ...cat,
    services: services.filter(s => s.categoryId === cat.id),
  }));

  return (
    <div className="flex flex-col gap-4 p-4 pb-safe">
      <h1 className="text-xl font-heading font-bold text-foreground">Growth Center</h1>

      {/* Tabs */}
      <div className="flex bg-secondary rounded-xl p-1">
        <button onClick={() => setActiveTab('services')} className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'services' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
          Services
        </button>
        <button onClick={() => setActiveTab('packages')} className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'packages' ? 'bg-gradient-to-r from-pink-500 to-rose-400 text-white shadow-sm' : 'text-muted-foreground'}`}>
          Packages
        </button>
      </div>

      {activeTab === 'services' ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">All Services ({services.length})</h2>
            <div className="flex gap-1.5">
              <button onClick={() => setCatDrawer(true)} className="flex items-center gap-1 bg-secondary text-foreground px-3 py-1.5 rounded-lg text-xs font-semibold">
                <FolderPlus className="w-3 h-3" /> Category
              </button>
              <button onClick={() => setSvcDrawer(true)} className="flex items-center gap-1 bg-gradient-to-r from-pink-500 to-rose-400 text-white px-3 py-1.5 rounded-lg text-xs font-semibold">
                <Plus className="w-3 h-3" /> Service
              </button>
            </div>
          </div>

          {groupedServices.map(group => (
            <div key={group.id} className="mb-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{group.name}</p>
              {group.services.length === 0 ? (
                <button onClick={() => { setSvcForm(f => ({ ...f, categoryId: group.id })); setSvcDrawer(true); }} className="w-full py-3 border border-dashed border-border rounded-xl text-xs text-muted-foreground hover:bg-secondary/50 transition-colors">
                  + Add first service
                </button>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {group.services.map(s => (
                    <div key={s.id} className="bg-card rounded-xl p-3 card-shadow flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.duration}min · {s.gender}</p>
                      </div>
                      <p className="text-sm font-bold text-foreground">₹{s.price}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Packages</h2>
            <button onClick={() => { setBuilding(true); setStep(0); }} className="flex items-center gap-1 bg-gradient-to-r from-pink-500 to-rose-400 text-white px-3 py-1.5 rounded-lg text-xs font-semibold">
              <Plus className="w-3 h-3" /> Create
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {packages.map(p => {
              const discount = Math.round((1 - p.bundlePrice / p.totalValue) * 100);
              const serviceNames = p.serviceIds.map(sid => services.find(sv => sv.id === sid)?.name).filter(Boolean);
              return (
                <div key={p.id} className="bg-card rounded-2xl p-4 card-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-pink-600" />
                      <div>
                        <p className="text-sm font-bold text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.serviceIds.length} services</p>
                      </div>
                    </div>
                    <button onClick={() => deletePackage(p.id)} className="p-1.5 text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg font-bold text-foreground">₹{p.bundlePrice.toLocaleString('en-IN')}</span>
                    <span className="text-sm text-muted-foreground line-through">₹{p.totalValue}</span>
                    <span className="text-xs font-bold text-emerald-600">{discount}% off</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {serviceNames.map((name, i) => (
                      <span key={i} className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded">{name}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Package Builder Drawer */}
      <ActionDrawer open={building} onClose={() => setBuilding(false)} title="Create Package">
        <div className="flex items-center gap-2 mb-4">
          {['Select', 'Configure'].map((label, i) => (
            <div key={label} className={`flex-1 h-1 rounded-full ${i <= step ? 'bg-primary' : 'bg-secondary'}`} />
          ))}
        </div>

        {step === 0 ? (
          <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto">
            {services.map(s => (
              <button key={s.id} onClick={() => setSelected(prev => prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id])} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${selected.includes(s.id) ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}>
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.category} · {s.duration}min · ₹{s.price}</p>
                </div>
                {selected.includes(s.id) && <Check className="w-4 h-4 text-primary" />}
              </button>
            ))}
            <button disabled={selected.length < 2} onClick={() => setStep(1)} className="btn-themed py-3 rounded-xl text-sm font-semibold mt-2 disabled:opacity-40 flex items-center justify-center gap-1">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Package Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full mt-1 bg-secondary rounded-lg px-3 py-2 text-sm text-foreground" placeholder="e.g. Summer Special" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Bundle Price (Value: ₹{totalValue})</label>
              <input value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} type="number" className="w-full mt-1 bg-secondary rounded-lg px-3 py-2 text-sm text-foreground" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Validity (days)</label>
              <input value={form.validity} onChange={e => setForm(f => ({ ...f, validity: e.target.value }))} type="number" className="w-full mt-1 bg-secondary rounded-lg px-3 py-2 text-sm text-foreground" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Commission %</label>
              <input value={form.commission} onChange={e => setForm(f => ({ ...f, commission: e.target.value }))} type="number" className="w-full mt-1 bg-secondary rounded-lg px-3 py-2 text-sm text-foreground" />
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={form.weekdaysOnly} onChange={e => setForm(f => ({ ...f, weekdaysOnly: e.target.checked }))} className="rounded" />
              Weekdays only
            </label>
            <div className="flex gap-2 mt-2">
              <button onClick={() => setStep(0)} className="flex-1 py-3 rounded-xl text-sm font-semibold bg-secondary text-foreground">Back</button>
              <button onClick={handleCreatePackage} disabled={!form.name} className="flex-1 btn-themed py-3 rounded-xl text-sm font-semibold disabled:opacity-40">Create</button>
            </div>
          </div>
        )}
      </ActionDrawer>

      {/* Add Category Drawer */}
      <ActionDrawer open={catDrawer} onClose={() => setCatDrawer(false)} title="New Category">
        <div className="flex flex-col gap-3">
          <input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Category name (e.g. Spa)" className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary" />
          <button onClick={handleAddCategory} disabled={!newCatName.trim()} className="btn-themed py-3 rounded-xl text-sm font-semibold disabled:opacity-40">Create Category</button>
        </div>
      </ActionDrawer>

      {/* Add Service Drawer */}
      <ActionDrawer open={svcDrawer} onClose={() => setSvcDrawer(false)} title="New Service">
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Service Name</label>
            <input value={svcForm.name} onChange={e => setSvcForm(f => ({ ...f, name: e.target.value }))} className="w-full mt-1 bg-secondary rounded-lg px-3 py-2 text-sm text-foreground" placeholder="e.g. Hot Towel Shave" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Category</label>
            <select value={svcForm.categoryId} onChange={e => setSvcForm(f => ({ ...f, categoryId: e.target.value }))} className="w-full mt-1 bg-secondary rounded-lg px-3 py-2 text-sm text-foreground">
              <option value="">Select category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Duration (min)</label>
              <input value={svcForm.duration} onChange={e => setSvcForm(f => ({ ...f, duration: e.target.value }))} type="number" className="w-full mt-1 bg-secondary rounded-lg px-3 py-2 text-sm text-foreground" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Price (₹)</label>
              <input value={svcForm.price} onChange={e => setSvcForm(f => ({ ...f, price: e.target.value }))} type="number" className="w-full mt-1 bg-secondary rounded-lg px-3 py-2 text-sm text-foreground" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Gender</label>
            <div className="flex gap-2 mt-1">
              {(['unisex', 'male', 'female'] as const).map(g => (
                <button key={g} onClick={() => setSvcForm(f => ({ ...f, gender: g }))} className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${svcForm.gender === g ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground'}`}>
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleAddService} disabled={!svcForm.name || !svcForm.categoryId || !svcForm.price} className="btn-themed py-3 rounded-xl text-sm font-semibold disabled:opacity-40 mt-2">Add Service</button>
        </div>
      </ActionDrawer>
    </div>
  );
};

export default OwnerGrowth;
