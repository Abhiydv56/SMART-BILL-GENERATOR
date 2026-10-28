import React, { useState } from 'react';
import {
  Receipt,
  ShoppingCart,
  Package,
  LayoutDashboard,
  History,
  FileSpreadsheet,
  Settings,
  Languages,
  UserCheck,
  Building2,
  Store,
  Award,
  LogOut,
  CloudCheck,
  ChevronDown,
  User,
} from 'lucide-react';
import { ShopConfig, Language, Cashier } from '../types';
import { translations, getTranslation } from '../utils/translations';
import { useAuth } from '../firebase/authContext';

interface HeaderProps {
  currentTab: 'billing' | 'products' | 'dashboard' | 'history' | 'loyalty' | 'reports' | 'setup';
  setCurrentTab: (tab: 'billing' | 'products' | 'dashboard' | 'history' | 'loyalty' | 'reports' | 'setup') => void;
  shopConfig: ShopConfig;
  lang: Language;
  setLang: (lang: Language) => void;
  activeCashier: Cashier;
  onOpenCashierModal: () => void;
  onQuickToggleMode: () => void;
  cloudSyncStatus?: 'syncing' | 'synced' | 'error';
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  shopConfig,
  lang,
  setLang,
  activeCashier,
  onOpenCashierModal,
  onQuickToggleMode,
  cloudSyncStatus = 'synced',
}) => {
  const t = (key: keyof typeof translations['en']) => getTranslation(lang, key);
  const { shopOwner, logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-sm print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Zone 1: Brand Wordmark & Mode Tag */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              {shopConfig.mode === 'mall' ? (
                <Building2 className="w-5 h-5" />
              ) : (
                <Store className="w-5 h-5" />
              )}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap">
                  {shopConfig.name || t('appName')}
                </span>
                <button
                  type="button"
                  onClick={onQuickToggleMode}
                  title="Click to toggle between Small Shop and Mall mode"
                  className="px-2 py-0.5 text-[11px] font-medium tracking-wide uppercase rounded bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors border border-slate-700 whitespace-nowrap"
                >
                  {shopConfig.mode === 'mall' ? t('mallMode') : t('smallShopMode')}
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="truncate max-w-[140px] sm:max-w-xs">
                  {shopConfig.city ? `${shopConfig.city} · GST: ${shopConfig.gstin || 'Unregistered'}` : t('appName')}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Cloud Synced
                </span>
              </div>
            </div>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setCurrentTab('billing')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                currentTab === 'billing'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>{t('billing')}</span>
            </button>

            <button
              onClick={() => setCurrentTab('products')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                currentTab === 'products'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>{t('products')}</span>
            </button>

            <button
              onClick={() => setCurrentTab('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                currentTab === 'dashboard'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>{t('dashboard')}</span>
            </button>

            <button
              onClick={() => setCurrentTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                currentTab === 'history'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <History className="w-4 h-4" />
              <span>{t('billHistory')}</span>
            </button>

            <button
              onClick={() => setCurrentTab('loyalty')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                currentTab === 'loyalty'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Award className="w-4 h-4 text-amber-400" />
              <span>{t('loyaltyClub')}</span>
            </button>

            {shopConfig.mode === 'mall' && (
              <button
                onClick={() => setCurrentTab('reports')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  currentTab === 'reports'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>{t('reports')}</span>
              </button>
            )}

            <button
              onClick={() => setCurrentTab('setup')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                currentTab === 'setup'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>{t('shopSetup')}</span>
            </button>
          </nav>

          {/* Zone 3: Actions (Shopkeeper Profile, Cashier info, Language toggle) */}
          <div className="flex items-center gap-2 shrink-0">
            {shopConfig.mode === 'mall' && (
              <button
                onClick={onOpenCashierModal}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors border border-slate-700 whitespace-nowrap cursor-pointer"
                title={t('switchCashier')}
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline text-slate-400">{activeCashier.counterName}:</span>
                <span className="font-semibold text-white truncate max-w-[90px]">{activeCashier.name}</span>
              </button>
            )}

            {/* Language Toggle EN / HI */}
            <button
              type="button"
              onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors whitespace-nowrap cursor-pointer"
              title="Toggle English / हिंदी"
            >
              <Languages className="w-3.5 h-3.5 text-emerald-400" />
              <span>{lang === 'en' ? 'हिंदी' : 'EN'}</span>
            </button>

            {/* Shop Owner Profile & Switch Store Button */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs text-white transition-all cursor-pointer"
              >
                {shopOwner?.photoURL ? (
                  <img
                    src={shopOwner.photoURL}
                    alt={shopOwner.displayName}
                    className="w-6 h-6 rounded-full object-cover border border-amber-400/50"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-[11px]">
                    {shopOwner?.displayName ? shopOwner.displayName.charAt(0).toUpperCase() : 'S'}
                  </div>
                )}
                <div className="hidden lg:flex flex-col text-left">
                  <span className="font-semibold text-white truncate max-w-[100px] leading-tight">
                    {shopOwner?.displayName || 'Shopkeeper'}
                  </span>
                  <span className="text-[10px] text-amber-400 leading-tight">
                    Owner
                  </span>
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {/* User Menu Dropdown */}
              {isUserMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-50 text-xs"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  <div className="p-2.5 border-b border-slate-800 mb-1">
                    <p className="font-bold text-white text-sm truncate">{shopOwner?.displayName}</p>
                    <p className="text-slate-400 text-[11px] truncate">{shopOwner?.email || 'Authenticated Shop Owner'}</p>
                    <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Active Shop: {shopConfig.name}
                    </div>
                  </div>

                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-colors cursor-pointer text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Switch Shop / Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Horizontal Navigation Scroll */}
        <div className="md:hidden flex items-center gap-2 py-2 overflow-x-auto no-scrollbar border-t border-slate-800">
          <button
            onClick={() => setCurrentTab('billing')}
            className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap cursor-pointer ${
              currentTab === 'billing' ? 'bg-emerald-600 text-white' : 'text-slate-300 bg-slate-800'
            }`}
          >
            {t('billing')}
          </button>
          <button
            onClick={() => setCurrentTab('products')}
            className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap cursor-pointer ${
              currentTab === 'products' ? 'bg-emerald-600 text-white' : 'text-slate-300 bg-slate-800'
            }`}
          >
            {t('products')}
          </button>
          <button
            onClick={() => setCurrentTab('dashboard')}
            className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap cursor-pointer ${
              currentTab === 'dashboard' ? 'bg-emerald-600 text-white' : 'text-slate-300 bg-slate-800'
            }`}
          >
            {t('dashboard')}
          </button>
          <button
            onClick={() => setCurrentTab('history')}
            className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap cursor-pointer ${
              currentTab === 'history' ? 'bg-emerald-600 text-white' : 'text-slate-300 bg-slate-800'
            }`}
          >
            {t('billHistory')}
          </button>
          <button
            onClick={() => setCurrentTab('loyalty')}
            className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap cursor-pointer ${
              currentTab === 'loyalty' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 bg-slate-800'
            }`}
          >
            {t('loyaltyClub')}
          </button>
          {shopConfig.mode === 'mall' && (
            <button
              onClick={() => setCurrentTab('reports')}
              className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap cursor-pointer ${
                currentTab === 'reports' ? 'bg-emerald-600 text-white' : 'text-slate-300 bg-slate-800'
              }`}
            >
              {t('reports')}
            </button>
          )}
          <button
            onClick={() => setCurrentTab('setup')}
            className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap cursor-pointer ${
              currentTab === 'setup' ? 'bg-emerald-600 text-white' : 'text-slate-300 bg-slate-800'
            }`}
          >
            {t('shopSetup')}
          </button>
        </div>
      </div>
    </header>
  );
};
