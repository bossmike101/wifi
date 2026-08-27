import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  CreditCard, 
  Building2, 
  KeyRound, 
  History, 
  Wifi, 
  Search, 
  Save, 
  Check, 
  AlertCircle, 
  Trash2, 
  UserX, 
  Clock, 
  ShieldCheck, 
  Smartphone,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { SystemSettings, Payment, WifiSession } from '../types.js';

interface SettingsViewProps {
  systemSettings: SystemSettings;
  onSaveSettings: (settings: Partial<SystemSettings>) => Promise<void>;
  isSaving: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  systemSettings,
  onSaveSettings,
  isSaving
}) => {
  const [formData, setFormData] = useState<SystemSettings>({ ...systemSettings });
  const [activeTab, setActiveTab] = useState<'payment' | 'business' | 'security' | 'transactions' | 'sessions'>('payment');
  const [showApiKey, setShowApiKey] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Security Credentials state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityMessage, setSecurityMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Transactions State
  const [transactions, setTransactions] = useState<Payment[]>([]);
  const [txnSearch, setTxnSearch] = useState('');
  const [txnFilter, setTxnFilter] = useState<'all' | 'successful' | 'pending' | 'failed'>('all');
  const [isLoadingTxns, setIsLoadingTxns] = useState(false);

  // Sessions State
  const [sessions, setSessions] = useState<WifiSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  // PalPluss Gateway Testing State
  const [testPhone, setTestPhone] = useState('0712345678');
  const [isTestingGateway, setIsTestingGateway] = useState(false);
  const [gatewayTestResult, setGatewayTestResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleTestPalpluss = async () => {
    setIsTestingGateway(true);
    setGatewayTestResult(null);

    try {
      const res = await fetch('/api/payments/test-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: formData.palplussApiKey,
          apiUrl: formData.palplussApiUrl,
          merchantId: formData.palplussMerchantId,
          phoneNumber: testPhone
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'PalPluss test failed.');
      }

      setGatewayTestResult({
        type: 'success',
        message: data.message || 'STK Push test prompt successfully sent to your phone!'
      });
    } catch (err: any) {
      setGatewayTestResult({
        type: 'error',
        message: err.message || 'Failed to send test STK push.'
      });
    } finally {
      setIsTestingGateway(false);
    }
  };

  const fetchTransactions = async () => {
    setIsLoadingTxns(true);
    try {
      const res = await fetch('/api/payments/history');
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingTxns(false);
    }
  };

  const fetchSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const res = await fetch('/api/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'transactions') {
      fetchTransactions();
    } else if (activeTab === 'sessions') {
      fetchSessions();
    }
  }, [activeTab]);

  const handleSave = async () => {
    await onSaveSettings(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityMessage(null);

    if (newPassword !== confirmPassword) {
      setSecurityMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      setSecurityMessage({ type: 'error', text: 'Password must be at least 6 characters long.' });
      return;
    }

    try {
      const res = await fetch('/api/auth/update-credentials', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update credentials.');

      setSecurityMessage({ type: 'success', text: 'Admin password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setSecurityMessage({ type: 'error', text: err.message });
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/revoke`, { method: 'POST' });
      if (res.ok) {
        setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: 'revoked' } : s));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered transactions
  const filteredTxns = transactions.filter(t => {
    const matchesSearch = t.phoneNumber.includes(txnSearch) || 
                          t.merchantReference.toLowerCase().includes(txnSearch.toLowerCase()) ||
                          (t.providerReference && t.providerReference.toLowerCase().includes(txnSearch.toLowerCase()));
    if (txnFilter === 'all') return matchesSearch;
    return matchesSearch && t.status === txnFilter;
  });

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto bg-[#0a0a0a] min-h-[calc(100vh-80px)] text-[#e0e0e0]">
      {/* Top Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#141414] p-5 rounded-2xl border border-[#242424] shadow-xs">
        <div>
          <h2 className="text-xl font-bold font-serif text-[#f5f5f5] tracking-wide">Payment & System Settings</h2>
          <p className="text-xs text-[#8a8a8a] mt-0.5">Configure PalPluss payment gateway, transaction logs, active sessions, and business profile</p>
        </div>

        {/* Action Save Button for Settings tabs */}
        {(activeTab === 'payment' || activeTab === 'business') && (
          <button
            id="btn-settings-save"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center space-x-2 px-5 py-2 bg-[#c5a37f] hover:bg-[#d6b593] text-[#0a0a0a] rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50 shrink-0"
          >
            {saveSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#0a0a0a]" />
                <span>Saved Successfully!</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Tabs Selector */}
      <div className="flex rounded-xl bg-[#141414] p-1 border border-[#242424] shadow-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('payment')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'payment' ? 'bg-[#262626] text-[#c5a37f] shadow-xs' : 'text-[#8a8a8a] hover:text-[#f5f5f5]'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>PalPluss / M-Pesa Gateway</span>
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'transactions' ? 'bg-[#262626] text-[#c5a37f] shadow-xs' : 'text-[#8a8a8a] hover:text-[#f5f5f5]'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Transactions History</span>
        </button>

        <button
          onClick={() => setActiveTab('sessions')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'sessions' ? 'bg-[#262626] text-[#c5a37f] shadow-xs' : 'text-[#8a8a8a] hover:text-[#f5f5f5]'
          }`}
        >
          <Wifi className="w-3.5 h-3.5" />
          <span>Active WiFi Sessions</span>
        </button>

        <button
          onClick={() => setActiveTab('business')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'business' ? 'bg-[#262626] text-[#c5a37f] shadow-xs' : 'text-[#8a8a8a] hover:text-[#f5f5f5]'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Business Info</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'security' ? 'bg-[#262626] text-[#c5a37f] shadow-xs' : 'text-[#8a8a8a] hover:text-[#f5f5f5]'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>Admin Security</span>
        </button>
      </div>

      {/* ---------------------------------------------------- */}
      {/* TAB 1: PALPLUSS PAYMENT CONFIGURATION */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'payment' && (
        <div className="bg-[#141414] rounded-2xl p-6 border border-[#242424] shadow-xs space-y-6">
          <div className="border-b border-[#242424] pb-3">
            <h3 className="text-base font-bold font-serif text-[#f5f5f5] tracking-wide">PalPluss Payment Gateway Configuration</h3>
            <p className="text-xs text-[#8a8a8a] mt-0.5">Integrate your official PalPluss API keys for real-time M-Pesa STK Push payments</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#a0a0a0] mb-1.5">PalPluss API Secret Key</label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={formData.palplussApiKey || ''}
                  onChange={(e) => setFormData({ ...formData, palplussApiKey: e.target.value })}
                  placeholder="e.g. pal_live_secret_key_..."
                  className="w-full px-3.5 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-xs font-mono text-[#c5a37f] focus:bg-[#202020] focus:border-[#c5a37f] focus:outline-hidden pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-2.5 text-[#707070] hover:text-[#c5a37f]"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-[#707070] mt-1">Keys are kept safe on the server and never exposed to client browsers.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#a0a0a0] mb-1.5">PalPluss API Base URL</label>
              <input
                type="text"
                value={formData.palplussApiUrl || 'https://api.palpluss.com/v1'}
                onChange={(e) => setFormData({ ...formData, palplussApiUrl: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-xs font-mono text-[#f0f0f0] focus:bg-[#202020] focus:border-[#c5a37f] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#a0a0a0] mb-1.5">PalPluss Merchant / Account ID</label>
              <input
                type="text"
                value={formData.palplussMerchantId || ''}
                onChange={(e) => setFormData({ ...formData, palplussMerchantId: e.target.value })}
                placeholder="e.g. MERCHANT_001"
                className="w-full px-3.5 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-xs font-mono text-[#f0f0f0] focus:bg-[#202020] focus:border-[#c5a37f] focus:outline-hidden"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#a0a0a0] mb-1.5">Webhook / Callback URL</label>
              <input
                type="text"
                value={formData.palplussCallbackUrl || 'https://billing-system.vercel.app/api/payments/callback'}
                onChange={(e) => setFormData({ ...formData, palplussCallbackUrl: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-xs font-mono text-[#8a8a8a] focus:bg-[#202020] focus:border-[#c5a37f] focus:outline-hidden"
              />
              <p className="text-[11px] text-[#707070] mt-1">Configure this URL in your PalPluss developer portal to receive instant STK notifications.</p>
            </div>
          </div>

          {/* Test STK Push Section */}
          <div className="pt-4 border-t border-[#242424]">
            <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2e2e2e] space-y-3">
              <div className="flex items-center space-x-2">
                <Smartphone className="w-4 h-4 text-[#c5a37f]" />
                <h4 className="text-xs font-bold text-[#f5f5f5] uppercase tracking-wider">Test Real M-Pesa STK Push</h4>
              </div>
              <p className="text-xs text-[#8a8a8a]">
                Send a live KSh 1 payment prompt to your phone to verify that your PalPluss API keys and channels are functioning properly.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                <div className="relative flex-1">
                  <input
                    type="tel"
                    placeholder="e.g. 0712345678"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#141414] border border-[#333] rounded-xl text-xs font-mono text-[#f0f0f0] focus:border-[#c5a37f] focus:outline-hidden"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleTestPalpluss}
                  disabled={isTestingGateway || !formData.palplussApiKey}
                  className="px-4 py-2 bg-[#c5a37f] hover:bg-[#d6b593] text-[#0a0a0a] rounded-xl text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 disabled:opacity-40 whitespace-nowrap"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>{isTestingGateway ? 'Sending STK Push...' : 'Send Test STK (KSh 1)'}</span>
                </button>
              </div>

              {gatewayTestResult && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-start space-x-2 border ${
                    gatewayTestResult.type === 'success'
                      ? 'bg-[#132014] text-[#8fa876] border-[#223d24]'
                      : 'bg-[#241414] text-[#c06056] border-[#402020]'
                  }`}
                >
                  {gatewayTestResult.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span>{gatewayTestResult.message}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 2: TRANSACTIONS HISTORY */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'transactions' && (
        <div className="bg-[#141414] rounded-2xl border border-[#242424] shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-[#707070] absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search phone, reference, or receipt..."
                value={txnSearch}
                onChange={(e) => setTxnSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-xs text-[#f0f0f0] focus:bg-[#202020] focus:border-[#c5a37f] focus:outline-hidden"
              />
            </div>

            <div className="flex items-center space-x-2">
              {(['all', 'successful', 'pending', 'failed'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTxnFilter(filter)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-colors ${
                    txnFilter === filter ? 'bg-[#c5a37f] text-[#0a0a0a]' : 'bg-[#1a1a1a] text-[#8a8a8a] hover:bg-[#242424] hover:text-[#f5f5f5]'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#242424] text-[11px] font-bold text-[#8a8a8a] uppercase tracking-wider">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Merchant Reference</th>
                  <th className="py-3 px-4">Phone Number</th>
                  <th className="py-3 px-4">Package</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Receipt / Provider Ref</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f1f1f] text-xs text-[#d0d0d0]">
                {filteredTxns.length > 0 ? (
                  filteredTxns.map((t) => (
                    <tr key={t.id} className="hover:bg-[#1a1a1a]/60">
                      <td className="py-3 px-4 text-[#8a8a8a]">{new Date(t.createdAt).toLocaleString()}</td>
                      <td className="py-3 px-4 font-mono font-semibold text-[#f0f0f0]">{t.merchantReference}</td>
                      <td className="py-3 px-4 font-bold text-[#f5f5f5]">{t.phoneNumber}</td>
                      <td className="py-3 px-4 text-[#c0c0c0]">{t.packageName || 'WiFi Package'}</td>
                      <td className="py-3 px-4 font-extrabold text-[#c5a37f]">KSh {t.amountKes}</td>
                      <td className="py-3 px-4 font-mono text-[#8a8a8a]">{t.providerReference || '—'}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full font-semibold capitalize ${
                          t.status === 'successful'
                            ? 'bg-[#132014] text-[#8fa876] border border-[#223d24]'
                            : t.status === 'pending'
                            ? 'bg-[#282015] text-[#d6a56e] border border-[#48341e]'
                            : 'bg-[#241414] text-[#c06056] border border-[#402020]'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#707070]">
                      No transactions recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 3: ACTIVE WIFI SESSIONS */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'sessions' && (
        <div className="bg-[#141414] rounded-2xl border border-[#242424] shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#242424] pb-3">
            <div>
              <h3 className="text-base font-bold font-serif text-[#f5f5f5] tracking-wide">Active HotSpot Customer Sessions</h3>
              <p className="text-xs text-[#8a8a8a] mt-0.5">Live monitoring of connected devices and automatic expiry enforcement</p>
            </div>
            <button
              onClick={fetchSessions}
              className="px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#242424] text-[#c5a37f] border border-[#282828] rounded-lg text-xs font-semibold"
            >
              Refresh Sessions
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#242424] text-[11px] font-bold text-[#8a8a8a] uppercase tracking-wider">
                  <th className="py-3 px-4">Customer Phone</th>
                  <th className="py-3 px-4">MikroTik Username</th>
                  <th className="py-3 px-4">Package</th>
                  <th className="py-3 px-4">Connected At</th>
                  <th className="py-3 px-4">Expires At</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f1f1f] text-xs text-[#d0d0d0]">
                {sessions.length > 0 ? (
                  sessions.map((s) => (
                    <tr key={s.id} className="hover:bg-[#1a1a1a]/60">
                      <td className="py-3 px-4 font-bold text-[#f5f5f5]">{s.phoneNumber}</td>
                      <td className="py-3 px-4 font-mono text-[#c5a37f]">{s.mikrotikUsername}</td>
                      <td className="py-3 px-4 font-medium text-[#d0d0d0]">{s.packageName || '1 Hour'}</td>
                      <td className="py-3 px-4 text-[#8a8a8a]">{new Date(s.startedAt).toLocaleTimeString()}</td>
                      <td className="py-3 px-4 font-bold text-[#c5a37f]">{new Date(s.expiresAt).toLocaleTimeString()}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded-full font-semibold capitalize ${
                          s.status === 'active'
                            ? 'bg-[#132014] text-[#8fa876] border border-[#223d24]'
                            : 'bg-[#1e1e1e] text-[#8a8a8a]'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {s.status === 'active' && (
                          <button
                            onClick={() => handleRevokeSession(s.id)}
                            className="px-2.5 py-1 text-[#c06056] hover:bg-[#241414] rounded-md font-semibold"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#707070]">
                      No active sessions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 4: BUSINESS INFO */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'business' && (
        <div className="bg-[#141414] rounded-2xl p-6 border border-[#242424] shadow-xs space-y-6">
          <div className="border-b border-[#242424] pb-3">
            <h3 className="text-base font-bold font-serif text-[#f5f5f5] tracking-wide">Business Profile & Regional Settings</h3>
            <p className="text-xs text-[#8a8a8a] mt-0.5">Control business contact details and timezone</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-[#a0a0a0] mb-1.5">Business Name</label>
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-xs text-[#f0f0f0] focus:bg-[#202020] focus:border-[#c5a37f] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#a0a0a0] mb-1.5">Support Phone</label>
              <input
                type="text"
                value={formData.businessPhone}
                onChange={(e) => setFormData({ ...formData, businessPhone: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-xs text-[#f0f0f0] focus:bg-[#202020] focus:border-[#c5a37f] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#a0a0a0] mb-1.5">Currency</label>
              <input
                type="text"
                value={formData.currency}
                disabled
                className="w-full px-3.5 py-2.5 bg-[#181818] border border-[#282828] rounded-xl text-xs font-bold text-[#c5a37f]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#a0a0a0] mb-1.5">Timezone</label>
              <input
                type="text"
                value={formData.timezone}
                disabled
                className="w-full px-3.5 py-2.5 bg-[#181818] border border-[#282828] rounded-xl text-xs font-bold text-[#a0a0a0]"
              />
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 5: ADMIN SECURITY */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'security' && (
        <div className="bg-[#141414] rounded-2xl p-6 border border-[#242424] shadow-xs max-w-xl space-y-6">
          <div className="border-b border-[#242424] pb-3">
            <h3 className="text-base font-bold font-serif text-[#f5f5f5] tracking-wide">Change Admin Password</h3>
            <p className="text-xs text-[#8a8a8a] mt-0.5">Secure your single-owner administrator dashboard</p>
          </div>

          {securityMessage && (
            <div className={`p-4 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
              securityMessage.type === 'success' ? 'bg-[#132014] text-[#8fa876] border border-[#223d24]' : 'bg-[#241414] text-[#c06056] border border-[#402020]'
            }`}>
              {securityMessage.type === 'success' ? <Check className="w-4 h-4 text-[#8fa876]" /> : <AlertCircle className="w-4 h-4 text-[#c06056]" />}
              <span>{securityMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#a0a0a0] mb-1.5">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-xs text-[#f0f0f0] focus:bg-[#202020] focus:border-[#c5a37f] focus:outline-hidden"
                placeholder="Enter current password (default: admin123)"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#a0a0a0] mb-1.5">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-xs text-[#f0f0f0] focus:bg-[#202020] focus:border-[#c5a37f] focus:outline-hidden"
                placeholder="Minimum 6 characters"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#a0a0a0] mb-1.5">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-xs text-[#f0f0f0] focus:bg-[#202020] focus:border-[#c5a37f] focus:outline-hidden"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#c5a37f] hover:bg-[#d6b593] text-[#0a0a0a] rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              Update Password
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
