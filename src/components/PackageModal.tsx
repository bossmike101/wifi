import React, { useState, useEffect } from 'react';
import { X, Package as PackageIcon, Clock, DollarSign, Smartphone, Check } from 'lucide-react';
import { Package } from '../types.js';

interface PackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pkgData: Partial<Package>) => Promise<void>;
  packageToEdit?: Package | null;
  isSaving: boolean;
}

export const PackageModal: React.FC<PackageModalProps> = ({
  isOpen,
  onClose,
  onSave,
  packageToEdit,
  isSaving
}) => {
  const [name, setName] = useState('');
  const [priceKes, setPriceKes] = useState('');
  const [durationValue, setDurationValue] = useState('1');
  const [durationUnit, setDurationUnit] = useState<'minutes' | 'hours' | 'days'>('hours');
  const [deviceLimit, setDeviceLimit] = useState('1');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (packageToEdit) {
      setName(packageToEdit.name);
      setPriceKes(packageToEdit.priceKes.toString());
      setDeviceLimit((packageToEdit.deviceLimit || 1).toString());
      setIsActive(packageToEdit.isActive);

      const mins = packageToEdit.durationMinutes;
      if (mins % 1440 === 0) {
        setDurationValue((mins / 1440).toString());
        setDurationUnit('days');
      } else if (mins % 60 === 0) {
        setDurationValue((mins / 60).toString());
        setDurationUnit('hours');
      } else {
        setDurationValue(mins.toString());
        setDurationUnit('minutes');
      }
    } else {
      setName('');
      setPriceKes('');
      setDurationValue('1');
      setDurationUnit('hours');
      setDeviceLimit('1');
      setIsActive(true);
      setError('');
    }
  }, [packageToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const price = Number(priceKes);
    const durVal = Number(durationValue);
    const devLim = Number(deviceLimit);

    if (!name.trim()) {
      setError('Package name is required.');
      return;
    }
    if (isNaN(price) || price <= 0) {
      setError('Price must be a valid number greater than 0.');
      return;
    }
    if (isNaN(durVal) || durVal <= 0) {
      setError('Duration must be greater than 0.');
      return;
    }
    if (isNaN(devLim) || devLim <= 0) {
      setError('Device limit must be at least 1.');
      return;
    }

    let totalMinutes = durVal;
    if (durationUnit === 'hours') totalMinutes = durVal * 60;
    if (durationUnit === 'days') totalMinutes = durVal * 1440;

    await onSave({
      name: name.trim(),
      priceKes: price,
      durationMinutes: totalMinutes,
      deviceLimit: devLim,
      isActive
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs text-[#e0e0e0]">
      <div className="bg-[#141414] rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-[#242424] animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-4 border-b border-[#242424]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#c5a37f]/15 text-[#c5a37f] flex items-center justify-center">
              <PackageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-serif text-[#f5f5f5] tracking-wide">
                {packageToEdit ? 'Edit WiFi Package' : 'Create New WiFi Package'}
              </h3>
              <p className="text-xs text-[#8a8a8a]">Configure HotSpot plan details & pricing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#707070] hover:text-[#f5f5f5] hover:bg-[#202020] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-[#241414] border border-[#402020] rounded-xl text-xs font-semibold text-[#c06056]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#a0a0a0] mb-1.5">Package Name</label>
            <input
              type="text"
              id="input-package-name"
              placeholder="e.g. 1 Hour, 3 Hours, 24 Hours Day Pass"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-xs text-[#f0f0f0] focus:bg-[#202020] focus:border-[#c5a37f] focus:outline-hidden"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#a0a0a0] mb-1.5">Price in KES</label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs font-bold text-[#c5a37f]">KSh</span>
              <input
                type="number"
                id="input-package-price"
                placeholder="e.g. 10, 20, 50"
                value={priceKes}
                onChange={(e) => setPriceKes(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-xs text-[#f0f0f0] font-semibold focus:bg-[#202020] focus:border-[#c5a37f] focus:outline-hidden"
                required
                min="1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#a0a0a0] mb-1.5">Duration</label>
              <input
                type="number"
                id="input-package-duration"
                value={durationValue}
                onChange={(e) => setDurationValue(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-xs text-[#f0f0f0] font-semibold focus:bg-[#202020] focus:border-[#c5a37f] focus:outline-hidden"
                required
                min="1"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#a0a0a0] mb-1.5">Unit</label>
              <select
                id="select-package-unit"
                value={durationUnit}
                onChange={(e) => setDurationUnit(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-xs text-[#f0f0f0] font-semibold focus:bg-[#202020] focus:border-[#c5a37f] focus:outline-hidden"
              >
                <option value="minutes" className="bg-[#141414]">Minutes</option>
                <option value="hours" className="bg-[#141414]">Hours</option>
                <option value="days" className="bg-[#141414]">Days</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#a0a0a0] mb-1.5">Device Limit</label>
              <input
                type="number"
                id="input-package-devices"
                value={deviceLimit}
                onChange={(e) => setDeviceLimit(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-xs text-[#f0f0f0] font-semibold focus:bg-[#202020] focus:border-[#c5a37f] focus:outline-hidden"
                min="1"
                max="5"
              />
              <p className="text-[10px] text-[#707070] mt-0.5">Default: 1 device strictly bound</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#a0a0a0] mb-1.5">Availability</label>
              <div className="flex items-center space-x-3 pt-2">
                <input
                  type="checkbox"
                  id="checkbox-package-active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-[#c5a37f] accent-[#c5a37f] rounded-md border-[#333333]"
                />
                <label htmlFor="checkbox-package-active" className="text-xs font-semibold text-[#e0e0e0] cursor-pointer">
                  Show on Captive Portal
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#242424]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#222222] text-[#e0e0e0] font-semibold rounded-xl text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="btn-save-package-modal"
              disabled={isSaving}
              className="px-5 py-2 bg-[#c5a37f] hover:bg-[#d6b593] text-[#0a0a0a] font-bold rounded-xl text-xs shadow-md transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : packageToEdit ? 'Save Changes' : 'Create Package'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
