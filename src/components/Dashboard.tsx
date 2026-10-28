import React from 'react';
import {
  TrendingUp,
  Receipt,
  PackageCheck,
  CreditCard,
  AlertTriangle,
  ArrowUpRight,
  ShoppingBag,
  Building2,
  Calendar,
  Layers,
} from 'lucide-react';
import { Bill, Product, ShopConfig, Language, Department } from '../types';
import { formatINR, formatDateTime, formatDateOnly } from '../utils/formatters';
import { translations, getTranslation } from '../utils/translations';

interface DashboardProps {
  bills: Bill[];
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  shopConfig: ShopConfig;
  departments: Department[];
  lang: Language;
  onViewBill: (bill: Bill) => void;
  onNavigateToBilling: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  bills,
  products,
  setProducts,
  shopConfig,
  departments,
  lang,
  onViewBill,
  onNavigateToBilling,
}) => {
  const t = (key: keyof typeof translations['en']) => getTranslation(lang, key);

  // Filter bills for today
  const todayStr = new Date().toDateString();
  const todaysBills = bills.filter(
    b => b.status === 'completed' && new Date(b.date).toDateString() === todayStr
  );

  // All completed bills
  const completedBills = bills.filter(b => b.status === 'completed');

  // KPI calculations
  const todaysSales = todaysBills.reduce((acc, b) => acc + b.grandTotal, 0);
  const todaysBillsCount = todaysBills.length;
  const todaysItemsSold = todaysBills.reduce(
    (acc, b) => acc + b.items.reduce((sum, item) => sum + item.quantity, 0),
    0
  );
  const avgBillValue = todaysBillsCount > 0 ? todaysSales / todaysBillsCount : 0;

  // Low stock products
  const lowStockProducts = products.filter(
    p => p.stock <= p.minStockAlert
  );

  // Top selling products
  const productSalesMap: { [productId: string]: { name: string; qty: number; revenue: number } } = {};
  completedBills.forEach(b => {
    b.items.forEach(item => {
      if (!productSalesMap[item.product.id]) {
        productSalesMap[item.product.id] = {
          name: item.product.name,
          qty: 0,
          revenue: 0,
        };
      }
      productSalesMap[item.product.id].qty += item.quantity;
      productSalesMap[item.product.id].revenue += item.total;
    });
  });

  const topSellingProducts = Object.values(productSalesMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  // Payment method breakdown for today
  const paymentBreakdown = {
    cash: todaysBills.filter(b => b.paymentMethod === 'cash').reduce((acc, b) => acc + b.grandTotal, 0),
    upi: todaysBills.filter(b => b.paymentMethod === 'upi').reduce((acc, b) => acc + b.grandTotal, 0),
    card: todaysBills.filter(b => b.paymentMethod === 'card').reduce((acc, b) => acc + b.grandTotal, 0),
    split: todaysBills.filter(b => b.paymentMethod === 'split').reduce((acc, b) => acc + b.grandTotal, 0),
  };

  // Quick Restock handler
  const handleQuickRestock = (productId: string) => {
    setProducts(prev =>
      prev.map(p => (p.id === productId ? { ...p, stock: p.stock + 10 } : p))
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Welcome & Mode Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900">
            {shopConfig.name} · {t('dashboard')}
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Real-time sales performance, inventory alerts, and transaction records for {formatDateOnly(new Date())}
          </p>
        </div>

        <button
          type="button"
          onClick={onNavigateToBilling}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors self-start sm:self-auto"
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Go to POS Billing</span>
        </button>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Today's Sales */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium mb-2">
            <span>{t('todaysSales')}</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 tabular-nums">
            {formatINR(todaysSales)}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            Calculated across {todaysBillsCount} successful bills
          </div>
        </div>

        {/* Total Bills */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium mb-2">
            <span>{t('todaysBills')}</span>
            <Receipt className="w-4 h-4 text-neutral-600" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 tabular-nums">
            {todaysBillsCount}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            Invoices issued today
          </div>
        </div>

        {/* Items Sold */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium mb-2">
            <span>{t('itemsSold')}</span>
            <PackageCheck className="w-4 h-4 text-neutral-600" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 tabular-nums">
            {todaysItemsSold}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            Units moved out of inventory
          </div>
        </div>

        {/* Average Bill Value */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium mb-2">
            <span>{t('avgBillValue')}</span>
            <CreditCard className="w-4 h-4 text-neutral-600" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 tabular-nums">
            {formatINR(avgBillValue)}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            Average customer basket size
          </div>
        </div>
      </div>

      {/* Low Stock Alerts Banner (if any) */}
      {lowStockProducts.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                {t('lowStockAlerts')} ({lowStockProducts.length} items need attention)
              </h3>
            </div>
            <span className="text-[11px] text-amber-800">Reorder threshold reached</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStockProducts.slice(0, 6).map(prod => (
              <div
                key={prod.id}
                className="bg-white p-3 rounded-lg border border-amber-200/80 shadow-2xs flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-neutral-900 truncate">
                    {prod.name}
                  </div>
                  <div className="text-[11px] text-amber-700 font-medium mt-0.5">
                    Only <strong className="tabular-nums">{prod.stock} {prod.unit}</strong> left (Alert at {prod.minStockAlert})
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleQuickRestock(prod.id)}
                  className="px-2.5 py-1 text-[11px] font-bold text-white bg-amber-700 hover:bg-amber-800 rounded transition-colors whitespace-nowrap shrink-0"
                >
                  {t('restock')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Middle Row: Top Selling & Payment Methods */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Top-Selling Leaderboard (7 cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-neutral-200 shadow-2xs">
          <h3 className="text-sm font-bold text-neutral-900 mb-4">
            {t('topSellingProducts')}
          </h3>

          {topSellingProducts.length > 0 ? (
            <div className="divide-y divide-neutral-100 text-xs">
              {topSellingProducts.map((p, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-neutral-100 text-neutral-700 font-bold text-[11px] flex items-center justify-center shrink-0 tabular-nums">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-neutral-900 truncate">{p.name}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-neutral-900 tabular-nums">
                      {formatINR(p.revenue)}
                    </div>
                    <div className="text-[11px] text-neutral-500 tabular-nums">
                      {p.qty} units sold
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-neutral-400 text-xs">
              No product sales recorded yet.
            </div>
          )}
        </div>

        {/* Payment Breakdown (5 cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-neutral-200 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 mb-4">
              {t('salesByPayment')} (Today)
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-neutral-50 rounded-lg">
                <span className="font-medium text-neutral-700">{t('cash')}</span>
                <span className="font-bold tabular-nums text-neutral-900">
                  {formatINR(paymentBreakdown.cash)}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-neutral-50 rounded-lg">
                <span className="font-medium text-neutral-700">{t('upi')}</span>
                <span className="font-bold tabular-nums text-neutral-900">
                  {formatINR(paymentBreakdown.upi)}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-neutral-50 rounded-lg">
                <span className="font-medium text-neutral-700">{t('card')}</span>
                <span className="font-bold tabular-nums text-neutral-900">
                  {formatINR(paymentBreakdown.card)}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-neutral-50 rounded-lg">
                <span className="font-medium text-neutral-700">{t('split')}</span>
                <span className="font-bold tabular-nums text-neutral-900">
                  {formatINR(paymentBreakdown.split)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-200 flex justify-between items-center text-xs">
            <span className="text-neutral-500">Total Settled Today</span>
            <span className="font-bold text-base text-emerald-800 tabular-nums">
              {formatINR(todaysSales)}
            </span>
          </div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-neutral-900">
            {t('recentBills')}
          </h3>
          <span className="text-xs text-neutral-500">
            Latest customer checkouts
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Counter & Cashier</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {bills.slice(0, 6).map(bill => (
                <tr key={bill.id} className="hover:bg-neutral-50/50">
                  <td className="py-3 px-4 font-mono font-bold text-neutral-900">
                    {bill.invoiceNumber}
                  </td>
                  <td className="py-3 px-4 text-neutral-500">
                    {formatDateTime(bill.date)}
                  </td>
                  <td className="py-3 px-4 text-neutral-800">
                    {bill.customerName || 'Cash Customer'}
                  </td>
                  <td className="py-3 px-4 text-neutral-600">
                    {bill.counterName} · {bill.cashierName}
                  </td>
                  <td className="py-3 px-4">
                    <span className="uppercase text-[11px] font-semibold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded">
                      {bill.paymentMethod}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-neutral-900 tabular-nums">
                    {formatINR(bill.grandTotal)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => onViewBill(bill)}
                      className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded transition-colors"
                    >
                      {t('viewInvoice')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
