import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import type { EmployeeSession, OwnerSession, UserRecord } from '@/types/models';
import { friendlyError } from '@/lib/sync';

const EMPLOYEE_STORAGE_KEY = 'storewatch.employee';
const OWNER_STORAGE_KEY = 'storewatch.owner';
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

function readOwnerSession(): OwnerSession | null {
  try {
    const raw = window.localStorage.getItem(OWNER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OwnerSession) : null;
  } catch {
    return null;
  }
}

function writeOwnerSession(session: OwnerSession | null) {
  if (session) {
    window.localStorage.setItem(OWNER_STORAGE_KEY, JSON.stringify(session));
  } else {
    window.localStorage.removeItem(OWNER_STORAGE_KEY);
  }
}

async function loadOwnerSessionFromSupabase(): Promise<OwnerSession | null> {
  const timeout = new Promise<null>((resolve) => {
    window.setTimeout(() => resolve(null), AUTH_BOOTSTRAP_TIMEOUT_MS);
  });

  const session = await Promise.race([
    supabase.auth.getSession().then((result) => result.data.session),
    timeout
  ]);

  if (!session?.user) {
    return readOwnerSession();
  }

  return loadOwnerSessionFromSession(session);
}

async function loadOwnerSessionFromSession(session: { user?: { id: string } } | null): Promise<OwnerSession | null> {
  if (!session?.user) {
    return readOwnerSession();
  }

  const { data: profile, error } = await supabase.from('users').select('id,name,role').eq('id', session.user.id).maybeSingle();
  const user = profile as UserRecord | null;
  if (error || !user || user.role !== 'owner') {
    return readOwnerSession();
  }

  const ownerSession: OwnerSession = {
    id: user.id,
    name: user.name,
    role: 'owner'
  };

  writeOwnerSession(ownerSession);
  return ownerSession;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [owner, setOwner] = useState<OwnerSession | null>(null);
  const [employee, setEmployee] = useState<EmployeeSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        const [ownerSession, employeeSession] = await Promise.all([loadOwnerSessionFromSupabase(), Promise.resolve(readEmployeeSession())]);
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

    return () => {
      mounted = false;
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

        const ownerSession = await loadOwnerSessionFromSession(data.session);
        if (!ownerSession) {
          await supabase.auth.signOut();
          throw new Error('This account is not registered as an owner.');
        }

        setOwner(ownerSession);
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
        writeOwnerSession(null);
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
