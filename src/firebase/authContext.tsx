import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  signInAnonymously,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from './config';

export interface ShopOwnerProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  shopName: string;
  shopMode: 'small_shop' | 'mall';
  role: 'owner';
  city: string;
  state: string;
  isDemo?: boolean;
}

export const PRESET_SHOPS: ShopOwnerProfile[] = [
  {
    uid: 'owner_kirana_sharma',
    email: 'sharma.kirana@retailpos.in',
    displayName: 'Ramesh Sharma',
    photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    shopName: 'Sharma Grocery & Kirana Store',
    shopMode: 'small_shop',
    role: 'owner',
    city: 'Jaipur',
    state: 'Rajasthan',
    isDemo: true,
  },
  {
    uid: 'owner_mall_citycenter',
    email: 'admin@citycentermall.com',
    displayName: 'Pooja Verma',
    photoURL: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80',
    shopName: 'City Center Hypermarket & Mall',
    shopMode: 'mall',
    role: 'owner',
    city: 'Mumbai',
    state: 'Maharashtra',
    isDemo: true,
  },
  {
    uid: 'owner_fashion_trends',
    email: 'contact@royalfashions.co.in',
    displayName: 'Anand Patel',
    photoURL: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
    shopName: 'Royal Apparels & Fashion Studio',
    shopMode: 'small_shop',
    role: 'owner',
    city: 'Ahmedabad',
    state: 'Gujarat',
    isDemo: true,
  },
];

