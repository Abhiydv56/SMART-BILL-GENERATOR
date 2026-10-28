import React, { useState } from 'react';
import { X, UserCheck, Plus, Check } from 'lucide-react';
import { Cashier, Language, Department } from '../types';
import { translations, getTranslation } from '../utils/translations';

interface CashierModalProps {
  isOpen: boolean;
  onClose: () => void;
  cashiers: Cashier[];
  activeCashier: Cashier;
  departments: Department[];
  onSelectCashier: (cashier: Cashier) => void;
  onAddCashier: (cashier: Cashier) => void;
  lang: Language;
}

export const CashierModal: React.FC<CashierModalProps> = ({
  isOpen,
  onClose,
  cashiers,
  activeCashier,
  departments,
  onSelectCashier,
  onAddCashier,
  lang,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCounter, setNewCounter] = useState('');
  const [newDeptId, setNewDeptId] = useState(departments[0]?.id || '');
  const [newPin, setNewPin] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;
  const t = (key: keyof typeof translations['en']) => getTranslation(lang, key);

  const handleCreateCashier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newCounter.trim()) {
      setError('Please provide cashier name and counter name.');
      return;
    }

    const created: Cashier = {
      id: `cash-${Date.now()}`,
      name: newName.trim(),
      counterName: newCounter.trim(),
      role: 'cashier',
      pin: newPin.trim() || '1234',
      departmentId: newDeptId,
    };

    onAddCashier(created);
    onSelectCashier(created);
    setShowAddForm(false);
    setNewName('');
    setNewCounter('');
    setNewPin('');
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-neutral-200 overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-semibold text-neutral-900">
              {t('selectCashier')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          {!showAddForm ? (
            <div>
              <div className="space-y-2 mb-6 max-h-72 overflow-y-auto pr-1">
                {cashiers.map(c => {
                  const isActive = c.id === activeCashier.id;
                  const dept = departments.find(d => d.id === c.departmentId);

                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onSelectCashier(c);
                        onClose();
                      }}
                      className={`w-full flex items-center justify-between p-3.5 rounded-lg border text-left transition-all ${
                        isActive
                          ? 'border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-600'
                          : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                            isActive ? 'bg-emerald-600 text-white' : 'bg-neutral-200 text-neutral-700'
                          }`}
                        >
                          {c.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
                            <span>{c.name}</span>
                            <span className="text-xs font-normal text-neutral-500">
                              · {c.counterName}
                            </span>
                          </div>
                          <div className="text-xs text-neutral-500">
                            {dept ? dept.name : 'General Retail'}
                          </div>
                        </div>
                      </div>
                      {isActive && (
                        <div className="flex items-center gap-1 text-emerald-700 text-xs font-medium">
                          <Check className="w-4 h-4" />
                          <span>Active</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold rounded-lg border border-dashed border-neutral-300 text-neutral-700 hover:bg-neutral-50 hover:border-neutral-400 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>{t('addCashier')}</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleCreateCashier} className="space-y-4">
              {error && (
                <div className="p-2.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  {t('cashierNameLabel')} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Suresh Patel"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  {t('counterNameLabel')} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Counter 05 (Kids Section)"
                  value={newCounter}
                  onChange={e => setNewCounter(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    {t('department')}
                  </label>
                  <select
                    value={newDeptId}
                    onChange={e => setNewDeptId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    4-Digit PIN (Optional)
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    placeholder="1234"
                    value={newPin}
                    onChange={e => setNewPin(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition-colors"
                >
                  Save & Switch
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
