import React, { useState } from 'react';
import { 
  DollarSign, 
  Users, 
  CreditCard, 
  Clock, 
  Plus, 
  Wifi, 
  ChevronRight, 
  ArrowUp, 
  ArrowDown, 
  Activity,
  Edit2,
  Trash2,
  CheckCircle,
  X,
  AlertTriangle
} from 'lucide-react';
import { DashboardStats, Package, Payment } from '../types.js';

interface DashboardViewProps {
  stats: DashboardStats;
  packages: Package[];
  onAddPackage: () => void;
  onEditPackage: (pkg: Package) => void;
  onDeletePackage: (pkg: Package) => void;
  onNavigate: (tab: string) => void;
  onOpenPortal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  packages,
  onAddPackage,
  onEditPackage,
  onDeletePackage,
  onNavigate,
  onOpenPortal,
}) => {
  const [selectedTxn, setSelectedTxn] = useState<Payment | null>(null);

  // Format time (e.g. 10:24 AM)
  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return dateStr;
    }
  };

  // Format currency
  const formatKes = (amount: number) => {
    return `KSh ${Number(amount).toLocaleString()}`;
  };

  // Calculate usage percentage
  const usagePercent = Math.min(100, Math.round((stats.activeUsers / (stats.maxSessionsCapacity || 10)) * 100));

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto bg-[#0a0a0a] text-[#e0e0e0] min-h-[calc(100vh-80px)]">
      {/* ---------------------------------------------------- */}
      {/* 1. TOP SUMMARY STAT CARDS (4-Column Grid) */}
      {/* ---------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* Card 1: Today's Revenue */}
        <div id="stat-card-revenue" className="bg-[#141414] rounded-2xl p-5 border border-[#242424] shadow-xs hover:border-[#383028] transition-all">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-[#c5a37f]/15 flex items-center justify-center text-[#c5a37f] shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#8a8a8a] uppercase tracking-wider">Today's Revenue</p>
              <h3 className="text-2xl font-bold font-serif text-[#f5f5f5] mt-0.5 tracking-tight">
                {formatKes(stats.todayRevenue ?? 0)}
              </h3>
              <p className="text-xs font-medium text-[#8fa876] mt-1 flex items-center space-x-0.5">
                <ArrowUp className="w-3.5 h-3.5 inline" />
                <span>{stats.revenueTrendPercent ?? 0}% vs yesterday</span>
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Active Users */}
        <div id="stat-card-active-users" className="bg-[#141414] rounded-2xl p-5 border border-[#242424] shadow-xs hover:border-[#383028] transition-all">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-[#c5a37f]/15 flex items-center justify-center text-[#c5a37f] shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#8a8a8a] uppercase tracking-wider">Active Users</p>
              <h3 className="text-2xl font-bold font-serif text-[#f5f5f5] mt-0.5 tracking-tight">
                {stats.activeUsers ?? 0}
              </h3>
              <p className="text-xs font-medium text-[#8fa876] mt-1 flex items-center space-x-0.5">
                <ArrowUp className="w-3.5 h-3.5 inline" />
                <span>{stats.activeUsersTrendPercent ?? 0}% vs yesterday</span>
              </p>
            </div>
          </div>
        </div>

        {/* Card 3: Successful Payments */}
        <div id="stat-card-successful-payments" className="bg-[#141414] rounded-2xl p-5 border border-[#242424] shadow-xs hover:border-[#383028] transition-all">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-[#c5a37f]/15 flex items-center justify-center text-[#c5a37f] shrink-0">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#8a8a8a] uppercase tracking-wider">Successful Payments</p>
              <h3 className="text-2xl font-bold font-serif text-[#f5f5f5] mt-0.5 tracking-tight">
                {stats.successfulPayments ?? 0}
              </h3>
              <p className="text-xs font-medium text-[#8fa876] mt-1 flex items-center space-x-0.5">
                <ArrowUp className="w-3.5 h-3.5 inline" />
                <span>{stats.successfulPaymentsTrendPercent ?? 0}% vs yesterday</span>
              </p>
            </div>
          </div>
        </div>

        {/* Card 4: Expired Sessions */}
        <div id="stat-card-expired-sessions" className="bg-[#141414] rounded-2xl p-5 border border-[#242424] shadow-xs hover:border-[#383028] transition-all">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-[#241414] flex items-center justify-center text-[#c06056] shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#8a8a8a] uppercase tracking-wider">Expired Sessions</p>
              <h3 className="text-2xl font-bold font-serif text-[#f5f5f5] mt-0.5 tracking-tight">
                {stats.expiredSessions ?? 0}
              </h3>
              <p className="text-xs font-medium text-[#c06056] mt-1 flex items-center space-x-0.5">
                <ArrowDown className="w-3.5 h-3.5 inline" />
                <span>{Math.abs(stats.expiredSessionsTrendPercent ?? 0)}% vs yesterday</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 2. MIDDLE SECTION (Recent Transactions & WiFi Usage) */}
      {/* ---------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (8 Cols): Recent Transactions */}
        <div id="section-recent-transactions" className="lg:col-span-8 bg-[#141414] rounded-2xl border border-[#242424] shadow-xs p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#242424]">
              <h2 className="text-lg font-bold font-serif text-[#f5f5f5] tracking-wide">Recent Transactions</h2>
              <button
                id="btn-view-all-transactions"
                onClick={() => onNavigate('settings')}
                className="text-xs font-semibold text-[#c5a37f] hover:text-[#d6b593] transition-colors"
              >
                View All
              </button>
            </div>

            <div className="overflow-x-auto mt-2">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#242424] text-[11px] font-bold text-[#8a8a8a] uppercase tracking-wider">
                    <th className="py-3 px-3">Phone Number</th>
                    <th className="py-3 px-3">Package</th>
                    <th className="py-3 px-3">Amount</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f1f1f] text-xs text-[#d0d0d0]">
                  {stats.recentTransactions && stats.recentTransactions.length > 0 ? (
                    stats.recentTransactions.map((txn, idx) => (
                      <tr 
                        key={txn.id || idx}
                        id={`txn-row-${txn.id || idx}`}
                        onClick={() => setSelectedTxn(txn)}
                        className="hover:bg-[#1a1a1a] cursor-pointer transition-colors"
                      >
                        <td className="py-3.5 px-3 font-semibold text-[#f0f0f0]">
                          {txn.phoneNumber}
                        </td>
                        <td className="py-3.5 px-3 text-[#a0a0a0]">
                          {txn.packageName || '1 Hour'}
                        </td>
                        <td className="py-3.5 px-3 font-semibold text-[#c5a37f]">
                          {formatKes(txn.amountKes)}
                        </td>
                        <td className="py-3.5 px-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize border ${
                              txn.status === 'successful'
                                ? 'bg-[#132014] text-[#8fa876] border-[#223d24]'
                                : txn.status === 'pending'
                                ? 'bg-[#241c10] text-[#c59b6d] border-[#42321c]'
                                : 'bg-[#241414] text-[#c06056] border-[#402020]'
                            }`}
                          >
                            {txn.status === 'successful' ? 'Success' : txn.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right text-[#707070] font-normal">
                          {formatTime(txn.createdAt)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[#606060] text-xs">
                        No recent transactions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right (4 Cols): WiFi Usage */}
        <div id="section-wifi-usage" className="lg:col-span-4 bg-[#141414] rounded-2xl border border-[#242424] shadow-xs p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#242424]">
              <h2 className="text-lg font-bold font-serif text-[#f5f5f5] tracking-wide">WiFi Usage</h2>
              <button
                id="btn-view-usage-details"
                onClick={() => onNavigate('router')}
                className="text-xs font-semibold text-[#c5a37f] hover:text-[#d6b593] transition-colors"
              >
                View Details
              </button>
            </div>

            {/* Active Sessions Counter & Bar */}
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-[#8a8a8a] font-medium">Active Sessions</span>
                <span className="text-[#f5f5f5] font-bold text-sm font-serif">
                  {stats.activeUsers ?? 0} / {stats.maxSessionsCapacity || 10}
                </span>
              </div>
              <div className="w-full bg-[#202020] h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-[#c5a37f] h-full rounded-full transition-all duration-500 shadow-xs shadow-[#c5a37f]/50" 
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </div>

            {/* Router Status Indicator */}
            <div className="mt-6 flex items-center justify-between p-3.5 rounded-xl bg-[#1a1a1a] border border-[#262626]">
              <span className="text-xs font-medium text-[#a0a0a0]">Router Status</span>
              <div className="flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full ${stats.routerStatus === 'connected' ? 'bg-[#8fa876] animate-pulse' : 'bg-[#707070]'}`}></span>
                <span className={`text-xs font-bold ${stats.routerStatus === 'connected' ? 'text-[#8fa876]' : 'text-[#8a8a8a]'}`}>
                  {stats.routerStatus === 'connected' ? 'Online' : 'Disconnected'}
                </span>
              </div>
            </div>

            {/* Sub-Metrics 2-Column Grid */}
            <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-[#242424]">
              <div>
                <p className="text-[11px] text-[#707070] font-medium">Uptime</p>
                <p className="text-sm font-bold font-serif text-[#f0f0f0] mt-0.5">{stats.routerUptime || '0m'}</p>
              </div>
              <div>
                <p className="text-[11px] text-[#707070] font-medium">Total Users Today</p>
                <p className="text-sm font-bold font-serif text-[#f0f0f0] mt-0.5">{stats.totalUsersToday ?? 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 3. BOTTOM SECTION (Package Management & Portal Preview) */}
      {/* ---------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (8 Cols): Package Management */}
        <div id="section-package-management" className="lg:col-span-8 bg-[#141414] rounded-2xl border border-[#242424] shadow-xs p-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#242424]">
            <h2 className="text-lg font-bold font-serif text-[#f5f5f5] tracking-wide">Package Management</h2>
            <button
              id="btn-dashboard-add-package"
              onClick={onAddPackage}
              className="flex items-center space-x-1.5 px-4 py-2 bg-[#c5a37f] hover:bg-[#d6b593] text-[#0a0a0a] rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Package</span>
            </button>
          </div>

          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#242424] text-[11px] font-bold text-[#8a8a8a] uppercase tracking-wider">
                  <th className="py-3 px-3">Package Name</th>
                  <th className="py-3 px-3">Price</th>
                  <th className="py-3 px-3">Duration</th>
                  <th className="py-3 px-3">Devices</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f1f1f] text-xs text-[#d0d0d0]">
                {packages && packages.length > 0 ? (
                  packages.map((pkg) => (
                    <tr key={pkg.id} id={`pkg-row-${pkg.id}`} className="hover:bg-[#1a1a1a] transition-colors">
                      <td className="py-3.5 px-3 font-semibold text-[#f0f0f0]">
                        {pkg.name}
                      </td>
                      <td className="py-3.5 px-3 font-medium text-[#c5a37f]">
                        {formatKes(pkg.priceKes)}
                      </td>
                      <td className="py-3.5 px-3 text-[#a0a0a0]">
                        {pkg.durationMinutes >= 60
                          ? `${pkg.durationMinutes / 60} Hour${pkg.durationMinutes > 60 ? 's' : ''}`
                          : `${pkg.durationMinutes} Mins`}
                      </td>
                      <td className="py-3.5 px-3 text-[#a0a0a0]">
                        {pkg.deviceLimit || 1}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#132014] text-[#8fa876] border border-[#223d24]">
                          Active
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right space-x-3">
                        <button
                          id={`btn-edit-pkg-${pkg.id}`}
                          onClick={() => onEditPackage(pkg)}
                          className="text-xs font-semibold text-[#c5a37f] hover:text-[#d6b593] transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          id={`btn-delete-pkg-${pkg.id}`}
                          onClick={() => onDeletePackage(pkg)}
                          className="text-xs font-semibold text-[#c06056] hover:text-[#d67066] transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#606060] text-xs">
                      No packages created yet. Click "+ Add Package" to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right (4 Cols): Portal Preview */}
        <div id="section-portal-preview" className="lg:col-span-4 bg-[#141414] rounded-2xl border border-[#242424] shadow-xs p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#242424]">
              <h2 className="text-lg font-bold font-serif text-[#f5f5f5] tracking-wide">Portal Preview</h2>
              <button
                id="btn-portal-preview-settings"
                onClick={() => onNavigate('portal')}
                className="text-xs font-semibold text-[#c5a37f] hover:text-[#d6b593] transition-colors"
              >
                Settings
              </button>
            </div>

            {/* Captive Portal Visual Card */}
            <div className="mt-4 p-5 rounded-2xl bg-[#0a0a0a] border border-[#242424] text-center">
              {/* Gold WiFi Wave Icon */}
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[#c5a37f] text-[#0a0a0a] flex items-center justify-center shadow-md shadow-[#c5a37f]/20 mb-3">
                <Wifi className="w-6 h-6" />
              </div>

              <h3 className="text-sm font-bold font-serif text-[#f0f0f0]">
                {stats.portalSettings?.welcomeTitle || 'Welcome to Our WiFi'}
              </h3>
              <p className="text-[11px] text-[#707070] mt-0.5 mb-4">
                {stats.portalSettings?.welcomeMessage || 'Choose a package to get started'}
              </p>

              {/* Package Selectors in Mini Preview */}
              <div className="space-y-2 text-left">
                {packages.slice(0, 2).map((pkg) => (
                  <div
                    key={pkg.id}
                    onClick={onOpenPortal}
                    className="p-3 rounded-xl bg-[#141414] border border-[#262626] flex items-center justify-between cursor-pointer hover:border-[#c5a37f]/50 hover:shadow-xs transition-all"
                  >
                    <div>
                      <p className="text-xs font-bold text-[#e0e0e0]">
                        {pkg.name} - {formatKes(pkg.priceKes)}
                      </p>
                      <p className="text-[10px] text-[#707070]">
                        {pkg.deviceLimit || 1} device • {pkg.durationMinutes >= 60 ? `${pkg.durationMinutes / 60} hour` : `${pkg.durationMinutes} mins`}
                      </p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[#707070]" />
                  </div>
                ))}
              </div>

              <button
                id="btn-mini-preview-open"
                onClick={onOpenPortal}
                className="w-full mt-4 py-2 px-3 bg-[#c5a37f] hover:bg-[#d6b593] text-[#0a0a0a] rounded-xl text-xs font-bold transition-colors"
              >
                Test Customer Portal
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* TRANSACTION DETAILS MODAL */}
      {/* ---------------------------------------------------- */}
      {selectedTxn && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-[#141414] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#282828] text-[#e0e0e0] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#242424]">
              <h3 className="text-base font-bold font-serif text-[#f5f5f5]">Transaction Details</h3>
              <button 
                onClick={() => setSelectedTxn(null)}
                className="p-1 rounded-lg text-[#707070] hover:text-[#f0f0f0] hover:bg-[#1f1f1f]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-[#1f1f1f]">
                <span className="text-[#8a8a8a]">Reference:</span>
                <span className="font-mono font-semibold text-[#f0f0f0]">{selectedTxn.merchantReference}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#1f1f1f]">
                <span className="text-[#8a8a8a]">Phone Number:</span>
                <span className="font-bold text-[#f0f0f0]">{selectedTxn.phoneNumber}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#1f1f1f]">
                <span className="text-[#8a8a8a]">Package:</span>
                <span className="font-medium text-[#d0d0d0]">{selectedTxn.packageName || '1 Hour'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#1f1f1f]">
                <span className="text-[#8a8a8a]">Amount:</span>
                <span className="font-bold text-[#c5a37f] text-sm">{formatKes(selectedTxn.amountKes)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#1f1f1f]">
                <span className="text-[#8a8a8a]">Status:</span>
                <span className={`font-semibold capitalize px-2 py-0.5 rounded-full text-[11px] border ${
                  selectedTxn.status === 'successful'
                    ? 'bg-[#132014] text-[#8fa876] border-[#223d24]'
                    : selectedTxn.status === 'pending'
                    ? 'bg-[#241c10] text-[#c59b6d] border-[#42321c]'
                    : 'bg-[#241414] text-[#c06056] border-[#402020]'
                }`}>
                  {selectedTxn.status}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[#8a8a8a]">Date & Time:</span>
                <span className="text-[#a0a0a0]">{new Date(selectedTxn.createdAt).toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => setSelectedTxn(null)}
                className="w-full py-2.5 bg-[#1f1f1f] hover:bg-[#282828] text-[#e0e0e0] font-semibold rounded-xl text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
