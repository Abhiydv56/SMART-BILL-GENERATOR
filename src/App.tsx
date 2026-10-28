import React, { useState, useEffect, useRef } from 'react';
import {
  ShopConfig,
  Product,
  Bill,
  Cashier,
  Department,
  Language,
  ShopMode,
  CustomerLoyalty,
  LoyaltyConfig,
} from './types';
import {
  getStoredShopConfig,
  saveStoredShopConfig,
  getStoredProducts,
  saveStoredProducts,
  getStoredBills,
  saveStoredBills,
  getStoredCashiers,
  saveStoredCashiers,
  getStoredDepartments,
  saveStoredDepartments,
  getActiveCashier,
  saveActiveCashierId,
  getStoredLanguage,
  saveStoredLanguage,
  getStoredCustomers,
  saveStoredCustomers,
  getStoredLoyaltyConfig,
  saveStoredLoyaltyConfig,
  resetToDemoData,
} from './utils/storage';
import { useAuth } from './firebase/authContext';
import {
  seedNewShopIfEmpty,
  subscribeToShop,
  saveShopConfigToFirestore,
  saveProductToFirestore,
  saveBillToFirestore,
  saveCustomerToFirestore,
  saveLoyaltyConfigToFirestore,
  saveCashierToFirestore,
  saveDepartmentToFirestore,
} from './firebase/firestoreService';
import { AuthScreen } from './components/AuthScreen';
import { Header } from './components/Header';
import { BillingScreen } from './components/BillingScreen';
import { InvoiceView } from './components/InvoiceView';
import { ProductManagement } from './components/ProductManagement';
import { Dashboard } from './components/Dashboard';
import { BillHistory } from './components/BillHistory';
import { MallReports } from './components/MallReports';
import { LoyaltyManagement } from './components/LoyaltyManagement';
import { ShopSetupModal } from './components/ShopSetupModal';
import { CashierModal } from './components/CashierModal';
import { Loader2 } from 'lucide-react';

