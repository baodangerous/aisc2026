import { db, doc, getDoc, setDoc, updateDoc, FirebaseUser } from './client';
import { UserProfile } from '../../domain/schemas';
import { apiClient } from '../api/client';

export interface ProfileLoadResult {
  status: 'synced' | 'offline' | 'failed';
  profile: UserProfile;
}

/**
 * Loads the user profile from Firestore users/{uid}.
 * If the profile does not exist yet (first-time Google login),
 * initializes a minimal profile document with uid, displayName, email, photoURL, and createdAt.
 * Falls back to backend API if direct Firestore is unavailable.
 */
export async function loadOrInitUserProfile(
  fbUser: FirebaseUser,
  idToken: string
): Promise<ProfileLoadResult> {
  const now = new Date().toISOString();
  const baseProfile: UserProfile = {
    uid: fbUser.uid,
    displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Công dân Cứu sinh',
    email: fbUser.email || undefined,
    photoURL: fbUser.photoURL || undefined,
    phoneMasked: undefined,
    role: 'citizen',
    preferredLanguage: 'vi',
    onboardingCompleted: false,
    createdAt: now,
    updatedAt: now,
  };

  // 1. Try reading directly from Firestore users/{uid}
  if (db) {
    try {
      const userRef = doc(db, 'users', fbUser.uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const data = snap.data();
        const profile: UserProfile = {
          uid: fbUser.uid,
          displayName: data.displayName || baseProfile.displayName,
          email: data.email || baseProfile.email,
          photoURL: data.photoURL || baseProfile.photoURL,
          phoneMasked: data.phoneMasked || undefined,
          role: data.role || 'citizen',
          preferredLanguage: data.preferredLanguage || 'vi',
          onboardingCompleted: data.onboardingCompleted ?? false,
          createdAt: data.createdAt || now,
          updatedAt: data.updatedAt || now,
          provinceCode: data.provinceCode,
          provinceName: data.provinceName,
          orgId: data.orgId,
          deletionRequestedAt: data.deletionRequestedAt,
        };
        return { status: 'synced', profile };
      } else {
        // First-time login: create minimal profile in Firestore
        await setDoc(userRef, baseProfile);
        return { status: 'synced', profile: baseProfile };
      }
    } catch {
      // If direct Firestore access is restricted or offline, proceed to backend API fallback
    }
  }

  // 2. Fallback via backend API with Authorization Bearer header
  try {
    const res = await apiClient.getCurrentUser(idToken);
    if (res && res.user && !res.isGuest && res.user.uid === fbUser.uid) {
      return { status: 'synced', profile: res.user };
    }

    const syncRes = await apiClient.syncFirebaseUserProfile(
      baseProfile.displayName,
      baseProfile.preferredLanguage,
      undefined,
      idToken
    );
    return { status: 'synced', profile: syncRes.user };
  } catch {
    // Return in-memory base profile safely with 'offline' status so user knows it's local
    return { status: 'offline', profile: baseProfile };
  }
}

export interface ProfileUpdateResult {
  status: 'synced' | 'offline' | 'failed';
  profile: UserProfile;
}

/**
 * Updates a user profile in Firestore and syncs with backend
 */
export async function updateUserProfileData(
  uid: string,
  updates: Partial<UserProfile>,
  idToken?: string
): Promise<ProfileUpdateResult> {
  const now = new Date().toISOString();
  const updatePayload = {
    ...updates,
    updatedAt: now,
  };

  let firestoreSuccess = false;
  if (db) {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, updatePayload);
      firestoreSuccess = true;
    } catch {
      // proceed with backend sync
    }
  }

  try {
    const res = await apiClient.syncFirebaseUserProfile(
      updates.displayName,
      updates.preferredLanguage,
      updates.phoneMasked,
      idToken
    );
    return { status: 'synced', profile: res.user };
  } catch {
    const fallbackProfile: UserProfile = {
      uid,
      displayName: updates.displayName || 'Công dân Cứu sinh',
      phoneMasked: updates.phoneMasked || undefined,
      role: updates.role || 'citizen',
      preferredLanguage: updates.preferredLanguage || 'vi',
      onboardingCompleted: updates.onboardingCompleted ?? false,
      createdAt: now,
      updatedAt: now,
      ...updates,
    };
    return {
      status: firestoreSuccess ? 'synced' : 'offline',
      profile: fallbackProfile,
    };
  }
}
