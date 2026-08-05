import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import i18n from '../i18n';
import { isSupportedLocale } from '../i18n/languages';
import type { User, ClientPrincipal } from '../types';

interface AuthContextType {
  user: User | null;
  principal: ClientPrincipal | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  principal: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

/** Applies the user's saved locale to the UI, if it is a supported one. */
function applyLocale(user: User | null) {
  const locale = user?.locale;
  if (isSupportedLocale(locale) && i18n.resolvedLanguage !== locale) {
    void i18n.changeLanguage(locale);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [principal, setPrincipal] = useState<ClientPrincipal | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchAuth(isCancelled: () => boolean) {
    try {
      const res = await fetch('/.auth/me');
      const data = await res.json();
      const cp = data.clientPrincipal as ClientPrincipal | null;
      if (isCancelled()) return;
      setPrincipal(cp);

      if (cp) {
        fetch('/api/track-login', { method: 'POST' }).catch(() => {});
        // Get or create user profile
        const userRes = await fetch('/api/user');
        if (userRes.ok) {
          const userData = await userRes.json();
          if (isCancelled()) return;
          setUser(userData);
          applyLocale(userData);

          // Auto-seed if no schedule exists (first login)
          if (!userData.enrolledPrograms || userData.enrolledPrograms.length === 0) {
            try {
              await fetch('/api/seed', { method: 'POST' });
              // Reload user after seed
              const reloadRes = await fetch('/api/user');
              if (reloadRes.ok && !isCancelled()) {
                const reloaded = await reloadRes.json();
                setUser(reloaded);
                applyLocale(reloaded);
              }
            } catch {
              /* seed failed — non-critical */
            }
          }
        }
      }
    } catch {
      // Not authenticated or API not available
    } finally {
      if (!isCancelled()) setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    void fetchAuth(() => cancelled);

    return () => {
      cancelled = true;
    };
  }, []);

  function login() {
    window.location.href = '/.auth/login/google?post_login_redirect_uri=/app';
  }

  function logout() {
    window.location.href = '/.auth/logout?post_logout_redirect_uri=/';
  }

  return (
    <AuthContext.Provider value={{ user, principal, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
