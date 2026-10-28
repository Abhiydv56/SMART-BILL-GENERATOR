import React, { useState } from 'react';
import {
  Store,
  Building2,
  LogIn,
  Sparkles,
  ShieldCheck,
  Zap,
  Printer,
  Barcode,
  Coins,
  ArrowRight,
  UserCheck,
  ShoppingBag,
  MapPin,
  Mail,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useAuth, PRESET_SHOPS, ShopOwnerProfile } from '../firebase/authContext';

export const AuthScreen: React.FC = () => {
  const { signInWithGoogle, signInWithDemoOwner, signInCustomShop, loading, authError, clearError } = useAuth();
  const [activeTab, setActiveTab] = useState<'switch' | 'new_shop'>('switch');

  // Form state for creating a new custom shopkeeper
  const [formData, setFormData] = useState({
    name: '',
    shopName: '',
    email: '',
    mode: 'small_shop' as 'small_shop' | 'mall',
    city: '',
    state: '',
  });

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.shopName.trim()) return;
    await signInCustomShop({
      name: formData.name.trim(),
      shopName: formData.shopName.trim(),
      email: formData.email.trim() || 'shopkeeper@smartbill.in',
      mode: formData.mode,
      city: formData.city.trim() || 'Mumbai',
      state: formData.state.trim() || 'Maharashtra',
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-black">
      {/* Background ambient glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      {/* Top Banner */}
      <header className="relative z-10 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-black text-xl">
            ₹
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-white tracking-tight">SmartBill POS Cloud</span>
              <span className="text-[10px] uppercase tracking-wider font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
                Multi-Store Edition
              </span>
            </div>
            <p className="text-xs text-slate-400">Cloud Point-of-Sale for Indian Retailers, Malls & Supermarkets</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Firebase Firestore Connected
          </span>
          <span className="text-slate-600">|</span>
          <span>GST Ready (0%, 5%, 12%, 18%, 28%)</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 py-8 md:py-12 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Value Prop & Features */}
        <div className="lg:col-span-5 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            Dedicated Tenant Data for Every Shop Owner
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
            One POS System. <br />
            <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200 bg-clip-text text-transparent">
              Independent Stores for Every Retailer.
            </span>
          </h1>

          <p className="text-slate-300 text-sm leading-relaxed">
            Log in to access your shop's private inventory, live thermal billing counter, customer loyalty rewards, and multi-counter sales reports in the cloud.
          </p>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <ShieldCheck className="w-5 h-5 text-amber-400 mb-1.5" />
              <h3 className="font-semibold text-white text-xs">Isolated Store Data</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Your catalog & sales are strictly private.</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <Coins className="w-5 h-5 text-emerald-400 mb-1.5" />
              <h3 className="font-semibold text-white text-xs">Customer Loyalty</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Earn & redeem reward points on bills.</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <Barcode className="w-5 h-5 text-blue-400 mb-1.5" />
              <h3 className="font-semibold text-white text-xs">Camera Barcode Scanner</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Instant live item detection into cart.</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <Printer className="w-5 h-5 text-purple-400 mb-1.5" />
              <h3 className="font-semibold text-white text-xs">Thermal 80mm Receipts</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">GST compliant receipts + UPI QR code.</p>
            </div>
          </div>

          {/* Quick Info card */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/40 to-slate-900 border border-blue-500/20 text-xs text-blue-200 flex items-start gap-3">
            <Zap className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">Multi-tenant Cloud Architecture</p>
              <p className="mt-0.5 text-blue-300/80">
                Each authenticated shop owner receives their own cloud Firestore collection. Switching shop owners automatically switches products, invoices, and loyalty database.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Authentication Card */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative">
          {/* Google Sign-In Main Action */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white mb-1">Shop Owner Login</h2>
            <p className="text-xs text-slate-400 mb-4">
              Sign in with your Google Account or select an existing shopkeeper profile to start billing.
            </p>

            <button
              onClick={signInWithGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white text-slate-900 font-semibold text-sm hover:bg-slate-100 transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer active:scale-[0.99]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{loading ? 'Signing In...' : 'Sign in with Google'}</span>
            </button>
          </div>

          {/* Auth Error Banner */}
          {authError && (
            <div className="mb-5 p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-xs text-red-200 flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
              <button onClick={clearError} className="text-red-400 hover:text-white font-bold text-sm px-1">
                ×
              </button>
            </div>
          )}

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-slate-900 px-3 text-slate-500 uppercase tracking-wider font-semibold">
                Or Select Shopkeeper Profile
              </span>
            </div>
          </div>

          {/* Tabs for Profiles vs New Shopkeeper */}
          <div className="flex gap-2 p-1 bg-slate-950 rounded-xl mb-4 border border-slate-800">
            <button
              onClick={() => setActiveTab('switch')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'switch'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              Pre-configured Shop Owners
            </button>
            <button
              onClick={() => setActiveTab('new_shop')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'new_shop'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              Register New Shop
            </button>
          </div>

          {/* Tab 1: Pre-configured Shopkeeper Cards */}
          {activeTab === 'switch' && (
            <div className="space-y-3">
              {PRESET_SHOPS.map((shop) => (
                <div
                  key={shop.uid}
                  onClick={() => signInWithDemoOwner(shop)}
                  className="group p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-800/40 transition-all cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-3.5">
                    <img
                      src={shop.photoURL}
                      alt={shop.displayName}
                      className="w-11 h-11 rounded-full object-cover border-2 border-slate-700 group-hover:border-amber-400 transition-colors"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white group-hover:text-amber-300 transition-colors">
                          {shop.displayName}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            shop.shopMode === 'mall'
                              ? 'bg-purple-950/80 text-purple-300 border border-purple-800'
                              : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                          }`}
                        >
                          {shop.shopMode === 'mall' ? 'Mall POS' : 'Kirana / Retail'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 font-medium">{shop.shopName}</p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {shop.city}, {shop.state}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {shop.email}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 group-hover:translate-x-1 transition-transform">
                    <span>Enter POS</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 2: Register New Custom Shopkeeper */}
          {activeTab === 'new_shop' && (
            <form onSubmit={handleCustomSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Owner Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Vikram Singhania"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Shop / Store Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.shopName}
                    onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                    placeholder="e.g. Singhania Supermart"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="vikram@example.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Store Type</label>
                  <select
                    value={formData.mode}
                    onChange={(e) => setFormData({ ...formData, mode: e.target.value as 'small_shop' | 'mall' })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="small_shop">Retail Shop / Kirana / Boutique</option>
                    <option value="mall">Shopping Mall / Hypermarket / Departmental</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g. Pune"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="e.g. Maharashtra"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
              >
                <Store className="w-4 h-4" />
                <span>Launch New Shop POS</span>
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>© 2026 SmartBill POS Cloud. Fast GST & Thermal Billing System.</p>
        <p className="text-slate-400">Firebase Firestore Realtime Cloud • Secure Multi-Store Isolation</p>
      </footer>
    </div>
  );
};
