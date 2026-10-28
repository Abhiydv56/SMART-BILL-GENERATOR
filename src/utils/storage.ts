import {
  ShopConfig,
  Product,
  Cashier,
  Department,
  Bill,
  CartItem,
  Language,
  CustomerLoyalty,
  LoyaltyConfig,
  LoyaltyTier,
} from '../types';
import {
  defaultSmallShopConfig,
  defaultMallConfig,
  defaultDepartments,
  defaultCashiers,
  sampleProducts,
  generateInitialBills,
  sampleCustomers,
  defaultLoyaltyConfig,
} from '../data/sampleData';

const BASE_STORAGE_KEYS = {
  SHOP_CONFIG: 'sbg_shop_config_v2',
  PRODUCTS: 'sbg_products_v2',
  BILLS: 'sbg_bills_v2',
  CASHIERS: 'sbg_cashiers_v2',
  DEPARTMENTS: 'sbg_departments_v2',
  ACTIVE_CASHIER: 'sbg_active_cashier_v2',
  LANGUAGE: 'sbg_language_v2',
  HELD_BILL: 'sbg_held_bill_v2',
  CUSTOMERS: 'sbg_customers_v2',
  LOYALTY_CONFIG: 'sbg_loyalty_config_v2',
};

function getScopedKey(baseKey: string, shopId?: string): string {
  return shopId ? `${baseKey}_${shopId}` : baseKey;
}

export function getStoredLanguage(): Language {
  const lang = localStorage.getItem(BASE_STORAGE_KEYS.LANGUAGE);
  return lang === 'hi' ? 'hi' : 'en';
}

export function saveStoredLanguage(lang: Language) {
  localStorage.setItem(BASE_STORAGE_KEYS.LANGUAGE, lang);
}

export function getStoredShopConfig(shopId?: string): ShopConfig {
  const raw = localStorage.getItem(getScopedKey(BASE_STORAGE_KEYS.SHOP_CONFIG, shopId));
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error('Error parsing shop config', e);
    }
  }
  return defaultSmallShopConfig;
}

export function saveStoredShopConfig(config: ShopConfig, shopId?: string) {
  localStorage.setItem(getScopedKey(BASE_STORAGE_KEYS.SHOP_CONFIG, shopId), JSON.stringify(config));
}

export function getStoredProducts(shopId?: string): Product[] {
  const raw = localStorage.getItem(getScopedKey(BASE_STORAGE_KEYS.PRODUCTS, shopId));
  if (raw) {
    try {
      const parsed: Product[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure standard staple items (Sugar, Soap, Milk, etc.) are available even if session was saved earlier
        const existingIds = new Set(parsed.map(p => p.id));
        const missingStaples = sampleProducts.filter(sp => !existingIds.has(sp.id) && sp.id.startsWith('prod-staple-'));
        if (missingStaples.length > 0) {
          const merged = [...parsed, ...missingStaples];
          saveStoredProducts(merged, shopId);
          return merged;
        }
        return parsed;
      }
    } catch (e) {
      console.error('Error parsing products', e);
    }
  }
  return sampleProducts;
}

export function saveStoredProducts(products: Product[], shopId?: string) {
  localStorage.setItem(getScopedKey(BASE_STORAGE_KEYS.PRODUCTS, shopId), JSON.stringify(products));
}

export function getStoredBills(shopId?: string): Bill[] {
  const raw = localStorage.getItem(getScopedKey(BASE_STORAGE_KEYS.BILLS, shopId));
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error('Error parsing bills', e);
    }
  }
  return generateInitialBills(sampleProducts);
}

export function saveStoredBills(bills: Bill[], shopId?: string) {
  localStorage.setItem(getScopedKey(BASE_STORAGE_KEYS.BILLS, shopId), JSON.stringify(bills));
}

export function getStoredCashiers(shopId?: string): Cashier[] {
  const raw = localStorage.getItem(getScopedKey(BASE_STORAGE_KEYS.CASHIERS, shopId));
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error('Error parsing cashiers', e);
    }
  }
  return defaultCashiers;
}

export function saveStoredCashiers(cashiers: Cashier[], shopId?: string) {
  localStorage.setItem(getScopedKey(BASE_STORAGE_KEYS.CASHIERS, shopId), JSON.stringify(cashiers));
}

