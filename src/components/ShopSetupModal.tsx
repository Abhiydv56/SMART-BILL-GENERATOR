import React, { useState } from 'react';
import {
  Store,
  Building2,
  Save,
  RotateCcw,
  Check,
  AlertCircle,
  QrCode,
  FileText,
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { ShopConfig, Language, ShopMode } from '../types';
import { validateGSTIN } from '../utils/formatters';
import { translations, getTranslation } from '../utils/translations';

interface ShopSetupModalProps {
  shopConfig: ShopConfig;
  onSave: (config: ShopConfig) => void;
  onResetDemo: (mode: ShopMode) => void;
  lang: Language;
}

export const ShopSetupModal: React.FC<ShopSetupModalProps> = ({
  shopConfig,
  onSave,
  onResetDemo,
  lang,
}) => {
  const [formData, setFormData] = useState<ShopConfig>({ ...shopConfig });
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const t = (key: keyof typeof translations['en']) => getTranslation(lang, key);

  const handleChange = (field: keyof ShopConfig, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg('Store or Mall name is required.');
      return;
    }

    if (formData.gstin && !validateGSTIN(formData.gstin)) {
      setErrorMsg('Invalid GSTIN format (must be 15 characters, e.g. 07AAAAA0000A1Z5).');
      return;
    }

    setErrorMsg('');
    onSave(formData);
    setSuccessMsg(t('settingsSaved'));
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleResetDemoClick = () => {
    if (window.confirm('Reset app data to default demo products, bills, and cashier records?')) {
      onResetDemo(formData.mode);
      setSuccessMsg(t('demoDataLoaded'));
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Toast Messages */}
      {successMsg && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-neutral-200 shadow-2xs overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-neutral-200 bg-neutral-50/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">
              {t('shopSetupTitle')}
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Configure your retail business profile, mode, tax credentials, and receipt footers
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetDemoClick}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-lg transition-colors shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5 text-neutral-500" />
              <span>{t('resetDemoData')}</span>
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{t('saveSettings')}</span>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Mode Switcher */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
              {t('modeSelection')} *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Small Shop */}
              <div
                onClick={() => handleChange('mode', 'small_shop')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  formData.mode === 'small_shop'
                    ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-600'
                    : 'border-neutral-200 hover:border-neutral-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-neutral-900">{t('smallShopMode')}</h3>
                    <span className="text-[11px] text-neutral-500">Kirana, Boutique, Retail</span>
                  </div>
                </div>
                <p className="text-xs text-neutral-600">
                  {t('smallShopDesc')}
                </p>
              </div>

              {/* Mall Mode */}
              <div
                onClick={() => handleChange('mode', 'mall')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  formData.mode === 'mall'
                    ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-600'
                    : 'border-neutral-200 hover:border-neutral-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-neutral-900">{t('mallMode')}</h3>
                    <span className="text-[11px] text-neutral-500">Shopping Malls, Supermarkets</span>
                  </div>
                </div>
                <p className="text-xs text-neutral-600">
                  {t('mallDesc')}
                </p>
              </div>
            </div>
          </div>

          {/* Business Details */}
          <div className="border-t border-neutral-200 pt-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
              Basic Business Profile
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  {t('shopName')} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => handleChange('name', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  {t('tagline')}
                </label>
                <input
                  type="text"
                  value={formData.tagline || ''}
                  onChange={e => handleChange('tagline', e.target.value)}
                  placeholder="e.g. Pure Quality Daily Groceries"
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  {t('address')} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={e => handleChange('address', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  {t('city')} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={e => handleChange('city', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  {t('state')} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.state}
                  onChange={e => handleChange('state', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  {t('pincode')}
                </label>
                <input
                  type="text"
                  value={formData.pincode}
                  onChange={e => handleChange('pincode', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  {t('phone')} *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={e => handleChange('phone', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Tax & UPI Configuration */}
          <div className="border-t border-neutral-200 pt-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
              GSTIN & Digital Payment Setup
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  {t('gstin')} (Indian GST Number)
                </label>
                <input
                  type="text"
                  maxLength={15}
                  placeholder="e.g. 07AAAAA0000A1Z5"
                  value={formData.gstin}
                  onChange={e => handleChange('gstin', e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono uppercase font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  FSSAI License No (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 13320005000123"
                  value={formData.fssai || ''}
                  onChange={e => handleChange('fssai', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  {t('upiId')} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. storename@okhdfcbank"
                  value={formData.upiId}
                  onChange={e => handleChange('upiId', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
                <span className="text-[11px] text-neutral-400 mt-0.5 block">
                  Enables dynamic customer QR code generation at checkout
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  {t('invoicePrefix')}
                </label>
                <input
                  type="text"
                  value={formData.invoicePrefix}
                  onChange={e => handleChange('invoicePrefix', e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono uppercase font-bold"
                />
              </div>
            </div>
          </div>

          {/* Receipt Custom Messages */}
          <div className="border-t border-neutral-200 pt-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
              Receipt Messages (Thermal & A4)
            </h3>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                {t('thermalFooterMsg')}
              </label>
              <textarea
                rows={2}
                value={formData.thermalFooter || ''}
                onChange={e => handleChange('thermalFooter', e.target.value)}
                placeholder="e.g. Goods once sold cannot be returned without bill. Thank you, Visit Again!"
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-neutral-200">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{t('saveSettings')}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
