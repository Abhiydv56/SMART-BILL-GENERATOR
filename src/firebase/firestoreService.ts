import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  getDoc,
  query,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './config';
import {
  ShopConfig,
  Product,
  Bill,
  Cashier,
  Department,
  CustomerLoyalty,
  LoyaltyConfig,
} from '../types';
import {
  defaultSmallShopConfig,
  defaultMallConfig,
  defaultCashiers,
  defaultDepartments,
  sampleProducts,
  defaultLoyaltyConfig,
  sampleCustomers,
} from '../data/sampleData';

export interface ShopSyncData {
  config?: ShopConfig;
  products?: Product[];
  bills?: Bill[];
  cashiers?: Cashier[];
  departments?: Department[];
  customers?: CustomerLoyalty[];
  loyaltyConfig?: LoyaltyConfig;
}

export interface SyncCallbacks {
  onConfigChange: (config: ShopConfig) => void;
  onProductsChange: (products: Product[]) => void;
  onBillsChange: (bills: Bill[]) => void;
  onCashiersChange: (cashiers: Cashier[]) => void;
  onDepartmentsChange: (departments: Department[]) => void;
  onCustomersChange: (customers: CustomerLoyalty[]) => void;
  onLoyaltyConfigChange: (loyaltyConfig: LoyaltyConfig) => void;
  onSyncStatus?: (status: 'syncing' | 'synced' | 'error', message?: string) => void;
}

/**
 * Initializes a new shop owner profile with default inventory and configuration in Firestore.
 */
export async function seedNewShopIfEmpty(
  shopId: string,
  ownerName: string,
  ownerEmail: string,
  shopName: string,
  mode: 'small_shop' | 'mall' = 'small_shop',
  city: string = 'Jaipur',
  state: string = 'Rajasthan'
): Promise<void> {
  try {
    const shopRef = doc(db, 'shops', shopId);
    const shopSnap = await getDoc(shopRef);

    if (shopSnap.exists()) {
      return; // Already initialized
    }

    const baseConfig: ShopConfig = mode === 'mall' ? { ...defaultMallConfig } : { ...defaultSmallShopConfig };
    baseConfig.name = shopName;
    baseConfig.email = ownerEmail;
    baseConfig.city = city;
    baseConfig.state = state;

    // 1. Save Shop Config
    await setDoc(shopRef, {
      ...baseConfig,
      ownerId: shopId,
      ownerName,
      createdAt: new Date().toISOString(),
    });

    // 2. Seed Initial Products
    for (const prod of sampleProducts) {
      const prodRef = doc(db, 'shops', shopId, 'products', prod.id);
      await setDoc(prodRef, prod);
    }

    // 3. Seed Cashiers
    for (const c of defaultCashiers) {
      const cRef = doc(db, 'shops', shopId, 'cashiers', c.id);
      await setDoc(cRef, c);
    }

    // 4. Seed Departments
    for (const d of defaultDepartments) {
      const dRef = doc(db, 'shops', shopId, 'departments', d.id);
      await setDoc(dRef, d);
    }

    // 5. Seed Loyalty Customers
    for (const cust of sampleCustomers) {
      const custRef = doc(db, 'shops', shopId, 'customers', cust.id);
      await setDoc(custRef, cust);
    }

    // 6. Seed Loyalty Config
    const loyaltyRef = doc(db, 'shops', shopId, 'loyaltyConfig', 'config');
    await setDoc(loyaltyRef, defaultLoyaltyConfig);

  } catch (err) {
    console.warn('Could not seed shop to cloud (falling back to local):', err);
  }
}

/**
 * Real-time listener for all shop data scoped by the shopkeeper's unique ID.
 */