export function getStoredDepartments(shopId?: string): Department[] {
  const raw = localStorage.getItem(getScopedKey(BASE_STORAGE_KEYS.DEPARTMENTS, shopId));
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error('Error parsing departments', e);
    }
  }
  return defaultDepartments;
}

export function saveStoredDepartments(departments: Department[], shopId?: string) {
  localStorage.setItem(getScopedKey(BASE_STORAGE_KEYS.DEPARTMENTS, shopId), JSON.stringify(departments));
}

export function getActiveCashier(cashiers: Cashier[], shopId?: string): Cashier {
  const activeId = localStorage.getItem(getScopedKey(BASE_STORAGE_KEYS.ACTIVE_CASHIER, shopId));
  if (activeId) {
    const found = cashiers.find(c => c.id === activeId);
    if (found) return found;
  }
  return cashiers[0] || defaultCashiers[0];
}

export function saveActiveCashierId(id: string, shopId?: string) {
  localStorage.setItem(getScopedKey(BASE_STORAGE_KEYS.ACTIVE_CASHIER, shopId), id);
}

export function getHeldBill(shopId?: string): { items: CartItem[]; customerName?: string; customerPhone?: string } | null {
  const raw = localStorage.getItem(getScopedKey(BASE_STORAGE_KEYS.HELD_BILL, shopId));
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error('Error parsing held bill', e);
    }
  }
  return null;
}

export function saveHeldBill(billData: { items: CartItem[]; customerName?: string; customerPhone?: string } | null, shopId?: string) {
  const key = getScopedKey(BASE_STORAGE_KEYS.HELD_BILL, shopId);
  if (billData) {
    localStorage.setItem(key, JSON.stringify(billData));
  } else {
    localStorage.removeItem(key);
  }
}

// -------------------------------------------------------------
// Customer Loyalty Program Persistence & Helpers
// -------------------------------------------------------------

export function getStoredCustomers(shopId?: string): CustomerLoyalty[] {
  const raw = localStorage.getItem(getScopedKey(BASE_STORAGE_KEYS.CUSTOMERS, shopId));
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error('Error parsing customers', e);
    }
  }
  return sampleCustomers;
}

export function saveStoredCustomers(customers: CustomerLoyalty[], shopId?: string) {
  localStorage.setItem(getScopedKey(BASE_STORAGE_KEYS.CUSTOMERS, shopId), JSON.stringify(customers));
}

export function getStoredLoyaltyConfig(shopId?: string): LoyaltyConfig {
  const raw = localStorage.getItem(getScopedKey(BASE_STORAGE_KEYS.LOYALTY_CONFIG, shopId));
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error('Error parsing loyalty config', e);
    }
  }
  return defaultLoyaltyConfig;
}

export function saveStoredLoyaltyConfig(config: LoyaltyConfig, shopId?: string) {
  localStorage.setItem(getScopedKey(BASE_STORAGE_KEYS.LOYALTY_CONFIG, shopId), JSON.stringify(config));
}

/**
 * Standardize phone number: extracts 10 digits
 */
export function normalizePhone(rawPhone: string): string {
  const cleaned = rawPhone.replace(/\D/g, '');
  if (cleaned.length > 10 && cleaned.startsWith('91')) {
    return cleaned.slice(2);
  }
  if (cleaned.length > 10 && cleaned.startsWith('0')) {
    return cleaned.slice(1);
  }
  return cleaned;
}

/**
 * Tier Calculation based on cumulative lifetime points earned
 */
export function calculateLoyaltyTier(lifetimeEarned: number): LoyaltyTier {
  if (lifetimeEarned >= 500) return 'Platinum';
  if (lifetimeEarned >= 200) return 'Gold';
  if (lifetimeEarned >= 75) return 'Silver';
  return 'Bronze';
}

/**
 * Multiplier for tier
 */
export function getTierMultiplier(tier: LoyaltyTier): number {
  switch (tier) {
    case 'Platinum':
      return 2.0;
    case 'Gold':
      return 1.5;
    case 'Silver':
      return 1.25;
    case 'Bronze':
    default:
      return 1.0;
  }
}

