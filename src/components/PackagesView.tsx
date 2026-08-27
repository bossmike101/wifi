import React, { useState } from 'react';
import { 
  Package as PackageIcon, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Smartphone,
  Tag,
  X
} from 'lucide-react';
import { Package } from '../types.js';

interface PackagesViewProps {
  packages: Package[];
  onAddPackage: () => void;
  onEditPackage: (pkg: Package) => void;
  onDeletePackage: (pkg: Package) => void;
  onToggleActive: (pkg: Package) => void;
}

export const PackagesView: React.FC<PackagesViewProps> = ({
  packages,
  onAddPackage,
  onEditPackage,
  onDeletePackage,
  onToggleActive,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

  const filteredPackages = packages.filter(pkg => {
    const matchesSearch = pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          pkg.priceKes.toString().includes(searchTerm);
    if (filterActive === 'active') return matchesSearch && pkg.isActive;
    if (filterActive === 'inactive') return matchesSearch && !pkg.isActive;
    return matchesSearch;
  });

  const formatDuration = (mins: number) => {
    if (mins % 1440 === 0) return `${mins / 1440} Day${mins > 1440 ? 's' : ''}`;
    if (mins % 60 === 0) return `${mins / 60} Hour${mins > 60 ? 's' : ''}`;
    return `${mins} Minutes`;
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto bg-[#0a0a0a] text-[#e0e0e0] min-h-[calc(100vh-80px)]">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#141414] p-5 rounded-2xl border border-[#242424] shadow-xs">
        <div>
          <h2 className="text-xl font-bold font-serif text-[#f5f5f5] tracking-wide">WiFi HotSpot Packages</h2>
          <p className="text-xs text-[#8a8a8a] mt-0.5">Manage pricing, duration limits, and captive portal availability</p>
        </div>

        <button
          id="btn-packages-page-add"
          onClick={onAddPackage}
          className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-[#c5a37f] hover:bg-[#d6b593] text-[#0a0a0a] rounded-xl text-xs font-bold shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Package</span>
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#141414] p-4 rounded-xl border border-[#242424] flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-[#c5a37f]/15 text-[#c5a37f] flex items-center justify-center">
            <PackageIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#8a8a8a] uppercase tracking-wider">Total Packages</p>
            <p className="text-lg font-bold font-serif text-[#f5f5f5]">{packages.length}</p>
          </div>
        </div>

        <div className="bg-[#141414] p-4 rounded-xl border border-[#242424] flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-[#132014] text-[#8fa876] flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#8a8a8a] uppercase tracking-wider">Active on Portal</p>
            <p className="text-lg font-bold font-serif text-[#8fa876]">{packages.filter(p => p.isActive).length}</p>
          </div>
        </div>

        <div className="bg-[#141414] p-4 rounded-xl border border-[#242424] flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-[#c5a37f]/15 text-[#c5a37f] flex items-center justify-center">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#8a8a8a] uppercase tracking-wider">Starting Price</p>
            <p className="text-lg font-bold font-serif text-[#c5a37f]">
              KSh {packages.length > 0 ? Math.min(...packages.map(p => p.priceKes)) : 0}
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#707070] absolute left-3.5 top-3" />
          <input
            id="input-search-packages"
            type="text"
            placeholder="Search packages by name or price..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#141414] border border-[#262626] rounded-xl text-xs text-[#e0e0e0] focus:outline-hidden focus:border-[#c5a37f]"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            onClick={() => setFilterActive('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterActive === 'all'
                ? 'bg-[#c5a37f] text-[#0a0a0a]'
                : 'bg-[#141414] text-[#8a8a8a] border border-[#242424] hover:text-[#e0e0e0]'
            }`}
          >
            All ({packages.length})
          </button>
          <button
            onClick={() => setFilterActive('active')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterActive === 'active'
                ? 'bg-[#c5a37f] text-[#0a0a0a]'
                : 'bg-[#141414] text-[#8a8a8a] border border-[#242424] hover:text-[#e0e0e0]'
            }`}
          >
            Active ({packages.filter(p => p.isActive).length})
          </button>
          <button
            onClick={() => setFilterActive('inactive')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterActive === 'inactive'
                ? 'bg-[#c5a37f] text-[#0a0a0a]'
                : 'bg-[#141414] text-[#8a8a8a] border border-[#242424] hover:text-[#e0e0e0]'
            }`}
          >
            Inactive ({packages.filter(p => !p.isActive).length})
          </button>
        </div>
      </div>

      {/* Packages Table Container */}
      <div className="bg-[#141414] rounded-2xl border border-[#242424] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#181818] border-b border-[#242424] text-[11px] font-bold text-[#8a8a8a] uppercase tracking-wider">
                <th className="py-4 px-6">Package Name</th>
                <th className="py-4 px-6">Price (KES)</th>
                <th className="py-4 px-6">Duration</th>
                <th className="py-4 px-6">Device Limit</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f1f1f] text-xs text-[#d0d0d0]">
              {filteredPackages.length > 0 ? (
                filteredPackages.map((pkg) => (
                  <tr key={pkg.id} id={`package-row-${pkg.id}`} className="hover:bg-[#1a1a1a] transition-colors">
                    <td className="py-4 px-6 font-bold text-[#f5f5f5]">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-[#c5a37f]/15 text-[#c5a37f] flex items-center justify-center shrink-0">
                          <PackageIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-xs text-[#f5f5f5]">{pkg.name}</p>
                          <p className="text-[10px] text-[#707070]">ID: {pkg.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-bold text-sm text-[#c5a37f]">
                      KSh {Number(pkg.priceKes).toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-[#a0a0a0]">
                      <div className="flex items-center space-x-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#707070]" />
                        <span>{formatDuration(pkg.durationMinutes)}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-[#a0a0a0]">
                      <div className="flex items-center space-x-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-[#707070]" />
                        <span>{pkg.deviceLimit || 1} Device</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() => onToggleActive(pkg)}
                        className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${
                          pkg.isActive
                            ? 'bg-[#132014] text-[#8fa876] border-[#223d24] hover:bg-[#192b1a]'
                            : 'bg-[#241414] text-[#c06056] border-[#402020] hover:bg-[#301a1a]'
                        }`}
                        title="Click to toggle status"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${pkg.isActive ? 'bg-[#8fa876]' : 'bg-[#c06056]'}`}></span>
                        <span>{pkg.isActive ? 'Active' : 'Inactive'}</span>
                      </button>
                    </td>
                    <td className="py-4 px-6 text-right space-x-3">
                      <button
                        id={`btn-edit-package-page-${pkg.id}`}
                        onClick={() => onEditPackage(pkg)}
                        className="p-1.5 text-[#c5a37f] hover:text-[#d6b593] hover:bg-[#202020] rounded-lg font-semibold text-xs transition-colors inline-flex items-center space-x-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        id={`btn-delete-package-page-${pkg.id}`}
                        onClick={() => onDeletePackage(pkg)}
                        className="p-1.5 text-[#c06056] hover:text-[#d67066] hover:bg-[#201515] rounded-lg font-semibold text-xs transition-colors inline-flex items-center space-x-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#606060] text-xs">
                    No packages match your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
