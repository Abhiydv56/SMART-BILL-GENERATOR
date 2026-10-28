import React, { useState } from 'react';
import {
  Award,
  Users,
  Coins,
  TrendingUp,
  Search,
  Plus,
  Sliders,
  Download,
  Phone,
  Calendar,
  ShoppingBag,
  Star,
  Check,
  X,
  AlertCircle,
  Edit2,
  Sparkles,
} from 'lucide-react';
import { CustomerLoyalty, LoyaltyConfig, LoyaltyTier, Language } from '../types';
import { formatINR, formatDateTime } from '../utils/formatters';
import { translations, getTranslation } from '../utils/translations';
import { calculateLoyaltyTier, getTierMultiplier, normalizePhone } from '../utils/storage';

interface LoyaltyManagementProps {
  customers: CustomerLoyalty[];
  setCustomers: React.Dispatch<React.SetStateAction<CustomerLoyalty[]>>;
  loyaltyConfig: LoyaltyConfig;
  setLoyaltyConfig: React.Dispatch<React.SetStateAction<LoyaltyConfig>>;
  lang: Language;
  onNavigateToBillingWithCustomer?: (phone: string, name: string) => void;
}

export const LoyaltyManagement: React.FC<LoyaltyManagementProps> = ({
  customers,
  setCustomers,
  loyaltyConfig,
  setLoyaltyConfig,
  lang,
  onNavigateToBillingWithCustomer,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerLoyalty | null>(null);
  const [pointsAdjustment, setPointsAdjustment] = useState<number>(0);
  const [adjustmentReason, setAdjustmentReason] = useState<string>('');
  const [notification, setNotification] = useState<string>('');

  // Add Member Form state
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustPoints, setNewCustPoints] = useState<number>(0);
  const [newCustNotes, setNewCustNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Loyalty Config Form state
  const [tempConfig, setTempConfig] = useState<LoyaltyConfig>({ ...loyaltyConfig });

  const t = (key: keyof typeof translations['en']) => getTranslation(lang, key);

  // Filter customers
  const filteredCustomers = customers.filter(c => {
    const matchesTier = selectedTier === 'all' || c.tier === selectedTier;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesTier;
    const matchesName = c.name.toLowerCase().includes(q);
    const matchesPhone = c.phone.includes(q);
    return matchesTier && (matchesName || matchesPhone);
  });

  // Analytics Metrics
  const totalMembers = customers.length;
  const activePointsInCirculation = customers.reduce((sum, c) => sum + c.points, 0);
  const totalLifetimeEarned = customers.reduce((sum, c) => sum + c.totalEarned, 0);
  const totalLifetimeRedeemed = customers.reduce((sum, c) => sum + c.totalRedeemed, 0);
  const repeatMembers = customers.filter(c => c.billsCount > 1).length;
  const repeatRate = totalMembers > 0 ? Math.round((repeatMembers / totalMembers) * 100) : 0;

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  };

  // Tier Badge Color Helper
  const getTierBadge = (tier: LoyaltyTier) => {
    switch (tier) {
      case 'Platinum':
        return {
          bg: 'bg-purple-100 text-purple-800 border-purple-300',
          dot: 'bg-purple-500',
          icon: '💎',
        };
      case 'Gold':
        return {
          bg: 'bg-amber-100 text-amber-800 border-amber-300',
          dot: 'bg-amber-500',
          icon: '🥇',
        };
      case 'Silver':
        return {
          bg: 'bg-slate-200 text-slate-800 border-slate-300',
          dot: 'bg-slate-400',
          icon: '🥈',
        };
      case 'Bronze':
      default:
        return {
          bg: 'bg-orange-100 text-orange-800 border-orange-300',
          dot: 'bg-orange-400',
          icon: '🥉',
        };
    }
  };

  // Add New Customer Submit
  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = normalizePhone(newCustPhone);
    if (!clean || clean.length < 10) {
      setFormError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (customers.some(c => normalizePhone(c.phone) === clean)) {
      setFormError('A customer with this mobile number is already enrolled in the Loyalty Club.');
      return;
    }

    const startingPoints = Math.max(0, newCustPoints);
    const tier = calculateLoyaltyTier(startingPoints);

    const newCustomer: CustomerLoyalty = {
      id: clean,
      name: newCustName.trim() || `Customer ${clean.slice(-4)}`,
      phone: clean,
      points: startingPoints,
      totalEarned: startingPoints,
      totalRedeemed: 0,
      totalSpent: 0,
      billsCount: 0,
      tier,
      memberSince: new Date().toISOString(),
      notes: newCustNotes.trim() || undefined,
    };

    setCustomers(prev => [newCustomer, ...prev]);
    setIsAddModalOpen(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustPoints(0);
    setNewCustNotes('');
    setFormError('');
    showNotification(`Member "${newCustomer.name}" successfully enrolled!`);
  };

  // Open Points Adjustment Modal
  const openAdjustModal = (customer: CustomerLoyalty) => {
    setSelectedCustomer(customer);
    setPointsAdjustment(0);
    setAdjustmentReason('');
    setIsAdjustModalOpen(true);
  };

  // Save Points Adjustment
  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    const delta = pointsAdjustment;
    if (delta === 0) {
      setIsAdjustModalOpen(false);
      return;
    }

    const newPoints = Math.max(0, selectedCustomer.points + delta);
    const newTotalEarned = delta > 0 ? selectedCustomer.totalEarned + delta : selectedCustomer.totalEarned;
    const newTier = calculateLoyaltyTier(newTotalEarned);

    const updated = customers.map(c => {
      if (c.id === selectedCustomer.id) {
        return {
          ...c,
          points: newPoints,
          totalEarned: newTotalEarned,
          tier: newTier,
          notes: adjustmentReason
            ? `${c.notes ? c.notes + ' | ' : ''}Adjustment: ${delta > 0 ? '+' : ''}${delta} pts (${adjustmentReason})`
            : c.notes,
        };
      }
      return c;
    });

    setCustomers(updated);
    setIsAdjustModalOpen(false);
    showNotification(
      `Points updated for ${selectedCustomer.name}: ${delta > 0 ? '+' : ''}${delta} pts (New Balance: ${newPoints})`
    );
  };

  // Save Loyalty Rules Config
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setLoyaltyConfig(tempConfig);
    setIsConfigModalOpen(false);
    showNotification('Loyalty rules and settings saved successfully!');
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Customer Name',
      'Phone Number',
      'Tier',
      'Points Balance',
      'Points Rupee Value (INR)',
      'Total Earned',
      'Total Redeemed',
      'Total Spent (INR)',
      'Visits Count',
      'Member Since',
      'Last Visit',
    ];

    const rows = filteredCustomers.map(c => [
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.phone}"`,
      `"${c.tier}"`,
      c.points,
      c.points * loyaltyConfig.pointValueINR,
      c.totalEarned,
      c.totalRedeemed,
      c.totalSpent,
      c.billsCount,
      `"${c.memberSince.slice(0, 10)}"`,
      `"${c.lastVisit ? c.lastVisit.slice(0, 10) : 'Never'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Loyalty_Members_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Notification */}
      {notification && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-semibold text-emerald-900 flex items-center gap-2 shadow-xs animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Banner / Hero Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('loyaltyClub')}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            {lang === 'hi' ? 'ग्राहक रिवॉर्ड्स एवं लॉयल्टी प्रोग्राम' : 'Customer Rewards & Loyalty Club'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {lang === 'hi'
              ? 'ग्राहकों को हर खरीदारी पर पॉइंट्स दें, बार-बार आने के लिए प्रेरित करें और सीधे बिलिंग में रिडीम कराएं।'
              : 'Reward repeat customers on every purchase. Build loyalty with automated points earning, tier multipliers, and instant redemption at POS checkout.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setTempConfig({ ...loyaltyConfig });
              setIsConfigModalOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-bold transition-all shadow-xs"
          >
            <Sliders className="w-4 h-4 text-slate-300" />
            <span>{t('loyaltySettings')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFormError('');
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>{t('addMember')}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Members */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
              {t('totalMembers')}
            </span>
            <h3 className="text-2xl font-black text-neutral-900 mt-1 tabular-nums">
              {totalMembers}
            </h3>
            <span className="text-[11px] text-emerald-600 font-medium">
              {repeatRate}% {t('repeatVisitRate')}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Active Points Balance in circulation */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
              {t('activePoints')}
            </span>
            <h3 className="text-2xl font-black text-neutral-900 mt-1 tabular-nums">
              {activePointsInCirculation.toLocaleString()}
            </h3>
            <span className="text-[11px] text-neutral-500">
              = {formatINR(activePointsInCirculation * loyaltyConfig.pointValueINR)} value
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <Coins className="w-6 h-6" />
          </div>
        </div>

        {/* Lifetime Earned */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
              {t('totalPointsIssued')}
            </span>
            <h3 className="text-2xl font-black text-neutral-900 mt-1 tabular-nums">
              {totalLifetimeEarned.toLocaleString()}
            </h3>
            <span className="text-[11px] text-emerald-600 font-medium">
              +{Math.round((totalLifetimeEarned / Math.max(1, totalMembers)))} avg/member
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Total Points Redeemed */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
              {t('totalPointsRedeemed')}
            </span>
            <h3 className="text-2xl font-black text-neutral-900 mt-1 tabular-nums">
              {totalLifetimeRedeemed.toLocaleString()}
            </h3>
            <span className="text-[11px] text-neutral-500">
              = {formatINR(totalLifetimeRedeemed * loyaltyConfig.pointValueINR)} saved
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <Award className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Members Directory Card */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
        {/* Controls Toolbar */}
        <div className="p-4 sm:p-5 border-b border-neutral-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={
                lang === 'hi'
                  ? 'ग्राहक का नाम या मोबाइल नंबर खोजें...'
                  : 'Search by customer name or 10-digit phone...'
              }
              className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>

          {/* Tier Filter Chips & Export */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {['all', 'Platinum', 'Gold', 'Silver', 'Bronze'].map(tier => (
              <button
                key={tier}
                type="button"
                onClick={() => setSelectedTier(tier)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  selectedTier === tier
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {tier === 'all'
                  ? (lang === 'hi' ? 'सभी टियर' : 'All Tiers')
                  : tier}
              </button>
            ))}

            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 text-neutral-700 bg-white hover:bg-neutral-50 text-xs font-semibold whitespace-nowrap ml-auto"
              title="Download CSV"
            >
              <Download className="w-3.5 h-3.5 text-neutral-500" />
              <span>{t('exportMembers')}</span>
            </button>
          </div>
        </div>

        {/* Customer Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50 text-neutral-600 font-semibold border-b border-neutral-200">
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Tier & Multiplier</th>
                <th className="py-3 px-4 text-right">Points Balance</th>
                <th className="py-3 px-4 text-right">Lifetime Spent</th>
                <th className="py-3 px-4 text-center">Visits</th>
                <th className="py-3 px-4">Member Since</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredCustomers.map(customer => {
                const badge = getTierBadge(customer.tier);
                const multiplier = getTierMultiplier(customer.tier);
                return (
                  <tr
                    key={customer.id}
                    className="hover:bg-neutral-50/80 transition-colors group"
                  >
                    {/* Customer Name & Phone */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-neutral-900 text-sm">{customer.name}</div>
                      <div className="text-[11px] text-neutral-500 font-mono flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-neutral-400" />
                        <span>+91 {customer.phone}</span>
                      </div>
                      {customer.notes && (
                        <div className="text-[10px] text-neutral-400 italic truncate max-w-xs mt-0.5">
                          {customer.notes}
                        </div>
                      )}
                    </td>

                    {/* Tier */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${badge.bg}`}
                        >
                          <span>{badge.icon}</span>
                          <span>{customer.tier}</span>
                        </span>
                        <span className="text-[10px] text-neutral-400 font-semibold">
                          ({multiplier}x earn)
                        </span>
                      </div>
                    </td>

                    {/* Points Balance */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="font-bold text-sm text-amber-700 tabular-nums flex items-center justify-end gap-1">
                        <Coins className="w-3.5 h-3.5 text-amber-500" />
                        <span>{customer.points.toLocaleString()} pts</span>
                      </div>
                      <div className="text-[10px] text-neutral-400">
                        = {formatINR(customer.points * loyaltyConfig.pointValueINR)} discount
                      </div>
                    </td>

                    {/* Total Spent */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="font-bold text-neutral-800 tabular-nums">
                        {formatINR(customer.totalSpent)}
                      </div>
                      <div className="text-[10px] text-neutral-400">
                        Earned: {customer.totalEarned} pts
                      </div>
                    </td>

                    {/* Visits */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center justify-center min-w-6 px-1.5 py-0.5 rounded-full bg-neutral-100 text-neutral-800 font-bold tabular-nums">
                        {customer.billsCount}
                      </span>
                    </td>

                    {/* Member Since / Last Visit */}
                    <td className="py-3.5 px-4 text-neutral-500 text-[11px]">
                      <div>{customer.memberSince.slice(0, 10)}</div>
                      {customer.lastVisit && (
                        <div className="text-[10px] text-neutral-400">
                          Last: {customer.lastVisit.slice(0, 10)}
                        </div>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openAdjustModal(customer)}
                          className="px-2.5 py-1 rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-100 text-xs font-semibold transition-colors flex items-center gap-1"
                          title="Adjust points balance"
                        >
                          <Edit2 className="w-3 h-3 text-neutral-500" />
                          <span>Adjust</span>
                        </button>

                        {onNavigateToBillingWithCustomer && (
                          <button
                            type="button"
                            onClick={() =>
                              onNavigateToBillingWithCustomer(customer.phone, customer.name)
                            }
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center gap-1"
                            title="Start new bill with this customer"
                          >
                            <ShoppingBag className="w-3 h-3" />
                            <span>Bill</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-neutral-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                    <p className="text-sm font-semibold text-neutral-600">
                      {lang === 'hi' ? 'कोई सदस्य नहीं मिला' : 'No loyalty members found'}
                    </p>
                    <p className="text-xs text-neutral-400 mt-1">
                      {searchQuery
                        ? 'Try searching with a different name or mobile number'
                        : 'Enroll your first member using the "Add Member" button above.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Add New Loyalty Member */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-neutral-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200 bg-neutral-900 text-white">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>{t('addMember')}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="p-5 space-y-3.5 text-xs">
              {formError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">
                  Customer Mobile Number (10 digits) *
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={newCustPhone}
                  onChange={e => setNewCustPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={e => setNewCustName(e.target.value)}
                  placeholder="e.g. Rohit Sharma"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">
                  Starting Bonus Points (Optional)
                </label>
                <input
                  type="number"
                  min="0"
                  value={newCustPoints}
                  onChange={e => setNewCustPoints(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
                <span className="text-[11px] text-neutral-400">
                  e.g. 50 bonus points for joining the club (= ₹{newCustPoints * loyaltyConfig.pointValueINR})
                </span>
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">
                  Customer Notes (Optional)
                </label>
                <input
                  type="text"
                  value={newCustNotes}
                  onChange={e => setNewCustNotes(e.target.value)}
                  placeholder="e.g. Birthday: 15 Aug, prefers organic items"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-neutral-300 rounded-xl font-bold text-neutral-600 hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs transition-colors"
                >
                  Enroll Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Adjust Points Balance */}
      {isAdjustModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-neutral-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200 bg-neutral-900 text-white">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>Adjust Points: {selectedCustomer.name}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                className="p-1 rounded text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-neutral-100 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-neutral-500 block">Current Balance:</span>
                  <span className="text-base font-black text-amber-700">
                    {selectedCustomer.points} Points
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-neutral-500 block">Tier:</span>
                  <span className="font-bold text-neutral-900">{selectedCustomer.tier}</span>
                </div>
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">
                  Points Adjustment (+ to add bonus, - to deduct) *
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPointsAdjustment(prev => prev + 50)}
                    className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-bold hover:bg-emerald-200"
                  >
                    +50 pts
                  </button>
                  <button
                    type="button"
                    onClick={() => setPointsAdjustment(prev => prev + 100)}
                    className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-bold hover:bg-emerald-200"
                  >
                    +100 pts
                  </button>
                  <button
                    type="button"
                    onClick={() => setPointsAdjustment(prev => prev - 50)}
                    className="px-2.5 py-1 bg-red-100 text-red-800 rounded-lg font-bold hover:bg-red-200"
                  >
                    -50 pts
                  </button>
                </div>
                <input
                  type="number"
                  required
                  value={pointsAdjustment}
                  onChange={e => setPointsAdjustment(parseInt(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full mt-2 px-3 py-2 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm font-bold"
                />
                <span className="text-[11px] text-neutral-400 block mt-1">
                  New Projected Balance:{' '}
                  <strong className="text-neutral-800">
                    {Math.max(0, selectedCustomer.points + pointsAdjustment)} pts
                  </strong>
                </span>
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">
                  Reason for Adjustment
                </label>
                <input
                  type="text"
                  value={adjustmentReason}
                  onChange={e => setAdjustmentReason(e.target.value)}
                  placeholder="e.g. Birthday gift, Diwali offer, manual correction"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 border border-neutral-300 rounded-xl font-bold text-neutral-600 hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs transition-colors"
                >
                  Save Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Loyalty Rules Configuration */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-neutral-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200 bg-neutral-900 text-white">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <span>{t('loyaltySettings')}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="p-1 rounded text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="p-5 space-y-4 text-xs">
              {/* Enable / Disable Toggle */}
              <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                <div>
                  <span className="font-bold text-neutral-900 block">
                    Enable Loyalty Rewards Program
                  </span>
                  <span className="text-[11px] text-neutral-500">
                    Calculates and offers points on POS billing screen
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={tempConfig.enabled}
                  onChange={e => setTempConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                />
              </div>

              {/* Spend Per Point Rule */}
              <div>
                <label className="block text-neutral-700 font-semibold mb-1">
                  {t('spendRule')} (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-neutral-400 font-bold">₹</span>
                  <input
                    type="number"
                    min="1"
                    value={tempConfig.spendPerPoint}
                    onChange={e =>
                      setTempConfig(prev => ({
                        ...prev,
                        spendPerPoint: Math.max(1, parseInt(e.target.value) || 1),
                      }))
                    }
                    className="w-full pl-7 pr-3 py-2 border border-neutral-300 rounded-xl font-bold font-mono"
                  />
                </div>
                <span className="text-[11px] text-neutral-400">
                  Example: If set to ₹100, customer spending ₹1,000 earns 10 points.
                </span>
              </div>

              {/* Point Value in INR */}
              <div>
                <label className="block text-neutral-700 font-semibold mb-1">
                  {t('pointValueRule')} (₹ Discount per Point)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-neutral-400 font-bold">₹</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={tempConfig.pointValueINR}
                    onChange={e =>
                      setTempConfig(prev => ({
                        ...prev,
                        pointValueINR: Math.max(0.1, parseFloat(e.target.value) || 1),
                      }))
                    }
                    className="w-full pl-7 pr-3 py-2 border border-neutral-300 rounded-xl font-bold font-mono"
                  />
                </div>
                <span className="text-[11px] text-neutral-400">
                  Standard in India: 1 point = ₹1 discount on future bills.
                </span>
              </div>

              {/* Minimum Points to Redeem */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">
                    {t('minPointsRule')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={tempConfig.minPointsToRedeem}
                    onChange={e =>
                      setTempConfig(prev => ({
                        ...prev,
                        minPointsToRedeem: Math.max(1, parseInt(e.target.value) || 1),
                      }))
                    }
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xl font-bold font-mono"
                  />
                  <span className="text-[10px] text-neutral-400">
                    Threshold before points unlock
                  </span>
                </div>

                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">
                    {t('maxDiscountPercentRule')}
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={tempConfig.maxDiscountPercent}
                    onChange={e =>
                      setTempConfig(prev => ({
                        ...prev,
                        maxDiscountPercent: Math.min(100, Math.max(5, parseInt(e.target.value) || 50)),
                      }))
                    }
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xl font-bold font-mono"
                  />
                  <span className="text-[10px] text-neutral-400">
                    Max bill % points can cover
                  </span>
                </div>
              </div>

              {/* Tier Multiplier Explainer */}
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1.5 text-[11px]">
                <span className="font-bold text-neutral-800 block">Tier Rewards System:</span>
                <div className="grid grid-cols-2 gap-2 text-neutral-600">
                  <div>🥉 Bronze (&lt;75 pts): 1.0x earn</div>
                  <div>🥈 Silver (75-199 pts): 1.25x earn</div>
                  <div>🥇 Gold (200-499 pts): 1.5x earn</div>
                  <div>💎 Platinum (500+ pts): 2.0x earn</div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(false)}
                  className="px-4 py-2 border border-neutral-300 rounded-xl font-bold text-neutral-600 hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs transition-colors"
                >
                  Save Rules
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
