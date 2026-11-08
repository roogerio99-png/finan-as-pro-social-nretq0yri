import { initializeApp, getApps, getApp } from 'firebase/app'
import {
  getAuth,
  initializeAuth,
  inMemoryPersistence,
  browserPopupRedirectResolver,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  type Auth,
} from 'firebase/auth'
import firebaseAppletConfig from '../../../firebase-applet-config.json'

// Limpa tokens expirados em cache (IndexedDB / WebStorage) que possam causar falha no securetoken.googleapis.com
// (Mesma proteção aplicada no aplicativo Task Account)
;(function cleanupStaleFirebaseAuthStorage() {
  if (typeof window === 'undefined') return
  try {
    const storages = [window.localStorage, window.sessionStorage]
    for (const storage of storages) {
      if (!storage) continue
      const keysToRemove: string[] = []
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i)
        if (key && key.startsWith('firebase:authUser:')) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach((k) => {
        try {
          storage.removeItem(k)
        } catch {
          // ignore
        }
      })
    }
  } catch {
    // ignore
  }

  try {
    if (window.indexedDB && typeof window.indexedDB.deleteDatabase === 'function') {
      window.indexedDB.deleteDatabase('firebaseLocalStorageDb')
    }
  } catch {
    // ignore
  }
})()

const env = (import.meta as any).env || {}

const runtimeFirebaseConfig = {
  projectId: env.VITE_FIREBASE_PROJECT_ID || firebaseAppletConfig.projectId,
  appId: env.VITE_FIREBASE_APP_ID || firebaseAppletConfig.appId,
  apiKey: env.VITE_FIREBASE_API_KEY || firebaseAppletConfig.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || firebaseAppletConfig.authDomain,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || firebaseAppletConfig.storageBucket,
  messagingSenderId:
    env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseAppletConfig.messagingSenderId,
}

const app = getApps().length > 0 ? getApp() : initializeApp(runtimeFirebaseConfig)

export const firebaseAuth: Auth = (() => {
  if (typeof window === 'undefined') {
    return {} as Auth
  }
  try {
    return initializeAuth(app, {
      persistence: inMemoryPersistence,
      popupRedirectResolver: browserPopupRedirectResolver,
    })
  } catch {
    return getAuth(app)
  }
})()

export interface VerifiedGoogleCredentials {
  uid: string
  email: string
  name: string
  avatar?: string
  emailVerified: boolean
}

/**
 * Realiza a autenticação oficial com Conta Google via Firebase Authentication (signInWithPopup),
 * exatamente como no aplicativo Task Account.
 */
export async function authenticateWithGooglePopup(
  loginHint?: string,
): Promise<VerifiedGoogleCredentials> {
  if (typeof window === 'undefined') {
    throw new Error('Autenticação interativa Google requer navegador web.')
  }

  const provider = new GoogleAuthProvider()
  const customParams: Record<string, string> = {
    prompt: 'select_account',
  }
  if (loginHint && loginHint.includes('@')) {
    customParams.login_hint = loginHint.trim().toLowerCase()
  }
  provider.setCustomParameters(customParams)

  const result = await signInWithPopup(firebaseAuth, provider)
  const fbUser = result.user
  const email = fbUser?.email?.toLowerCase().trim()

  if (!fbUser || !email || fbUser.emailVerified === false) {
    try {
      await signOut(firebaseAuth)
    } catch {
      // ignore
    }
    throw new Error(
      'Não foi possível validar um e-mail verificado na Conta Google selecionada.',
    )
  }

  const displayName = fbUser.displayName?.trim() || email.split('@')[0]

  return {
    uid: fbUser.uid,
    email,
    name: displayName,
    avatar: fbUser.photoURL || undefined,
    emailVerified: fbUser.emailVerified,
  }
}

export async function signOutFirebaseAuth(): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    if (firebaseAuth && typeof firebaseAuth.signOut === 'function') {
      await signOut(firebaseAuth)
    }
  } catch {
    // ignore
  }
}
