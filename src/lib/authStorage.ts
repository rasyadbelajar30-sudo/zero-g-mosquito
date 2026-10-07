// File: src/lib/authStorage.ts

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  provider?: 'google' | 'github' | 'phone' | 'email' | 'demo';
  reportsCount?: number;
}

const LOCAL_USER_KEY = 'zerog_user_profile';

export function getStoredUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(LOCAL_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveStoredUser(user: UserProfile | null) {
  if (user) {
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(LOCAL_USER_KEY);
  }
}
