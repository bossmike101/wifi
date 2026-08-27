import React, { useState } from 'react';
import { Wifi, Lock, User, Eye, EyeOff, ArrowRight, ShieldCheck, ExternalLink } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: any) => void;
  onOpenPortal: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, onOpenPortal }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid credentials.');
      }

      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col justify-between p-4 sm:p-6 text-[#e0e0e0]">
      {/* Top mini header */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between py-2">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-[#c5a37f] flex items-center justify-center text-[#0a0a0a] shadow-md">
            <Wifi className="w-5 h-5" />
          </div>
          <span className="font-bold font-serif text-sm tracking-wide text-[#f5f5f5]">WiFi Billing System</span>
        </div>

        <button
          onClick={onOpenPortal}
          className="flex items-center space-x-1 px-3 py-1.5 bg-[#141414] hover:bg-[#1f1f1f] text-[#c5a37f] border border-[#242424] rounded-lg text-xs font-semibold transition-colors"
        >
          <span>Customer Portal</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md mx-auto bg-[#141414] rounded-3xl p-8 shadow-2xl border border-[#242424] my-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#c5a37f] text-[#0a0a0a] flex items-center justify-center shadow-lg mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold font-serif text-[#f5f5f5] tracking-wide">Admin Sign In</h2>
          <p className="text-xs text-[#8a8a8a] mt-1">Single-Owner MikroTik WiFi HotSpot Billing Management</p>
        </div>

        {error && (
          <div className="mb-5 p-3 bg-[#241414] border border-[#402020] rounded-xl text-xs font-semibold text-[#c06056]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#a0a0a0] mb-1.5">Username or Email</label>
            <div className="relative">
              <User className="w-4 h-4 text-[#707070] absolute left-3.5 top-3" />
              <input
                type="text"
                id="login-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-xs text-[#f0f0f0] focus:outline-hidden focus:border-[#c5a37f]"
                placeholder="admin"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#a0a0a0] mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#707070] absolute left-3.5 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                id="login-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-11 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-xs text-[#f0f0f0] focus:outline-hidden focus:border-[#c5a37f] font-mono"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-[#707070] hover:text-[#c5a37f]"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Demo helper */}
          <div className="p-3 rounded-xl bg-[#1c1813] border border-[#382b1d] text-xs text-[#d6a56e]">
            <p className="font-semibold">Default Owner Credentials:</p>
            <p className="font-mono text-[11px] text-[#c5a37f] mt-0.5">Username: admin • Password: admin123</p>
          </div>

          <button
            type="submit"
            id="btn-admin-signin"
            disabled={isLoading}
            className="w-full py-3.5 bg-[#c5a37f] hover:bg-[#d6b593] text-[#0a0a0a] font-bold rounded-xl text-xs shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50 mt-2"
          >
            <span>{isLoading ? 'Signing In...' : 'Sign In to Dashboard'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Footer */}
      <div className="w-full max-w-md mx-auto text-center py-4 text-xs text-[#707070]">
        <p>MikroTik hAP lite HotSpot Billing System • Single Business Owner</p>
      </div>
    </div>
  );
};
