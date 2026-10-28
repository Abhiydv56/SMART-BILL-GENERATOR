export type ShopMode = 'small_shop' | 'mall';

export type Language = 'en' | 'hi';

export type PaymentMethod = 'cash' | 'upi' | 'card' | 'split';

export type GSTRate = 0 | 5 | 12 | 18 | 28;

export interface ShopConfig {
  name: string;
  tagline?: string;
  mode: ShopMode;
  logoUrl?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email?: string;
  gstin: string;
  fssai?: string;
  upiId: string;
  thermalHeader?: string;
  thermalFooter?: string;
  invoicePrefix: string;
  currentInvoiceNum: number;
}

export interface Cashier {
  id: string;
  name: string;
  counterName: string;
  role: 'admin' | 'cashier';
  pin?: string;
  departmentId?: string;
}

export interface Department {
  id: string;
  name: string;
  nameHi: string;
  code: string;
}

export interface Product {
  id: string;
  name: string;
  nameHi?: string;
  category: string;
  departmentId?: string;
  price: number;
  costPrice?: number;
  gstRate: GSTRate;
  stock: number;
  minStockAlert: number;
  barcode: string;
  sku: string;
  unit: 'Pcs' | 'Kg' | 'Gram' | 'Ltr' | 'Pack' | 'Box' | 'Meter';
  hsnCode?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number; // Selling price inclusive of GST
  discountPercent: number; // Item level discount %
  discountAmount: number; // Calculated discount in ₹
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  totalTax: number;
  total: number;
}

export interface SplitPaymentDetail {
  cash: number;
  upi: number;
  card: number;
}

export interface Bill {
  id: string;
  invoiceNumber: string;
  date: string; // ISO date string
  timestamp: number;
  items: CartItem[];
  customerName?: string;
  customerPhone?: string;
  customerGstin?: string;
  mode: ShopMode;
  departmentId?: string;
  departmentName?: string;
  cashierId: string;
  cashierName: string;
  counterName: string;
  paymentMethod: PaymentMethod;
  splitDetails?: SplitPaymentDetail;
  cashTendered?: number;
  changeDue?: number;
  subtotal: number;
  totalDiscount: number;
  taxableSubtotal: number;
  cgstTotal: number;
  sgstTotal: number;
  totalGst: number;
  roundOff: number;
  grandTotal: number;
  status: 'completed' | 'cancelled';
  notes?: string;
  // Loyalty Program fields
  loyaltyPointsEarned?: number;
  loyaltyPointsRedeemed?: number;
  loyaltyDiscountAmount?: number;
  loyaltyBalanceAfter?: number;
}

export interface GSTSlabSummary {
  rate: GSTRate;
  taxableValue: number;
  cgst: number;
  sgst: number;
  totalTax: number;
}

export type LoyaltyTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

export interface CustomerLoyalty {
  id: string; // Phone number or unique ID
  name: string;
  phone: string;
  points: number; // Current active redeemable points
  totalEarned: number; // Lifetime points earned
  totalRedeemed: number; // Lifetime points redeemed
  totalSpent: number; // Total ₹ spent across all purchases
  billsCount: number; // Number of visits / bills
  tier: LoyaltyTier;
  memberSince: string; // ISO date
  lastVisit?: string; // ISO date of last bill
  notes?: string;
}

export interface LoyaltyConfig {
  enabled: boolean;
  spendPerPoint: number; // ₹ spend required to earn 1 point (default: 100)
  pointValueINR: number; // Rupee value of 1 point when redeemed (default: 1)
  minPointsToRedeem: number; // Minimum points required before redemption (default: 10)
  maxDiscountPercent: number; // Max % of bill that can be paid via points (default: 50)
}
