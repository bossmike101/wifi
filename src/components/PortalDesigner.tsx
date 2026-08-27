import React, { useState } from 'react';
import { 
  Palette, 
  Smartphone, 
  Monitor, 
  Save, 
  Send, 
  Check, 
  Wifi, 
  ChevronRight, 
  Upload, 
  Sparkles,
  Type,
  Layout,
  Sliders,
  ShieldCheck
} from 'lucide-react';
import { PortalSettings, Package } from '../types.js';

interface PortalDesignerProps {
  settings: PortalSettings;
  packages: Package[];
  onSaveSettings: (settings: Partial<PortalSettings>) => Promise<void>;
  onPublishPortal: () => Promise<void>;
  isSaving: boolean;
  isPublishing: boolean;
}

export const PortalDesigner: React.FC<PortalDesignerProps> = ({
  settings,
  packages,
  onSaveSettings,
  onPublishPortal,
  isSaving,
  isPublishing
}) => {
  const [formData, setFormData] = useState<PortalSettings>({ ...settings });
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');
  const [activeTab, setActiveTab] = useState<'branding' | 'colors' | 'templates' | 'text'>('branding');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleColorChange = (field: keyof PortalSettings, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    await onSaveSettings(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto bg-[#0a0a0a] text-[#e0e0e0] min-h-[calc(100vh-80px)]">
      {/* Top Banner with Save & Publish */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#141414] p-5 rounded-2xl border border-[#242424] shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold font-serif text-[#f5f5f5] tracking-wide">Captive Portal Designer</h2>
            {formData.isPublished && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#132014] text-[#8fa876] border border-[#223d24]">
                Published & Live
              </span>
            )}
          </div>
          <p className="text-xs text-[#8a8a8a] mt-0.5">Customize the branding, colors, and package presentation for your WiFi customers</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            id="btn-portal-save-changes"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center space-x-2 px-4 py-2.5 bg-[#1a1a1a] border border-[#2e2e2e] hover:bg-[#222222] text-[#e0e0e0] rounded-xl text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4 text-[#8fa876]" />
                <span className="text-[#8fa876]">Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-[#8a8a8a]" />
                <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
              </>
            )}
          </button>

          <button
            id="btn-portal-publish"
            onClick={onPublishPortal}
            disabled={isPublishing}
            className="flex items-center space-x-2 px-5 py-2.5 bg-[#c5a37f] hover:bg-[#d6b593] text-[#0a0a0a] rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{isPublishing ? 'Publishing...' : 'Publish to Customers'}</span>
          </button>
        </div>
      </div>

      {/* Main Studio Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 Cols): Customization Controls */}
        <div className="lg:col-span-5 space-y-5">
          {/* Section Tabs */}
          <div className="flex rounded-xl bg-[#141414] p-1 border border-[#242424] shadow-xs">
            <button
              onClick={() => setActiveTab('branding')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'branding' ? 'bg-[#c5a37f] text-[#0a0a0a] shadow-xs' : 'text-[#8a8a8a] hover:text-[#f5f5f5]'
              }`}
            >
              Branding
            </button>
            <button
              onClick={() => setActiveTab('colors')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'colors' ? 'bg-[#c5a37f] text-[#0a0a0a] shadow-xs' : 'text-[#8a8a8a] hover:text-[#f5f5f5]'
              }`}
            >
              Colors
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'templates' ? 'bg-[#c5a37f] text-[#0a0a0a] shadow-xs' : 'text-[#8a8a8a] hover:text-[#f5f5f5]'
              }`}
            >
              Templates
            </button>
            <button
              onClick={() => setActiveTab('text')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'text' ? 'bg-[#c5a37f] text-[#0a0a0a] shadow-xs' : 'text-[#8a8a8a] hover:text-[#f5f5f5]'
              }`}
            >
              Content
            </button>
          </div>

          {/* Tab 1: Branding */}
          {activeTab === 'branding' && (
            <div className="bg-[#141414] rounded-2xl p-6 border border-[#242424] shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-[#c5a37f] uppercase tracking-wider">Business Branding</h3>

              <div>
                <label className="block text-xs font-semibold text-[#a0a0a0] mb-1.5">Business / Hotspot Name</label>
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-xs text-[#f0f0f0] focus:bg-[#202020] focus:border-[#c5a37f] focus:outline-hidden"
                  placeholder="e.g. WiFi Billing HotSpot"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a0a0a0] mb-1.5">Logo URL (or Image Address)</label>
                <input
                  type="text"
                  value={formData.logoUrl || ''}
                  onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-xs text-[#f0f0f0] focus:bg-[#202020] focus:border-[#c5a37f] focus:outline-hidden"
                  placeholder="https://example.com/logo.png (leave empty for WiFi icon)"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a0a0a0] mb-1.5">Background Image URL (Optional)</label>
                <input
                  type="text"
                  value={formData.backgroundImageUrl || ''}
                  onChange={(e) => setFormData({ ...formData, backgroundImageUrl: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-xs text-[#f0f0f0] focus:bg-[#202020] focus:border-[#c5a37f] focus:outline-hidden"
                  placeholder="https://images.unsplash.com/... (optional)"
                />
              </div>
            </div>
          )}

          {/* Tab 2: Colors */}
          {activeTab === 'colors' && (
            <div className="bg-[#141414] rounded-2xl p-6 border border-[#242424] shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-[#c5a37f] uppercase tracking-wider">Color Palette</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#a0a0a0] mb-1.5">Primary Accent</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={formData.primaryColor || '#c5a37f'}
                      onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                      className="w-9 h-9 rounded-lg border border-[#333333] cursor-pointer p-0.5 bg-[#1a1a1a]"
                    />
                    <input
                      type="text"
                      value={formData.primaryColor || '#c5a37f'}
                      onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-mono bg-[#1a1a1a] text-[#f0f0f0] border border-[#2a2a2a] rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#a0a0a0] mb-1.5">Button Color</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={formData.buttonColor || '#c5a37f'}
                      onChange={(e) => handleColorChange('buttonColor', e.target.value)}
                      className="w-9 h-9 rounded-lg border border-[#333333] cursor-pointer p-0.5 bg-[#1a1a1a]"
                    />
                    <input
                      type="text"
                      value={formData.buttonColor || '#c5a37f'}
                      onChange={(e) => handleColorChange('buttonColor', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-mono bg-[#1a1a1a] text-[#f0f0f0] border border-[#2a2a2a] rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#a0a0a0] mb-1.5">Background</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={formData.backgroundColor || '#0a0a0a'}
                      onChange={(e) => handleColorChange('backgroundColor', e.target.value)}
                      className="w-9 h-9 rounded-lg border border-[#333333] cursor-pointer p-0.5 bg-[#1a1a1a]"
                    />
                    <input
                      type="text"
                      value={formData.backgroundColor || '#0a0a0a'}
                      onChange={(e) => handleColorChange('backgroundColor', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-mono bg-[#1a1a1a] text-[#f0f0f0] border border-[#2a2a2a] rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#a0a0a0] mb-1.5">Card Color</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={formData.cardColor || '#141414'}
                      onChange={(e) => handleColorChange('cardColor', e.target.value)}
                      className="w-9 h-9 rounded-lg border border-[#333333] cursor-pointer p-0.5 bg-[#1a1a1a]"
                    />
                    <input
                      type="text"
                      value={formData.cardColor || '#141414'}
                      onChange={(e) => handleColorChange('cardColor', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-mono bg-[#1a1a1a] text-[#f0f0f0] border border-[#2a2a2a] rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="pt-3 border-t border-[#242424]">
                <p className="text-xs text-[#8a8a8a] font-semibold mb-2">Recommended Presets</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      primaryColor: '#c5a37f',
                      buttonColor: '#c5a37f',
                      backgroundColor: '#0a0a0a',
                      cardColor: '#141414',
                      textColor: '#e0e0e0',
                      successColor: '#8fa876'
                    })}
                    className="px-3 py-1.5 bg-[#c5a37f]/15 border border-[#c5a37f]/40 text-[#c5a37f] rounded-lg text-xs font-medium"
                  >
                    Artistic Gold (Theme)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      primaryColor: '#2563EB',
                      buttonColor: '#2563EB',
                      backgroundColor: '#0f172a',
                      cardColor: '#1e293b',
                      textColor: '#f8fafc',
                      successColor: '#10b981'
                    })}
                    className="px-3 py-1.5 bg-[#1e293b] border border-[#334155] text-[#93c5fd] rounded-lg text-xs font-medium"
                  >
                    Midnight Blue
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      primaryColor: '#8fa876',
                      buttonColor: '#8fa876',
                      backgroundColor: '#0d130e',
                      cardColor: '#132014',
                      textColor: '#e2ece0',
                      successColor: '#8fa876'
                    })}
                    className="px-3 py-1.5 bg-[#132014] border border-[#223d24] text-[#8fa876] rounded-lg text-xs font-medium"
                  >
                    Forest Sage
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Templates */}
          {activeTab === 'templates' && (
            <div className="bg-[#141414] rounded-2xl p-6 border border-[#242424] shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-[#c5a37f] uppercase tracking-wider">Layout Template</h3>

              <div className="space-y-3">
                {[
                  { id: 'clean', title: 'Clean (Default)', desc: 'Spacious cards with clean typography and subtle borders.' },
                  { id: 'modern', title: 'Modern Compact', desc: 'Dense, mobile-optimized cards with high information density.' },
                  { id: 'minimal', title: 'Minimalist', desc: 'Ultra simple flat aesthetic with prominent call-to-action buttons.' },
                ].map((tpl) => (
                  <div
                    key={tpl.id}
                    onClick={() => setFormData({ ...formData, portalTemplate: tpl.id as any })}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      formData.portalTemplate === tpl.id
                        ? 'border-[#c5a37f] bg-[#c5a37f]/10'
                        : 'border-[#242424] hover:border-[#383838] bg-[#141414]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-[#f5f5f5] text-xs">{tpl.title}</p>
                      {formData.portalTemplate === tpl.id && (
                        <div className="w-5 h-5 rounded-full bg-[#c5a37f] text-[#0a0a0a] flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-[#8a8a8a] mt-1">{tpl.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 4: Content & Text */}
          {activeTab === 'text' && (
            <div className="bg-[#141414] rounded-2xl p-6 border border-[#242424] shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-[#c5a37f] uppercase tracking-wider">Headings & Copy</h3>

              <div>
                <label className="block text-xs font-semibold text-[#a0a0a0] mb-1.5">Welcome Title</label>
                <input
                  type="text"
                  value={formData.welcomeTitle}
                  onChange={(e) => setFormData({ ...formData, welcomeTitle: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-xs text-[#f0f0f0] focus:bg-[#202020] focus:border-[#c5a37f] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a0a0a0] mb-1.5">Welcome Subtitle</label>
                <input
                  type="text"
                  value={formData.welcomeMessage}
                  onChange={(e) => setFormData({ ...formData, welcomeMessage: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-xs text-[#f0f0f0] focus:bg-[#202020] focus:border-[#c5a37f] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a0a0a0] mb-1.5">Footer Text</label>
                <input
                  type="text"
                  value={formData.footerText || ''}
                  onChange={(e) => setFormData({ ...formData, footerText: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-xs text-[#f0f0f0] focus:bg-[#202020] focus:border-[#c5a37f] focus:outline-hidden"
                  placeholder="Powered by MikroTik WiFi Billing"
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Column (7 Cols): Live Preview */}
        <div className="lg:col-span-7 bg-[#141414] rounded-2xl border border-[#242424] p-6 flex flex-col items-center justify-center">
          {/* Device Frame Viewport Controls */}
          <div className="flex items-center justify-between w-full mb-4 px-2">
            <span className="text-xs font-bold text-[#8a8a8a] uppercase tracking-wider flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-[#8fa876] animate-pulse"></span>
              <span>Live Interactive Preview</span>
            </span>

            <div className="flex items-center bg-[#1a1a1a] p-1 rounded-xl border border-[#2e2e2e] shadow-2xs">
              <button
                onClick={() => setPreviewDevice('mobile')}
                className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  previewDevice === 'mobile' ? 'bg-[#c5a37f] text-[#0a0a0a] shadow-xs' : 'text-[#8a8a8a] hover:text-[#f5f5f5]'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mobile</span>
              </button>
              <button
                onClick={() => setPreviewDevice('desktop')}
                className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  previewDevice === 'desktop' ? 'bg-[#c5a37f] text-[#0a0a0a] shadow-xs' : 'text-[#8a8a8a] hover:text-[#f5f5f5]'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Desktop</span>
              </button>
            </div>
          </div>

          {/* Device Mockup Wrapper */}
          <div
            className={`transition-all duration-300 w-full overflow-hidden shadow-2xl rounded-3xl border-8 ${
              previewDevice === 'mobile'
                ? 'max-w-sm border-[#242424] bg-[#0a0a0a]'
                : 'max-w-xl border-[#242424] bg-[#0a0a0a]'
            }`}
          >
            {/* Mobile Top Bar */}
            {previewDevice === 'mobile' && (
              <div className="bg-[#181818] text-[#8a8a8a] px-5 py-2 flex items-center justify-between text-[11px] font-medium border-b border-[#242424]">
                <span>9:41</span>
                <div className="flex items-center space-x-1.5">
                  <Wifi className="w-3 h-3 text-[#c5a37f]" />
                  <span>5G</span>
                  <span className="w-4 h-2 bg-[#8a8a8a] rounded-xs"></span>
                </div>
              </div>
            )}

            {/* Captive Portal Customer Canvas */}
            <div
              className="p-6 text-center min-h-[460px] flex flex-col justify-between"
              style={{
                backgroundColor: formData.backgroundColor || '#0A0A0A',
                color: formData.textColor || '#E0E0E0'
              }}
            >
              <div>
                {/* Logo / WiFi Icon */}
                {formData.logoUrl ? (
                  <img
                    src={formData.logoUrl}
                    alt="Logo"
                    className="w-14 h-14 mx-auto object-contain rounded-xl mb-3"
                  />
                ) : (
                  <div
                    className="w-14 h-14 mx-auto rounded-2xl text-[#0a0a0a] flex items-center justify-center shadow-lg mb-3"
                    style={{ backgroundColor: formData.primaryColor || '#c5a37f' }}
                  >
                    <Wifi className="w-8 h-8" />
                  </div>
                )}

                <h2 className="text-xl font-bold font-serif tracking-wide" style={{ color: formData.textColor || '#E0E0E0' }}>
                  {formData.welcomeTitle || 'Welcome to Our WiFi'}
                </h2>
                <p className="text-xs text-[#8a8a8a] mt-1 mb-5">
                  {formData.welcomeMessage || 'Choose a package to get started'}
                </p>

                {/* Packages List in Preview */}
                <div className="space-y-2.5 text-left">
                  {packages.map((pkg) => (
                    <div
                      key={pkg.id}
                      className="p-3.5 rounded-xl border flex items-center justify-between shadow-xs transition-all hover:scale-[1.01]"
                      style={{
                        backgroundColor: formData.cardColor || '#141414',
                        borderColor: '#262626'
                      }}
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-semibold text-xs" style={{ color: formData.textColor || '#E0E0E0' }}>
                            {pkg.name}
                          </p>
                          <span
                            className="font-bold text-xs"
                            style={{ color: formData.primaryColor || '#c5a37f' }}
                          >
                            KSh {pkg.priceKes}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#707070] mt-0.5">
                          {pkg.deviceLimit || 1} Device • {pkg.durationMinutes >= 60 ? `${pkg.durationMinutes / 60} Hours` : `${pkg.durationMinutes} Mins`}
                        </p>
                      </div>

                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[#0a0a0a] text-xs font-bold"
                        style={{ backgroundColor: formData.buttonColor || '#c5a37f' }}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-[#242424] text-[11px] text-[#707070]">
                <p>{formData.footerText || 'Powered by MikroTik WiFi Billing System'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
