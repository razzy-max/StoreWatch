import { CheckCircle2, Store, ShieldCheck, User2, Moon, Sun } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { useAuth, getFriendlyAuthError } from '@/hooks/useAuth';
import { useToast } from '@/components/ToastProvider';
import { friendlyError } from '@/lib/sync';
import { useTheme } from '@/context/ThemeContext';

const pinKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'];

function LogoMark() {
  return (
    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 shadow-soft">
      <Store className="h-10 w-10 text-slate-950" />
    </div>
  );
}

function PinDot({ filled }: { filled: boolean }) {
  return <span className={`h-4 w-4 rounded-full border-2 ${filled ? 'border-amberAccent bg-amberAccent' : 'border-slate-600 bg-transparent'}`} />;
}

function OwnerForm({ onSuccess }: { onSuccess: () => void }) {
  const { signInOwner } = useAuth();
  const { error: pushError, success } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors: typeof errors = {};
    if (!email.trim()) {
      nextErrors.email = 'Email is required.';
    }
    if (!password.trim()) {
      nextErrors.password = 'Password is required.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      await signInOwner(email.trim(), password);
      success('Signed in', 'Owner access granted.');
      onSuccess();
      navigate('/owner/dashboard');
    } catch (error) {
      pushError('Login failed', getFriendlyAuthError(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          className={`h-12 w-full rounded-xl border bg-slate-100 px-4 text-slate-900 outline-none placeholder:text-slate-500 focus:border-amberAccent dark:bg-navy dark:text-slate-50 ${
            errors.email ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'
          }`}
          placeholder="owner@storewatch.ng"
        />
        {errors.email ? <p className="mt-1 text-xs text-red-400">{errors.email}</p> : null}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          className={`h-12 w-full rounded-xl border bg-slate-100 px-4 text-slate-900 outline-none placeholder:text-slate-500 focus:border-amberAccent dark:bg-navy dark:text-slate-50 ${
            errors.password ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'
          }`}
          placeholder="Enter password"
        />
        {errors.password ? <p className="mt-1 text-xs text-red-400">{errors.password}</p> : null}
      </div>
      <Button type="submit" fullWidth disabled={submitting}>
        {submitting ? 'Signing in...' : 'Sign In'}
      </Button>
    </form>
  );
}

function EmployeePad({ onSuccess }: { onSuccess: () => void }) {
  const { signInEmployee } = useAuth();
  const { error: pushError, success } = useToast();
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const dots = useMemo(() => Array.from({ length: 4 }, (_, index) => index < pin.length), [pin.length]);

  function appendDigit(value: string) {
    if (pin.length >= 4) {
      return;
    }
    setPin((current) => `${current}${value}`);
    setError('');
  }

  async function submitPin() {
    if (pin.length !== 4) {
      setError('Enter a 4-digit PIN.');
      return;
    }

    setSubmitting(true);
    try {
      await signInEmployee(pin);
      success('Welcome back', 'Employee session unlocked.');
      onSuccess();
      navigate('/employee/sale');
    } catch (error) {
      const message = friendlyError(error, 'Invalid PIN.');
      setError(message);
      pushError('Login failed', message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-center gap-3">
        {dots.map((filled, index) => (
          <PinDot key={index} filled={filled} />
        ))}
      </div>
      {error ? <p className="text-center text-sm text-red-400">{error}</p> : null}
      <div className="grid grid-cols-3 gap-3">
        {pinKeys.map((key) => {
          const isControl = key === 'clear' || key === 'back';
          const label = key === 'clear' ? 'C' : key === 'back' ? '⌫' : key;
          return (
            <Button
              key={key}
              type="button"
              variant={isControl ? 'secondary' : 'ghost'}
              className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-300 text-lg dark:border-slate-700"
              onClick={() => {
                if (key === 'clear') {
                  setPin('');
                  return;
                }
                if (key === 'back') {
                  setPin((current) => current.slice(0, -1));
                  return;
                }
                appendDigit(key);
              }}
            >
              {label}
            </Button>
          );
        })}
      </div>
      <Button type="button" fullWidth disabled={submitting} onClick={submitPin}>
        {submitting ? 'Checking...' : 'Enter'}
      </Button>
    </div>
  );
}

export default function Login() {
  const [mode, setMode] = useState<'owner' | 'employee' | null>(null);
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 dark:bg-navy dark:text-slate-50">
      <div className="mx-auto flex max-w-md flex-col gap-4">
        <div className="flex items-start justify-end">
          <Button
            variant="secondary"
            className="min-h-12 min-w-12 rounded-full border border-slate-300 bg-white p-3 text-slate-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-100"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <span className="relative block h-5 w-5">
              <Sun className={`absolute inset-0 h-5 w-5 transition-all duration-200 ${theme === 'dark' ? 'rotate-0 opacity-100' : '-rotate-45 opacity-0'}`} />
              <Moon className={`absolute inset-0 h-5 w-5 transition-all duration-200 ${theme === 'light' ? 'rotate-0 opacity-100' : 'rotate-45 opacity-0'}`} />
            </span>
          </Button>
        </div>

        <div className="text-center">
          <LogoMark />
          <h1 className="mt-4 text-3xl font-bold tracking-tight">StoreWatch</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Mobile-first retail operations for drinks and wine inventory.</p>
        </div>

        <Card className="space-y-3">
          <button
            type="button"
            className={`w-full rounded-2xl border p-4 text-left transition ${mode === 'owner' ? 'border-amberAccent bg-amberAccent/10' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/20'}`}
            onClick={() => setMode(mode === 'owner' ? null : 'owner')}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amberAccent text-slate-950">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-base font-semibold">I'm the Owner</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Sign in with Supabase Auth.</p>
              </div>
            </div>
          </button>
          <div className={`overflow-hidden transition-all duration-300 ${mode === 'owner' ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="pt-2">
              <OwnerForm onSuccess={() => setMode('owner')} />
            </div>
          </div>
        </Card>

        <Card className="space-y-3">
          <button
            type="button"
            className={`w-full rounded-2xl border p-4 text-left transition ${mode === 'employee' ? 'border-amberAccent bg-amberAccent/10' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/20'}`}
            onClick={() => setMode(mode === 'employee' ? null : 'employee')}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-50">
                <User2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-base font-semibold">I'm an Employee</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Use your 4-digit PIN.</p>
              </div>
            </div>
          </button>
          <div className={`overflow-hidden transition-all duration-300 ${mode === 'employee' ? 'max-h-[32rem] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="pt-2">
              <EmployeePad onSuccess={() => setMode('employee')} />
            </div>
          </div>
        </Card>

        <Card className="flex items-center gap-3 border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          <p className="text-sm text-slate-600 dark:text-slate-300">Offline caching and background sync are enabled after first connection.</p>
        </Card>
      </div>
    </div>
  );
}
