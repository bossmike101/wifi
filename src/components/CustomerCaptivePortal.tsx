import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  ChevronRight, 
  Smartphone, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowLeft, 
  Sparkles,
  Lock,
  Globe
} from 'lucide-react';
import { Package, PortalSettings, Payment, WifiSession } from '../types.js';

interface CustomerCaptivePortalProps {
  portalSettings: PortalSettings;
  packages: Package[];
  onBackToAdmin?: () => void;
}

export const CustomerCaptivePortal: React.FC<CustomerCaptivePortalProps> = ({
  portalSettings,
  packages,
  onBackToAdmin
}) => {
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [isInitiating, setIsInitiating] = useState(false);
  const [activePayment, setActivePayment] = useState<Payment | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [activeSession, setActiveSession] = useState<WifiSession | null>(null);
  const [paymentError, setPaymentError] = useState('');

  // Auto-select first package if none selected
  useEffect(() => {
    if (packages.length > 0 && !selectedPackage) {
      setSelectedPackage(packages[0]);
    }
  }, [packages, selectedPackage]);

  // Phone number validator
  const validatePhone = (phone: string) => {
    const cleaned = phone.replace(/[^0-9]/g, '');
    if ((cleaned.startsWith('07') || cleaned.startsWith('01')) && cleaned.length === 10) return true;
    if ((cleaned.startsWith('2547') || cleaned.startsWith('2541')) && cleaned.length === 12) return true;
    if ((cleaned.startsWith('7') || cleaned.startsWith('1')) && cleaned.length === 9) return true;
    return false;
  };

  const handleInitiatePayment = async () => {
    if (!selectedPackage) return;
    setPhoneError('');
    setPaymentError('');

    if (!validatePhone(phoneNumber)) {
      setPhoneError('Please enter a valid Kenyan phone number (e.g. 0712345678 or 0112345678)');
      return;
    }

    setIsInitiating(true);
    try {
      const res = await fetch('/api/payments/stk-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: selectedPackage.id,
          phoneNumber: phoneNumber
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        let errStr = 'Failed to initiate STK push.';
        if (typeof data.message === 'string') {
          errStr = data.message;
        } else if (typeof data.error === 'string') {
          errStr = data.error;
        } else if (data.error && typeof data.error.message === 'string') {
          errStr = data.error.message;
        }
        throw new Error(errStr);
      }

      setActivePayment(data.payment);
      setIsPolling(true);
    } catch (err: any) {
      setPaymentError(typeof err?.message === 'string' ? err.message : 'Unable to complete payment request. Please try again.');
    } finally {
      setIsInitiating(false);
    }
  };

  // Poll for payment completion
  useEffect(() => {
    if (!isPolling || !activePayment) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/status/${activePayment.merchantReference}`);
        if (res.ok) {
          const updated: Payment = await res.json();
          if (updated.status === 'successful') {
            clearInterval(interval);
            setIsPolling(false);
            setActivePayment(updated);

            // Fetch session created
            const sessRes = await fetch('/api/sessions?status=active');
            if (sessRes.ok) {
              const sessions: WifiSession[] = await sessRes.json();
              const mySess = sessions.find(s => s.paymentId === updated.id) || sessions[0];
              setActiveSession(mySess);
            }
          } else if (updated.status === 'failed' || updated.status === 'cancelled') {
            clearInterval(interval);
            setIsPolling(false);
            setPaymentError(`Payment ${updated.status}. Please try again.`);
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [isPolling, activePayment]);

  return (
    <div 
      className="min-h-screen flex flex-col justify-between p-4 sm:p-6 bg-[#0a0a0a] text-[#e0e0e0]"
      style={{ backgroundColor: portalSettings.backgroundColor || '#0A0A0A' }}
    >
      {/* Top Navigation Bar */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between py-2">
        {onBackToAdmin && (
          <button
            onClick={onBackToAdmin}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#141414] border border-[#242424] text-[#e0e0e0] rounded-xl text-xs font-semibold hover:bg-[#1f1f1f] shadow-2xs transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#c5a37f]" />
            <span>Back to Admin</span>
          </button>
        )}
        <div className="flex items-center space-x-1.5 text-xs text-[#8a8a8a] font-medium ml-auto">
          <Lock className="w-3.5 h-3.5 text-[#8fa876]" />
          <span>Secure HotSpot</span>
        </div>
      </div>

      {/* Main Container Card */}
      <div className="w-full max-w-md mx-auto bg-[#141414] rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#242424] my-auto">
        {/* State 1: Active Connected Session (SUCCESS) */}
        {activeSession ? (
          <div className="text-center space-y-5 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#132014] text-[#8fa876] flex items-center justify-center border border-[#223d24] shadow-md shadow-[#8fa876]/10">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <span className="px-3 py-1 bg-[#132014] text-[#8fa876] border border-[#223d24] rounded-full text-[11px] font-bold uppercase tracking-wider">
                WiFi Activated
              </span>
              <h2 className="text-2xl font-bold font-serif text-[#f5f5f5] mt-2">You're Connected!</h2>
              <p className="text-xs text-[#8a8a8a] mt-1">High-speed internet access is now active on your device.</p>
            </div>

            {/* Session Details Box */}
            <div className="p-4 rounded-2xl bg-[#1a1a1a] border border-[#262626] text-left space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#8a8a8a]">Package:</span>
                <span className="font-bold text-[#f5f5f5]">{activeSession.packageName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8a8a8a]">WiFi Username:</span>
                <span className="font-mono font-semibold text-[#c5a37f]">{activeSession.mikrotikUsername}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8a8a8a]">Device Limit:</span>
                <span className="font-semibold text-[#d0d0d0]">1 Device (Active)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8a8a8a]">Expires At:</span>
                <span className="font-bold text-[#c5a37f]">
                  {new Date(activeSession.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            <button
              onClick={() => window.open('https://google.com', '_blank')}
              className="w-full py-3.5 bg-[#c5a37f] hover:bg-[#d6b593] text-[#0a0a0a] font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center space-x-2"
            >
              <Globe className="w-4 h-4" />
              <span>Start Browsing Internet</span>
            </button>

            <button
              onClick={() => {
                setActiveSession(null);
                setActivePayment(null);
              }}
              className="text-xs font-semibold text-[#707070] hover:text-[#c5a37f]"
            >
              Purchase another package
            </button>
          </div>
        ) : activePayment && isPolling ? (
          /* State 2: STK Push Sent - Waiting for M-Pesa PIN */
          <div className="text-center space-y-5 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#c5a37f]/15 text-[#c5a37f] flex items-center justify-center border border-[#c5a37f]/30">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>

            <div>
              <span className="px-3 py-1 bg-[#282015] text-[#d6a56e] border border-[#48341e] rounded-full text-[11px] font-bold uppercase tracking-wider">
                STK Push Prompt Sent
              </span>
              <h2 className="text-2xl font-bold font-serif text-[#f5f5f5] mt-2">Enter M-Pesa PIN</h2>
              <p className="text-xs text-[#8a8a8a] mt-2">
                A payment prompt of <strong className="text-[#c5a37f]">KSh {activePayment.amountKes}</strong> has been sent to phone <strong className="text-[#f5f5f5]">{activePayment.phoneNumber}</strong>.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#1c1813] border border-[#382b1d] text-left text-xs text-[#d6a56e] space-y-2">
              <p className="font-bold flex items-center space-x-1.5">
                <span>1. Check your phone screen for the prompt.</span>
              </p>
              <p className="font-bold flex items-center space-x-1.5">
                <span>2. Enter your 4-digit M-Pesa PIN and press OK.</span>
              </p>
              <p className="text-[#a88255]">Internet access will automatically activate the moment payment confirms.</p>
            </div>

            <button
              onClick={() => {
                setIsPolling(false);
                setActivePayment(null);
              }}
              className="text-xs font-semibold text-[#707070] hover:text-[#c5a37f]"
            >
              Cancel Payment & Return
            </button>
          </div>
        ) : (
          /* State 3: Package Selection & Phone Input */
          <div className="space-y-6">
            {/* Header Brand */}
            <div className="text-center">
              {portalSettings.logoUrl ? (
                <img
                  src={portalSettings.logoUrl}
                  alt="Brand Logo"
                  className="w-16 h-16 mx-auto object-contain rounded-2xl mb-3 shadow-xs"
                />
              ) : (
                <div
                  className="w-16 h-16 mx-auto rounded-2xl text-[#0a0a0a] flex items-center justify-center shadow-lg mb-3"
                  style={{ backgroundColor: portalSettings.primaryColor || '#c5a37f' }}
                >
                  <Wifi className="w-9 h-9" />
                </div>
              )}

              <h1 className="text-2xl font-bold font-serif text-[#f5f5f5] tracking-wide">
                {portalSettings.welcomeTitle || 'Welcome to Our WiFi'}
              </h1>
              <p className="text-xs text-[#8a8a8a] mt-1">
                {portalSettings.welcomeMessage || 'Choose a package to get started'}
              </p>
            </div>

            {/* Error Banner if any */}
            {paymentError && (
              <div className="p-3 bg-[#241414] border border-[#402020] rounded-xl text-xs text-[#c06056] flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{paymentError}</span>
              </div>
            )}

            {/* Packages Selector */}
            <div className="space-y-2.5">
              <label className="block text-[11px] font-bold text-[#8a8a8a] uppercase tracking-wider">
                Select WiFi Package:
              </label>
              {packages.map((pkg) => {
                const isSelected = selectedPackage?.id === pkg.id;
                return (
                  <div
                    key={pkg.id}
                    onClick={() => setSelectedPackage(pkg)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-[#c5a37f] bg-[#c5a37f]/10 shadow-xs'
                        : 'border-[#242424] bg-[#141414] hover:border-[#383838]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-semibold text-xs text-[#f5f5f5]">{pkg.name}</p>
                        <span className="font-bold text-xs text-[#c5a37f]">
                          KSh {pkg.priceKes}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#707070] mt-0.5">
                        {pkg.deviceLimit || 1} Device • {pkg.durationMinutes >= 60 ? `${pkg.durationMinutes / 60} Hour${pkg.durationMinutes > 60 ? 's' : ''}` : `${pkg.durationMinutes} Mins`}
                      </p>
                    </div>

                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                        isSelected ? 'bg-[#c5a37f] text-[#0a0a0a]' : 'bg-[#242424] text-[#707070]'
                      }`}
                    >
                      {isSelected ? <CheckCircle2 className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Phone Number Input */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-[#8a8a8a] uppercase tracking-wider">
                M-Pesa Phone Number:
              </label>
              <div className="relative">
                <Smartphone className="w-4 h-4 text-[#707070] absolute left-3.5 top-3" />
                <input
                  type="tel"
                  id="customer-phone-input"
                  placeholder="07XXXXXXXX or 01XXXXXXXX"
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    if (phoneError) setPhoneError('');
                  }}
                  className={`w-full pl-10 pr-4 py-2.5 bg-[#1a1a1a] border rounded-xl text-xs text-[#f0f0f0] font-medium focus:bg-[#202020] focus:outline-hidden ${
                    phoneError ? 'border-[#c06056] focus:border-[#c06056]' : 'border-[#2a2a2a] focus:border-[#c5a37f]'
                  }`}
                />
              </div>
              {phoneError ? (
                <p className="text-xs text-[#c06056] font-medium">{phoneError}</p>
              ) : (
                <p className="text-[11px] text-[#707070]">Accepts 07..., 01..., or 2547... format</p>
              )}
            </div>

            {/* Pay Button */}
            <button
              id="customer-pay-now-btn"
              onClick={handleInitiatePayment}
              disabled={isInitiating || !selectedPackage}
              className="w-full py-3.5 text-[#0a0a0a] font-bold rounded-2xl text-xs shadow-lg hover:bg-[#d6b593] active:scale-[0.99] transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              style={{ backgroundColor: portalSettings.buttonColor || '#c5a37f' }}
            >
              {isInitiating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Initiating STK Push...</span>
                </>
              ) : (
                <>
                  <span>Pay KSh {selectedPackage?.priceKes || 0} via M-Pesa</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Footer text */}
      <div className="w-full max-w-md mx-auto text-center py-4 text-xs text-[#707070]">
        <p>{portalSettings.footerText || 'Powered by MikroTik WiFi Billing System • Fast & Reliable Internet'}</p>
      </div>
    </div>
  );
};
