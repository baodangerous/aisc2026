import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  auth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  FirebaseUser,
  isFirebaseConfigured,
} from '../../services/firebase/client';
import { UserProfile, AuthStatus } from '../../domain/schemas';
import { apiClient } from '../../services/api/client';
import { getLocalSessions, saveLocalSession } from '../../services/indexedDb';
import { loadOrInitUserProfile, updateUserProfileData, ProfileUpdateResult } from '../../services/firebase/profileService';

interface AuthContextType {
  authStatus: AuthStatus;
  user: UserProfile | null;
  profile: UserProfile | null; // Alias for user profile
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  isGuest: boolean;
  isAuthenticated: boolean;
  isSynced: boolean;
  isFirebaseReady: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (displayName?: string, preferredLanguage?: string, phone?: string) => Promise<ProfileUpdateResult>;
  requestDeletion: (reason?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('initializing');
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    // If Firebase is not configured, immediately enter Guest mode
    if (!auth || !isFirebaseConfigured) {
      setFirebaseUser(null);
      setUser(null);
      setAuthStatus('guest');
      return;
    }

    let isSubscribed = true;

    // Listen to Firebase Auth state changes
    const unsubscribe = auth.onAuthStateChanged(async (fbUser) => {
      if (!isSubscribed) return;

      // 1. Guest mode: No authenticated Firebase user
      if (!fbUser) {
        setFirebaseUser(null);
        setUser(null);
        setAuthStatus('guest');
        return;
      }

      // 2. Authenticated user detected: Restore session, get fresh ID token, then load profile
      try {
        setFirebaseUser(fbUser);
        const idToken = await fbUser.getIdToken();
        if (!isSubscribed) return;

        if (!idToken) {
          setUser(null);
          setAuthStatus('guest');
          return;
        }

        // Load profile from Firestore users/{uid} (or backend API fallback)
        const { status: loadStatus, profile } = await loadOrInitUserProfile(fbUser, idToken);
        if (!isSubscribed) return;

        setUser(profile);
        setAuthStatus(loadStatus === 'synced' ? 'authenticated_synced' : 'authenticated_offline');

        // Sync any offline training sessions recorded in guest mode
        if (loadStatus === 'synced') {
          syncGuestSessionsToUser(profile.uid).catch(() => {
            // Gracefully maintain offline state in IndexedDB if sync fails
          });
        }
      } catch (err) {
        if (!isSubscribed) return;
        setUser(null);
        setAuthStatus('authentication_error');
      }
    });

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, []);

  // Google Sign-In with popup
  const loginWithGoogle = async () => {
    if (!auth || !isFirebaseConfigured) {
      throw new Error('Cần cấu hình Firebase để sử dụng tính năng đăng nhập và đồng bộ đám mây.');
    }

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await signInWithPopup(auth, provider);
      
      if (cred.user) {
        setFirebaseUser(cred.user);
        const idToken = await cred.user.getIdToken();
        const { status: loadStatus, profile } = await loadOrInitUserProfile(cred.user, idToken);
        setUser(profile);
        setAuthStatus(loadStatus === 'synced' ? 'authenticated_synced' : 'authenticated_offline');
        if (loadStatus === 'synced') {
          await syncGuestSessionsToUser(profile.uid);
        }
      }
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        console.warn('Google Sign-In note:', err?.message || 'Đăng nhập không thành công');
      }
      throw err;
    }
  };

  // Sign out and transition to Guest state
  const logout = async () => {
    try {
      if (auth) {
        await signOut(auth);
      }
      setFirebaseUser(null);
      setUser(null);
      setAuthStatus('guest');
    } catch {
      throw new Error('Chưa thể đăng xuất. Vui lòng thử lại.');
    }
  };

  const updateProfile = async (displayName?: string, preferredLanguage?: string, phone?: string): Promise<ProfileUpdateResult> => {
    if (!firebaseUser || (authStatus !== 'authenticated_synced' && authStatus !== 'authenticated_offline')) {
      return {
        status: 'failed',
        profile: user || {
          uid: 'guest',
          displayName: 'Khách',
          role: 'guest',
          preferredLanguage: 'vi',
          onboardingCompleted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };
    }
    const token = await firebaseUser.getIdToken();
    const result = await updateUserProfileData(
      firebaseUser.uid,
      {
        displayName: displayName || user?.displayName,
        preferredLanguage: (preferredLanguage as any) || user?.preferredLanguage,
        phoneMasked: phone || user?.phoneMasked,
      },
      token
    );
    setUser(result.profile);
    if (result.status === 'synced') {
      setAuthStatus('authenticated_synced');
    }
    return result;
  };

  const requestDeletion = async (reason?: string) => {
    if (!firebaseUser) return;
    await apiClient.requestAccountDeletion(reason);
    if (user) {
      setUser({ ...user, deletionRequestedAt: new Date().toISOString() });
    }
  };

  const isAuth = authStatus === 'authenticated_synced' || authStatus === 'authenticated_offline';

  return (
    <AuthContext.Provider
      value={{
        authStatus,
        user,
        profile: user,
        firebaseUser,
        isLoading: authStatus === 'initializing',
        isGuest: authStatus === 'guest' || authStatus === 'authentication_error',
        isAuthenticated: isAuth,
        isSynced: authStatus === 'authenticated_synced',
        isFirebaseReady: isFirebaseConfigured,
        loginWithGoogle,
        logout,
        updateProfile,
        requestDeletion,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

// Helper: sync local IndexedDB guest sessions to server
async function syncGuestSessionsToUser(uid: string) {
  try {
    const localSessions = await getLocalSessions();
    const guestSessions = localSessions.filter((s) => !s.ownerUid && s.status === 'completed');

    if (guestSessions.length === 0) return;

    for (const sess of guestSessions) {
      try {
        const result = await apiClient.saveTrainingSession({
          clientSessionId: sess.clientSessionId,
          scenarioId: sess.scenarioId,
          scenarioTitle: sess.scenarioTitle || 'Luyện tập tình huống',
          events: sess.events || [],
          dataOrigin: 'training_user',
          notes: 'Đồng bộ từ phiên ngoại tuyến trên thiết bị',
        });
        if ('isLocalOnly' in result && result.isLocalOnly) continue;
        sess.ownerUid = uid;
        await saveLocalSession(sess);
      } catch {
        // Keep in local IndexedDB for future retry
      }
    }
  } catch {
    // Guest sync note
  }
}
