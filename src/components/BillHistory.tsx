import React, { useState } from 'react';
import {
  Search,
  Filter,
  Eye,
  Printer,
  Share2,
  Ban,
  Calendar,
  Layers,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { Bill, Product, Language, ShopConfig } from '../types';
import { formatINR, formatDateTime } from '../utils/formatters';
import { translations, getTranslation } from '../utils/translations';

interface BillHistoryProps {
  bills: Bill[];
  setBills: React.Dispatch<React.SetStateAction<Bill[]>>;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  shopConfig: ShopConfig;
  lang: Language;
  onViewBill: (bill: Bill) => void;
}

export const BillHistory: React.FC<BillHistoryProps> = ({
  bills,
  setBills,
  products,
  setProducts,
  shopConfig,
  lang,
  onViewBill,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | '7days' | 'month'>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');

  const t = (key: keyof typeof translations['en']) => getTranslation(lang, key);

  // Date filtering logic
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  const sevenDaysAgo = todayStart - 7 * 24 * 60 * 60 * 1000;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const filteredBills = bills.filter(bill => {
    // Search query
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const matchInv = bill.invoiceNumber.toLowerCase().includes(q);
      const matchName = bill.customerName && bill.customerName.toLowerCase().includes(q);
      const matchPhone = bill.customerPhone && bill.customerPhone.includes(q);
      if (!matchInv && !matchName && !matchPhone) return false;
    }

    // Payment filter
    if (paymentFilter !== 'all' && bill.paymentMethod !== paymentFilter) {
      return false;
    }

    // Date filter
    const billTime = new Date(bill.date).getTime();
    if (dateFilter === 'today') {
      return billTime >= todayStart;
    } else if (dateFilter === 'yesterday') {
      return billTime >= yesterdayStart && billTime < todayStart;
    } else if (dateFilter === '7days') {
      return billTime >= sevenDaysAgo;
    } else if (dateFilter === 'month') {
      return billTime >= monthStart;
    }

    return true;
  });

  // Calculate totals of filtered items
  const totalFilteredRevenue = filteredBills
    .filter(b => b.status === 'completed')
    .reduce((acc, b) => acc + b.grandTotal, 0);

  const totalFilteredGst = filteredBills
    .filter(b => b.status === 'completed')
    .reduce((acc, b) => acc + b.totalGst, 0);

  // Void / Cancel bill
  const handleVoidBill = (bill: Bill) => {
    if (bill.status === 'cancelled') return;

    if (window.confirm(t('cancelConfirm'))) {
      // 1. Mark bill as cancelled
      setBills(prev =>
        prev.map(b => (b.id === bill.id ? { ...b, status: 'cancelled' } : b))
      );

      // 2. Return items back to product stock
      setProducts(prevProducts =>
        prevProducts.map(prod => {
          const itemInBill = bill.items.find(i => i.product.id === prod.id);
          if (itemInBill) {
            return {
              ...prod,
              stock: prod.stock + itemInBill.quantity,
            };
          }
          return prod;
        })
      );
    }
  };

  // Direct WhatsApp share
  const handleShareWhatsApp = (bill: Bill) => {
    const phone = bill.customerPhone ? bill.customerPhone.replace(/\D/g, '') : '';
    const cleanPhone = phone.length === 10 ? `91${phone}` : phone;

    const message = `*${shopConfig.name.toUpperCase()}*\nInvoice: ${bill.invoiceNumber}\nDate: ${formatDateTime(bill.date)}\nTotal Amount: ₹${bill.grandTotal.toFixed(2)}\nPayment: ${bill.paymentMethod.toUpperCase()}\nStatus: ${bill.status.toUpperCase()}\nThank you for visiting!`;
    const whatsappUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900">
            {t('billHistoryTitle')}
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Search, review, reprint invoices, or share past transactions on WhatsApp
          </p>
        </div>

        {/* Filtered stats summary strip */}
        <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-lg border border-neutral-200 text-xs shadow-2xs">
          <div>
            <span className="text-neutral-500">Bills: </span>
            <strong className="text-neutral-900 font-bold tabular-nums">{filteredBills.length}</strong>
          </div>
          <div className="h-4 w-px bg-neutral-200" />
          <div>
            <span className="text-neutral-500">Sales: </span>
            <strong className="text-emerald-700 font-bold tabular-nums">
              {formatINR(totalFilteredRevenue)}
            </strong>
          </div>
          <div className="h-4 w-px bg-neutral-200" />
          <div>
            <span className="text-neutral-500">GST: </span>
            <strong className="text-neutral-900 font-bold tabular-nums">
              {formatINR(totalFilteredGst)}
            </strong>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder={t('searchBills')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Date range filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => setDateFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                dateFilter === 'all'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {t('allTime')}
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('today')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                dateFilter === 'today'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {t('today')}
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('yesterday')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                dateFilter === 'yesterday'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {t('yesterday')}
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('7days')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                dateFilter === '7days'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {t('last7Days')}
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('month')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                dateFilter === 'month'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {t('thisMonth')}
            </button>
          </div>

          {/* Payment filter dropdown */}
          <select
            value={paymentFilter}
            onChange={e => setPaymentFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          >
            <option value="all">{t('allPayments')}</option>
            <option value="cash">{t('cash')}</option>
            <option value="upi">{t('upi')}</option>
            <option value="card">{t('card')}</option>
            <option value="split">{t('split')}</option>
          </select>
        </div>
      </div>

      {/* Bills Table */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Counter / Cashier</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4 text-right">Taxable</th>
                <th className="py-3 px-4 text-right">GST</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {filteredBills.map(bill => {
                const isCancelled = bill.status === 'cancelled';

                return (
                  <tr
                    key={bill.id}
                    className={`hover:bg-neutral-50/50 transition-colors ${
                      isCancelled ? 'bg-red-50/40 text-neutral-400' : ''
                    }`}
                  >
                    {/* Invoice Number */}
                    <td className="py-3 px-4 font-mono font-bold text-neutral-900">
                      {bill.invoiceNumber}
                    </td>

                    {/* Date */}
                    <td className="py-3 px-4 text-neutral-500 whitespace-nowrap">
                      {formatDateTime(bill.date)}
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-neutral-900">
                        {bill.customerName || 'Cash Customer'}
                      </div>
                      {bill.customerPhone && (
                        <div className="text-[11px] text-neutral-500">{bill.customerPhone}</div>
                      )}
                    </td>

                    {/* Counter / Cashier */}
                    <td className="py-3 px-4 text-neutral-600 whitespace-nowrap">
                      <div>{bill.counterName}</div>
                      <div className="text-[11px] text-neutral-400">{bill.cashierName}</div>
                    </td>

                    {/* Payment Mode */}
                    <td className="py-3 px-4">
                      <span className="uppercase text-[11px] font-semibold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded">
                        {bill.paymentMethod}
                      </span>
                    </td>

                    {/* Taxable */}
                    <td className="py-3 px-4 text-right tabular-nums text-neutral-700">
                      ₹{bill.taxableSubtotal.toFixed(2)}
                    </td>

                    {/* GST */}
                    <td className="py-3 px-4 text-right tabular-nums text-neutral-700">
                      ₹{bill.totalGst.toFixed(2)}
                    </td>

                    {/* Grand Total */}
                    <td className="py-3 px-4 text-right font-bold text-neutral-900 tabular-nums">
                      {formatINR(bill.grandTotal)}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded uppercase ${
                          isCancelled
                            ? 'bg-red-100 text-red-700'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isCancelled ? t('billStatusCancelled') : t('billStatusCompleted')}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onViewBill(bill)}
                          className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded"
                          title="View / Print"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleShareWhatsApp(bill)}
                          className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded"
                          title="Share on WhatsApp"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        {!isCancelled && (
                          <button
                            type="button"
                            onClick={() => handleVoidBill(bill)}
                            className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title={t('cancelBill')}
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredBills.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-neutral-400 text-xs">
                    No bills found for the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
