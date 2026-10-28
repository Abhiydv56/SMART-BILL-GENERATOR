import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
// Safely load config: prioritizes local config if present, falls back to example template and env vars
const configModules = import.meta.glob('../../firebase-applet-config.json', { eager: true });
const localData = (configModules['../../firebase-applet-config.json'] as any)?.default;

const exampleModules = import.meta.glob('../../firebase-applet-config.example.json', { eager: true });
const exampleData = (exampleModules['../../firebase-applet-config.example.json'] as any)?.default || {};

const firebaseConfigData = localData || exampleData;

const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfigData.projectId || 'demo-project',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfigData.appId || '',
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfigData.apiKey || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigData.authDomain || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigData.storageBucket || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigData.messagingSenderId || '',
};

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with specific Database ID if provided
const firestoreDbId = (firebaseConfigData as { firestoreDatabaseId?: string }).firestoreDatabaseId;
export const db: Firestore = firestoreDbId 
  ? getFirestore(app, firestoreDbId) 
  : getFirestore(app);

// Initialize Firebase Auth
export const auth: Auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    token: Record<string, unknown> | undefined;
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const err = error as { code?: string; message?: string };
  const currentUser = auth.currentUser;

  const errorInfo: FirestoreErrorInfo = {
    error: err.message || String(error),
    operationType,
    path,
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email ?? undefined,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      token: undefined,
    },
  };

  console.error('[Firestore Error]', errorInfo);
  throw new Error(JSON.stringify(errorInfo));
}
