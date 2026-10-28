import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Building2,
  Users,
  Calendar,
  Layers,
  Percent,
} from 'lucide-react';
import { Bill, Department, Cashier, Language, ShopConfig } from '../types';
import { formatINR, exportToCSV } from '../utils/formatters';
import { translations, getTranslation } from '../utils/translations';

interface MallReportsProps {
  bills: Bill[];
  departments: Department[];
  cashiers: Cashier[];
  shopConfig: ShopConfig;
  lang: Language;
}

export const MallReports: React.FC<MallReportsProps> = ({
  bills,
  departments,
  cashiers,
  shopConfig,
  lang,
}) => {
  const [reportPeriod, setReportPeriod] = useState<'daily' | 'monthly' | 'all'>('monthly');

  const t = (key: keyof typeof translations['en']) => getTranslation(lang, key);

  // Time boundaries
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  // Filter bills by report period
  const eligibleBills = bills.filter(b => {
    if (b.status !== 'completed') return false;
    const time = new Date(b.date).getTime();
    if (reportPeriod === 'daily') return time >= todayStart;
    if (reportPeriod === 'monthly') return time >= monthStart;
    return true;
  });

  // 1. Department Wise Aggregation
  const departmentStats = departments.map(dept => {
    const deptBills = eligibleBills.filter(b => b.departmentId === dept.id);
    const billsCount = deptBills.length;
    const itemsCount = deptBills.reduce(
      (sum, b) => sum + b.items.reduce((acc, i) => acc + i.quantity, 0),
      0
    );
    const taxableSales = deptBills.reduce((sum, b) => sum + b.taxableSubtotal, 0);
    const totalGst = deptBills.reduce((sum, b) => sum + b.totalGst, 0);
    const grossSales = deptBills.reduce((sum, b) => sum + b.grandTotal, 0);

    return {
      id: dept.id,
      name: dept.name,
      code: dept.code,
      billsCount,
      itemsCount,
      taxableSales,
      totalGst,
      grossSales,
    };
  });

  // 2. Counter & Cashier Performance Aggregation
  const cashierStats = cashiers.map(cashier => {
    const cBills = eligibleBills.filter(b => b.cashierId === cashier.id);
    const count = cBills.length;
    const totalRevenue = cBills.reduce((sum, b) => sum + b.grandTotal, 0);
    const cashTotal = cBills
      .filter(b => b.paymentMethod === 'cash')
      .reduce((sum, b) => sum + b.grandTotal, 0);
    const upiTotal = cBills
      .filter(b => b.paymentMethod === 'upi')
      .reduce((sum, b) => sum + b.grandTotal, 0);
    const cardTotal = cBills
      .filter(b => b.paymentMethod === 'card')
      .reduce((sum, b) => sum + b.grandTotal, 0);

    return {
      id: cashier.id,
      name: cashier.name,
      counter: cashier.counterName,
      count,
      totalRevenue,
      cashTotal,
      upiTotal,
      cardTotal,
    };
  });

  // 3. GST Slab Report (0%, 5%, 12%, 18%, 28%)
  const gstSlabs: { [key: number]: { taxable: number; cgst: number; sgst: number; total: number } } = {
    0: { taxable: 0, cgst: 0, sgst: 0, total: 0 },
    5: { taxable: 0, cgst: 0, sgst: 0, total: 0 },
    12: { taxable: 0, cgst: 0, sgst: 0, total: 0 },
    18: { taxable: 0, cgst: 0, sgst: 0, total: 0 },
    28: { taxable: 0, cgst: 0, sgst: 0, total: 0 },
  };

  eligibleBills.forEach(bill => {
    bill.items.forEach(item => {
      const rate = item.product.gstRate;
      if (gstSlabs[rate] !== undefined) {
        gstSlabs[rate].taxable += item.taxableAmount;
        gstSlabs[rate].cgst += item.cgstAmount;
        gstSlabs[rate].sgst += item.sgstAmount;
        gstSlabs[rate].total += item.totalTax;
      }
    });
  });

  // Overall Totals
  const overallGross = eligibleBills.reduce((sum, b) => sum + b.grandTotal, 0);
  const overallTaxable = eligibleBills.reduce((sum, b) => sum + b.taxableSubtotal, 0);
  const overallGst = eligibleBills.reduce((sum, b) => sum + b.totalGst, 0);

  // CSV Export: Department Summary
  const handleExportDepartmentCSV = () => {
    const headers = ['Department Code', 'Department Name', 'Bills Count', 'Items Sold', 'Taxable Sales (INR)', 'GST Collected (INR)', 'Net Revenue (INR)'];
    const rows = departmentStats.map(d => [
      d.code,
      d.name,
      d.billsCount,
      d.itemsCount,
      d.taxableSales.toFixed(2),
      d.totalGst.toFixed(2),
      d.grossSales.toFixed(2),
    ]);

    rows.push([
      'TOTAL',
      'All Departments',
      eligibleBills.length,
      departmentStats.reduce((a, b) => a + b.itemsCount, 0),
      overallTaxable.toFixed(2),
      overallGst.toFixed(2),
      overallGross.toFixed(2),
    ]);

    exportToCSV(`Department_Sales_${reportPeriod}_${new Date().toISOString().slice(0, 10)}`, [headers, ...rows]);
  };

  // CSV Export: Cashier Summary
  const handleExportCashierCSV = () => {
    const headers = ['Counter Name', 'Cashier Name', 'Bills Count', 'Cash Collection (INR)', 'UPI Collection (INR)', 'Card Collection (INR)', 'Total Revenue (INR)'];
    const rows = cashierStats.map(c => [
      c.counter,
      c.name,
      c.count,
      c.cashTotal.toFixed(2),
      c.upiTotal.toFixed(2),
      c.cardTotal.toFixed(2),
      c.totalRevenue.toFixed(2),
    ]);

    exportToCSV(`Cashier_Performance_${reportPeriod}_${new Date().toISOString().slice(0, 10)}`, [headers, ...rows]);
  };

  // CSV Export: GST Slab GSTR-3B Summary
  const handleExportGstCSV = () => {
    const headers = ['GST Rate Slab', 'Taxable Turnover (INR)', 'Central GST CGST (INR)', 'State GST SGST (INR)', 'Total Tax Amount (INR)'];
    const rows = Object.entries(gstSlabs).map(([rate, vals]) => [
      `${rate}%`,
      vals.taxable.toFixed(2),
      vals.cgst.toFixed(2),
      vals.sgst.toFixed(2),
      vals.total.toFixed(2),
    ]);

    rows.push([
      'TOTAL',
      overallTaxable.toFixed(2),
      (overallGst / 2).toFixed(2),
      (overallGst / 2).toFixed(2),
      overallGst.toFixed(2),
    ]);

    exportToCSV(`GST_Tax_Report_${reportPeriod}_${new Date().toISOString().slice(0, 10)}`, [headers, ...rows]);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900">
            {t('mallReportsTitle')}
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Store-wise breakdown, cashier collections, and GSTR tax slabs exportable to Excel
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-neutral-200 shadow-2xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setReportPeriod('daily')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              reportPeriod === 'daily'
                ? 'bg-neutral-900 text-white'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Today's Daily Report
          </button>
          <button
            type="button"
            onClick={() => setReportPeriod('monthly')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              reportPeriod === 'monthly'
                ? 'bg-neutral-900 text-white'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            This Month
          </button>
          <button
            type="button"
            onClick={() => setReportPeriod('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              reportPeriod === 'all'
                ? 'bg-neutral-900 text-white'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            All-Time Cumulative
          </button>
        </div>
      </div>

      {/* High-level Totals Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-2xs">
          <span className="text-xs text-neutral-500 font-medium">Total Gross Mall Sales</span>
          <div className="text-2xl font-bold text-neutral-900 tabular-nums mt-1">
            {formatINR(overallGross)}
          </div>
          <span className="text-[11px] text-neutral-400">Total consumer spend</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-2xs">
          <span className="text-xs text-neutral-500 font-medium">Net Taxable Turnover</span>
          <div className="text-2xl font-bold text-neutral-900 tabular-nums mt-1">
            {formatINR(overallTaxable)}
          </div>
          <span className="text-[11px] text-neutral-400">Excluding GST liability</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-2xs">
          <span className="text-xs text-neutral-500 font-medium">GST Collected (CGST + SGST)</span>
          <div className="text-2xl font-bold text-emerald-800 tabular-nums mt-1">
            {formatINR(overallGst)}
          </div>
          <span className="text-[11px] text-neutral-400">Government tax collection</span>
        </div>
      </div>

      {/* Section 1: Department / Store Wise Sales Table */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-neutral-700" />
            <h3 className="text-sm font-bold text-neutral-900">
              {t('departmentSummary')}
            </h3>
          </div>
          <button
            type="button"
            onClick={handleExportDepartmentCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-md transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('exportCsv')}</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Department / Store Name</th>
                <th className="py-3 px-4 text-center">Bills Count</th>
                <th className="py-3 px-4 text-center">Items Sold</th>
                <th className="py-3 px-4 text-right">Taxable Sales</th>
                <th className="py-3 px-4 text-right">GST Collected</th>
                <th className="py-3 px-4 text-right">Gross Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {departmentStats.map(dept => (
                <tr key={dept.id} className="hover:bg-neutral-50/50">
                  <td className="py-3 px-4 font-mono font-semibold text-neutral-500">
                    {dept.code}
                  </td>
                  <td className="py-3 px-4 font-semibold text-neutral-900">
                    {dept.name}
                  </td>
                  <td className="py-3 px-4 text-center tabular-nums">
                    {dept.billsCount}
                  </td>
                  <td className="py-3 px-4 text-center tabular-nums">
                    {dept.itemsCount}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums">
                    ₹{dept.taxableSales.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums">
                    ₹{dept.totalGst.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-neutral-900 tabular-nums">
                    {formatINR(dept.grossSales)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Cashier & Counter Performance */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-neutral-700" />
            <h3 className="text-sm font-bold text-neutral-900">
              {t('counterSummary')}
            </h3>
          </div>
          <button
            type="button"
            onClick={handleExportCashierCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-md transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('exportCsv')}</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Counter</th>
                <th className="py-3 px-4">Cashier Name</th>
                <th className="py-3 px-4 text-center">Bills Handled</th>
                <th className="py-3 px-4 text-right">Cash Received</th>
                <th className="py-3 px-4 text-right">UPI Received</th>
                <th className="py-3 px-4 text-right">Card Received</th>
                <th className="py-3 px-4 text-right">Total Collection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {cashierStats.map(c => (
                <tr key={c.id} className="hover:bg-neutral-50/50">
                  <td className="py-3 px-4 font-semibold text-neutral-900">
                    {c.counter}
                  </td>
                  <td className="py-3 px-4 text-neutral-700">
                    {c.name}
                  </td>
                  <td className="py-3 px-4 text-center tabular-nums">
                    {c.count}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-neutral-700">
                    ₹{c.cashTotal.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-neutral-700">
                    ₹{c.upiTotal.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-neutral-700">
                    ₹{c.cardTotal.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-neutral-900 tabular-nums">
                    {formatINR(c.totalRevenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3: GST Tax Slab Summary */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Percent className="w-4 h-4 text-neutral-700" />
            <h3 className="text-sm font-bold text-neutral-900">
              {t('gstReport')}
            </h3>
          </div>
          <button
            type="button"
            onClick={handleExportGstCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-md transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download GST CSV</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">GST Rate Slab</th>
                <th className="py-3 px-4 text-right">Taxable Turnover</th>
                <th className="py-3 px-4 text-right">Central GST (CGST)</th>
                <th className="py-3 px-4 text-right">State GST (SGST)</th>
                <th className="py-3 px-4 text-right">Total GST Tax</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {Object.entries(gstSlabs).map(([rate, vals]) => (
                <tr key={rate} className="hover:bg-neutral-50/50">
                  <td className="py-3 px-4 font-bold text-neutral-900">
                    {rate}% GST Slab
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums">
                    ₹{vals.taxable.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums">
                    ₹{vals.cgst.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums">
                    ₹{vals.sgst.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-neutral-900 tabular-nums">
                    ₹{vals.total.toFixed(2)}
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
