import React, { useState, useEffect, useRef } from 'react';
import {
  Printer,
  Download,
  Share2,
  PlusCircle,
  FileText,
  ReceiptText,
  CheckCircle2,
  Store,
  Building2,
} from 'lucide-react';
import QRCode from 'qrcode';
import { Bill, ShopConfig, Language } from '../types';
import { formatINR, formatDateTime, numberToIndianWords, formatQuantity } from '../utils/formatters';
import { translations, getTranslation } from '../utils/translations';

interface InvoiceViewProps {
  bill: Bill;
  shopConfig: ShopConfig;
  lang: Language;
  onNewBill: () => void;
}

export const InvoiceView: React.FC<InvoiceViewProps> = ({
  bill,
  shopConfig,
  lang,
  onNewBill,
}) => {
  const [format, setFormat] = useState<'thermal' | 'a4'>('thermal');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const t = (key: keyof typeof translations['en']) => getTranslation(lang, key);

  // Generate dynamic UPI QR Code
  useEffect(() => {
    const upiId = shopConfig.upiId || 'billing@upi';
    const payeeName = encodeURIComponent(shopConfig.name || 'Merchant');
    const invoiceNum = bill.invoiceNumber;
    const amount = bill.grandTotal.toFixed(2);
    const upiPayload = `upi://pay?pa=${upiId}&pn=${payeeName}&am=${amount}&cu=INR&tn=Invoice-${invoiceNum}`;

    QRCode.toDataURL(upiPayload, {
      width: 140,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('QR code generation error', err));
  }, [bill, shopConfig]);

  // Handle Print
  const handlePrint = () => {
    window.print();
  };

  // Handle WhatsApp Share
  const handleShareWhatsApp = () => {
    const phone = bill.customerPhone ? bill.customerPhone.replace(/\D/g, '') : '';
    const cleanPhone = phone.length === 10 ? `91${phone}` : phone;

    const itemsSummary = bill.items
      .map(
        item =>
          `• ${item.product.name} (${formatQuantity(item.quantity, item.product.unit)}) - ₹${item.total.toFixed(2)}`
      )
      .join('\n');

    const loyaltySummaryText = (bill.loyaltyPointsEarned || bill.loyaltyPointsRedeemed || bill.loyaltyBalanceAfter !== undefined)
      ? `\n--------------------------\n🎁 *LOYALTY CLUB REWARDS*\n${bill.loyaltyPointsRedeemed ? `• Points Redeemed: ${bill.loyaltyPointsRedeemed} (-₹${(bill.loyaltyDiscountAmount || 0).toFixed(2)})\n` : ''}${bill.loyaltyPointsEarned ? `• Points Earned Today: +${bill.loyaltyPointsEarned} pts\n` : ''}${bill.loyaltyBalanceAfter !== undefined ? `• Closing Points Balance: ${bill.loyaltyBalanceAfter} pts\n` : ''}`
      : '';

    const message = `*${shopConfig.name.toUpperCase()}*\n${shopConfig.address}, ${shopConfig.city}\nGSTIN: ${shopConfig.gstin || 'N/A'}\n--------------------------\n*TAX INVOICE: ${bill.invoiceNumber}*\nDate: ${formatDateTime(bill.date)}\nCustomer: ${bill.customerName || 'Valued Customer'}\n--------------------------\n${itemsSummary}\n--------------------------\nSubtotal: ₹${bill.taxableSubtotal.toFixed(2)}\nCGST: ₹${bill.cgstTotal.toFixed(2)}\nSGST: ₹${bill.sgstTotal.toFixed(2)}\n*GRAND TOTAL: ₹${bill.grandTotal.toFixed(2)}*\nPayment: ${bill.paymentMethod.toUpperCase()}${loyaltySummaryText}\n--------------------------\n${shopConfig.thermalFooter || 'Thank you for shopping with us! Visit again.'}`;

    const encoded = encodeURIComponent(message);
    const whatsappUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;

    window.open(whatsappUrl, '_blank');
  };

  // Handle Download HTML/Text receipt
  const handleDownload = () => {
    if (!receiptRef.current) return;
    const content = receiptRef.current.innerHTML;
    const title = `Invoice_${bill.invoiceNumber}`;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: monospace; padding: 20px; max-width: 80mm; margin: 0 auto; }
            table { width: 100%; border-collapse: collapse; }
            th, td { text-align: left; padding: 4px 0; }
            .right { text-align: right; }
            .center { text-align: center; }
            .dashed { border-top: 1px dashed #000; margin: 8px 0; }
          </style>
        </head>
        <body>
          ${content}
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Group items by GST rate for the tax slab summary table
  const gstBreakdownMap: { [key: number]: { taxable: number; cgst: number; sgst: number; total: number } } = {};
  bill.items.forEach(item => {
    const rate = item.product.gstRate;
    if (!gstBreakdownMap[rate]) {
      gstBreakdownMap[rate] = { taxable: 0, cgst: 0, sgst: 0, total: 0 };
    }
    gstBreakdownMap[rate].taxable += item.taxableAmount;
    gstBreakdownMap[rate].cgst += item.cgstAmount;
    gstBreakdownMap[rate].sgst += item.sgstAmount;
    gstBreakdownMap[rate].total += item.totalTax;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      
      {/* Top Action Toolbar (Hidden during print) */}
      <div className="print:hidden bg-white p-4 rounded-xl border border-neutral-200 shadow-xs mb-6 flex flex-wrap items-center justify-between gap-4">
        
        {/* Format Selector: Thermal vs A4 */}
        <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setFormat('thermal')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              format === 'thermal'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <ReceiptText className="w-3.5 h-3.5" />
            <span>{t('thermalReceipt')}</span>
          </button>
          <button
            type="button"
            onClick={() => setFormat('a4')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              format === 'a4'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{t('standardA4')}</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{t('print')}</span>
          </button>

          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors shadow-xs"
          >
            <Share2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t('shareWhatsApp')}</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('downloadPdf')}</span>
          </button>

          <button
            type="button"
            onClick={onNewBill}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{t('newBill')}</span>
          </button>
        </div>
      </div>

      {/* Invoice Container - Wrapped for Print & View */}
      <div className="flex justify-center">
        {format === 'thermal' ? (
          /* =========================================================================
             80mm THERMAL RECEIPT FORMAT (Standard POS Slip)
             ========================================================================= */
          <div
            id="printable-receipt"
            ref={receiptRef}
            className="w-full max-w-[80mm] bg-white p-4 sm:p-5 text-neutral-900 border border-neutral-300 shadow-sm rounded-lg font-mono text-[12px] leading-relaxed"
            style={{ width: '80mm', minHeight: '120mm' }}
          >
            {/* Header */}
            <div className="text-center pb-2">
              <div className="text-sm font-bold uppercase tracking-wider">
                {shopConfig.name}
              </div>
              {shopConfig.tagline && (
                <div className="text-[11px] text-neutral-600">
                  {shopConfig.tagline}
                </div>
              )}
              <div className="text-[11px] text-neutral-700 mt-1">
                {shopConfig.address}, {shopConfig.city}
              </div>
              <div className="text-[11px] text-neutral-700">
                Ph: {shopConfig.phone}
              </div>
              {shopConfig.gstin && (
                <div className="text-[11px] font-bold mt-0.5">
                  GSTIN: {shopConfig.gstin}
                </div>
              )}
              {shopConfig.fssai && (
                <div className="text-[10px] text-neutral-600">
                  FSSAI: {shopConfig.fssai}
                </div>
              )}
            </div>

            <div className="border-t border-dashed border-neutral-400 my-2" />

            {/* Bill Meta */}
            <div className="text-[11px] space-y-0.5">
              <div className="flex justify-between">
                <span>INVOICE: <strong className="font-bold">{bill.invoiceNumber}</strong></span>
                <span>{bill.paymentMethod.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span>DATE: {formatDateTime(bill.date)}</span>
              </div>
              <div className="flex justify-between">
                <span>COUNTER: {bill.counterName}</span>
                <span>CASHIER: {bill.cashierName}</span>
              </div>
              {bill.customerName && (
                <div className="flex justify-between">
                  <span>CUST: {bill.customerName}</span>
                  {bill.customerPhone && <span>PH: {bill.customerPhone}</span>}
                </div>
              )}
              {bill.customerGstin && (
                <div>CUST GSTIN: {bill.customerGstin}</div>
              )}
            </div>

            <div className="border-t border-dashed border-neutral-400 my-2" />

            {/* Items Table */}
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="border-b border-dashed border-neutral-400 pb-1">
                  <th className="py-1">ITEM</th>
                  <th className="text-center py-1">QTY</th>
                  <th className="text-right py-1">RATE</th>
                  <th className="text-right py-1">AMT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dotted divide-neutral-300">
                {bill.items.map((item, idx) => (
                  <tr key={idx} className="py-1">
                    <td className="py-1 pr-1">
                      <div className="font-semibold text-neutral-900 leading-tight">
                        {item.product.name}
                      </div>
                      <div className="text-[10px] text-neutral-500">
                        GST {item.product.gstRate}% {item.discountPercent > 0 ? `· Disc -${item.discountPercent}%` : ''}
                      </div>
                    </td>
                    <td className="text-center py-1 align-top tabular-nums whitespace-nowrap text-[10px]">
                      {formatQuantity(item.quantity, item.product.unit)}
                    </td>
                    <td className="text-right py-1 align-top tabular-nums">
                      {item.unitPrice.toFixed(2)}
                    </td>
                    <td className="text-right py-1 align-top font-bold tabular-nums">
                      {item.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-t border-dashed border-neutral-400 my-2" />

            {/* Financial Calculations */}
            <div className="text-[11px] space-y-1">
              <div className="flex justify-between">
                <span>Items / Total Qty:</span>
                <span className="tabular-nums">
                  {bill.items.length} / {bill.items.reduce((acc, i) => acc + i.quantity, 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Taxable Subtotal:</span>
                <span className="tabular-nums">₹{bill.taxableSubtotal.toFixed(2)}</span>
              </div>
              {bill.totalDiscount > 0 && (
                <div className="flex justify-between text-neutral-700">
                  <span>Discount:</span>
                  <span className="tabular-nums">-₹{bill.totalDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>CGST:</span>
                <span className="tabular-nums">₹{bill.cgstTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>SGST:</span>
                <span className="tabular-nums">₹{bill.sgstTotal.toFixed(2)}</span>
              </div>
              {bill.roundOff !== 0 && (
                <div className="flex justify-between">
                  <span>Round Off:</span>
                  <span className="tabular-nums">
                    {bill.roundOff > 0 ? `+₹${bill.roundOff.toFixed(2)}` : `-₹${Math.abs(bill.roundOff).toFixed(2)}`}
                  </span>
                </div>
              )}
              <div className="border-t border-dashed border-neutral-400 pt-1 flex justify-between font-bold text-sm">
                <span>NET TOTAL:</span>
                <span className="tabular-nums">₹{bill.grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="border-t border-dashed border-neutral-400 my-2 pt-1 text-[11px]">
              <div className="flex justify-between">
                <span>Paid via {bill.paymentMethod.toUpperCase()}:</span>
                <span className="font-bold tabular-nums">₹{bill.grandTotal.toFixed(2)}</span>
              </div>
              {bill.paymentMethod === 'cash' && bill.cashTendered && (
                <>
                  <div className="flex justify-between">
                    <span>Cash Tendered:</span>
                    <span className="tabular-nums">₹{bill.cashTendered.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Change Returned:</span>
                    <span className="tabular-nums">₹{(bill.changeDue || 0).toFixed(2)}</span>
                  </div>
                </>
              )}
              {bill.paymentMethod === 'split' && bill.splitDetails && (
                <div className="text-[10px] text-neutral-600 pl-2">
                  <span>Cash: ₹{bill.splitDetails.cash}</span> · 
                  <span> UPI: ₹{bill.splitDetails.upi}</span> · 
                  <span> Card: ₹{bill.splitDetails.card}</span>
                </div>
              )}
            </div>

            {/* Loyalty Rewards Summary */}
            {(bill.loyaltyPointsEarned || bill.loyaltyPointsRedeemed || bill.loyaltyBalanceAfter !== undefined) && (
              <div className="border border-dashed border-neutral-400 p-2 my-2 rounded text-[10px] space-y-0.5 bg-neutral-50">
                <div className="font-bold text-center uppercase tracking-wider text-neutral-800">
                  🎁 LOYALTY CLUB REWARDS 🎁
                </div>
                {bill.loyaltyPointsRedeemed ? (
                  <div className="flex justify-between">
                    <span>Points Redeemed:</span>
                    <span className="font-bold">{bill.loyaltyPointsRedeemed} pts (-₹{(bill.loyaltyDiscountAmount || 0).toFixed(2)})</span>
                  </div>
                ) : null}
                {bill.loyaltyPointsEarned ? (
                  <div className="flex justify-between text-emerald-900">
                    <span>Points Earned Today:</span>
                    <span className="font-bold">+{bill.loyaltyPointsEarned} pts</span>
                  </div>
                ) : null}
                {bill.loyaltyBalanceAfter !== undefined ? (
                  <div className="flex justify-between font-bold pt-0.5 border-t border-dotted border-neutral-300">
                    <span>Closing Points Balance:</span>
                    <span className="tabular-nums">{bill.loyaltyBalanceAfter} pts</span>
                  </div>
                ) : null}
              </div>
            )}

            {/* UPI QR Code for instant scanning & payment / digital bill verification */}
            {qrDataUrl && (
              <div className="text-center my-3 pt-1 border-t border-dashed border-neutral-400">
                <div className="text-[10px] font-semibold text-neutral-700 mb-1">
                  SCAN TO PAY VIA UPI
                </div>
                <img
                  src={qrDataUrl}
                  alt="UPI QR Code"
                  className="mx-auto w-24 h-24 border border-neutral-200 p-1"
                />
                <div className="text-[9px] text-neutral-500 mt-0.5">
                  {shopConfig.upiId}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="border-t border-dashed border-neutral-400 pt-2 text-center text-[10px] text-neutral-600">
              <p className="font-semibold">{shopConfig.thermalFooter || t('thankYouMessage')}</p>
              <p className="mt-1">Powered by Smart Bill Generator</p>
            </div>
          </div>
        ) : (
          /* =========================================================================
             STANDARD A4 FORMAL GST TAX INVOICE FORMAT
             ========================================================================= */
          <div
            id="printable-receipt"
            ref={receiptRef}
            className="w-full max-w-4xl bg-white p-8 sm:p-10 text-neutral-900 border border-neutral-300 shadow-sm rounded-xl text-xs font-sans leading-relaxed"
          >
            {/* Header: Seller info & Invoice title */}
            <div className="flex items-start justify-between border-b-2 border-neutral-900 pb-6 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {shopConfig.mode === 'mall' ? (
                    <Building2 className="w-6 h-6 text-neutral-900" />
                  ) : (
                    <Store className="w-6 h-6 text-neutral-900" />
                  )}
                  <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
                    {shopConfig.name}
                  </h1>
                </div>
                {shopConfig.tagline && (
                  <p className="text-xs text-neutral-500 mb-1">{shopConfig.tagline}</p>
                )}
                <p className="text-xs text-neutral-600">{shopConfig.address}, {shopConfig.city}, {shopConfig.state} - {shopConfig.pincode}</p>
                <p className="text-xs text-neutral-600">Phone: {shopConfig.phone} | Email: {shopConfig.email || 'N/A'}</p>
                <div className="mt-2 inline-flex items-center gap-3 font-mono text-xs font-semibold bg-neutral-100 px-3 py-1 rounded">
                  <span>GSTIN: {shopConfig.gstin || 'UNREGISTERED'}</span>
                  {shopConfig.fssai && <span>| FSSAI: {shopConfig.fssai}</span>}
                </div>
              </div>

              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-neutral-900 text-white text-xs font-bold uppercase tracking-wider rounded mb-2">
                  TAX INVOICE
                </span>
                <div className="font-mono text-xs space-y-1">
                  <div>
                    <span className="text-neutral-500">Invoice No: </span>
                    <strong className="font-bold text-sm text-neutral-900">{bill.invoiceNumber}</strong>
                  </div>
                  <div>
                    <span className="text-neutral-500">Invoice Date: </span>
                    <span>{formatDateTime(bill.date)}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Place of Supply: </span>
                    <span>{shopConfig.state || 'Local'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Billed To & Counter Info */}
            <div className="grid grid-cols-2 gap-6 bg-neutral-50 p-4 rounded-lg border border-neutral-200 mb-6">
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wide text-neutral-700 mb-1">
                  {t('billedTo')}
                </h3>
                <p className="font-semibold text-sm text-neutral-900">
                  {bill.customerName || 'Cash / Retail Customer'}
                </p>
                <p className="text-xs text-neutral-600">
                  Phone: {bill.customerPhone || 'N/A'}
                </p>
                {bill.customerGstin && (
                  <p className="text-xs font-mono font-medium text-neutral-800">
                    GSTIN: {bill.customerGstin}
                  </p>
                )}
              </div>

              <div className="text-right">
                <h3 className="font-bold text-xs uppercase tracking-wide text-neutral-700 mb-1">
                  POS Dispatch & Counter
                </h3>
                <p className="text-xs text-neutral-800">
                  <span className="text-neutral-500">Counter: </span>
                  <strong className="font-semibold">{bill.counterName}</strong>
                </p>
                <p className="text-xs text-neutral-800">
                  <span className="text-neutral-500">Cashier: </span>
                  <span>{bill.cashierName}</span>
                </p>
                <p className="text-xs text-neutral-800">
                  <span className="text-neutral-500">Payment Mode: </span>
                  <span className="font-bold uppercase text-emerald-700">{bill.paymentMethod}</span>
                </p>
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full text-left border border-neutral-200 mb-6">
              <thead className="bg-neutral-100 border-b border-neutral-200 font-semibold text-neutral-800 text-[11px]">
                <tr>
                  <th className="p-2.5 text-center w-10">#</th>
                  <th className="p-2.5">Item Description</th>
                  <th className="p-2.5 text-center">HSN</th>
                  <th className="p-2.5 text-center">Qty</th>
                  <th className="p-2.5 text-right">Unit Rate</th>
                  <th className="p-2.5 text-right">Taxable Val</th>
                  <th className="p-2.5 text-center">GST %</th>
                  <th className="p-2.5 text-right">GST Amt</th>
                  <th className="p-2.5 text-right">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-xs">
                {bill.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-neutral-50/50">
                    <td className="p-2.5 text-center text-neutral-500 tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="p-2.5">
                      <div className="font-semibold text-neutral-900">{item.product.name}</div>
                      <div className="text-[10px] text-neutral-500 font-mono">SKU: {item.product.sku}</div>
                    </td>
                    <td className="p-2.5 text-center font-mono text-[11px] text-neutral-600">
                      {item.product.hsnCode || '1905'}
                    </td>
                    <td className="p-2.5 text-center tabular-nums font-medium whitespace-nowrap">
                      {formatQuantity(item.quantity, item.product.unit)}
                    </td>
                    <td className="p-2.5 text-right tabular-nums">
                      ₹{item.unitPrice.toFixed(2)}
                    </td>
                    <td className="p-2.5 text-right tabular-nums">
                      ₹{item.taxableAmount.toFixed(2)}
                    </td>
                    <td className="p-2.5 text-center tabular-nums">
                      {item.product.gstRate}%
                    </td>
                    <td className="p-2.5 text-right tabular-nums">
                      ₹{item.totalTax.toFixed(2)}
                    </td>
                    <td className="p-2.5 text-right tabular-nums font-bold text-neutral-900">
                      ₹{item.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Calculations & GST Breakup Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              
              {/* GST Slab Breakup Table */}
              <div className="border border-neutral-200 rounded-lg p-3 bg-neutral-50/50">
                <h4 className="font-bold text-xs uppercase tracking-wide text-neutral-700 mb-2">
                  {t('taxBreakup')}
                </h4>
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-neutral-200 text-neutral-600 pb-1">
                      <th className="text-left py-1">Rate</th>
                      <th className="text-right py-1">Taxable</th>
                      <th className="text-right py-1">CGST</th>
                      <th className="text-right py-1">SGST</th>
                      <th className="text-right py-1">Total Tax</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {Object.entries(gstBreakdownMap).map(([rate, data]) => (
                      <tr key={rate}>
                        <td className="py-1 font-semibold">{rate}%</td>
                        <td className="py-1 text-right tabular-nums">₹{data.taxable.toFixed(2)}</td>
                        <td className="py-1 text-right tabular-nums">₹{data.cgst.toFixed(2)}</td>
                        <td className="py-1 text-right tabular-nums">₹{data.sgst.toFixed(2)}</td>
                        <td className="py-1 text-right tabular-nums font-medium">₹{data.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Summary */}
              <div className="space-y-2 border border-neutral-200 rounded-lg p-4 bg-white">
                <div className="flex justify-between text-xs text-neutral-600">
                  <span>Taxable Subtotal:</span>
                  <span className="tabular-nums font-semibold text-neutral-900">₹{bill.taxableSubtotal.toFixed(2)}</span>
                </div>
                {bill.totalDiscount > 0 && (
                  <div className="flex justify-between text-xs text-emerald-700">
                    <span>Discount:</span>
                    <span className="tabular-nums font-semibold">-₹{bill.totalDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-neutral-600">
                  <span>Central GST (CGST):</span>
                  <span className="tabular-nums">₹{bill.cgstTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-neutral-600">
                  <span>State GST (SGST):</span>
                  <span className="tabular-nums">₹{bill.sgstTotal.toFixed(2)}</span>
                </div>
                {bill.roundOff !== 0 && (
                  <div className="flex justify-between text-xs text-neutral-600">
                    <span>Round Off:</span>
                    <span className="tabular-nums">
                      {bill.roundOff > 0 ? `+₹${bill.roundOff.toFixed(2)}` : `-₹${Math.abs(bill.roundOff).toFixed(2)}`}
                    </span>
                  </div>
                )}
                <div className="border-t-2 border-neutral-900 pt-2 flex justify-between items-center">
                  <span className="font-bold text-sm text-neutral-900">GRAND TOTAL:</span>
                  <span className="font-bold text-lg text-emerald-800 tabular-nums">
                    {formatINR(bill.grandTotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* Amount in words */}
            <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200 mb-4">
              <span className="text-neutral-500 font-semibold text-[11px] uppercase tracking-wide">
                {t('amountInWords')}:{' '}
              </span>
              <strong className="text-neutral-900 font-semibold text-xs">
                {numberToIndianWords(bill.grandTotal)}
              </strong>
            </div>

            {/* Loyalty Rewards Box for A4 Invoice */}
            {(bill.loyaltyPointsEarned || bill.loyaltyPointsRedeemed || bill.loyaltyBalanceAfter !== undefined) && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-lg p-3.5 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center font-bold text-lg">
                    🎁
                  </div>
                  <div>
                    <h5 className="font-bold text-xs uppercase tracking-wide text-amber-950">
                      Loyalty Club Rewards Summary
                    </h5>
                    <p className="text-[11px] text-amber-800">
                      {bill.customerName ? `Member: ${bill.customerName}` : 'Customer Loyalty Program'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-xs text-right">
                  {bill.loyaltyPointsRedeemed ? (
                    <div>
                      <span className="text-neutral-500 block text-[10px]">Points Redeemed</span>
                      <span className="font-bold text-neutral-800">
                        {bill.loyaltyPointsRedeemed} pts (-₹{(bill.loyaltyDiscountAmount || 0).toFixed(2)})
                      </span>
                    </div>
                  ) : null}

                  {bill.loyaltyPointsEarned ? (
                    <div>
                      <span className="text-neutral-500 block text-[10px]">Earned Today</span>
                      <span className="font-bold text-emerald-800">
                        +{bill.loyaltyPointsEarned} pts
                      </span>
                    </div>
                  ) : null}

                  {bill.loyaltyBalanceAfter !== undefined ? (
                    <div className="bg-white px-3 py-1.5 rounded-md border border-amber-300 shadow-2xs">
                      <span className="text-amber-700 block text-[10px] font-semibold">Closing Balance</span>
                      <span className="font-black text-amber-950 text-sm tabular-nums">
                        {bill.loyaltyBalanceAfter} pts
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {/* Terms & Signatory */}
            <div className="grid grid-cols-2 gap-8 pt-4 border-t border-neutral-200">
              <div className="text-[11px] text-neutral-600 space-y-1">
                <p className="font-bold uppercase tracking-wide text-neutral-800">
                  {t('termsAndConditions')}
                </p>
                <p>1. Goods once sold can only be exchanged within 7 days with valid bill.</p>
                <p>2. Subject to local jurisdiction only.</p>
                <p>3. This is a computer generated tax invoice.</p>
              </div>

              <div className="text-right flex flex-col justify-end items-end">
                <div className="text-xs font-semibold text-neutral-900 mb-8">
                  For {shopConfig.name}
                </div>
                <div className="border-t border-neutral-400 w-48 text-center pt-1 text-[11px] text-neutral-600">
                  {t('authorizedSignatory')}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
