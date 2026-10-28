import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Barcode,
  Plus,
  Minus,
  Trash2,
  Percent,
  IndianRupee,
  User,
  Phone,
  QrCode,
  CreditCard,
  Banknote,
  Split,
  PauseCircle,
  PlayCircle,
  Check,
  AlertCircle,
  Sparkles,
  Layers,
  Scale,
  Camera,
  Coins,
  Award,
  Mic,
} from 'lucide-react';
import QRCode from 'qrcode';
import { PortionModal } from './PortionModal';
import { CameraBarcodeScanner } from './CameraBarcodeScanner';
import { VoiceBillingAssistant } from './VoiceBillingAssistant';
import {
  Product,
  CartItem,
  Bill,
  ShopConfig,
  Cashier,
  Department,
  PaymentMethod,
  Language,
  CustomerLoyalty,
  LoyaltyConfig,
} from '../types';
import {
  formatINR,
  calculateGSTFromInclusive,
  validateGSTIN,
  formatQuantity,
} from '../utils/formatters';
import { translations, getTranslation } from '../utils/translations';
import {
  getHeldBill,
  saveHeldBill,
  findCustomerByPhone,
  applyBillToCustomerLoyalty,
  getTierMultiplier,
  normalizePhone,
} from '../utils/storage';

interface BillingScreenProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  shopConfig: ShopConfig;
  setShopConfig: React.Dispatch<React.SetStateAction<ShopConfig>>;
  activeCashier: Cashier;
  departments: Department[];
  lang: Language;
  onBillGenerated: (bill: Bill) => void;
  customers: CustomerLoyalty[];
  setCustomers: React.Dispatch<React.SetStateAction<CustomerLoyalty[]>>;
  loyaltyConfig: LoyaltyConfig;
  initialCustomerPhone?: string;
  initialCustomerName?: string;
}

