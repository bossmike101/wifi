import React from 'react';
import { 
  Wifi, 
  LayoutDashboard, 
  Package as PackageIcon, 
  Palette, 
  Network, 
  Settings, 
  LogOut,
  X,
  ExternalLink
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onLogout: () => void;
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
  onOpenPortal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  onLogout,
  isOpenMobile,
  setIsOpenMobile,
  onOpenPortal
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'packages', label: 'Packages', icon: PackageIcon },
    { id: 'portal', label: 'Portal Designer', icon: Palette },
    { id: 'router', label: 'MikroTik / Router', icon: Network },
    { id: 'settings', label: 'Payment & Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div 
          id="sidebar-mobile-backdrop"
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-xs"
          onClick={() => setIsOpenMobile(false)}
        />
      )}

      {/* Main Sidebar */}
      <aside 
        id="admin-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0c0c0c] text-[#d0d0d0] border-r border-[#242424] flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-6 py-6 border-b border-[#242424]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#c5a37f] flex items-center justify-center text-[#0a0a0a] shadow-md shadow-[#c5a37f]/20">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold font-serif text-[#f5f5f5] leading-tight tracking-wide">WiFi Billing</h1>
              <p className="text-[11px] text-[#8a8a8a] font-medium tracking-wider uppercase">Admin Portal</p>
            </div>
          </div>

          <button
            id="close-sidebar-mobile-btn"
            onClick={() => setIsOpenMobile(false)}
            className="lg:hidden p-1.5 rounded-lg text-[#8a8a8a] hover:text-white hover:bg-[#1a1a1a]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                onClick={() => {
                  setCurrentTab(item.id);
                  setIsOpenMobile(false);
                }}
                className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#c5a37f]/15 text-[#c5a37f] border border-[#c5a37f]/30 font-semibold shadow-xs'
                    : 'text-[#9e9e9e] hover:text-[#e0e0e0] hover:bg-[#181818] border border-transparent'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#c5a37f]' : 'text-[#707070]'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Quick Customer Portal Preview Action */}
        <div className="px-4 py-3.5 mx-4 mb-3 rounded-xl bg-[#141414] border border-[#262626] text-xs">
          <div className="flex items-center justify-between text-[#a0a0a0] mb-2 font-medium">
            <span>Customer View</span>
            <span className="inline-block w-2 h-2 rounded-full bg-[#8fa876] shadow-xs shadow-[#8fa876]/40"></span>
          </div>
          <button
            id="btn-quick-customer-portal"
            onClick={onOpenPortal}
            className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 bg-[#c5a37f]/10 hover:bg-[#c5a37f]/20 text-[#c5a37f] border border-[#c5a37f]/30 rounded-lg text-xs font-semibold transition-colors"
          >
            <span>Open Captive Portal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Logout Bottom Link */}
        <div className="p-4 border-t border-[#242424]">
          <button
            id="btn-sidebar-logout"
            onClick={onLogout}
            className="w-full flex items-center space-x-3.5 px-4 py-3 rounded-xl text-sm font-medium text-[#9e9e9e] hover:text-[#c06056] hover:bg-[#201515] transition-colors"
          >
            <LogOut className="w-5 h-5 text-[#707070] group-hover:text-[#c06056]" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};
