import { lazy, Suspense } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { BarChart3, History, Home, Package, ShieldCheck, ShoppingCart, Truck, Warehouse } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { BottomNav } from '@/components/BottomNav';
import { OfflineBanner } from '@/components/OfflineBanner';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { useAuth } from '@/hooks/useAuth';
import { useSync } from '@/hooks/useSync';

const LoginPage = lazy(() => import('@/pages/auth/Login'));
const InstallPage = lazy(() => import('@/pages/Install'));
const EmployeeSalePage = lazy(() => import('@/pages/employee/Sale'));
const EmployeeStockPage = lazy(() => import('@/pages/employee/Stock'));
const EmployeeLogPage = lazy(() => import('@/pages/employee/Log'));
const OwnerDashboardPage = lazy(() => import('@/pages/owner/Dashboard'));
const OwnerInventoryPage = lazy(() => import('@/pages/owner/Inventory'));
const OwnerHistoryPage = lazy(() => import('@/pages/owner/History'));
const OwnerProductsPage = lazy(() => import('@/pages/owner/Products'));

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 dark:bg-navy dark:text-slate-50">
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <SkeletonLoader className="h-24 w-full" />
        <SkeletonLoader className="h-48 w-full" />
        <SkeletonLoader className="h-48 w-full" />
      </div>
    </div>
  );
}

function PublicGate() {
  const { owner, employee, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (owner) {
    return <Navigate to="/owner/dashboard" replace />;
  }

  if (employee) {
    return <Navigate to="/employee/sale" replace />;
  }

  return <Outlet />;
}

function OwnerRoute() {
  const { owner, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!owner) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

function EmployeeRoute() {
  const { employee, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!employee) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

function OwnerLayout() {
  const { owner, signOut } = useAuth();
  const { offline } = useSync();

  return (
    <div className="min-h-screen bg-slate-100 px-4 pb-28 pt-3 text-slate-900 transition-colors dark:bg-navy dark:text-slate-50">
      <OfflineBanner offline={offline} />
      <div className="mx-auto flex max-w-2xl animate-fade-in flex-col gap-4">
        <AppHeader title="StoreWatch" subtitle={owner ? `Owner view · ${owner.name}` : 'Owner view'} onLogout={signOut} />
        <Outlet />
      </div>
      <BottomNav
        items={[
          { label: 'Dashboard', to: '/owner/dashboard', icon: Home },
          { label: 'Inventory', to: '/owner/inventory', icon: Warehouse },
          { label: 'Sales', to: '/owner/history', icon: History },
          { label: 'Products', to: '/owner/products', icon: Package }
        ]}
      />
    </div>
  );
}

function EmployeeLayout() {
  const { employee, signOut } = useAuth();
  const { offline } = useSync();

  return (
    <div className="min-h-screen bg-slate-100 px-4 pb-28 pt-3 text-slate-900 transition-colors dark:bg-navy dark:text-slate-50">
      <OfflineBanner offline={offline} />
      <div className="mx-auto flex max-w-2xl animate-fade-in flex-col gap-4">
        <AppHeader title="StoreWatch" subtitle={employee ? `Employee view · ${employee.name}` : 'Employee view'} onLogout={signOut} />
        <Outlet />
      </div>
      <BottomNav
        items={[
          { label: 'Sale', to: '/employee/sale', icon: ShoppingCart },
          { label: 'Stock', to: '/employee/stock', icon: Truck },
          { label: 'Log', to: '/employee/log', icon: BarChart3 }
        ]}
      />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/install" element={<InstallPage />} />
        <Route element={<PublicGate />}>
          <Route path="/" element={<LoginPage />} />
        </Route>
        <Route element={<OwnerRoute />}>
          <Route element={<OwnerLayout />}>
            <Route path="/owner">
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<OwnerDashboardPage />} />
              <Route path="inventory" element={<OwnerInventoryPage />} />
              <Route path="history" element={<OwnerHistoryPage />} />
              <Route path="products" element={<OwnerProductsPage />} />
            </Route>
          </Route>
        </Route>
        <Route element={<EmployeeRoute />}>
          <Route element={<EmployeeLayout />}>
            <Route path="/employee">
              <Route index element={<Navigate to="sale" replace />} />
              <Route path="sale" element={<EmployeeSalePage />} />
              <Route path="stock" element={<EmployeeStockPage />} />
              <Route path="log" element={<EmployeeLogPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