export const BillingScreen: React.FC<BillingScreenProps> = ({
  products,
  setProducts,
  shopConfig,
  setShopConfig,
  activeCashier,
  departments,
  lang,
  onBillGenerated,
  customers,
  setCustomers,
  loyaltyConfig,
  initialCustomerPhone,
  initialCustomerName,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [splitCash, setSplitCash] = useState<string>('');
  const [splitUpi, setSplitUpi] = useState<string>('');
  const [splitCard, setSplitCard] = useState<string>('');
  const [billDiscountType, setBillDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [billDiscountValue, setBillDiscountValue] = useState<number>(0);
  const [heldBillData, setHeldBillData] = useState<{ items: CartItem[]; customerName?: string; customerPhone?: string } | null>(null);
  const [upiQrUrl, setUpiQrUrl] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  const [barcodeNotification, setBarcodeNotification] = useState<string>('');

  // Loyalty Program State
  const [redeemLoyalty, setRedeemLoyalty] = useState<boolean>(false);
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);

  // Auto-fill from navigation prop if provided
  useEffect(() => {
    if (initialCustomerPhone) setCustomerPhone(initialCustomerPhone);
    if (initialCustomerName) setCustomerName(initialCustomerName);
  }, [initialCustomerPhone, initialCustomerName]);

  // Find customer loyalty account
  const matchedCustomer = React.useMemo(() => {
    return findCustomerByPhone(customerPhone, customers);
  }, [customerPhone, customers]);

  // Autofill name from loyalty customer record if customer name is empty
  useEffect(() => {
    if (matchedCustomer && !customerName) {
      setCustomerName(matchedCustomer.name);
    }
  }, [matchedCustomer]);

  // Loose & Fractional Portion modal state
  const [isPortionModalOpen, setIsPortionModalOpen] = useState(false);
  const [portionProduct, setPortionProduct] = useState<Product | null>(null);

  // Camera Barcode Scanner modal state
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);

  // Live Voice Cart Assistant modal state
  const [isVoiceAssistantOpen, setIsVoiceAssistantOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const t = (key: keyof typeof translations['en']) => getTranslation(lang, key);

  // Load any held bill on mount
  useEffect(() => {
    setHeldBillData(getHeldBill());
  }, []);

  // Keyboard shortcuts: '/' focuses search input, 'F4' / 'Alt+S' toggles camera scanner, 'Alt+V' toggles voice assistant
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      const isInputFocused = activeTag === 'input' || activeTag === 'textarea';

      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F4' || (e.altKey && (e.key === 's' || e.key === 'S'))) {
        e.preventDefault();
        setIsCameraScannerOpen(prev => !prev);
      } else if ((e.altKey && (e.key === 'v' || e.key === 'V')) || (!isInputFocused && (e.key === 'v' || e.key === 'V'))) {
        e.preventDefault();
        setIsVoiceAssistantOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter categories
  const categories = Array.from(new Set(products.map(p => p.category)));

  // Filter products by search and category
  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesCategory;

    const matchesName = p.name.toLowerCase().includes(q) || (p.nameHi && p.nameHi.toLowerCase().includes(q));
    const matchesBarcode = p.barcode.toLowerCase().includes(q);
    const matchesSku = p.sku.toLowerCase().includes(q);
    return matchesCategory && (matchesName || matchesBarcode || matchesSku);
  });

  const openPortionModal = (prod?: Product) => {
    setPortionProduct(prod || null);
    setIsPortionModalOpen(true);
  };

  // Add product to cart helper (supporting decimal/fractional quantities)
  const addToCart = (product: Product, qtyToAdd: number = 1, isExactPortion: boolean = false) => {
    if (product.stock <= 0) {
      setFormError(`${product.name} is out of stock!`);
      setTimeout(() => setFormError(''), 3000);
      return;
    }

    setCart(prevCart => {
      const existingIndex = prevCart.findIndex(item => item.product.id === product.id);
      if (existingIndex > -1) {
        const existing = prevCart[existingIndex];
        const newQty = isExactPortion
          ? Math.round(qtyToAdd * 1000) / 1000
          : Math.round((existing.quantity + qtyToAdd) * 1000) / 1000;

        if (newQty > product.stock) {
          setFormError(`Only ${product.stock} units available in stock!`);
          setTimeout(() => setFormError(''), 3000);
          return prevCart;
        }

        const discountedUnitPrice = existing.unitPrice * (1 - existing.discountPercent / 100);
        const itemTotal = Math.round((discountedUnitPrice * newQty + Number.EPSILON) * 100) / 100;
        const gst = calculateGSTFromInclusive(itemTotal, product.gstRate);

        const updated: CartItem = {
          ...existing,
          quantity: newQty,
          discountAmount: (existing.unitPrice * existing.discountPercent / 100) * newQty,
          taxableAmount: gst.taxableAmount,
          cgstAmount: gst.cgstAmount,
          sgstAmount: gst.sgstAmount,
          totalTax: gst.totalTax,
          total: itemTotal,
        };

        const copy = [...prevCart];
        copy[existingIndex] = updated;
        return copy;
      } else {
        const cleanQty = Math.round(qtyToAdd * 1000) / 1000;
        const itemTotal = Math.round((product.price * cleanQty + Number.EPSILON) * 100) / 100;
        const gst = calculateGSTFromInclusive(itemTotal, product.gstRate);

        const newItem: CartItem = {
          product,
          quantity: cleanQty,
          unitPrice: product.price,
          discountPercent: 0,
          discountAmount: 0,
          taxableAmount: gst.taxableAmount,
          cgstAmount: gst.cgstAmount,
          sgstAmount: gst.sgstAmount,
          totalTax: gst.totalTax,
          total: itemTotal,
        };
        return [...prevCart, newItem];
      }
    });

    const displayQty = formatQuantity(qtyToAdd, product.unit);
    setBarcodeNotification(`Added: ${product.name} (${displayQty})`);
    setTimeout(() => setBarcodeNotification(''), 2500);
  };

  // Direct Barcode Scan Handler
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Check exact barcode match first
    const exactMatch = products.find(
      p => p.barcode.toLowerCase() === searchQuery.trim().toLowerCase() ||
           p.sku.toLowerCase() === searchQuery.trim().toLowerCase()
    );

    if (exactMatch) {
      addToCart(exactMatch, 1);
      setSearchQuery('');
    } else if (filteredProducts.length === 1) {
      addToCart(filteredProducts[0], 1);
      setSearchQuery('');
    }
  };

  // Update item quantity (supports decimals e.g. 0.25, 0.5, 1.5)
  const updateQuantity = (productId: string, newQty: number) => {
    const cleanQty = Math.round(newQty * 1000) / 1000;
    if (cleanQty <= 0) {
      removeFromCart(productId);
      return;
    }

    const prod = products.find(p => p.id === productId);
    if (prod && cleanQty > prod.stock) {
      setFormError(`Only ${prod.stock} units in stock!`);
      setTimeout(() => setFormError(''), 2500);
      return;
    }

    setCart(prev =>
      prev.map(item => {
        if (item.product.id !== productId) return item;
        const discountedUnitPrice = item.unitPrice * (1 - item.discountPercent / 100);
        const itemTotal = Math.round((discountedUnitPrice * cleanQty + Number.EPSILON) * 100) / 100;
        const gst = calculateGSTFromInclusive(itemTotal, item.product.gstRate);

        return {
          ...item,
          quantity: cleanQty,
          discountAmount: (item.unitPrice * item.discountPercent / 100) * cleanQty,
          taxableAmount: gst.taxableAmount,
          cgstAmount: gst.cgstAmount,
          sgstAmount: gst.sgstAmount,
          totalTax: gst.totalTax,
          total: itemTotal,
        };
      })
    );
  };

  // Update item level discount %
  const updateItemDiscount = (productId: string, percent: number) => {
    const safePercent = Math.max(0, Math.min(100, isNaN(percent) ? 0 : percent));
    setCart(prev =>
      prev.map(item => {
        if (item.product.id !== productId) return item;
        const discountedUnitPrice = item.unitPrice * (1 - safePercent / 100);
        const itemTotal = discountedUnitPrice * item.quantity;
        const gst = calculateGSTFromInclusive(itemTotal, item.product.gstRate);

        return {
          ...item,
          discountPercent: safePercent,
          discountAmount: (item.unitPrice * safePercent / 100) * item.quantity,
          taxableAmount: gst.taxableAmount,
          cgstAmount: gst.cgstAmount,
          sgstAmount: gst.sgstAmount,
          totalTax: gst.totalTax,
          total: itemTotal,
        };
      })
    );
  };

  // Remove single item from cart
  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  // Clear entire cart
  const clearCart = () => {
    setCart([]);
    setBillDiscountValue(0);
    setRedeemLoyalty(false);
    setPointsToRedeem(0);
    setCashTendered('');
    setSplitCash('');
    setSplitUpi('');
    setSplitCard('');
  };

  // Hold current bill
  const handleHoldBill = () => {
    if (cart.length === 0) return;
    const billToHold = { items: cart, customerName, customerPhone };
    saveHeldBill(billToHold);
    setHeldBillData(billToHold);
    clearCart();
    setCustomerName('');
    setCustomerPhone('');
    setBarcodeNotification('Bill held successfully. Ready for next customer!');
    setTimeout(() => setBarcodeNotification(''), 3000);
  };

  // Recall held bill
  const handleRecallBill = () => {
    if (!heldBillData) return;
    setCart(heldBillData.items);
    setCustomerName(heldBillData.customerName || '');
    setCustomerPhone(heldBillData.customerPhone || '');
    saveHeldBill(null);
    setHeldBillData(null);
  };

  // Calculations
  const rawSubtotal = cart.reduce((acc, item) => acc + item.total, 0);
  const totalItemDiscounts = cart.reduce((acc, item) => acc + item.discountAmount, 0);

  // Overall bill discount
  let billDiscountAmount = 0;
  if (billDiscountType === 'percent') {
    billDiscountAmount = (rawSubtotal * Math.min(100, Math.max(0, billDiscountValue))) / 100;
  } else {
    billDiscountAmount = Math.min(rawSubtotal, Math.max(0, billDiscountValue));
  }

  const subtotalAfterBillDiscount = Math.max(0, rawSubtotal - billDiscountAmount);

  // Loyalty Points calculations
  const maxRedeemableINR = subtotalAfterBillDiscount * (loyaltyConfig.maxDiscountPercent / 100);
  const maxRedeemablePoints =
    matchedCustomer && loyaltyConfig.enabled
      ? Math.min(
          matchedCustomer.points,
          Math.floor(maxRedeemableINR / loyaltyConfig.pointValueINR)
        )
      : 0;

  const actualPointsRedeemed =
    redeemLoyalty &&
    matchedCustomer &&
    matchedCustomer.points >= loyaltyConfig.minPointsToRedeem
      ? Math.min(Math.max(0, pointsToRedeem), maxRedeemablePoints)
      : 0;

  const loyaltyDiscountAmount = actualPointsRedeemed * loyaltyConfig.pointValueINR;
  const subtotalAfterAllDiscounts = Math.max(0, subtotalAfterBillDiscount - loyaltyDiscountAmount);

  // Tax breakdown calculated proportionally after all discounts
  const discountRatio = rawSubtotal > 0 ? subtotalAfterAllDiscounts / rawSubtotal : 1;
  const taxableSubtotal = cart.reduce((acc, item) => acc + item.taxableAmount * discountRatio, 0);
  const cgstTotal = cart.reduce((acc, item) => acc + item.cgstAmount * discountRatio, 0);
  const sgstTotal = cart.reduce((acc, item) => acc + item.sgstAmount * discountRatio, 0);
  const totalGst = cgstTotal + sgstTotal;

  // Round off calculation to nearest rupee
  const exactTotal = subtotalAfterAllDiscounts;
  const roundedGrandTotal = Math.round(exactTotal);
  const roundOff = Math.round((roundedGrandTotal - exactTotal + Number.EPSILON) * 100) / 100;

  // Loyalty points that will be earned on this transaction:
  const customerTier = matchedCustomer ? matchedCustomer.tier : 'Bronze';
  const tierMultiplier = getTierMultiplier(customerTier);
  const pointsEarnedOnBill =
    loyaltyConfig.enabled && roundedGrandTotal > 0
      ? Math.floor((roundedGrandTotal / loyaltyConfig.spendPerPoint) * tierMultiplier)
      : 0;

  // Calculate change due for Cash payments
  const numericCashTendered = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, numericCashTendered - roundedGrandTotal);

  // Dynamic UPI QR generation for the active cart
  useEffect(() => {
    if (paymentMethod === 'upi' && roundedGrandTotal > 0) {
      const upiId = shopConfig.upiId || 'billing@upi';
      const payee = encodeURIComponent(shopConfig.name || 'Store');
      const tempInv = `${shopConfig.invoicePrefix}-${shopConfig.currentInvoiceNum}`;
      const payload = `upi://pay?pa=${upiId}&pn=${payee}&am=${roundedGrandTotal}&cu=INR&tn=Bill-${tempInv}`;

      QRCode.toDataURL(payload, { width: 140, margin: 1 })
        .then(url => setUpiQrUrl(url))
        .catch(e => console.error(e));
    }
  }, [paymentMethod, roundedGrandTotal, shopConfig]);

  // Complete and Generate Bill
  const handleCompleteBill = () => {
    if (cart.length === 0) {
      setFormError('Please add at least one product to the bill.');
      return;
    }

    if (customerGstin && !validateGSTIN(customerGstin)) {
      setFormError('Invalid GSTIN format (should be 15 alphanumeric characters).');
      return;
    }

    // Split payment validation
    if (paymentMethod === 'split') {
      const c = parseFloat(splitCash) || 0;
      const u = parseFloat(splitUpi) || 0;
      const cd = parseFloat(splitCard) || 0;
      const totalSplit = c + u + cd;

      if (Math.abs(totalSplit - roundedGrandTotal) > 0.5) {
        setFormError(
          `Split payments sum (₹${totalSplit.toFixed(2)}) must equal Grand Total (₹${roundedGrandTotal})!`
        );
        return;
      }
    }

    // Cash tendered validation
    if (paymentMethod === 'cash' && numericCashTendered > 0 && numericCashTendered < roundedGrandTotal) {
      setFormError('Tendered cash is less than the grand total!');
      return;
    }

    // 1. Deduct stock from products
    const updatedProducts = products.map(prod => {
      const inCart = cart.find(item => item.product.id === prod.id);
      if (inCart) {
        return {
          ...prod,
          stock: Math.max(0, prod.stock - inCart.quantity),
        };
      }
      return prod;
    });
    setProducts(updatedProducts);

    // 2. Increment invoice number
    const nextInvNum = shopConfig.currentInvoiceNum + 1;
    const invString = `${shopConfig.invoicePrefix}-${shopConfig.currentInvoiceNum}`;

    const newShopConfig = {
      ...shopConfig,
      currentInvoiceNum: nextInvNum,
    };
    setShopConfig(newShopConfig);

    // 3. Update customer loyalty points in localStorage if customer phone is provided
    let updatedCustomerRecord: CustomerLoyalty | undefined;
    if (customerPhone.trim() && loyaltyConfig.enabled) {
      const { updatedCustomers, customerRecord } = applyBillToCustomerLoyalty(
        customerPhone,
        customerName,
        roundedGrandTotal,
        actualPointsRedeemed,
        pointsEarnedOnBill,
        customers
      );
      setCustomers(updatedCustomers);
      updatedCustomerRecord = customerRecord;
    }

    // 4. Create Bill object
    const createdBill: Bill = {
      id: `bill-${Date.now()}`,
      invoiceNumber: invString,
      date: new Date().toISOString(),
      timestamp: Date.now(),
      items: [...cart],
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      customerGstin: customerGstin.trim().toUpperCase() || undefined,
      mode: shopConfig.mode,
      departmentId: activeCashier.departmentId,
      departmentName: departments.find(d => d.id === activeCashier.departmentId)?.name || 'General',
      cashierId: activeCashier.id,
      cashierName: activeCashier.name,
      counterName: activeCashier.counterName,
      paymentMethod,
      splitDetails:
        paymentMethod === 'split'
          ? {
              cash: parseFloat(splitCash) || 0,
              upi: parseFloat(splitUpi) || 0,
              card: parseFloat(splitCard) || 0,
            }
          : undefined,
      cashTendered: paymentMethod === 'cash' && numericCashTendered > 0 ? numericCashTendered : undefined,
      changeDue: paymentMethod === 'cash' && numericCashTendered > 0 ? changeDue : undefined,
      subtotal: rawSubtotal,
      totalDiscount: totalItemDiscounts + billDiscountAmount + loyaltyDiscountAmount,
      taxableSubtotal: Math.round(taxableSubtotal * 100) / 100,
      cgstTotal: Math.round(cgstTotal * 100) / 100,
      sgstTotal: Math.round(sgstTotal * 100) / 100,
      totalGst: Math.round(totalGst * 100) / 100,
      roundOff,
      grandTotal: roundedGrandTotal,
      status: 'completed',
      // Loyalty Program metadata
      loyaltyPointsEarned: pointsEarnedOnBill > 0 ? pointsEarnedOnBill : undefined,
      loyaltyPointsRedeemed: actualPointsRedeemed > 0 ? actualPointsRedeemed : undefined,
      loyaltyDiscountAmount: loyaltyDiscountAmount > 0 ? loyaltyDiscountAmount : undefined,
      loyaltyBalanceAfter: updatedCustomerRecord?.points,
    };

    // 4. Trigger callback to display invoice
    onBillGenerated(createdBill);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
      
      {/* Notifications */}
      {barcodeNotification && (
        <div className="mb-3 p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{barcodeNotification}</span>
        </div>
      )}
      {formError && (
        <div className="mb-3 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{formError}</span>
          </div>
          <button onClick={() => setFormError('')} className="text-red-500 hover:text-red-700 text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Main 2-Column POS Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* =========================================================================
           LEFT COLUMN: Product Catalog, Barcode Search & Category Tabs (7 cols)
           ========================================================================= */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Barcode & Search Bar with Camera Scanner & Quick Loose Item Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            <form onSubmit={handleBarcodeSubmit} className="relative flex-1">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t('searchPlaceholder')}
                  className="w-full pl-10 pr-28 py-2.5 text-sm bg-white border border-neutral-300 rounded-lg shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <div className="absolute right-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsVoiceAssistantOpen(true)}
                    title={lang === 'hi' ? 'बोलकर बिल बनाएं (Press V)' : 'Voice Cart Assistant (Press V)'}
                    className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors"
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCameraScannerOpen(true)}
                    title={lang === 'hi' ? 'कैमरा बारकोड स्कैनर (Alt+S)' : 'Camera Barcode Scanner (Alt+S)'}
                    className="p-1 text-neutral-500 hover:text-emerald-700 hover:bg-neutral-100 rounded transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  <button
                    type="submit"
                    className="px-2 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors"
                  >
                    Enter
                  </button>
                </div>
              </div>
            </form>

            {/* Live Voice Cart Builder Button */}
            <button
              type="button"
              onClick={() => setIsVoiceAssistantOpen(true)}
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 rounded-lg shadow-sm hover:shadow transition-all whitespace-nowrap shrink-0 group border border-emerald-500/30"
              title={lang === 'hi' ? 'बोलकर सामान जोड़ें (वॉइस बिलिंग - Press V)' : 'Voice Cart Assistant (Speak to add items - Press V)'}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-200 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-100"></span>
              </span>
              <Mic className="w-4 h-4 text-emerald-100 group-hover:scale-110 transition-transform" />
              <span>{lang === 'hi' ? 'बोलकर बिल बनाएं' : 'Voice Cart'}</span>
              <span className="text-[10px] bg-white/20 text-white px-1.5 py-0.5 rounded font-mono hidden sm:inline">V</span>
            </button>

            {/* Camera Barcode Scanner Button */}
            <button
              type="button"
              onClick={() => setIsCameraScannerOpen(true)}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-2xs transition-colors whitespace-nowrap shrink-0"
              title={lang === 'hi' ? 'कैमरा स्कैनर खोलें (Alt+S या F4)' : 'Open Camera Barcode Scanner (Alt+S or F4)'}
            >
              <Camera className="w-4 h-4 text-emerald-400" />
              <span>{lang === 'hi' ? 'कैमरा स्कैनर' : 'Camera Scan'}</span>
            </button>

            {/* Quick Loose / Custom Item Button */}
            <button
              type="button"
              onClick={() => openPortionModal()}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg shadow-2xs transition-colors whitespace-nowrap shrink-0"
              title="Sell loose groceries, sugar, dal, oil or custom weight (खुला सामान / वजन)"
            >
              <Scale className="w-4 h-4 text-emerald-600" />
              <span>+ {t('addCustomItem')}</span>
            </button>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50'
              }`}
            >
              {t('allCategories')} ({products.length})
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-neutral-900 text-white'
                    : 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[580px] overflow-y-auto pr-1">
            {filteredProducts.map(prod => {
              const inCartItem = cart.find(c => c.product.id === prod.id);
              const isLowStock = prod.stock > 0 && prod.stock <= prod.minStockAlert;
              const isOutOfStock = prod.stock <= 0;

              return (
                <div
                  key={prod.id}
                  onClick={() => !isOutOfStock && addToCart(prod, 1)}
                  className={`group relative p-3 rounded-xl border bg-white text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isOutOfStock
                      ? 'opacity-50 border-neutral-200 cursor-not-allowed'
                      : inCartItem
                      ? 'border-emerald-500 ring-1 ring-emerald-500 shadow-xs'
                      : 'border-neutral-200 hover:border-neutral-300 hover:shadow-xs'
                  }`}
                >
                  <div>
                    {/* Stock & GST indicators (anti-slop clean text) */}
                    <div className="flex items-center justify-between text-[11px] text-neutral-500 mb-1">
                      <span>GST {prod.gstRate}%</span>
                      <span
                        className={`font-semibold tabular-nums ${
                          isOutOfStock
                            ? 'text-red-600'
                            : isLowStock
                            ? 'text-amber-600'
                            : 'text-neutral-500'
                        }`}
                      >
                        {isOutOfStock ? t('outOfStock') : `${prod.stock} ${t('stockLeft')}`}
                      </span>
                    </div>

                    {/* Name */}
                    <h4 className="text-xs font-semibold text-neutral-900 line-clamp-2 leading-tight mb-1 group-hover:text-emerald-700">
                      {lang === 'hi' && prod.nameHi ? prod.nameHi : prod.name}
                    </h4>
                    <p className="text-[10px] text-neutral-400 font-mono truncate">
                      {prod.barcode}
                    </p>
                  </div>

                  {/* Price & Action */}
                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-neutral-100">
                    <div>
                      <span className="text-sm font-bold text-neutral-900 tabular-nums">
                        {formatINR(prod.price)}
                      </span>
                      <span className="text-[10px] text-neutral-400 block font-normal">
                        / {prod.unit}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openPortionModal(prod);
                        }}
                        title={lang === 'hi' ? 'वजन / हिस्सा चुनें (पाव, आधा, ₹)' : 'Portion / Weight (250g, 500g, ₹)'}
                        className="p-1 rounded bg-neutral-100 hover:bg-emerald-50 text-neutral-600 hover:text-emerald-700 transition-colors border border-neutral-200"
                      >
                        <Scale className="w-3.5 h-3.5" />
                      </button>

                      {inCartItem ? (
                        <span className="min-w-6 h-6 px-1.5 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center tabular-nums">
                          {inCartItem.quantity}
                        </span>
                      ) : (
                        <span className="w-6 h-6 rounded-full bg-neutral-100 text-neutral-700 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center transition-colors">
                          <Plus className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredProducts.length === 0 && (
              <div className="col-span-full py-12 text-center text-neutral-500 bg-white rounded-xl border border-neutral-200">
                <Layers className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-neutral-700">No products found matching your search</p>
                <p className="text-xs text-neutral-400 mt-1">Try another keyword or barcode</p>
              </div>
            )}
          </div>
        </div>

        {/* =========================================================================
           RIGHT COLUMN: Interactive Cart & Checkout Drawer (5 cols)
           ========================================================================= */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-neutral-200 shadow-xs flex flex-col overflow-hidden">
          
          {/* Cart Header with Customer & Hold Actions */}
          <div className="p-4 border-b border-neutral-200 bg-neutral-50/70">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-neutral-900">
                  {t('cart')}
                </h3>
                <span className="text-xs text-neutral-500">
                  ({cart.reduce((a, b) => a + b.quantity, 0)} items)
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {heldBillData && (
                  <button
                    type="button"
                    onClick={handleRecallBill}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors"
                    title={t('recallBill')}
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    <span>{t('recallBill')}</span>
                  </button>
                )}
                {cart.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={handleHoldBill}
                      className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded hover:bg-neutral-200 transition-colors"
                      title={t('holdBill')}
                    >
                      <PauseCircle className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={clearCart}
                      className="p-1.5 text-neutral-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                      title={t('clearCart')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Customer Inputs & Loyalty Program Section */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder={t('customerName')}
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full pl-8 pr-2 py-1.5 text-xs bg-white border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
                  <input
                    type="tel"
                    placeholder={t('customerPhone')}
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    className="w-full pl-8 pr-2 py-1.5 text-xs bg-white border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Loyalty Member Badge & Redemption Controls */}
              {loyaltyConfig.enabled && customerPhone.trim().length >= 5 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-2.5 space-y-2 text-xs animate-in fade-in">
                  {matchedCustomer ? (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">
                            {matchedCustomer.tier === 'Platinum' ? '💎' : matchedCustomer.tier === 'Gold' ? '🥇' : matchedCustomer.tier === 'Silver' ? '🥈' : '🥉'}
                          </span>
                          <div>
                            <span className="font-bold text-amber-950 block">
                              {matchedCustomer.name} ({matchedCustomer.tier} Member)
                            </span>
                            <span className="text-[11px] text-amber-800">
                              Points: <strong className="font-mono text-amber-950 font-bold">{matchedCustomer.points} pts</strong> (= {formatINR(matchedCustomer.points * loyaltyConfig.pointValueINR)}) · {tierMultiplier}x
                            </span>
                          </div>
                        </div>

                        {matchedCustomer.points >= loyaltyConfig.minPointsToRedeem && maxRedeemablePoints > 0 && (
                          <label className="flex items-center gap-1.5 cursor-pointer font-bold text-[11px] text-emerald-800 bg-white border border-emerald-300 px-2 py-1 rounded-lg shadow-2xs hover:bg-emerald-50 transition-colors shrink-0">
                            <input
                              type="checkbox"
                              checked={redeemLoyalty}
                              onChange={e => {
                                setRedeemLoyalty(e.target.checked);
                                if (e.target.checked && pointsToRedeem === 0) {
                                  setPointsToRedeem(maxRedeemablePoints);
                                }
                              }}
                              className="w-3.5 h-3.5 text-emerald-600 rounded"
                            />
                            <span>{t('redeemPoints')}</span>
                          </label>
                        )}
                      </div>

                      {/* Redemption Input & Quick Chips */}
                      {redeemLoyalty && maxRedeemablePoints > 0 && (
                        <div className="pt-2 border-t border-amber-200/80 space-y-2 bg-white/80 p-2 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-neutral-600 font-semibold flex items-center gap-1">
                              <Coins className="w-3.5 h-3.5 text-amber-600" />
                              <span>{t('pointsToRedeem')}:</span>
                            </span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min={loyaltyConfig.minPointsToRedeem}
                                max={maxRedeemablePoints}
                                value={pointsToRedeem}
                                onChange={e => {
                                  const val = parseInt(e.target.value) || 0;
                                  setPointsToRedeem(Math.min(maxRedeemablePoints, Math.max(0, val)));
                                }}
                                className="w-16 px-2 py-0.5 text-right font-mono font-bold text-xs bg-white border border-amber-300 rounded focus:outline-none"
                              />
                              <span className="text-[11px] font-bold text-emerald-700 tabular-nums">
                                = -₹{loyaltyDiscountAmount.toFixed(2)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setPointsToRedeem(loyaltyConfig.minPointsToRedeem)}
                              className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 rounded"
                            >
                              Min ({loyaltyConfig.minPointsToRedeem})
                            </button>
                            {maxRedeemablePoints >= 50 && (
                              <button
                                type="button"
                                onClick={() => setPointsToRedeem(50)}
                                className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 rounded"
                              >
                                50 pts
                              </button>
                            )}
                            {maxRedeemablePoints >= 100 && (
                              <button
                                type="button"
                                onClick={() => setPointsToRedeem(100)}
                                className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 rounded"
                              >
                                100 pts
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setPointsToRedeem(maxRedeemablePoints)}
                              className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded ml-auto"
                            >
                              {t('redeemAll')} ({maxRedeemablePoints})
                            </button>
                          </div>
                        </div>
                      )}

                      {matchedCustomer.points < loyaltyConfig.minPointsToRedeem && (
                        <div className="text-[11px] text-amber-800">
                          ℹ️ Min {loyaltyConfig.minPointsToRedeem} points needed to redeem (Customer has {matchedCustomer.points} pts).
                        </div>
                      )}

                      {/* Points to be earned on this bill */}
                      {pointsEarnedOnBill > 0 && (
                        <div className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1 pt-0.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span>
                            Customer will earn +{pointsEarnedOnBill} points on this bill!
                          </span>
                        </div>
                      )}
                    </>
                  ) : normalizePhone(customerPhone).length === 10 ? (
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 text-amber-900">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>
                          <strong>{t('newCustomerEnroll')}</strong> (+{pointsEarnedOnBill} pts today!)
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          {/* Cart Items List */}
          <div className="divide-y divide-neutral-100 max-h-60 overflow-y-auto px-4 py-1">
            {cart.map(item => (
              <div key={item.product.id} className="py-2.5 flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-neutral-900 truncate">
                    {item.product.name}
                  </div>
                  <div className="text-[11px] text-neutral-500 flex items-center gap-1.5 mt-0.5">
                    <span>₹{item.unitPrice} / {item.product.unit}</span>
                    <span>·</span>
                    <span className="font-semibold text-emerald-800 tabular-nums">
                      {formatQuantity(item.quantity, item.product.unit)}
                    </span>
                    {item.discountPercent > 0 && (
                      <span className="text-emerald-700">· -{item.discountPercent}%</span>
                    )}
                  </div>
                </div>

                {/* Quantity Stepper & Portion Quick Selector */}
                <div className="flex items-center gap-1 border border-neutral-200 rounded-md p-0.5 bg-neutral-50">
                  <button
                    type="button"
                    onClick={() => {
                      const step = item.quantity <= 1 ? 0.25 : 1;
                      updateQuantity(item.product.id, Math.max(0, Math.round((item.quantity - step) * 1000) / 1000));
                    }}
                    className="p-1 hover:bg-neutral-200 text-neutral-600 rounded transition-colors"
                    title="Decrease"
                  >
                    <Minus className="w-3 h-3" />
                  </button>

                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={item.quantity}
                    onChange={e => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val > 0) updateQuantity(item.product.id, val);
                    }}
                    className="w-12 text-center text-xs font-bold text-neutral-900 bg-white border border-neutral-300 rounded py-0.5 tabular-nums focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    title="Directly enter fractional quantity (e.g. 0.25, 0.5, 1.5)"
                  />

                  <button
                    type="button"
                    onClick={() => {
                      const step = item.quantity < 1 ? 0.25 : 1;
                      updateQuantity(item.product.id, Math.round((item.quantity + step) * 1000) / 1000);
                    }}
                    className="p-1 hover:bg-neutral-200 text-neutral-600 rounded transition-colors"
                    title="Increase"
                  >
                    <Plus className="w-3 h-3" />
                  </button>

                  <button
                    type="button"
                    onClick={() => openPortionModal(item.product)}
                    className="p-1 text-emerald-700 hover:bg-emerald-100 rounded ml-0.5 transition-colors"
                    title={lang === 'hi' ? 'वजन / हिस्सा बदलें (पाव, आधा, ₹)' : 'Change portion / weight (250g, 500g, ₹)'}
                  >
                    <Scale className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Item Total */}
                <div className="text-right w-16">
                  <span className="text-xs font-bold text-neutral-900 tabular-nums">
                    ₹{item.total.toFixed(2)}
                  </span>
                </div>

                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => removeFromCart(item.product.id)}
                  className="p-1 text-neutral-400 hover:text-red-600 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {cart.length === 0 && (
              <div className="py-10 text-center text-neutral-400 text-xs">
                {t('emptyCart')}
              </div>
            )}
          </div>

          {/* Discount & Calculation Breakdown */}
          {cart.length > 0 && (
            <div className="p-4 border-t border-neutral-200 bg-neutral-50/50 space-y-2 text-xs">
              
              {/* Bill Discount Input */}
              <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
                <span className="text-neutral-600 font-medium">{t('applyBillDiscount')}:</span>
                <div className="flex items-center gap-1">
                  <div className="flex bg-neutral-200 p-0.5 rounded">
                    <button
                      type="button"
                      onClick={() => setBillDiscountType('percent')}
                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                        billDiscountType === 'percent' ? 'bg-white text-neutral-900' : 'text-neutral-600'
                      }`}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillDiscountType('fixed')}
                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                        billDiscountType === 'fixed' ? 'bg-white text-neutral-900' : 'text-neutral-600'
                      }`}
                    >
                      ₹
                    </button>
                  </div>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={billDiscountValue || ''}
                    onChange={e => setBillDiscountValue(parseFloat(e.target.value) || 0)}
                    className="w-16 px-2 py-1 text-right text-xs bg-white border border-neutral-300 rounded focus:outline-none"
                  />
                </div>
              </div>

              {/* Subtotal, GST, Round-off summary */}
              <div className="flex justify-between text-neutral-600">
                <span>{t('subtotal')}:</span>
                <span className="tabular-nums font-semibold">₹{taxableSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>{t('cgst')} + {t('sgst')}:</span>
                <span className="tabular-nums">
                  ₹{cgstTotal.toFixed(2)} + ₹{sgstTotal.toFixed(2)}
                </span>
              </div>
              {(totalItemDiscounts > 0 || billDiscountAmount > 0) && (
                <div className="flex justify-between text-emerald-700">
                  <span>{t('totalDiscount')}:</span>
                  <span className="tabular-nums font-semibold">
                    -₹{(totalItemDiscounts + billDiscountAmount).toFixed(2)}
                  </span>
                </div>
              )}
              {loyaltyDiscountAmount > 0 && (
                <div className="flex justify-between text-amber-900 bg-amber-100/70 px-2 py-1 rounded font-medium">
                  <span className="flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-amber-600" />
                    <span>Loyalty Points ({actualPointsRedeemed} pts):</span>
                  </span>
                  <span className="tabular-nums font-bold text-amber-950">
                    -₹{loyaltyDiscountAmount.toFixed(2)}
                  </span>
                </div>
              )}
              {roundOff !== 0 && (
                <div className="flex justify-between text-neutral-500">
                  <span>{t('roundOff')}:</span>
                  <span className="tabular-nums">
                    {roundOff > 0 ? `+₹${roundOff.toFixed(2)}` : `-₹${Math.abs(roundOff).toFixed(2)}`}
                  </span>
                </div>
              )}

              {/* Grand Total */}
              <div className="flex justify-between items-center pt-2 border-t border-neutral-300 text-sm font-bold text-neutral-900">
                <span>{t('grandTotal')}:</span>
                <span className="text-lg text-emerald-700 tabular-nums">
                  {formatINR(roundedGrandTotal)}
                </span>
              </div>
            </div>
          )}

          {/* Payment Method Selector */}
          {cart.length > 0 && (
            <div className="p-4 border-t border-neutral-200 space-y-3">
              <div className="text-xs font-semibold text-neutral-700">
                {t('paymentMethod')}:
              </div>
              
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-semibold transition-all ${
                    paymentMethod === 'cash'
                      ? 'border-emerald-600 bg-emerald-50/70 text-emerald-800 ring-1 ring-emerald-600'
                      : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  <Banknote className="w-4 h-4 mb-1" />
                  <span>{t('cash')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('upi')}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-semibold transition-all ${
                    paymentMethod === 'upi'
                      ? 'border-emerald-600 bg-emerald-50/70 text-emerald-800 ring-1 ring-emerald-600'
                      : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  <QrCode className="w-4 h-4 mb-1" />
                  <span>{t('upi')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-semibold transition-all ${
                    paymentMethod === 'card'
                      ? 'border-emerald-600 bg-emerald-50/70 text-emerald-800 ring-1 ring-emerald-600'
                      : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  <CreditCard className="w-4 h-4 mb-1" />
                  <span>{t('card')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('split');
                    setSplitCash(String(Math.floor(roundedGrandTotal / 2)));
                    setSplitUpi(String(roundedGrandTotal - Math.floor(roundedGrandTotal / 2)));
                  }}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-semibold transition-all ${
                    paymentMethod === 'split'
                      ? 'border-emerald-600 bg-emerald-50/70 text-emerald-800 ring-1 ring-emerald-600'
                      : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  <Split className="w-4 h-4 mb-1" />
                  <span>{t('split')}</span>
                </button>
              </div>

              {/* Cash Tendered & Change Due Calculator */}
              {paymentMethod === 'cash' && (
                <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-neutral-700">{t('cashTendered')}:</span>
                    <input
                      type="number"
                      placeholder={String(roundedGrandTotal)}
                      value={cashTendered}
                      onChange={e => setCashTendered(e.target.value)}
                      className="w-24 px-2 py-1 text-right text-xs bg-white border border-neutral-300 rounded font-mono font-bold"
                    />
                  </div>
                  
                  {/* Quick cash denomination buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setCashTendered(String(roundedGrandTotal))}
                      className="px-2 py-0.5 text-[11px] font-semibold bg-white border border-neutral-300 rounded hover:bg-neutral-100"
                    >
                      Exact
                    </button>
                    {[100, 200, 500, 2000].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setCashTendered(String(amt))}
                        className="px-2 py-0.5 text-[11px] font-semibold bg-white border border-neutral-300 rounded hover:bg-neutral-100 tabular-nums"
                      >
                        ₹{amt}
                      </button>
                    ))}
                  </div>

                  {numericCashTendered > 0 && (
                    <div className="flex justify-between items-center pt-1 border-t border-neutral-200 text-xs">
                      <span className="font-semibold text-neutral-700">{t('changeDue')}:</span>
                      <span className="font-bold text-sm text-emerald-700 tabular-nums">
                        {formatINR(changeDue)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* UPI QR Display */}
              {paymentMethod === 'upi' && upiQrUrl && (
                <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg flex items-center gap-4">
                  <img
                    src={upiQrUrl}
                    alt="UPI QR Code"
                    className="w-20 h-20 border border-neutral-200 rounded p-1 bg-white"
                  />
                  <div className="text-xs space-y-1">
                    <p className="font-semibold text-neutral-900">{t('scanUpiPrompt')}</p>
                    <p className="text-[11px] text-neutral-500 font-mono">UPI ID: {shopConfig.upiId}</p>
                    <p className="text-xs font-bold text-emerald-700 tabular-nums">Amount: ₹{roundedGrandTotal}</p>
                  </div>
                </div>
              )}

              {/* Split Payment inputs */}
              {paymentMethod === 'split' && (
                <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span>Cash:</span>
                    <input
                      type="number"
                      value={splitCash}
                      onChange={e => setSplitCash(e.target.value)}
                      className="w-24 px-2 py-1 text-right text-xs bg-white border border-neutral-300 rounded font-mono"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>UPI:</span>
                    <input
                      type="number"
                      value={splitUpi}
                      onChange={e => setSplitUpi(e.target.value)}
                      className="w-24 px-2 py-1 text-right text-xs bg-white border border-neutral-300 rounded font-mono"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Card:</span>
                    <input
                      type="number"
                      value={splitCard}
                      onChange={e => setSplitCard(e.target.value)}
                      className="w-24 px-2 py-1 text-right text-xs bg-white border border-neutral-300 rounded font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Complete & Generate Bill Button */}
              <button
                type="button"
                onClick={handleCompleteBill}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>{t('generateBill')} · {formatINR(roundedGrandTotal)}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Loose / Portion Selector Modal */}
      <PortionModal
        isOpen={isPortionModalOpen}
        onClose={() => setIsPortionModalOpen(false)}
        product={portionProduct}
        onAddToCartWithPortion={(prod, qty) => {
          addToCart(prod, qty, true);
        }}
        lang={lang}
      />

      {/* Camera Barcode Scanner Modal */}
      <CameraBarcodeScanner
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        products={products}
        onProductScanned={(scannedProd) => {
          addToCart(scannedProd, 1);
        }}
        onUnknownBarcode={(code) => {
          setSearchQuery(code);
        }}
        lang={lang}
      />

      {/* Live Voice Cart Builder Modal */}
      <VoiceBillingAssistant
        isOpen={isVoiceAssistantOpen}
        onClose={() => setIsVoiceAssistantOpen(false)}
        products={products}
        currentCart={cart}
        onAddToCart={(prod, qty) => {
          addToCart(prod, qty);
        }}
        onRemoveFromCart={(prodId) => {
          removeFromCart(prodId);
        }}
        onClearCart={() => {
          clearCart();
        }}
        lang={lang}
      />
    </div>
  );
};