export default function App() {
  const { shopOwner, loading: authLoading } = useAuth();

  const [shopConfig, setShopConfig] = useState<ShopConfig>(() =>
    getStoredShopConfig(shopOwner?.uid)
  );
  const [products, setProducts] = useState<Product[]>(() =>
    getStoredProducts(shopOwner?.uid)
  );
  const [bills, setBills] = useState<Bill[]>(() =>
    getStoredBills(shopOwner?.uid)
  );
  const [cashiers, setCashiers] = useState<Cashier[]>(() =>
    getStoredCashiers(shopOwner?.uid)
  );
  const [departments, setDepartments] = useState<Department[]>(() =>
    getStoredDepartments(shopOwner?.uid)
  );
  const [customers, setCustomers] = useState<CustomerLoyalty[]>(() =>
    getStoredCustomers(shopOwner?.uid)
  );
  const [loyaltyConfig, setLoyaltyConfig] = useState<LoyaltyConfig>(() =>
    getStoredLoyaltyConfig(shopOwner?.uid)
  );
  const [lang, setLang] = useState<Language>(getStoredLanguage);

  const [activeCashier, setActiveCashier] = useState<Cashier>(() =>
    getActiveCashier(getStoredCashiers(shopOwner?.uid), shopOwner?.uid)
  );

  const [currentTab, setCurrentTab] = useState<
    'billing' | 'products' | 'dashboard' | 'history' | 'loyalty' | 'reports' | 'setup'
  >('billing');

  const [activeInvoice, setActiveInvoice] = useState<Bill | null>(null);
  const [isCashierModalOpen, setIsCashierModalOpen] = useState(false);
  const [selectedBillingCustomer, setSelectedBillingCustomer] = useState<{ phone: string; name: string } | null>(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'syncing' | 'synced' | 'error'>('synced');

  // Track current shop owner UID to prevent cross-shop race conditions
  const currentOwnerUidRef = useRef<string | undefined>(shopOwner?.uid);

  // When shop owner changes, switch local state and subscribe to Firestore
  useEffect(() => {
    if (!shopOwner) return;

    currentOwnerUidRef.current = shopOwner.uid;
    const uid = shopOwner.uid;

    // Load initial cached state for this shop owner
    const loadedConfig = getStoredShopConfig(uid);
    // If it's a freshly chosen owner profile and default name was empty/generic, apply shop owner identity
    if (loadedConfig.name === 'My Retail Store' || loadedConfig.name === 'Sharma Kirana & General Store') {
      loadedConfig.name = shopOwner.shopName || loadedConfig.name;
      loadedConfig.mode = shopOwner.shopMode || loadedConfig.mode;
      if (shopOwner.city) loadedConfig.city = shopOwner.city;
      if (shopOwner.state) loadedConfig.state = shopOwner.state;
      if (shopOwner.email) loadedConfig.email = shopOwner.email;
    }
    setShopConfig(loadedConfig);

    const loadedProds = getStoredProducts(uid);
    setProducts(loadedProds);

    const loadedBills = getStoredBills(uid);
    setBills(loadedBills);

    const loadedCashiers = getStoredCashiers(uid);
    setCashiers(loadedCashiers);
    setActiveCashier(getActiveCashier(loadedCashiers, uid));

    const loadedDepts = getStoredDepartments(uid);
    setDepartments(loadedDepts);

    const loadedCust = getStoredCustomers(uid);
    setCustomers(loadedCust);

    const loadedLoyalty = getStoredLoyaltyConfig(uid);
    setLoyaltyConfig(loadedLoyalty);

    // Seed new shop profile into Firestore if not initialized yet
    seedNewShopIfEmpty(
      uid,
      shopOwner.displayName,
      shopOwner.email,
      shopOwner.shopName,
      shopOwner.shopMode,
      shopOwner.city,
      shopOwner.state
    ).catch(err => console.warn('Seed shop notice:', err));

    // Subscribe to real-time updates for this shopkeeper's store
    const unsubscribe = subscribeToShop(uid, {
      onConfigChange: (remoteConfig) => {
        if (currentOwnerUidRef.current === uid) {
          setShopConfig(remoteConfig);
          saveStoredShopConfig(remoteConfig, uid);
        }
      },
      onProductsChange: (remoteProds) => {
        if (currentOwnerUidRef.current === uid) {
          setProducts(remoteProds);
          saveStoredProducts(remoteProds, uid);
        }
      },
      onBillsChange: (remoteBills) => {
        if (currentOwnerUidRef.current === uid) {
          setBills(remoteBills);
          saveStoredBills(remoteBills, uid);
        }
      },
      onCashiersChange: (remoteCashiers) => {
        if (currentOwnerUidRef.current === uid) {
          setCashiers(remoteCashiers);
          saveStoredCashiers(remoteCashiers, uid);
        }
      },
      onDepartmentsChange: (remoteDepts) => {
        if (currentOwnerUidRef.current === uid) {
          setDepartments(remoteDepts);
          saveStoredDepartments(remoteDepts, uid);
        }
      },
      onCustomersChange: (remoteCust) => {
        if (currentOwnerUidRef.current === uid) {
          setCustomers(remoteCust);
          saveStoredCustomers(remoteCust, uid);
        }
      },
      onLoyaltyConfigChange: (remoteLoyalty) => {
        if (currentOwnerUidRef.current === uid) {
          setLoyaltyConfig(remoteLoyalty);
          saveStoredLoyaltyConfig(remoteLoyalty, uid);
        }
      },
      onSyncStatus: (status) => {
        setCloudSyncStatus(status);
      },
    });

    return () => {
      unsubscribe();
    };
  }, [shopOwner?.uid]);

  // Sync state changes with localStorage
  useEffect(() => {
    if (shopOwner?.uid) {
      saveStoredShopConfig(shopConfig, shopOwner.uid);
    }
  }, [shopConfig, shopOwner?.uid]);

  useEffect(() => {
    if (shopOwner?.uid) {
      saveStoredProducts(products, shopOwner.uid);
    }
  }, [products, shopOwner?.uid]);

  useEffect(() => {
    if (shopOwner?.uid) {
      saveStoredBills(bills, shopOwner.uid);
    }
  }, [bills, shopOwner?.uid]);

  useEffect(() => {
    if (shopOwner?.uid) {
      saveStoredCashiers(cashiers, shopOwner.uid);
    }
  }, [cashiers, shopOwner?.uid]);

  useEffect(() => {
    if (shopOwner?.uid) {
      saveStoredDepartments(departments, shopOwner.uid);
    }
  }, [departments, shopOwner?.uid]);

  useEffect(() => {
    if (shopOwner?.uid) {
      saveStoredCustomers(customers, shopOwner.uid);
    }
  }, [customers, shopOwner?.uid]);

  useEffect(() => {
    if (shopOwner?.uid) {
      saveStoredLoyaltyConfig(loyaltyConfig, shopOwner.uid);
    }
  }, [loyaltyConfig, shopOwner?.uid]);

  useEffect(() => {
    saveStoredLanguage(lang);
  }, [lang]);

  useEffect(() => {
    if (shopOwner?.uid) {
      saveActiveCashierId(activeCashier.id, shopOwner.uid);
    }
  }, [activeCashier, shopOwner?.uid]);

  // Handler for when a new bill is generated in the POS screen
  const handleBillGenerated = async (newBill: Bill) => {
    setBills(prev => [newBill, ...prev]);
    setActiveInvoice(newBill);
    setSelectedBillingCustomer(null);

    if (shopOwner?.uid) {
      saveBillToFirestore(shopOwner.uid, newBill).catch(err => {
        console.warn('Could not save bill to cloud:', err);
      });
      // Also persist updated invoice sequence to cloud
      saveShopConfigToFirestore(shopOwner.uid, shopConfig).catch(() => {});
    }
  };

  // Handler for products modification
  const handleSetProducts = (updater: React.SetStateAction<Product[]>) => {
    setProducts(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (shopOwner?.uid) {
        // Sync modified products to Firestore
        for (const p of next) {
          saveProductToFirestore(shopOwner.uid, p).catch(() => {});
        }
      }
      return next;
    });
  };

  // Handler for customer loyalty updates
  const handleSetCustomers = (updater: React.SetStateAction<CustomerLoyalty[]>) => {
    setCustomers(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (shopOwner?.uid) {
        for (const c of next) {
          saveCustomerToFirestore(shopOwner.uid, c).catch(() => {});
        }
      }
      return next;
    });
  };

  // Handler for shop config updates
  const handleSetShopConfig = (updater: React.SetStateAction<ShopConfig>) => {
    setShopConfig(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (shopOwner?.uid) {
        saveShopConfigToFirestore(shopOwner.uid, next).catch(() => {});
      }
      return next;
    });
  };

  // Handler for loyalty config updates
  const handleSetLoyaltyConfig = (updater: React.SetStateAction<LoyaltyConfig>) => {
    setLoyaltyConfig(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (shopOwner?.uid) {
        saveLoyaltyConfigToFirestore(shopOwner.uid, next).catch(() => {});
      }
      return next;
    });
  };

  // Handler for quick mode toggle
  const handleQuickToggleMode = () => {
    const newMode: ShopMode = shopConfig.mode === 'mall' ? 'small_shop' : 'mall';
    handleSetShopConfig(prev => ({ ...prev, mode: newMode }));
  };

  // Handler for reset demo data
  const handleResetDemoData = (mode: ShopMode) => {
    const reset = resetToDemoData(mode, shopOwner?.uid);
    setShopConfig(reset.shopConfig);
    setProducts(reset.products);
    setBills(reset.bills);
    setCashiers(reset.cashiers);
    setDepartments(reset.departments);
    setCustomers(reset.customers);
    setLoyaltyConfig(reset.loyaltyConfig);
    setActiveCashier(reset.cashiers[0]);
    setActiveInvoice(null);
    setSelectedBillingCustomer(null);

    if (shopOwner?.uid) {
      saveShopConfigToFirestore(shopOwner.uid, reset.shopConfig).catch(() => {});
      for (const p of reset.products) saveProductToFirestore(shopOwner.uid, p).catch(() => {});
      for (const c of reset.cashiers) saveCashierToFirestore(shopOwner.uid, c).catch(() => {});
      for (const d of reset.departments) saveDepartmentToFirestore(shopOwner.uid, d).catch(() => {});
      for (const cu of reset.customers) saveCustomerToFirestore(shopOwner.uid, cu).catch(() => {});
      saveLoyaltyConfigToFirestore(shopOwner.uid, reset.loyaltyConfig).catch(() => {});
    }
  };

  // Handler for cashier switch
  const handleSelectCashier = (cashier: Cashier) => {
    setActiveCashier(cashier);
  };

  // Handler for adding cashier
  const handleAddCashier = (cashier: Cashier) => {
    setCashiers(prev => [...prev, cashier]);
    if (shopOwner?.uid) {
      saveCashierToFirestore(shopOwner.uid, cashier).catch(() => {});
    }
  };

  // Handler to jump from Loyalty directory straight to POS billing
  const handleNavigateToBillingWithCustomer = (phone: string, name: string) => {
    setSelectedBillingCustomer({ phone, name });
    setActiveInvoice(null);
    setCurrentTab('billing');
  };

  // 1. Loading State
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 text-amber-400 animate-spin mb-4" />
        <p className="text-sm font-semibold tracking-wide text-slate-300">
          Connecting to SmartBill POS Cloud...
        </p>
        <p className="text-xs text-slate-500 mt-1">Verifying Multi-Tenant Store Authentication</p>
      </div>
    );
  }

  // 2. Unauthenticated / Shop Owner Selection Screen
  if (!shopOwner) {
    return <AuthScreen />;
  }

  // 3. Authenticated POS System
  return (
    <div className="min-h-screen bg-neutral-100/70 text-neutral-900 flex flex-col font-sans">
      {/* Top Bar Header with Shopkeeper Badge & Cloud Sync Indicator */}
      <Header
        currentTab={currentTab}
        setCurrentTab={tab => {
          setActiveInvoice(null);
          setCurrentTab(tab);
        }}
        shopConfig={shopConfig}
        lang={lang}
        setLang={setLang}
        activeCashier={activeCashier}
        onOpenCashierModal={() => setIsCashierModalOpen(true)}
        onQuickToggleMode={handleQuickToggleMode}
        cloudSyncStatus={cloudSyncStatus}
      />

      {/* Main View Area */}
      <main className="flex-1 pb-12">
        {activeInvoice ? (
          <InvoiceView
            bill={activeInvoice}
            shopConfig={shopConfig}
            lang={lang}
            onNewBill={() => {
              setActiveInvoice(null);
              setSelectedBillingCustomer(null);
              setCurrentTab('billing');
            }}
          />
        ) : (
          <>
            {currentTab === 'billing' && (
              <BillingScreen
                products={products}
                setProducts={handleSetProducts}
                shopConfig={shopConfig}
                setShopConfig={handleSetShopConfig}
                activeCashier={activeCashier}
                departments={departments}
                lang={lang}
                onBillGenerated={handleBillGenerated}
                customers={customers}
                setCustomers={handleSetCustomers}
                loyaltyConfig={loyaltyConfig}
                initialCustomerPhone={selectedBillingCustomer?.phone}
                initialCustomerName={selectedBillingCustomer?.name}
              />
            )}

            {currentTab === 'products' && (
              <ProductManagement
                products={products}
                setProducts={handleSetProducts}
                departments={departments}
                shopMode={shopConfig.mode}
                lang={lang}
              />
            )}

            {currentTab === 'dashboard' && (
              <Dashboard
                bills={bills}
                products={products}
                setProducts={handleSetProducts}
                shopConfig={shopConfig}
                departments={departments}
                lang={lang}
                onViewBill={bill => setActiveInvoice(bill)}
                onNavigateToBilling={() => setCurrentTab('billing')}
              />
            )}

            {currentTab === 'history' && (
              <BillHistory
                bills={bills}
                setBills={setBills}
                products={products}
                setProducts={handleSetProducts}
                shopConfig={shopConfig}
                lang={lang}
                onViewBill={bill => setActiveInvoice(bill)}
              />
            )}

            {currentTab === 'loyalty' && (
              <LoyaltyManagement
                customers={customers}
                setCustomers={handleSetCustomers}
                loyaltyConfig={loyaltyConfig}
                setLoyaltyConfig={handleSetLoyaltyConfig}
                lang={lang}
                onNavigateToBillingWithCustomer={handleNavigateToBillingWithCustomer}
              />
            )}

            {currentTab === 'reports' && shopConfig.mode === 'mall' && (
              <MallReports
                bills={bills}
                departments={departments}
                cashiers={cashiers}
                shopConfig={shopConfig}
                lang={lang}
              />
            )}

            {currentTab === 'setup' && (
              <ShopSetupModal
                shopConfig={shopConfig}
                onSave={cfg => handleSetShopConfig(cfg)}
                onResetDemo={handleResetDemoData}
                lang={lang}
              />
            )}
          </>
        )}
      </main>

      {/* Cashier selection / creation modal */}
      <CashierModal
        isOpen={isCashierModalOpen}
        onClose={() => setIsCashierModalOpen(false)}
        cashiers={cashiers}
        activeCashier={activeCashier}
        departments={departments}
        onSelectCashier={handleSelectCashier}
        onAddCashier={handleAddCashier}
        lang={lang}
      />
    </div>
  );
}