/**
 * Find customer by 10-digit phone number or partial search
 */
export function findCustomerByPhone(phone: string, customers: CustomerLoyalty[]): CustomerLoyalty | undefined {
  const clean = normalizePhone(phone);
  if (!clean || clean.length < 5) return undefined;
  return customers.find(c => normalizePhone(c.phone) === clean);
}

/**
 * Update customer loyalty records after a bill is completed
 */
export function applyBillToCustomerLoyalty(
  customerPhone: string,
  customerName: string | undefined,
  billGrandTotal: number,
  pointsRedeemed: number,
  pointsEarned: number,
  customers: CustomerLoyalty[],
  shopId?: string
): { updatedCustomers: CustomerLoyalty[]; customerRecord: CustomerLoyalty } {
  const cleanPhone = normalizePhone(customerPhone);
  const nowIso = new Date().toISOString();
  const existingIndex = customers.findIndex(c => normalizePhone(c.phone) === cleanPhone);

  let customerRecord: CustomerLoyalty;

  if (existingIndex > -1) {
    const existing = customers[existingIndex];
    const newPointsBalance = Math.max(0, existing.points - pointsRedeemed + pointsEarned);
    const newTotalEarned = existing.totalEarned + pointsEarned;
    const newTotalRedeemed = existing.totalRedeemed + pointsRedeemed;
    const newTotalSpent = existing.totalSpent + billGrandTotal;
    const newBillsCount = existing.billsCount + 1;
    const newTier = calculateLoyaltyTier(newTotalEarned);

    customerRecord = {
      ...existing,
      name: customerName?.trim() || existing.name,
      phone: cleanPhone,
      points: newPointsBalance,
      totalEarned: newTotalEarned,
      totalRedeemed: newTotalRedeemed,
      totalSpent: newTotalSpent,
      billsCount: newBillsCount,
      tier: newTier,
      lastVisit: nowIso,
    };

    const updated = [...customers];
    updated[existingIndex] = customerRecord;
    saveStoredCustomers(updated, shopId);
    return { updatedCustomers: updated, customerRecord };
  } else {
    // New customer enrollment
    const newPointsBalance = Math.max(0, pointsEarned - pointsRedeemed);
    const newTier = calculateLoyaltyTier(pointsEarned);

    customerRecord = {
      id: cleanPhone || `cust-${Date.now()}`,
      name: customerName?.trim() || `Customer ${cleanPhone.slice(-4)}`,
      phone: cleanPhone,
      points: newPointsBalance,
      totalEarned: pointsEarned,
      totalRedeemed: pointsRedeemed,
      totalSpent: billGrandTotal,
      billsCount: 1,
      tier: newTier,
      memberSince: nowIso,
      lastVisit: nowIso,
    };

    const updated = [customerRecord, ...customers];
    saveStoredCustomers(updated, shopId);
    return { updatedCustomers: updated, customerRecord };
  }
}

/**
 * Resets storage back to default demo state for a given mode
 */
export function resetToDemoData(mode: 'small_shop' | 'mall', shopId?: string): {
  shopConfig: ShopConfig;
  products: Product[];
  bills: Bill[];
  cashiers: Cashier[];
  departments: Department[];
  customers: CustomerLoyalty[];
  loyaltyConfig: LoyaltyConfig;
} {
  const shopConfig = mode === 'mall' ? defaultMallConfig : defaultSmallShopConfig;
  const products = [...sampleProducts];
  const bills = generateInitialBills(products);
  const cashiers = [...defaultCashiers];
  const departments = [...defaultDepartments];
  const customers = [...sampleCustomers];
  const loyaltyConfig = { ...defaultLoyaltyConfig };

  saveStoredShopConfig(shopConfig, shopId);
  saveStoredProducts(products, shopId);
  saveStoredBills(bills, shopId);
  saveStoredCashiers(cashiers, shopId);
  saveStoredDepartments(departments, shopId);
  saveStoredCustomers(customers, shopId);
  saveStoredLoyaltyConfig(loyaltyConfig, shopId);
  saveActiveCashierId(cashiers[0].id, shopId);
  saveHeldBill(null, shopId);

  return { shopConfig, products, bills, cashiers, departments, customers, loyaltyConfig };
}
