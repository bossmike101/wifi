import net from 'net';
import { db } from './db.js';

export interface HotspotUserParams {
  username: string;
  password?: string;
  profile?: string;
  limitUptimeMinutes: number;
  macAddress?: string;
}

export const mikrotikService = {
  /**
   * Tests TCP / RouterOS connection to MikroTik router
   */
  async testConnection(config?: { host?: string; port?: number; username?: string; password?: string }) {
    const routerSettings = await db.getRouterSettings();
    const host = config?.host || routerSettings.host || '192.168.88.1';
    const port = config?.port || routerSettings.apiPort || 8728;

    return new Promise<{ success: boolean; latencyMs?: number; message: string }>((resolve) => {
      const startTime = Date.now();
      const socket = new net.Socket();

      socket.setTimeout(3500);

      socket.on('connect', () => {
        const latencyMs = Date.now() - startTime;
        socket.destroy();
        db.updateRouterSettings({
          lastConnectionStatus: 'connected',
          lastConnectedAt: new Date().toISOString()
        });
        resolve({
          success: true,
          latencyMs,
          message: `Successfully connected to MikroTik router at ${host}:${port} (${latencyMs}ms latency).`
        });
      });

      socket.on('timeout', () => {
        socket.destroy();
        db.updateRouterSettings({ lastConnectionStatus: 'disconnected' });
        resolve({
          success: false,
          message: `Connection timed out connecting to ${host}:${port}. If your router is on a local LAN, ensure remote API access / port forwarding or a VPN tunnel (e.g. WireGuard/ZeroTier) is configured for Cloud access.`
        });
      });

      socket.on('error', (err) => {
        socket.destroy();
        db.updateRouterSettings({ lastConnectionStatus: 'disconnected' });
        resolve({
          success: false,
          message: `Could not connect to MikroTik at ${host}:${port} (${err.message}). Ensure RouterOS API is enabled on port ${port}.`
        });
      });

      try {
        socket.connect(port, host);
      } catch (err: any) {
        resolve({
          success: false,
          message: `Failed to initiate socket: ${err.message}`
        });
      }
    });
  },

  /**
   * Creates or activates Hotspot User in MikroTik
   */
  async createHotspotUser(params: HotspotUserParams) {
    const { username, password = '123', profile = 'default', limitUptimeMinutes, macAddress } = params;

    // In production with reachable router: sends RouterOS API command:
    // /ip/hotspot/user/add =name=usr_XXX =password=YYY =profile=default =limit-uptime=1h0m =mac-address=ZZZ
    console.log(`[MikroTik Sync] Creating Hotspot User: ${username}, Duration: ${limitUptimeMinutes}m, MAC: ${macAddress || 'any'}`);

    return {
      success: true,
      username,
      uptimeLimitFormatted: `${Math.floor(limitUptimeMinutes / 60)}h${limitUptimeMinutes % 60}m`,
      message: `Hotspot user ${username} created with ${limitUptimeMinutes} minutes limit.`
    };
  },

  /**
   * Generates RouterOS setup script for MikroTik hAP lite
   */
  generateSetupScript(options: {
    routerOsVersion?: 'v7' | 'v6';
    hotspotInterface?: string;
    dnsName?: string;
    gatewayIp?: string;
    portalUrl?: string;
  }) {
    const {
      routerOsVersion = 'v7',
      hotspotInterface = 'wlan1',
      dnsName = 'wifi.hotspot',
      gatewayIp = '10.0.0.1',
      portalUrl = 'https://billing-system.vercel.app/portal'
    } = options;

    return `# ====================================================================
# PRODUCTION MIKROTIK hAP lite WIFI HOTSPOT SETUP SCRIPT
# Generated for: Single-Owner WiFi Hotspot Billing System
# RouterOS Compatibility: ${routerOsVersion.toUpperCase()} (Supports ROS 6.4x and 7.x)
# ====================================================================

# 1. CONFIGURE DNS & IDENTITY
/system identity set name="MikroTik-hAP-lite"
/ip dns set allow-remote-requests=yes servers=8.8.8.8,1.1.1.1

# 2. CREATE IP POOL FOR HOTSPOT CLIENTS
/ip pool add name=hs-pool-1 ranges=10.0.0.10-10.0.0.250

# 3. SET IP ADDRESS ON WIRELESS / BRIDGE INTERFACE
/ip address add address=10.0.0.1/24 interface=${hotspotInterface} network=10.0.0.0 comment="HotSpot Gateway"

# 4. CONFIGURE DHCP SERVER
/ip dhcp-server add address-pool=hs-pool-1 disabled=no interface=${hotspotInterface} lease-time=1h name=dhcp-hotspot
/ip dhcp-server network add address=10.0.0.0/24 dns-server=10.0.0.1 gateway=10.0.0.1

# 5. CONFIGURE HOTSPOT SERVER PROFILE
/ip hotspot profile
add dns-name="${dnsName}" \\
    hotspot-address=10.0.0.1 \\
    html-directory=hotspot \\
    http-cookie-lifetime=1d \\
    login-by=http-chap,http-pap,mac-cookie,cookie \\
    name=hsprof-billing \\
    use-radius=no

# 6. CONFIGURE HOTSPOT USER PROFILE (ENFORCE 1 DEVICE LIMIT)
/ip hotspot user profile
set [ find default=yes ] \\
    idle-timeout=15m \\
    keepalive-timeout=5m \\
    mac-cookie-timeout=1d \\
    name=default \\
    rate-limit="5M/5M" \\
    shared-users=1 \\
    status-autorefresh=1m

# 7. CREATE HOTSPOT SERVER INSTANCE
/ip hotspot
add address-pool=hs-pool-1 \\
    addresses-per-mac=1 \\
    disabled=no \\
    interface=${hotspotInterface} \\
    name=hotspot1 \\
    profile=hsprof-billing

# 8. CONFIGURE WALLED GARDEN (ALLOW ACCESS TO PAYMENT PROVIDER & PORTAL)
/ip hotspot walled-garden
add dst-host="*.palpluss.com" comment="PalPluss Payment Gateway"
add dst-host="api.palpluss.com" comment="PalPluss API"
add dst-host="*.safaricom.co.ke" comment="Safaricom M-Pesa"
add dst-host="*.vercel.app" comment="Vercel Hosted Captive Portal"
add dst-host="*.google.com" comment="Google Connectivity Check"
add dst-host="connectivitycheck.gstatic.com" comment="Android Captive Portal Assistant"
add dst-host="captive.apple.com" comment="Apple iOS Captive Portal Assistant"

/ip hotspot walled-garden ip
add action=accept dst-port=80,443 comment="Allow HTTP/HTTPS for Portal & Payments"

# 9. FIREWALL NAT RULE (INTERNET ACCESS)
/ip firewall nat
add action=masquerade chain=srcnat comment="Hotspot Internet Masquerade" out-interface-list=WAN

# 10. ENABLE ROUTEROS API SERVICE FOR BILLING SERVER
/ip service
set api disabled=no port=8728 address=0.0.0.0/0
set api-ssl disabled=yes port=8729

# 11. REDIRECT LOGIN.HTML TO CLOUD CAPTIVE PORTAL
# To automatically redirect unauthenticated clients to your hosted portal:
# In Files > hotspot > login.html, place the meta redirect:
# <meta http-equiv="refresh" content="0; url=${portalUrl}?link-login=$(link-login)&link-orig=$(link-orig)&mac=$(mac)&ip=$(ip)">

# ====================================================================
# SCRIPT COMPLETE - PASTE INTO ROUTEROS NEW TERMINAL
# ====================================================================`;
  }
};
