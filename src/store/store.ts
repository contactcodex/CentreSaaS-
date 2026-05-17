import { create } from 'zustand';

export type ViewType =
  | 'dashboard'
  | 'user-management'
  | 'financial-reports'
  | 'students'
  | 'teachers'
  | 'payments'
  | 'teacher-payments'
  | 'schedule'
  | 'services'
  | 'classrooms'
  | 'settings'
  | 'super-admin';

export type Lang = 'ar' | 'fr';

interface AppState {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  userRole: string;
  setUserRole: (role: string) => void;
  subscriptionExpired: boolean;
  setSubscriptionExpired: (expired: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'dashboard',
  setCurrentView: (view) => set({ currentView: view }),
  lang: 'ar',
  setLang: (lang) => set({ lang }),
  toggleLang: () =>
    set((state) => ({ lang: state.lang === 'ar' ? 'fr' : 'ar' })),
  userRole: '',
  setUserRole: (role) => set({ userRole: role }),
  subscriptionExpired: false,
  setSubscriptionExpired: (expired: boolean) => set({ subscriptionExpired: expired }),
}));

// ── Smart fetch wrapper that detects subscription expiry ────────────────
// All centre API calls should use this instead of raw fetch.
// When the API returns 403 + SUBSCRIPTION_EXPIRED, it updates the global store
// so the UI can react immediately.

// Helper to check if subscription is expired (for views to skip error toasts)
export function isExpired(): boolean {
  return useAppStore.getState().subscriptionExpired;
}

export async function centreFetch(url: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(url, options);
  if (res.status === 403) {
    try {
      const data = await res.clone().json();
      if (data.code === 'SUBSCRIPTION_EXPIRED' || data.error === 'subscription_expired') {
        // Update store to show expired page
        const store = useAppStore.getState();
        store.setSubscriptionExpired(true);
        // Return a new response that callers can still read
        return new Response(JSON.stringify(data), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } catch {
      // Not JSON, just return as-is
    }
  }
  return res;
}
