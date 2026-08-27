/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar.tsx';
import { Header } from './components/Header.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { PackagesView } from './components/PackagesView.tsx';
import { PortalDesigner } from './components/PortalDesigner.tsx';
import { MikroTikView } from './components/MikroTikView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { CustomerCaptivePortal } from './components/CustomerCaptivePortal.tsx';
import { LoginView } from './components/LoginView.tsx';
import { PackageModal } from './components/PackageModal.tsx';
import { DeleteConfirmModal } from './components/DeleteConfirmModal.tsx';
import { 
  DashboardStats, 
  Package, 
  PortalSettings, 
  RouterSettings, 
  SystemSettings 
} from './types.ts';

export default function App() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Data States
  const [stats, setStats] = useState<DashboardStats>({
    todayRevenue: 0,
    revenueTrendPercent: 0,
    activeUsers: 0,
    activeUsersTrendPercent: 0,
    successfulPayments: 0,
    successfulPaymentsTrendPercent: 0,
    expiredSessions: 0,
    expiredSessionsTrendPercent: 0,
    maxSessionsCapacity: 10,
    routerStatus: 'disconnected',
    routerUptime: '0m',
    totalUsersToday: 0,
    recentTransactions: [],
    packages: [],
    portalSettings: {
      id: '1',
      businessName: 'WiFi HotSpot',
      welcomeTitle: 'Welcome to Our WiFi',
      welcomeMessage: 'Choose a package to get started',
      primaryColor: '#c5a37f',
      buttonColor: '#c5a37f',
      backgroundColor: '#0a0a0a',
      textColor: '#e0e0e0',
      cardColor: '#141414',
      successColor: '#8fa876',
      portalTemplate: 'clean',
      isPublished: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  });

  const [packages, setPackages] = useState<Package[]>([]);
  const [portalSettings, setPortalSettings] = useState<PortalSettings>(stats.portalSettings);
  const [routerSettings, setRouterSettings] = useState<RouterSettings>({
    id: '1',
    routerName: 'MikroTik Router',
    host: '192.168.88.1',
    apiPort: 8728,
    username: 'admin',
    isEnabled: false,
    lastConnectionStatus: 'disconnected',
    uptime: '0m',
    activeUsersCount: 0,
    totalUsersToday: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    id: '1',
    businessName: 'WiFi Billing',
    businessPhone: '',
    businessEmail: '',
    currency: 'KES',
    timezone: 'Africa/Nairobi',
    paymentProvider: 'palpluss',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  // Modal States
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [packageToEdit, setPackageToEdit] = useState<Package | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [packageToDelete, setPackageToDelete] = useState<Package | null>(null);

  // Loading States
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSavingPackage, setIsSavingPackage] = useState(false);
  const [isDeletingPackage, setIsDeletingPackage] = useState(false);
  const [isSavingPortal, setIsSavingPortal] = useState(false);
  const [isPublishingPortal, setIsPublishingPortal] = useState(false);
  const [isSavingRouter, setIsSavingRouter] = useState(false);
  const [isSavingSystem, setIsSavingSystem] = useState(false);

  // Fetch initial data
  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      // 1. Dashboard stats
      const statsRes = await fetch('/api/dashboard/stats');
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }

      // 2. Packages
      const pkgRes = await fetch('/api/packages?all=true');
      if (pkgRes.ok) {
        const pkgs = await pkgRes.json();
        setPackages(pkgs);
      }

      // 3. Portal settings
      const portalRes = await fetch('/api/portal/settings');
      if (portalRes.ok) {
        const portal = await portalRes.json();
        setPortalSettings(portal);
      }

      // 4. Router settings
      const routerRes = await fetch('/api/router/settings');
      if (routerRes.ok) {
        const router = await routerRes.json();
        setRouterSettings(router);
      }

      // 5. System settings
      const sysRes = await fetch('/api/settings');
      if (sysRes.ok) {
        const sys = await sysRes.json();
        setSystemSettings(sys);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Package Handlers
  const handleOpenAddPackage = () => {
    setPackageToEdit(null);
    setIsPackageModalOpen(true);
  };

  const handleOpenEditPackage = (pkg: Package) => {
    setPackageToEdit(pkg);
    setIsPackageModalOpen(true);
  };

  const handleSavePackage = async (pkgData: Partial<Package>) => {
    setIsSavingPackage(true);
    try {
      if (packageToEdit) {
        const res = await fetch(`/api/packages/${packageToEdit.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pkgData)
        });
        if (res.ok) {
          const updated = await res.json();
          setPackages(prev => prev.map(p => p.id === updated.id ? updated : p));
        }
      } else {
        const res = await fetch('/api/packages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pkgData)
        });
        if (res.ok) {
          const created = await res.json();
          setPackages(prev => [created, ...prev]);
        }
      }
      setIsPackageModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Save package error:', err);
    } finally {
      setIsSavingPackage(false);
    }
  };

  const handleOpenDeletePackage = (pkg: Package) => {
    setPackageToDelete(pkg);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeletePackage = async () => {
    if (!packageToDelete) return;
    setIsDeletingPackage(true);
    try {
      const res = await fetch(`/api/packages/${packageToDelete.id}`, { method: 'DELETE' });
      if (res.ok) {
        setPackages(prev => prev.filter(p => p.id !== packageToDelete.id));
        setIsDeleteModalOpen(false);
        setPackageToDelete(null);
        fetchData();
      }
    } catch (err) {
      console.error('Delete package error:', err);
    } finally {
      setIsDeletingPackage(false);
    }
  };

  const handleTogglePackageActive = async (pkg: Package) => {
    try {
      const res = await fetch(`/api/packages/${pkg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !pkg.isActive })
      });
      if (res.ok) {
        const updated = await res.json();
        setPackages(prev => prev.map(p => p.id === updated.id ? updated : p));
      }
    } catch (err) {
      console.error('Toggle active error:', err);
    }
  };

  // Portal Settings Handler
  const handleSavePortalSettings = async (newSettings: Partial<PortalSettings>) => {
    setIsSavingPortal(true);
    try {
      const res = await fetch('/api/portal/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      if (res.ok) {
        const saved = await res.json();
        setPortalSettings(saved);
        setStats(prev => ({ ...prev, portalSettings: saved }));
      }
    } catch (err) {
      console.error('Save portal error:', err);
    } finally {
      setIsSavingPortal(false);
    }
  };

  const handlePublishPortal = async () => {
    setIsPublishingPortal(true);
    try {
      const res = await fetch('/api/portal/publish', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setPortalSettings(data.settings);
      }
    } catch (err) {
      console.error('Publish portal error:', err);
    } finally {
      setIsPublishingPortal(false);
    }
  };

  // Router Settings Handler
  const handleSaveRouterSettings = async (newSettings: Partial<RouterSettings>) => {
    setIsSavingRouter(true);
    try {
      const res = await fetch('/api/router/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      if (res.ok) {
        const saved = await res.json();
        setRouterSettings(saved);
      }
    } catch (err) {
      console.error('Save router error:', err);
    } finally {
      setIsSavingRouter(false);
    }
  };

  const handleTestRouterConnection = async (config: any) => {
    const res = await fetch('/api/router/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    const data = await res.json();
    if (data.success) {
      setRouterSettings(prev => ({ ...prev, lastConnectionStatus: 'connected' }));
      setStats(prev => ({ ...prev, routerStatus: 'connected' }));
    } else {
      setRouterSettings(prev => ({ ...prev, lastConnectionStatus: 'disconnected' }));
      setStats(prev => ({ ...prev, routerStatus: 'disconnected' }));
    }
    return data;
  };

  // System Settings Handler
  const handleSaveSystemSettings = async (newSettings: Partial<SystemSettings>) => {
    setIsSavingSystem(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      if (res.ok) {
        const saved = await res.json();
        setSystemSettings(saved);
      }
    } catch (err) {
      console.error('Save system settings error:', err);
    } finally {
      setIsSavingSystem(false);
    }
  };

  // Logout Handler
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error(err);
    }
    setIsAuthenticated(false);
  };

  // Unauthenticated screen
  if (!isAuthenticated) {
    return (
      <LoginView
        onLoginSuccess={() => setIsAuthenticated(true)}
        onOpenPortal={() => {
          setIsAuthenticated(true);
          setCurrentTab('customer-portal');
        }}
      />
    );
  }

  // Standalone Customer Captive Portal View
  if (currentTab === 'customer-portal') {
    return (
      <CustomerCaptivePortal
        portalSettings={portalSettings}
        packages={packages.filter(p => p.isActive)}
        onBackToAdmin={() => setCurrentTab('dashboard')}
      />
    );
  }

  // Titles mapping
  const titles: Record<string, { title: string; subtitle: string }> = {
    dashboard: { title: 'Dashboard', subtitle: 'Overview of your WiFi business' },
    packages: { title: 'Packages', subtitle: 'Manage WiFi plans, pricing, and durations' },
    portal: { title: 'Portal Designer', subtitle: 'Customize branding and captive portal interface' },
    router: { title: 'MikroTik / Router', subtitle: 'RouterOS configuration, API connectivity, and scripts' },
    settings: { title: 'Payment & Settings', subtitle: 'Configure PalPluss, logs, sessions, and preferences' },
  };

  const currentHeaderInfo = titles[currentTab] || titles.dashboard;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e0e0e0] flex font-sans antialiased selection:bg-[#c5a37f] selection:text-[#0a0a0a]">
      {/* 1. Left Dark Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onLogout={handleLogout}
        isOpenMobile={isMobileSidebarOpen}
        setIsOpenMobile={setIsMobileSidebarOpen}
        onOpenPortal={() => setCurrentTab('customer-portal')}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Sticky Header */}
        <Header
          title={currentHeaderInfo.title}
          subtitle={currentHeaderInfo.subtitle}
          routerStatus={stats.routerStatus}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onNavigate={(tab) => setCurrentTab(tab)}
          onLogout={handleLogout}
          onOpenPortal={() => setCurrentTab('customer-portal')}
          onRefreshStats={fetchData}
          isRefreshing={isRefreshing}
        />

        {/* Dynamic Main Body Content */}
        <main className="flex-1">
          {currentTab === 'dashboard' && (
            <DashboardView
              stats={stats}
              packages={packages.filter(p => p.isActive)}
              onAddPackage={handleOpenAddPackage}
              onEditPackage={handleOpenEditPackage}
              onDeletePackage={handleOpenDeletePackage}
              onNavigate={(tab) => setCurrentTab(tab)}
              onOpenPortal={() => setCurrentTab('customer-portal')}
            />
          )}

          {currentTab === 'packages' && (
            <PackagesView
              packages={packages}
              onAddPackage={handleOpenAddPackage}
              onEditPackage={handleOpenEditPackage}
              onDeletePackage={handleOpenDeletePackage}
              onToggleActive={handleTogglePackageActive}
            />
          )}

          {currentTab === 'portal' && (
            <PortalDesigner
              settings={portalSettings}
              packages={packages.filter(p => p.isActive)}
              onSaveSettings={handleSavePortalSettings}
              onPublishPortal={handlePublishPortal}
              isSaving={isSavingPortal}
              isPublishing={isPublishingPortal}
            />
          )}

          {currentTab === 'router' && (
            <MikroTikView
              routerSettings={routerSettings}
              onSaveSettings={handleSaveRouterSettings}
              onTestConnection={handleTestRouterConnection}
              isSaving={isSavingRouter}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              systemSettings={systemSettings}
              onSaveSettings={handleSaveSystemSettings}
              isSaving={isSavingSystem}
            />
          )}
        </main>
      </div>

      {/* 3. Global Action Modals */}
      <PackageModal
        isOpen={isPackageModalOpen}
        onClose={() => {
          setIsPackageModalOpen(false);
          setPackageToEdit(null);
        }}
        onSave={handleSavePackage}
        packageToEdit={packageToEdit}
        isSaving={isSavingPackage}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setPackageToDelete(null);
        }}
        onConfirm={handleConfirmDeletePackage}
        packageToDelete={packageToDelete}
        isDeleting={isDeletingPackage}
      />
    </div>
  );
}
