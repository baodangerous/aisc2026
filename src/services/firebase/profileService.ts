import type { FirebaseUser } from './client';
import { UserProfile, UserProfileSchema } from '../../domain/schemas';
import { apiClient } from '../api/client';

export interface ProfileLoadResult { status: 'synced'; profile: UserProfile }
export interface ProfileUpdateResult { status: 'synced' | 'offline' | 'failed'; profile: UserProfile }

// The server verifies identity and is the only writer; direct client writes bypassed validation.
export async function loadOrInitUserProfile(fbUser: FirebaseUser, idToken: string): Promise<ProfileLoadResult> {
  const response = await apiClient.getCurrentUser(idToken);
  if (response.isGuest || response.user.uid !== fbUser.uid) throw new Error('Không thể xác thực hồ sơ. Vui lòng thử lại.');
  return { status: 'synced', profile: UserProfileSchema.parse(response.user) };
}

export async function updateUserProfileData(uid: string, updates: Partial<UserProfile>, idToken?: string): Promise<ProfileUpdateResult> {
  const response = await apiClient.syncFirebaseUserProfile(updates.displayName, updates.preferredLanguage, updates.phoneMasked, idToken);
  if (response.user.uid !== uid) throw new Error('Không thể cập nhật hồ sơ.');
  return { status: 'synced', profile: UserProfileSchema.parse(response.user) };
}