interface AuthContextType {
  user: FirebaseUser | null;
  shopOwner: ShopOwnerProfile | null;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithDemoOwner: (owner: ShopOwnerProfile) => Promise<void>;
  signInCustomShop: (data: { name: string; shopName: string; email: string; mode: 'small_shop' | 'mall'; city: string; state: string }) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_ACTIVE_OWNER_KEY = 'sbg_active_shop_owner_v2';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [shopOwner, setShopOwner] = useState<ShopOwnerProfile | null>(() => {
    const saved = localStorage.getItem(LOCAL_ACTIVE_OWNER_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Monitor Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const data = snap.data();
            const profile: ShopOwnerProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || data.email || '',
              displayName: firebaseUser.displayName || data.displayName || 'Shop Owner',
              photoURL: firebaseUser.photoURL || data.photoURL,
              shopName: data.shopName || `${firebaseUser.displayName || 'My'} Retail Store`,
              shopMode: data.shopMode || 'small_shop',
              role: 'owner',
              city: data.city || 'New Delhi',
              state: data.state || 'Delhi',
            };
            setShopOwner(profile);
            localStorage.setItem(LOCAL_ACTIVE_OWNER_KEY, JSON.stringify(profile));
          } else {
            // New user signed in via Google or Auth
            const newProfile: ShopOwnerProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'Shop Owner',
              photoURL: firebaseUser.photoURL || undefined,
              shopName: `${firebaseUser.displayName || 'Retail'} Store`,
              shopMode: 'small_shop',
              role: 'owner',
              city: 'New Delhi',
              state: 'Delhi',
            };
            await setDoc(userDocRef, {
              ...newProfile,
              createdAt: new Date().toISOString(),
            }).catch(() => {});
            setShopOwner(newProfile);
            localStorage.setItem(LOCAL_ACTIVE_OWNER_KEY, JSON.stringify(newProfile));
          }
        } catch (err) {
          console.warn('Notice reading profile from Firestore:', err);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setAuthError(null);
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const googleUser = result.user;
      
      const userDocRef = doc(db, 'users', googleUser.uid);
      const snap = await getDoc(userDocRef).catch(() => null);
      
      let profile: ShopOwnerProfile;
      if (snap && snap.exists()) {
        const d = snap.data();
        profile = {
          uid: googleUser.uid,
          email: googleUser.email || d.email || '',
          displayName: googleUser.displayName || d.displayName || 'Shop Owner',
          photoURL: googleUser.photoURL || d.photoURL,
          shopName: d.shopName || `${googleUser.displayName || 'My'} Store`,
          shopMode: d.shopMode || 'small_shop',
          role: 'owner',
          city: d.city || 'New Delhi',
          state: d.state || 'Delhi',
        };
      } else {
        profile = {
          uid: googleUser.uid,
          email: googleUser.email || '',
          displayName: googleUser.displayName || 'Shop Owner',
          photoURL: googleUser.photoURL || undefined,
          shopName: `${googleUser.displayName || 'My'} Store`,
          shopMode: 'small_shop',
          role: 'owner',
          city: 'New Delhi',
          state: 'Delhi',
        };
        await setDoc(userDocRef, {
          ...profile,
          createdAt: new Date().toISOString(),
        }).catch(() => {});
      }

      setShopOwner(profile);
      localStorage.setItem(LOCAL_ACTIVE_OWNER_KEY, JSON.stringify(profile));
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e.code === 'auth/popup-closed-by-user') {
        // User voluntarily dismissed or cancelled popup, not a system failure
        console.info('Google sign-in popup was dismissed by the user.');
      } else if (e.code === 'auth/unauthorized-domain') {
        console.warn('Authorized domain notice:', e.message);
        setAuthError('Applet domain is authorizing. You can use the shopkeeper profiles or register a shop below.');
      } else {
        console.warn('Google Sign-In notice:', e.message);
        setAuthError(e.message || 'Could not complete Google Sign-In. You can select a shopkeeper below.');
      }
    } finally {
      setLoading(false);
    }
  };

  const signInWithDemoOwner = async (demo: ShopOwnerProfile) => {
    setAuthError(null);
    setLoading(true);
    try {
      // Attempt anonymous auth if available, but never fail if project restricts anonymous auth
      if (!auth.currentUser) {
        try {
          await signInAnonymously(auth);
        } catch {
          // Anonymous auth restricted in project - ignore and continue with local shopkeeper tenancy
        }
      }
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: demo.displayName,
        }).catch(() => {});
      }
      setShopOwner(demo);
      localStorage.setItem(LOCAL_ACTIVE_OWNER_KEY, JSON.stringify(demo));
    } catch (err) {
      console.warn('Notice signing in demo owner:', err);
      setShopOwner(demo);
      localStorage.setItem(LOCAL_ACTIVE_OWNER_KEY, JSON.stringify(demo));
    } finally {
      setLoading(false);
    }
  };

  const signInCustomShop = async (data: {
    name: string;
    shopName: string;
    email: string;
    mode: 'small_shop' | 'mall';
    city: string;
    state: string;
  }) => {
    setAuthError(null);
    setLoading(true);
    try {
      // Attempt anonymous auth if available, but never fail if project restricts anonymous auth
      if (!auth.currentUser) {
        try {
          await signInAnonymously(auth);
        } catch {
          // Anonymous auth restricted in project - ignore and continue with local shopkeeper tenancy
        }
      }
      const ownerUid = `owner_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const profile: ShopOwnerProfile = {
        uid: ownerUid,
        email: data.email,
        displayName: data.name,
        shopName: data.shopName,
        shopMode: data.mode,
        role: 'owner',
        city: data.city,
        state: data.state,
        isDemo: false,
      };

      setShopOwner(profile);
      localStorage.setItem(LOCAL_ACTIVE_OWNER_KEY, JSON.stringify(profile));
    } catch (err) {
      console.warn('Notice setting up custom shopkeeper:', err);
      // Fallback: create shopkeeper profile directly
      const ownerUid = `owner_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const fallbackProfile: ShopOwnerProfile = {
        uid: ownerUid,
        email: data.email,
        displayName: data.name,
        shopName: data.shopName,
        shopMode: data.mode,
        role: 'owner',
        city: data.city,
        state: data.state,
        isDemo: false,
      };
      setShopOwner(fallbackProfile);
      localStorage.setItem(LOCAL_ACTIVE_OWNER_KEY, JSON.stringify(fallbackProfile));
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.warn('Logout notice:', err);
    } finally {
      setUser(null);
      setShopOwner(null);
      localStorage.removeItem(LOCAL_ACTIVE_OWNER_KEY);
      setLoading(false);
    }
  };

  const clearError = () => setAuthError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        shopOwner,
        loading,
        authError,
        signInWithGoogle,
        signInWithDemoOwner,
        signInCustomShop,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
