import React, { useState } from 'react';
import { 
  Network, 
  Activity, 
  Terminal, 
  Copy, 
  Check, 
  Save, 
  RefreshCw, 
  ShieldCheck, 
  AlertCircle, 
  Cpu, 
  Clock, 
  Users, 
  HelpCircle, 
  Key,
  Globe,
  Radio,
  Sliders
} from 'lucide-react';
import { RouterSettings } from '../types.js';

interface MikroTikViewProps {
  routerSettings: RouterSettings;
  onSaveSettings: (settings: Partial<RouterSettings>) => Promise<void>;
  onTestConnection: (config: { host: string; port: number; username: string; password?: string }) => Promise<{ success: boolean; latencyMs?: number; message: string }>;
  isSaving: boolean;
}

export const MikroTikView: React.FC<MikroTikViewProps> = ({
  routerSettings,
  onSaveSettings,
  onTestConnection,
  isSaving
}) => {
  const [formData, setFormData] = useState<RouterSettings>({ ...routerSettings });
  const [showPassword, setShowPassword] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; latencyMs?: number; message: string } | null>(null);

  // Script Generator State
  const [rosVersion, setRosVersion] = useState<'v7' | 'v6'>('v7');
  const [hotspotInterface, setHotspotInterface] = useState('wlan1');
  const [dnsName, setDnsName] = useState('wifi.hotspot');
  const [gatewayIp, setGatewayIp] = useState('10.0.0.1');
  const [portalUrl, setPortalUrl] = useState('https://billing-system.vercel.app/portal');
  const [generatedScript, setGeneratedScript] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'script' | 'guide'>('config');

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await onTestConnection({
        host: formData.host,
        port: Number(formData.apiPort),
        username: formData.username,
        password: formData.encryptedPassword
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setIsTesting(false);
    }
  };

  const handleGenerateScript = async () => {
    try {
      const res = await fetch('/api/router/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routerOsVersion: rosVersion,
          hotspotInterface,
          dnsName,
          gatewayIp,
          portalUrl
        })
      });
      const data = await res.json();
      if (data.script) {
        setGeneratedScript(data.script);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyScript = () => {
    if (!generatedScript) return;
    navigator.clipboard.writeText(generatedScript);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto bg-[#0a0a0a] min-h-[calc(100vh-80px)] text-[#e0e0e0]">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#141414] p-5 rounded-2xl border border-[#242424] shadow-xs">
        <div>
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-bold font-serif text-[#f5f5f5] tracking-wide">MikroTik Router Management</h2>
            <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
              routerSettings.lastConnectionStatus === 'connected'
                ? 'bg-[#132014] text-[#8fa876] border-[#223d24]'
                : 'bg-[#241414] text-[#c06056] border-[#402020]'
            }`}>
              <span className={`w-2 h-2 rounded-full ${routerSettings.lastConnectionStatus === 'connected' ? 'bg-[#8fa876] animate-pulse' : 'bg-[#c06056]'}`}></span>
              <span>{routerSettings.lastConnectionStatus === 'connected' ? 'Router: Connected' : 'Router: Disconnected'}</span>
            </span>
          </div>
          <p className="text-xs text-[#8a8a8a] mt-0.5">Manage RouterOS API integration, HotSpot user provisioning, and setup scripts for MikroTik hAP lite</p>
        </div>

        {/* Action Tabs */}
        <div className="flex rounded-xl bg-[#1a1a1a] p-1 border border-[#262626]">
          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'config' ? 'bg-[#262626] text-[#c5a37f] shadow-xs' : 'text-[#8a8a8a] hover:text-[#f5f5f5]'
            }`}
          >
            Connection & Status
          </button>
          <button
            onClick={() => {
              setActiveTab('script');
              if (!generatedScript) handleGenerateScript();
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'script' ? 'bg-[#262626] text-[#c5a37f] shadow-xs' : 'text-[#8a8a8a] hover:text-[#f5f5f5]'
            }`}
          >
            Setup Script Generator
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'guide' ? 'bg-[#262626] text-[#c5a37f] shadow-xs' : 'text-[#8a8a8a] hover:text-[#f5f5f5]'
            }`}
          >
            Deployment Guide
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* TAB 1: CONNECTION & STATUS */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (7 Cols): Router Settings Form */}
          <div className="lg:col-span-7 bg-[#141414] rounded-2xl p-6 border border-[#242424] shadow-xs space-y-5">
            <h3 className="text-base font-bold font-serif text-[#f5f5f5] tracking-wide border-b border-[#242424] pb-3">
              Router API Credentials
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#a0a0a0] mb-1.5">Router Name</label>
                <input
                  type="text"
                  value={formData.routerName}
                  onChange={(e) => setFormData({ ...formData, routerName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-xs text-[#f0f0f0] focus:bg-[#202020] focus:border-[#c5a37f] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a0a0a0] mb-1.5">HotSpot Server Name</label>
                <input
                  type="text"
                  value={formData.hotspotName || 'hotspot1'}
                  onChange={(e) => setFormData({ ...formData, hotspotName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-xs text-[#f0f0f0] focus:bg-[#202020] focus:border-[#c5a37f] focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#a0a0a0] mb-1.5">
                  Host / IP Address (or DDNS / VPN IP)
                </label>
                <input
                  type="text"
                  value={formData.host}
                  onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-xs font-mono text-[#c5a37f] focus:bg-[#202020] focus:border-[#c5a37f] focus:outline-hidden"
                  placeholder="192.168.88.1 or router.mydomain.com"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a0a0a0] mb-1.5">API Port</label>
                <input
                  type="number"
                  value={formData.apiPort}
                  onChange={(e) => setFormData({ ...formData, apiPort: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-xs font-mono text-[#f0f0f0] focus:bg-[#202020] focus:border-[#c5a37f] focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#a0a0a0] mb-1.5">API Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-xs text-[#f0f0f0] focus:bg-[#202020] focus:border-[#c5a37f] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a0a0a0] mb-1.5">API Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.encryptedPassword || ''}
                    onChange={(e) => setFormData({ ...formData, encryptedPassword: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-xs font-mono text-[#f0f0f0] focus:bg-[#202020] focus:border-[#c5a37f] focus:outline-hidden pr-16"
                    placeholder="Router admin password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-xs text-[#8a8a8a] hover:text-[#c5a37f] font-semibold px-1 py-0.5"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            </div>

            {/* Test Result Message Box */}
            {testResult && (
              <div className={`p-4 rounded-xl border text-xs space-y-1 ${
                testResult.success ? 'bg-[#132014] text-[#8fa876] border-[#223d24]' : 'bg-[#241414] text-[#c06056] border-[#402020]'
              }`}>
                <div className="flex items-center space-x-2 font-bold">
                  {testResult.success ? <Check className="w-4 h-4 text-[#8fa876]" /> : <AlertCircle className="w-4 h-4 text-[#c06056]" />}
                  <span>{testResult.success ? 'Connection Successful' : 'Connection Notice'}</span>
                </div>
                <p>{testResult.message}</p>
              </div>
            )}

            {/* Buttons Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-[#242424]">
              <button
                id="btn-router-test-connection"
                onClick={handleTest}
                disabled={isTesting}
                className="flex items-center space-x-2 px-4 py-2 bg-[#1a1a1a] hover:bg-[#222222] text-[#e0e0e0] rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-[#c5a37f]' : ''}`} />
                <span>{isTesting ? 'Testing Socket...' : 'Test Connection'}</span>
              </button>

              <button
                id="btn-router-save-settings"
                onClick={() => onSaveSettings(formData)}
                disabled={isSaving}
                className="flex items-center space-x-2 px-5 py-2 bg-[#c5a37f] hover:bg-[#d6b593] text-[#0a0a0a] rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : 'Save Router Settings'}</span>
              </button>
            </div>
          </div>

          {/* Right Column (5 Cols): Live Router Diagnostics Card */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-[#141414] rounded-2xl p-6 border border-[#242424] shadow-xs space-y-4">
              <h3 className="text-base font-bold font-serif text-[#f5f5f5] tracking-wide border-b border-[#242424] pb-3 flex items-center justify-between">
                <span>Live HotSpot Status</span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#8fa876] animate-pulse"></span>
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-[#242424]">
                  <span className="text-[#8a8a8a] flex items-center space-x-2">
                    <Radio className="w-4 h-4 text-[#c5a37f]" />
                    <span>Router Identity:</span>
                  </span>
                  <span className="font-bold text-[#f5f5f5]">{routerSettings.routerIdentity || 'MikroTik-hAP-lite'}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-[#242424]">
                  <span className="text-[#8a8a8a] flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-[#d6a56e]" />
                    <span>System Uptime:</span>
                  </span>
                  <span className="font-bold text-[#f5f5f5]">{routerSettings.uptime || '12h 34m'}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-[#242424]">
                  <span className="text-[#8a8a8a] flex items-center space-x-2">
                    <Users className="w-4 h-4 text-[#8fa876]" />
                    <span>Active HotSpot Users:</span>
                  </span>
                  <span className="font-bold text-[#c5a37f]">{routerSettings.activeUsersCount || 8} Active Devices</span>
                </div>

                <div className="flex justify-between py-2 border-b border-[#242424]">
                  <span className="text-[#8a8a8a] flex items-center space-x-2">
                    <Cpu className="w-4 h-4 text-[#a380b8]" />
                    <span>Enforcement Mode:</span>
                  </span>
                  <span className="font-semibold text-[#d0d0d0]">1 Device per User</span>
                </div>

                <div className="flex justify-between py-2">
                  <span className="text-[#8a8a8a] flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-[#8fa876]" />
                    <span>Walled Garden:</span>
                  </span>
                  <span className="font-semibold text-[#8fa876]">PalPluss + Safaricom M-Pesa Enabled</span>
                </div>
              </div>

              <div className="p-3 bg-[#1c1813] border border-[#382b1d] rounded-xl text-xs text-[#d6a56e]">
                <p className="font-semibold">Vercel Cloud Deployment Note:</p>
                <p className="mt-0.5 text-[#a88255]">
                  When deployed on Vercel, connect your MikroTik hAP lite via a public IP, dynamic DNS (e.g. IP Cloud), or a lightweight VPN tunnel (WireGuard / ZeroTier) so API commands execute in real time.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 2: SETUP SCRIPT GENERATOR */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'script' && (
        <div className="bg-[#141414] rounded-2xl p-6 border border-[#242424] shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#242424] pb-4">
            <div>
              <h3 className="text-lg font-bold font-serif text-[#f5f5f5] tracking-wide">RouterOS Configuration Script Generator</h3>
              <p className="text-xs text-[#8a8a8a] mt-0.5">Generates ready-to-paste MikroTik Hotspot commands for your hAP lite router</p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleGenerateScript}
                className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#222222] text-[#e0e0e0] rounded-xl text-xs font-bold transition-colors"
              >
                Regenerate Script
              </button>

              <button
                onClick={handleCopyScript}
                className="flex items-center space-x-1.5 px-4 py-2 bg-[#c5a37f] hover:bg-[#d6b593] text-[#0a0a0a] rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{isCopied ? 'Copied to Clipboard!' : 'Copy Script'}</span>
              </button>
            </div>
          </div>

          {/* Config Parameters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-[#1a1a1a] border border-[#262626]">
            <div>
              <label className="block text-xs font-bold text-[#a0a0a0] mb-1">RouterOS Version</label>
              <select
                value={rosVersion}
                onChange={(e) => setRosVersion(e.target.value as any)}
                className="w-full px-3 py-1.5 bg-[#141414] border border-[#2a2a2a] rounded-lg text-xs font-semibold text-[#f0f0f0]"
              >
                <option value="v7">RouterOS v7 (Latest)</option>
                <option value="v6">RouterOS v6.4x</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#a0a0a0] mb-1">HotSpot Interface</label>
              <input
                type="text"
                value={hotspotInterface}
                onChange={(e) => setHotspotInterface(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#141414] border border-[#2a2a2a] rounded-lg text-xs font-mono text-[#c5a37f]"
                placeholder="wlan1 or bridge1"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#a0a0a0] mb-1">DNS Hostname</label>
              <input
                type="text"
                value={dnsName}
                onChange={(e) => setDnsName(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#141414] border border-[#2a2a2a] rounded-lg text-xs font-mono text-[#f0f0f0]"
                placeholder="wifi.hotspot"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#a0a0a0] mb-1">Gateway IP</label>
              <input
                type="text"
                value={gatewayIp}
                onChange={(e) => setGatewayIp(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#141414] border border-[#2a2a2a] rounded-lg text-xs font-mono text-[#f0f0f0]"
                placeholder="10.0.0.1"
              />
            </div>
          </div>

          {/* Script Output Terminal Box */}
          <div className="relative rounded-2xl bg-[#0d0d0d] border border-[#242424] p-5 font-mono text-xs text-[#d0d0d0] overflow-x-auto max-h-[500px]">
            <pre className="whitespace-pre">{generatedScript || 'Click "Regenerate Script" to load configuration...'}</pre>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 3: DEPLOYMENT GUIDE */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'guide' && (
        <div className="bg-[#141414] rounded-2xl p-6 border border-[#242424] shadow-xs space-y-6">
          <h3 className="text-lg font-bold font-serif text-[#f5f5f5] tracking-wide border-b border-[#242424] pb-3">
            Step-by-Step MikroTik hAP lite Setup Guide
          </h3>

          <div className="space-y-4 text-xs text-[#d0d0d0]">
            <div className="p-4 rounded-xl bg-[#1a1a1a] border border-[#262626] space-y-2">
              <h4 className="font-bold text-[#f5f5f5] flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-[#c5a37f] text-[#0a0a0a] flex items-center justify-center text-xs font-bold">1</span>
                <span>Open WinBox or SSH into your MikroTik hAP lite</span>
              </h4>
              <p className="text-xs text-[#8a8a8a] ml-7">
                Connect your PC via Ethernet cable to port 2 on the hAP lite and open WinBox. Connect using MAC Address or IP <code className="bg-[#242424] text-[#c5a37f] px-1 rounded font-mono">192.168.88.1</code>.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#1a1a1a] border border-[#262626] space-y-2">
              <h4 className="font-bold text-[#f5f5f5] flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-[#c5a37f] text-[#0a0a0a] flex items-center justify-center text-xs font-bold">2</span>
                <span>Open New Terminal and Paste the Setup Script</span>
              </h4>
              <p className="text-xs text-[#8a8a8a] ml-7">
                In WinBox, click <strong>"New Terminal"</strong> from the left menu. Paste the script generated in Tab 2 and press Enter. This will create the HotSpot profile, user profile with 1-device limit, and Walled Garden rules.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#1a1a1a] border border-[#262626] space-y-2">
              <h4 className="font-bold text-[#f5f5f5] flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-[#c5a37f] text-[#0a0a0a] flex items-center justify-center text-xs font-bold">3</span>
                <span>Redirect login.html to Hosted Captive Portal</span>
              </h4>
              <p className="text-xs text-[#8a8a8a] ml-7">
                In WinBox, go to <strong>Files &gt; hotspot &gt; login.html</strong>. Edit the file to include the HTML redirect meta tag to your hosted Vercel portal URL: <code className="bg-[#242424] text-[#c5a37f] px-1 rounded font-mono">https://billing-system.vercel.app/portal</code>.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#1a1a1a] border border-[#262626] space-y-2">
              <h4 className="font-bold text-[#f5f5f5] flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-[#c5a37f] text-[#0a0a0a] flex items-center justify-center text-xs font-bold">4</span>
                <span>Connect Phone to WiFi and Verify Flow</span>
              </h4>
              <p className="text-xs text-[#8a8a8a] ml-7">
                Connect your smartphone to the WiFi SSID. The captive portal will pop up automatically. Choose a package, enter your M-Pesa number, pay, and get instant verified high-speed internet!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