export function subscribeToShop(shopId: string, callbacks: SyncCallbacks): () => void {
  const unsubscribers: Unsubscribe[] = [];

  try {
    callbacks.onSyncStatus?.('syncing', 'Connecting to cloud database...');

    // 1. Shop Config listener
    const shopRef = doc(db, 'shops', shopId);
    const unsubShop = onSnapshot(
      shopRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as ShopConfig;
          callbacks.onConfigChange(data);
          callbacks.onSyncStatus?.('synced', 'Connected to Firestore');
        }
      },
      (error) => {
        console.warn('Error listening to shop config:', error);
        callbacks.onSyncStatus?.('error', error.message);
      }
    );
    unsubscribers.push(unsubShop);

    // 2. Products listener
    const productsRef = collection(db, 'shops', shopId, 'products');
    const unsubProducts = onSnapshot(
      productsRef,
      (querySnap) => {
        const prods: Product[] = [];
        querySnap.forEach((d) => prods.push(d.data() as Product));
        if (prods.length > 0) {
          callbacks.onProductsChange(prods);
        }
      },
      (error) => {
        console.warn('Error listening to products:', error);
      }
    );
    unsubscribers.push(unsubProducts);

    // 3. Bills listener
    const billsRef = query(collection(db, 'shops', shopId, 'bills'), orderBy('timestamp', 'desc'));
    const unsubBills = onSnapshot(
      billsRef,
      (querySnap) => {
        const billsList: Bill[] = [];
        querySnap.forEach((d) => billsList.push(d.data() as Bill));
        if (billsList.length > 0) {
          callbacks.onBillsChange(billsList);
        }
      },
      (error) => {
        console.warn('Error listening to bills:', error);
      }
    );
    unsubscribers.push(unsubBills);

    // 4. Cashiers listener
    const cashiersRef = collection(db, 'shops', shopId, 'cashiers');
    const unsubCashiers = onSnapshot(
      cashiersRef,
      (querySnap) => {
        const cashiersList: Cashier[] = [];
        querySnap.forEach((d) => cashiersList.push(d.data() as Cashier));
        if (cashiersList.length > 0) {
          callbacks.onCashiersChange(cashiersList);
        }
      },
      (error) => {
        console.warn('Error listening to cashiers:', error);
      }
    );
    unsubscribers.push(unsubCashiers);

    // 5. Departments listener
    const deptsRef = collection(db, 'shops', shopId, 'departments');
    const unsubDepts = onSnapshot(
      deptsRef,
      (querySnap) => {
        const deptsList: Department[] = [];
        querySnap.forEach((d) => deptsList.push(d.data() as Department));
        if (deptsList.length > 0) {
          callbacks.onDepartmentsChange(deptsList);
        }
      },
      (error) => {
        console.warn('Error listening to departments:', error);
      }
    );
    unsubscribers.push(unsubDepts);

    // 6. Customers listener
    const custRef = collection(db, 'shops', shopId, 'customers');
    const unsubCust = onSnapshot(
      custRef,
      (querySnap) => {
        const custList: CustomerLoyalty[] = [];
        querySnap.forEach((d) => custList.push(d.data() as CustomerLoyalty));
        if (custList.length > 0) {
          callbacks.onCustomersChange(custList);
        }
      },
      (error) => {
        console.warn('Error listening to customers:', error);
      }
    );
    unsubscribers.push(unsubCust);

    // 7. Loyalty Config listener
    const loyaltyRef = doc(db, 'shops', shopId, 'loyaltyConfig', 'config');
    const unsubLoyalty = onSnapshot(
      loyaltyRef,
      (docSnap) => {
        if (docSnap.exists()) {
          callbacks.onLoyaltyConfigChange(docSnap.data() as LoyaltyConfig);
        }
      },
      (error) => {
        console.warn('Error listening to loyalty config:', error);
      }
    );
    unsubscribers.push(unsubLoyalty);

  } catch (err) {
    console.error('Subscription error in subscribeToShop:', err);
    callbacks.onSyncStatus?.('error', 'Sync paused (using offline local data)');
  }

  return () => {
    unsubscribers.forEach((unsub) => unsub());
  };
}

// =================== Write Operations ===================

export async function saveShopConfigToFirestore(shopId: string, config: ShopConfig): Promise<void> {
  const path = `shops/${shopId}`;
  try {
    const ref = doc(db, 'shops', shopId);
    await setDoc(ref, config, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function saveProductToFirestore(shopId: string, product: Product): Promise<void> {
  const path = `shops/${shopId}/products/${product.id}`;
  try {
    const ref = doc(db, 'shops', shopId, 'products', product.id);
    await setDoc(ref, product);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteProductFromFirestore(shopId: string, productId: string): Promise<void> {
  const path = `shops/${shopId}/products/${productId}`;
  try {
    const ref = doc(db, 'shops', shopId, 'products', productId);
    await deleteDoc(ref);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveBillToFirestore(shopId: string, bill: Bill): Promise<void> {
  const path = `shops/${shopId}/bills/${bill.id}`;
  try {
    const ref = doc(db, 'shops', shopId, 'bills', bill.id);
    await setDoc(ref, bill);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function saveCustomerToFirestore(shopId: string, customer: CustomerLoyalty): Promise<void> {
  const path = `shops/${shopId}/customers/${customer.id}`;
  try {
    const ref = doc(db, 'shops', shopId, 'customers', customer.id);
    await setDoc(ref, customer);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function saveCashierToFirestore(shopId: string, cashier: Cashier): Promise<void> {
  const path = `shops/${shopId}/cashiers/${cashier.id}`;
  try {
    const ref = doc(db, 'shops', shopId, 'cashiers', cashier.id);
    await setDoc(ref, cashier);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function saveDepartmentToFirestore(shopId: string, dept: Department): Promise<void> {
  const path = `shops/${shopId}/departments/${dept.id}`;
  try {
    const ref = doc(db, 'shops', shopId, 'departments', dept.id);
    await setDoc(ref, dept);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function saveLoyaltyConfigToFirestore(shopId: string, config: LoyaltyConfig): Promise<void> {
  const path = `shops/${shopId}/loyaltyConfig/config`;
  try {
    const ref = doc(db, 'shops', shopId, 'loyaltyConfig', 'config');
    await setDoc(ref, config);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}
