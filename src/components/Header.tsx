import React, { useState, useRef, useEffect } from 'react';
import { Menu, ChevronDown, User, Settings, Network, ExternalLink, LogOut, RefreshCw } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle: string;
  routerStatus: 'connected' | 'disconnected' | 'checking';
  onToggleMobileSidebar: () => void;
  onNavigate: (tab: string) => void;
  onLogout: () => void;
  onOpenPortal: () => void;
  onRefreshStats?: () => void;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  routerStatus,
  onToggleMobileSidebar,
  onNavigate,
  onLogout,
  onOpenPortal,
  onRefreshStats,
  isRefreshing = false
}) => {
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowAdminMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-[#0c0c0c]/95 backdrop-blur-md border-b border-[#242424] sticky top-0 z-30 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left Side: Hamburger & Titles */}
        <div className="flex items-center space-x-4">
          <button
            id="header-hamburger-btn"
            onClick={onToggleMobileSidebar}
            className="p-2 -ml-2 rounded-lg text-[#8a8a8a] hover:text-[#f0f0f0] hover:bg-[#1a1a1a] lg:hidden transition-colors"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold font-serif text-[#f5f5f5] tracking-wide leading-none">{title}</h1>
            <p className="text-xs text-[#8a8a8a] mt-1 font-normal tracking-wide">{subtitle}</p>
          </div>
        </div>

        {/* Right Side: Router Status & Admin Profile Dropdown */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Refresh Action if available */}
          {onRefreshStats && (
            <button
              id="header-refresh-btn"
              onClick={onRefreshStats}
              disabled={isRefreshing}
              className="p-2 text-[#8a8a8a] hover:text-[#f0f0f0] hover:bg-[#1a1a1a] rounded-lg transition-colors hidden sm:flex items-center justify-center"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#c5a37f]' : ''}`} />
            </button>
          )}

          {/* Router Connection Status Pill */}
          <div
            id="header-router-status-badge"
            onClick={() => onNavigate('router')}
            className={`cursor-pointer flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              routerStatus === 'connected'
                ? 'bg-[#132014] text-[#8fa876] border-[#223d24] hover:bg-[#192b1b]'
                : routerStatus === 'checking'
                ? 'bg-[#241c10] text-[#c59b6d] border-[#42321c] hover:bg-[#302515]'
                : 'bg-[#241414] text-[#c06056] border-[#402020] hover:bg-[#301a1a]'
            }`}
            title="Click to view MikroTik Router settings"
          >
            <span className={`w-2 h-2 rounded-full ${
              routerStatus === 'connected'
                ? 'bg-[#8fa876] ring-2 ring-[#8fa876]/30 animate-pulse'
                : routerStatus === 'checking'
                ? 'bg-[#c59b6d] animate-spin'
                : 'bg-[#c06056]'
            }`} />
            <span className="font-medium tracking-wide">
              {routerStatus === 'connected' ? 'Router: Connected' : routerStatus === 'checking' ? 'Router: Checking...' : 'Router: Disconnected'}
            </span>
          </div>

          {/* Admin Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              id="header-admin-profile-btn"
              onClick={() => setShowAdminMenu(!showAdminMenu)}
              className="flex items-center space-x-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-full sm:rounded-xl bg-[#141414] border border-[#262626] hover:border-[#383838] text-[#e0e0e0] font-medium text-sm transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-[#c5a37f] text-[#0a0a0a] flex items-center justify-center font-bold text-xs shadow-xs">
                <User className="w-4 h-4" />
              </div>
              <span className="hidden sm:inline-block font-medium text-xs text-[#d0d0d0]">Admin</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#8a8a8a]" />
            </button>

            {/* Dropdown Menu */}
            {showAdminMenu && (
              <div
                id="header-admin-menu-popup"
                className="absolute right-0 mt-2 w-56 bg-[#141414] rounded-2xl shadow-2xl border border-[#2a2a2a] py-2 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs"
              >
                <div className="px-4 py-2.5 border-b border-[#242424]">
                  <p className="text-[10px] font-semibold text-[#8a8a8a] uppercase tracking-wider">Signed in as</p>
                  <p className="text-xs font-bold text-[#f0f0f0] truncate mt-0.5">admin@wifibilling.co.ke</p>
                </div>

                <div className="py-1">
                  <button
                    id="admin-menu-settings"
                    onClick={() => {
                      onNavigate('settings');
                      setShowAdminMenu(false);
                    }}
                    className="w-full flex items-center space-x-2.5 px-4 py-2.5 text-xs text-[#d0d0d0] hover:bg-[#1c1c1c] hover:text-[#c5a37f] transition-colors"
                  >
                    <Settings className="w-4 h-4 text-[#8a8a8a]" />
                    <span>Payment & Settings</span>
                  </button>

                  <button
                    id="admin-menu-router"
                    onClick={() => {
                      onNavigate('router');
                      setShowAdminMenu(false);
                    }}
                    className="w-full flex items-center space-x-2.5 px-4 py-2.5 text-xs text-[#d0d0d0] hover:bg-[#1c1c1c] hover:text-[#c5a37f] transition-colors"
                  >
                    <Network className="w-4 h-4 text-[#8a8a8a]" />
                    <span>MikroTik Router</span>
                  </button>

                  <button
                    id="admin-menu-portal"
                    onClick={() => {
                      onOpenPortal();
                      setShowAdminMenu(false);
                    }}
                    className="w-full flex items-center space-x-2.5 px-4 py-2.5 text-xs text-[#d0d0d0] hover:bg-[#1c1c1c] hover:text-[#c5a37f] transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 text-[#8a8a8a]" />
                    <span>Customer Captive Portal</span>
                  </button>
                </div>

                <div className="border-t border-[#242424] pt-1">
                  <button
                    id="admin-menu-logout"
                    onClick={() => {
                      setShowAdminMenu(false);
                      onLogout();
                    }}
                    className="w-full flex items-center space-x-2.5 px-4 py-2.5 text-xs text-[#c06056] hover:bg-[#201515] transition-colors"
                  >
                    <LogOut className="w-4 h-4 text-[#c06056]" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
