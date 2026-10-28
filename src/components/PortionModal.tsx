import React, { useState, useEffect } from 'react';
import {
  X,
  Scale,
  IndianRupee,
  Plus,
  Check,
  Calculator,
  Tag,
  Package,
} from 'lucide-react';
import { Product, CartItem, GSTRate, Language } from '../types';
import { formatINR, calculateGSTFromInclusive, formatQuantity } from '../utils/formatters';
import { translations, getTranslation } from '../utils/translations';

interface PortionModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null; // null if adding a brand-new loose item
  onAddToCartWithPortion: (product: Product, quantity: number, customName?: string, customUnitPrice?: number) => void;
  lang: Language;
}

export const PortionModal: React.FC<PortionModalProps> = ({
  isOpen,
  onClose,
  product,
  onAddToCartWithPortion,
  lang,
}) => {
  const t = (key: keyof typeof translations['en']) => getTranslation(lang, key);

  // Tab: 'weight' (fraction) or 'amount' (rupees)
  const [calculationMode, setCalculationMode] = useState<'weight' | 'amount'>('weight');

  // If loose custom item
  const [looseName, setLooseName] = useState('खुला सामान (Loose Item)');
  const [loosePrice, setLoosePrice] = useState('50');
  const [looseUnit, setLooseUnit] = useState<Product['unit']>('Kg');
  const [looseGst, setLooseGst] = useState<GSTRate>(0);

  // Weight mode inputs
  const [weightQty, setWeightQty] = useState<string>('0.25'); // default 250g
  const [weightUnitType, setWeightUnitType] = useState<'kg' | 'gram'>('kg');

  // Amount mode inputs
  const [targetAmount, setTargetAmount] = useState<string>('20');

  // Reset or initialize when modal opens
  useEffect(() => {
    if (product) {
      // Default to 0.25 (250g) for Kg/Ltr items, or 0.5
      if (product.unit === 'Kg' || product.unit === 'Ltr' || product.unit === 'Meter') {
        setWeightQty('0.25');
      } else {
        setWeightQty('1');
      }
      setTargetAmount(String(Math.round(product.price * 0.25) || 20));
    } else {
      setLooseName(lang === 'hi' ? 'खुला सामान' : 'Loose Item');
      setLoosePrice('60');
      setWeightQty('0.5');
      setTargetAmount('30');
    }
  }, [product, isOpen, lang]);

  if (!isOpen) return null;

  // Active unit price
  const activeUnitPrice = product ? product.price : parseFloat(loosePrice) || 0;
  const activeUnit = product ? product.unit : looseUnit;

  // Calculate final quantity based on mode
  let finalQty = 0;
  let finalPrice = 0;

  if (calculationMode === 'weight') {
    const rawVal = parseFloat(weightQty) || 0;
    if (weightUnitType === 'gram' && (activeUnit === 'Kg' || activeUnit === 'Gram')) {
      finalQty = rawVal / 1000;
    } else {
      finalQty = rawVal;
    }
    finalPrice = finalQty * activeUnitPrice;
  } else {
    // Amount mode: Qty = Target Amount / Unit Price
    const rupees = parseFloat(targetAmount) || 0;
    if (activeUnitPrice > 0) {
      finalQty = Math.round((rupees / activeUnitPrice + Number.EPSILON) * 1000) / 1000;
      finalPrice = rupees;
    }
  }

  // Quick weight presets (in Kg or fractions)
  const weightPresets = [
    { label: t('pao'), value: 0.25, grams: 250 },
    { label: t('adhaKilo'), value: 0.5, grams: 500 },
    { label: t('paunKilo'), value: 0.75, grams: 750 },
    { label: '100g (100 ग्राम)', value: 0.1, grams: 100 },
    { label: '1.0 Kg', value: 1.0, grams: 1000 },
    { label: t('derhKilo'), value: 1.5, grams: 1500 },
    { label: '2.5 Kg', value: 2.5, grams: 2500 },
  ];

  // Quick Rupee presets
  const rupeePresets = [10, 20, 30, 50, 100, 200, 500];

  const handleConfirm = () => {
    if (finalQty <= 0) return;

    if (product) {
      onAddToCartWithPortion(product, finalQty);
    } else {
      // Build custom loose product
      const numPrice = parseFloat(loosePrice) || 50;
      const customProd: Product = {
        id: `loose-${Date.now()}`,
        name: looseName.trim() || 'Loose Item',
        category: 'Loose Goods',
        price: numPrice,
        gstRate: looseGst,
        stock: 9999, // loose bulk inventory
        minStockAlert: 10,
        barcode: `LOOSE-${Date.now().toString().slice(-6)}`,
        sku: `LSE-${Date.now().toString().slice(-4)}`,
        unit: looseUnit,
      };
      onAddToCartWithPortion(customProd, finalQty);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-neutral-200 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="text-sm font-bold text-neutral-900">
                {product ? `${t('portionWeight')}: ${product.name}` : t('addCustomItem')}
              </h3>
              <p className="text-[11px] text-neutral-500">
                {product
                  ? `Rate: ₹${product.price} / ${product.unit} (GST ${product.gstRate}%)`
                  : 'Sell loose groceries, vegetables, or partial fractions by weight or rupee budget'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-neutral-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          
          {/* If creating a new loose item, show name, rate & unit inputs */}
          {!product && (
            <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  {t('looseItemName')} *
                </label>
                <input
                  type="text"
                  value={looseName}
                  onChange={e => setLooseName(e.target.value)}
                  placeholder="e.g. Loose Sugar, Dal, Besan, Fresh Veggies"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    {t('ratePerUnit')} *
                  </label>
                  <input
                    type="number"
                    value={loosePrice}
                    onChange={e => setLoosePrice(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    {t('unit')}
                  </label>
                  <select
                    value={looseUnit}
                    onChange={e => setLooseUnit(e.target.value as Product['unit'])}
                    className="w-full px-2 py-1.5 text-xs bg-white border border-neutral-300 rounded-md focus:outline-none"
                  >
                    <option value="Kg">Kg</option>
                    <option value="Gram">Gram</option>
                    <option value="Ltr">Ltr</option>
                    <option value="Meter">Meter</option>
                    <option value="Pcs">Pcs</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    GST Rate
                  </label>
                  <select
                    value={looseGst}
                    onChange={e => setLooseGst(parseInt(e.target.value, 10) as GSTRate)}
                    className="w-full px-2 py-1.5 text-xs bg-white border border-neutral-300 rounded-md focus:outline-none"
                  >
                    <option value={0}>0%</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Mode Selector Tabs: By Weight vs By Rupees */}
          <div>
            <div className="flex bg-neutral-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setCalculationMode('weight')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  calculationMode === 'weight'
                    ? 'bg-white text-neutral-900 shadow-2xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                <span>{t('byWeight')}</span>
              </button>

              <button
                type="button"
                onClick={() => setCalculationMode('amount')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  calculationMode === 'amount'
                    ? 'bg-white text-neutral-900 shadow-2xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <IndianRupee className="w-3.5 h-3.5" />
                <span>{t('byAmount')}</span>
              </button>
            </div>
          </div>

          {/* MODE 1: BY WEIGHT / FRACTIONS */}
          {calculationMode === 'weight' && (
            <div className="space-y-4">
              <div>
                <span className="block text-xs font-semibold text-neutral-700 mb-2">
                  {t('quickFractions')} (Quick Tap):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {weightPresets.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setWeightQty(String(preset.value));
                        setWeightUnitType('kg');
                      }}
                      className={`p-2 rounded-lg border text-xs text-left transition-all ${
                        parseFloat(weightQty) === preset.value && weightUnitType === 'kg'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold ring-1 ring-emerald-600'
                          : 'border-neutral-200 hover:border-neutral-300 text-neutral-800'
                      }`}
                    >
                      <div className="font-semibold">{preset.label}</div>
                      <div className="text-[10px] text-neutral-500 tabular-nums">
                        {formatINR(preset.value * activeUnitPrice)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Weight / Quantity input */}
              <div className="pt-2 border-t border-neutral-100">
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  {t('customQuantity')}:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={weightQty}
                    onChange={e => setWeightQty(e.target.value)}
                    placeholder="e.g. 0.350"
                    className="flex-1 px-3 py-2 text-sm bg-neutral-50 border border-neutral-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                  />
                  <div className="flex bg-neutral-100 p-0.5 rounded-lg border border-neutral-200">
                    <button
                      type="button"
                      onClick={() => setWeightUnitType('kg')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md ${
                        weightUnitType === 'kg' ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-600'
                      }`}
                    >
                      {activeUnit}
                    </button>
                    {(activeUnit === 'Kg' || activeUnit === 'Gram') && (
                      <button
                        type="button"
                        onClick={() => {
                          setWeightUnitType('gram');
                          if (weightUnitType === 'kg') {
                            setWeightQty(String((parseFloat(weightQty) || 0.25) * 1000));
                          }
                        }}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md ${
                          weightUnitType === 'gram' ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-600'
                        }`}
                      >
                        Grams (ग्राम)
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MODE 2: BY RUPEES (Amount -> Qty) */}
          {calculationMode === 'amount' && (
            <div className="space-y-4">
              <div>
                <span className="block text-xs font-semibold text-neutral-700 mb-2">
                  {t('enterAmountPrompt')}
                </span>
                <div className="flex flex-wrap gap-2 mb-3">
                  {rupeePresets.map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTargetAmount(String(amt))}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-bold tabular-nums transition-all ${
                        targetAmount === String(amt)
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-600'
                          : 'border-neutral-200 hover:border-neutral-300 text-neutral-800'
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <IndianRupee className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                  <input
                    type="number"
                    min="1"
                    value={targetAmount}
                    onChange={e => setTargetAmount(e.target.value)}
                    placeholder="Enter customer budget amount (₹)"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-neutral-50 border border-neutral-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Explanatory calculation */}
              <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 text-xs text-neutral-600 space-y-1">
                <div className="flex justify-between">
                  <span>Customer Budget:</span>
                  <strong className="text-neutral-900">₹{targetAmount || 0}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Price per {activeUnit}:</span>
                  <span>₹{activeUnitPrice}</span>
                </div>
                <div className="border-t border-neutral-200 pt-1 flex justify-between font-bold text-emerald-800">
                  <span>{t('calculatedQty')}:</span>
                  <span className="tabular-nums">
                    {formatQuantity(finalQty, activeUnit)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Calculation Live Summary Strip */}
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] text-emerald-700 font-medium block">
                Selected Portion to Add:
              </span>
              <span className="text-sm font-bold text-emerald-950 tabular-nums">
                {formatQuantity(finalQty, activeUnit)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-emerald-700 font-medium block">
                Total Price:
              </span>
              <span className="text-base font-bold text-emerald-900 tabular-nums">
                {formatINR(finalPrice)}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={finalQty <= 0}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{t('addToBill')} · {formatINR(finalPrice)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
