import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import type { EmployeeSession, OwnerSession, UserRecord } from '@/types/models';
import { friendlyError } from '@/lib/sync';

const EMPLOYEE_STORAGE_KEY = 'storewatch.employee';
const AUTH_BOOTSTRAP_TIMEOUT_MS = 8000;

interface AuthContextValue {
  owner: OwnerSession | null;
  employee: EmployeeSession | null;
  loading: boolean;
  signInOwner: (email: string, password: string) => Promise<void>;
  signInEmployee: (pin: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readEmployeeSession(): EmployeeSession | null {
  try {
    const raw = window.localStorage.getItem(EMPLOYEE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as EmployeeSession) : null;
  } catch {
    return null;
  }
}

async function loadOwnerSession(): Promise<OwnerSession | null> {
  const timeout = new Promise<null>((resolve) => {
    window.setTimeout(() => resolve(null), AUTH_BOOTSTRAP_TIMEOUT_MS);
  });

  const sessionResult = await Promise.race([
    supabase.auth.getSession().then((result) => result.data.session),
    timeout
  ]);

  const session = sessionResult;
  if (!session?.user) {
    return null;
  }

  const { data: profile, error } = await supabase.from('users').select('id,name,role').eq('id', session.user.id).maybeSingle();
  const user = profile as UserRecord | null;
  if (error || !user || user.role !== 'owner') {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    role: 'owner'
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [owner, setOwner] = useState<OwnerSession | null>(null);
  const [employee, setEmployee] = useState<EmployeeSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        const [ownerSession, employeeSession] = await Promise.all([loadOwnerSession(), Promise.resolve(readEmployeeSession())]);
        if (!mounted) {
          return;
        }

        setOwner(ownerSession);
        setEmployee(employeeSession);
      } catch {
        if (!mounted) {
          return;
        }

        setOwner(null);
        setEmployee(readEmployeeSession());
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    bootstrap();

    const { data: subscription } = supabase.auth.onAuthStateChange(async () => {
      const nextOwner = await loadOwnerSession();
      if (mounted) {
        setOwner(nextOwner);
      }
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      owner,
      employee,
      loading,
      signInOwner: async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error || !data.session?.user) {
          throw new Error(error?.message || 'Unable to sign in.');
        }

        const { data: profile, error: profileError } = await supabase.from('users').select('id,name,role').eq('id', data.session.user.id).maybeSingle();
        const user = profile as UserRecord | null;
        if (profileError || !user || user.role !== 'owner') {
          await supabase.auth.signOut();
          throw new Error('This account is not registered as an owner.');
        }

        setOwner({ id: user.id, name: user.name, role: 'owner' });
      },
      signInEmployee: async (pin: string) => {
        const { data, error } = await supabase.from('users').select('*').eq('role', 'employee');
        if (error) {
          throw new Error(error.message);
        }

        const users = (data ?? []) as UserRecord[];
        const match = users.find((user) => user.pin && bcrypt.compareSync(pin, user.pin));
        if (!match) {
          throw new Error('Invalid employee PIN.');
        }

        const session = { id: match.id, name: match.name, role: 'employee' as const };
        window.localStorage.setItem(EMPLOYEE_STORAGE_KEY, JSON.stringify(session));
        setEmployee(session);
      },
      signOut: async () => {
        window.localStorage.removeItem(EMPLOYEE_STORAGE_KEY);
        setOwner(null);
        setEmployee(null);

        // Best-effort sign out for owner tokens; local app session is cleared first.
        try {
          await supabase.auth.signOut();
        } catch {
          // Ignore network/session signout failures to avoid blocking logout UX.
        }
      }
    }),
    [employee, loading, owner]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}

export function useAuthState() {
  const { owner, employee, loading } = useAuth();
  return { owner, employee, loading };
}

export function getFriendlyAuthError(error: unknown) {
  return friendlyError(error, 'Unable to complete sign in. Please check your details and try again.');
}
