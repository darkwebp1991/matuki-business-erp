import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Save, 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  Sun, 
  Moon, 
  Sparkles, 
  DollarSign, 
  Truck,
  CheckCircle2,
  ChevronDown,
  Search,
  ShoppingBag,
  Layers,
  ChefHat
} from 'lucide-react';
import { api } from '../../api/client';
import { Product, Customer, Driver, DeliveryLocation, AreaDeliveryRate, AdvanceOrder, DailyOrdersSummary } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ChefProductionPrintModal } from './ChefProductionPrintModal';
import { AddNewVenueModal } from '../common/AddNewVenueModal';

interface AdvanceOrderModalProps {
  isOpen: boolean;
  order?: AdvanceOrder | null;
  onClose: () => void;
  onSuccess: (savedOrder: AdvanceOrder) => void;
  defaultDate?: string;
  defaultSlot?: 'MORNING' | 'EVENING' | 'ALL_DAY';
}

interface OrderRowItem {
  product_id: number | null;
  product_name: string;
  item_code: string;
  unit: string;
  quantity: number | '';
  rate: number | '';
  discount_pct: number;
  vasan_type: string;
  vasan_qty: number | '';
  amount: number;
  notes: string;
}

export const AdvanceOrderModal: React.FC<AdvanceOrderModalProps> = ({
  isOpen,
  order,
  onClose,
  onSuccess,
  defaultDate,
  defaultSlot = 'MORNING'
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Master lists
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [locations, setLocations] = useState<DeliveryLocation[]>([]);
  const [areaRates, setAreaRates] = useState<AreaDeliveryRate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Unified Party Search State (Customers + Suppliers / Caterers)
  const [allParties, setAllParties] = useState<Array<{
    id: number;
    name: string;
    mobile?: string;
    address?: string;
    party_type: 'CUSTOMER' | 'SUPPLIER';
    current_balance?: number;
  }>>([]);
  const [partySearchQuery, setPartySearchQuery] = useState<string>('');
  const [isPartyDropdownOpen, setIsPartyDropdownOpen] = useState<boolean>(false);
  const partySearchRef = useRef<HTMLDivElement>(null);

  // Success Confirmation Modal State
  const [savedOrderSuccess, setSavedOrderSuccess] = useState<AdvanceOrder | null>(null);
  const [isChefPrintSuccessOpen, setIsChefPrintSuccessOpen] = useState<boolean>(false);
  const [chefDailySummary, setChefDailySummary] = useState<DailyOrdersSummary | null>(null);

  // Form Fields
  const [customerId, setCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerMobile, setCustomerMobile] = useState<string>('');
  const [customerBalance, setCustomerBalance] = useState<number>(0);
  
  // Delivery Schedule & Time Slots
  const [deliveryDate, setDeliveryDate] = useState<string>(defaultDate || todayStr);
  const [deliverySlot, setDeliverySlot] = useState<'MORNING' | 'EVENING' | 'ALL_DAY'>(defaultSlot);
  const [deliveryTime, setDeliveryTime] = useState<string>(defaultSlot === 'EVENING' ? '05:00 PM' : '08:00 AM');
  
  // Delivery Venue & Location Autocomplete (Surat 100+ Plots)
  const [venueSearchQuery, setVenueSearchQuery] = useState<string>('');
  const [isVenueDropdownOpen, setIsVenueDropdownOpen] = useState<boolean>(false);
  const [deliveryVenue, setDeliveryVenue] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [isAddNewVenueOpen, setIsAddNewVenueOpen] = useState<boolean>(false);
  const venueSearchRef = useRef<HTMLDivElement>(null);

  // AI Smart Recommendation State
  const [frequentVenues, setFrequentVenues] = useState<Array<{ venue_name: string; usage_count: number; address?: string; area_landmark?: string; customer_charge?: number; driver_rent?: number }>>([]);
  const [frequentProducts, setFrequentProducts] = useState<Array<{ product_id: number | null; item_name: string; order_count: number; total_qty: number; unit: string; rate: number; code?: string }>>([]);
  const [productVasanMap, setProductVasanMap] = useState<Record<string | number, string>>({});

  // Party-Wise Last Billed Item Rates Map
  const [customerLastRates, setCustomerLastRates] = useState<Record<number, { rate: number; discount: number; last_date: string; invoice_no: string }>>({});

  // Rickshaw Driver & Financials
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [tripType, setTripType] = useState<'ROUND_TRIP' | 'ONE_WAY'>('ROUND_TRIP');
  const [customerDeliveryCharge, setCustomerDeliveryCharge] = useState<number | ''>(0);
  const [driverDeliveryRate, setDriverDeliveryRate] = useState<number | ''>(0);
  const [advancePaid, setAdvancePaid] = useState<number | ''>(0);
  const [advancePaymentMode, setAdvancePaymentMode] = useState<string>('CASH');
  const [status, setStatus] = useState<string>('PENDING');
  const [notes, setNotes] = useState<string>('');

  // Close Confirmation Dialog
  const [showCloseConfirm, setShowCloseConfirm] = useState<boolean>(false);

  // Item Autocomplete state
  const [activeItemDropdownIdx, setActiveItemDropdownIdx] = useState<number | null>(null);
  const [itemSearchText, setItemSearchText] = useState<string>('');
  const itemInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  const createEmptyRow = (): OrderRowItem => ({
    product_id: null,
    product_name: '',
    item_code: '',
    unit: 'KG',
    quantity: '',
    rate: '',
    discount_pct: 0,
    vasan_type: 'NONE',
    vasan_qty: '',
    amount: 0,
    notes: ''
  });

  // Items List (default 6 rows)
  const [items, setItems] = useState<OrderRowItem[]>([
    createEmptyRow(),
    createEmptyRow(),
    createEmptyRow(),
    createEmptyRow(),
    createEmptyRow(),
    createEmptyRow()
  ]);

  // Load masters on mount
  useEffect(() => {
    const loadMasters = async () => {
      try {
        setLoading(true);
        const [prodRes, custRes, suppRes, drvRes, locRes, areaRes] = await Promise.all([
          api.getProducts(),
          api.getCustomers(),
          api.getSuppliers(),
          api.getDrivers(),
          api.getDeliveryLocations(),
          api.getAreaDeliveryRates()
        ]);
        setProducts(prodRes || []);
        setCustomers(custRes || []);
        setDrivers(drvRes || []);
        setLocations(locRes || []);
        setAreaRates(areaRes || []);

        // Build Unified Parties list (Customers + Caterers + Suppliers)
        const unified = [
          ...(custRes || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            mobile: c.mobile,
            address: c.address,
            party_type: 'CUSTOMER' as const,
            current_balance: c.current_balance || c.closing_balance || 0
          })),
          ...(suppRes || []).map((s: any) => ({
            id: s.id,
            name: s.name,
            mobile: s.mobile,
            address: s.address,
            party_type: 'SUPPLIER' as const,
            current_balance: s.current_balance || s.closing_balance || 0
          }))
        ];
        setAllParties(unified);
      } catch (err) {
        console.error('Failed to load masters:', err);
      } finally {
        setLoading(false);
      }
    };
    loadMasters();
  }, []);

  // Sync with initial order prop when editing or changing props
  useEffect(() => {
    if (order) {
      setCustomerId(order.customer_id ? String(order.customer_id) : '');
      setCustomerName(order.customer_name || '');
      setCustomerMobile(order.customer_mobile || '');
      setDeliveryDate(order.delivery_date || todayStr);
      setDeliverySlot(order.delivery_slot || 'MORNING');
      setDeliveryTime(order.delivery_time || (order.delivery_slot === 'EVENING' ? '05:00 PM' : '08:00 AM'));
      setDeliveryVenue(order.delivery_venue || '');
      setVenueSearchQuery(order.delivery_venue || '');
      setCustomerDeliveryCharge(order.customer_delivery_charge || 0);
      setDriverDeliveryRate(order.driver_delivery_rate || 0);
      setTripType(order.trip_type === 'ONE_WAY' ? 'ONE_WAY' : 'ROUND_TRIP');
      setAdvancePaid(order.advance_paid || 0);
      setStatus(order.status || 'PENDING');
      setNotes(order.notes || '');

      if (order.items && order.items.length > 0) {
        const orderRows: OrderRowItem[] = order.items.map(it => {
          const qty = Number(it.quantity) || 0;
          const rate = Number(it.rate) || 0;
          return {
            product_id: it.product_id || null,
            product_name: it.item_name,
            item_code: '',
            unit: it.unit || 'KG',
            quantity: qty,
            rate: rate,
            discount_pct: 0,
            vasan_type: 'NONE',
            vasan_qty: '',
            amount: Math.round(qty * rate * 100) / 100,
            notes: it.notes || ''
          };
        });

        while (orderRows.length < 6) {
          orderRows.push(createEmptyRow());
        }
        setItems(orderRows);
      }
    } else {
      // New Order defaults
      setCustomerId('');
      setCustomerName('');
      setCustomerMobile('');
      setCustomerBalance(0);
      setDeliveryDate(defaultDate || todayStr);
      setDeliverySlot(defaultSlot);
      setDeliveryTime(defaultSlot === 'EVENING' ? '05:00 PM' : '08:00 AM');
      setDeliveryVenue('');
      setVenueSearchQuery('');
      setDeliveryAddress('');
      setTripType('ROUND_TRIP');
      setCustomerDeliveryCharge(0);
      setDriverDeliveryRate(0);
      setAdvancePaid(0);
      setStatus('PENDING');
      setNotes('');
      setItems([
        createEmptyRow(),
        createEmptyRow(),
        createEmptyRow(),
        createEmptyRow(),
        createEmptyRow(),
        createEmptyRow()
      ]);
    }
  }, [isOpen, order, defaultDate, defaultSlot]);

  // Click outside listener for venue dropdown & item autocomplete
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (venueSearchRef.current && !venueSearchRef.current.contains(e.target as Node)) {
        setIsVenueDropdownOpen(false);
      }
      const target = e.target as HTMLElement;
      if (!target.closest('.item-autocomplete-wrapper')) {
        setActiveItemDropdownIdx(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut listener (Esc to close, Ctrl+S to save)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (showCloseConfirm) {
          setShowCloseConfirm(false);
          return;
        }
        handleRequestClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, items, customerName, deliveryDate, deliverySlot, deliveryVenue, customerDeliveryCharge, driverDeliveryRate, advancePaid, notes]);

  const handleRequestClose = () => {
    const hasAnyContent = items.some(i => i.product_name.trim() !== '') || customerName.trim() !== '';
    if (hasAnyContent) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  const loadSmartRecommendations = (cId: number) => {
    if (!cId) {
      setFrequentVenues([]);
      setFrequentProducts([]);
      setCustomerLastRates({});
      return;
    }
    // Fetch AI Smart Recommendations (Venues, Products, Driver & Vasan preferences)
    api.getCustomerSmartRecommendations(cId).then(res => {
      if (res) {
        setFrequentVenues(res.frequentVenues || []);
        setFrequentProducts(res.frequentProducts || []);
        if (res.productVasanMap) {
          setProductVasanMap(res.productVasanMap);
        }
        if (res.frequentVenues && res.frequentVenues.length > 0 && !deliveryVenue) {
          const top = res.frequentVenues[0];
          setDeliveryVenue(top.venue_name);
          setVenueSearchQuery(top.venue_name);
          if (top.address) setDeliveryAddress(top.address);
          if (top.customer_charge) setCustomerDeliveryCharge(top.customer_charge);
          if (top.driver_rent) setDriverDeliveryRate(top.driver_rent);
        }
        if (res.frequentDriver && res.frequentDriver.id && !selectedDriverId) {
          setSelectedDriverId(String(res.frequentDriver.id));
        }
      }
    }).catch(console.error);

    // Fetch Party-Wise Last Billed Item Rates
    api.getCustomerLastRates(cId).then(rates => {
      const rateMap = rates || {};
      setCustomerLastRates(rateMap);
      setItems(prevItems => prevItems.map(row => {
        if (row.product_id && rateMap[row.product_id] && Number(rateMap[row.product_id].rate) > 0) {
          const customRate = Number(rateMap[row.product_id].rate);
          const qty = row.quantity === '' ? 0 : Number(row.quantity);
          const disc = Number(row.discount_pct || 0);
          const amt = Math.round((qty * customRate * (1 - disc / 100)) * 100) / 100;
          return {
            ...row,
            rate: customRate,
            amount: amt
          };
        }
        return row;
      }));
    }).catch(console.error);
  };

  const handleCustomerChange = (selectedId: string) => {
    setCustomerId(selectedId);
    if (!selectedId) {
      setCustomerName('');
      setCustomerMobile('');
      setCustomerBalance(0);
      setFrequentVenues([]);
      setFrequentProducts([]);
      return;
    }

    const cust = customers.find(c => String(c.id) === selectedId);
    if (cust) {
      setCustomerName(cust.name);
      setCustomerMobile(cust.mobile || '');
      setCustomerBalance(cust.current_balance || 0);
      if (cust.address && !deliveryAddress) {
        setDeliveryAddress(cust.address);
      }
    }
    loadSmartRecommendations(Number(selectedId));
  };

  // Helper: Trip Type Toggle with automatic 50% / 100% rate adjustment
  const handleTripTypeChange = (newType: 'ROUND_TRIP' | 'ONE_WAY') => {
    if (newType === tripType) return;
    setTripType(newType);
    if (newType === 'ONE_WAY') {
      setCustomerDeliveryCharge(prev => typeof prev === 'number' && prev > 0 ? Math.round(prev / 2) : prev);
      setDriverDeliveryRate(prev => typeof prev === 'number' && prev > 0 ? Math.round(prev / 2) : prev);
    } else {
      setCustomerDeliveryCharge(prev => typeof prev === 'number' && prev > 0 ? Math.round(prev * 2) : prev);
      setDriverDeliveryRate(prev => typeof prev === 'number' && prev > 0 ? Math.round(prev * 2) : prev);
    }
  };

  // Match Area & Apply Rates from Surat Area Database
  const matchAndApplyArea = (text: string, currentTripType: 'ROUND_TRIP' | 'ONE_WAY' = tripType) => {
    if (!text || !areaRates || areaRates.length === 0) return;
    const lower = text.toLowerCase();
    const matched = areaRates.find(a => 
      lower.includes(a.area_name.toLowerCase())
    );

    if (matched) {
      const mult = currentTripType === 'ONE_WAY' ? 0.5 : 1.0;
      setCustomerDeliveryCharge(Math.round((matched.customer_charge || 0) * mult));
      setDriverDeliveryRate(Math.round((matched.driver_rent || 0) * mult));
    }
  };

  const handleSelectVenueLocation = (loc: DeliveryLocation) => {
    const formattedVenue = loc.area_landmark ? `${loc.venue_name} (${loc.area_landmark})` : loc.venue_name;
    setDeliveryVenue(formattedVenue);
    setVenueSearchQuery(formattedVenue);
    setDeliveryAddress(`${loc.address}${loc.area_landmark ? ' (' + loc.area_landmark + ')' : ''}`);
    const mult = tripType === 'ONE_WAY' ? 0.5 : 1.0;
    if (loc.customer_charge) setCustomerDeliveryCharge(Math.round(loc.customer_charge * mult));
    if (loc.driver_rent) setDriverDeliveryRate(Math.round(loc.driver_rent * mult));
    setIsVenueDropdownOpen(false);
  };

  const handleItemFieldChange = (index: number, field: keyof OrderRowItem, value: any) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: value };

    if (field === 'quantity' || field === 'rate' || field === 'discount_pct') {
      const q = field === 'quantity' ? (value === '' ? 0 : Number(value)) : (item.quantity === '' ? 0 : Number(item.quantity));
      const r = field === 'rate' ? (value === '' ? 0 : Number(value)) : (item.rate === '' ? 0 : Number(item.rate));
      const disc = field === 'discount_pct' ? Number(value || 0) : Number(item.discount_pct || 0);
      const gross = q * r;
      const discountVal = gross * (disc / 100);
      item.amount = Math.round((gross - discountVal) * 100) / 100;

      // Auto update vasan count hint if not touched
      if (field === 'quantity' && q > 0 && item.vasan_type !== 'NONE') {
        item.vasan_qty = Math.max(1, Math.ceil(q / 15));
      }
    }

    updated[index] = item;

    // Auto append row if editing last row
    if (index === updated.length - 1 && (field === 'product_name' || field === 'quantity') && value) {
      updated.push(createEmptyRow());
    }

    setItems(updated);
  };

  const getSmartVasanType = (prod: Product) => {
    if (prod.id && productVasanMap[prod.id]) return productVasanMap[prod.id];
    if (prod.name && productVasanMap[prod.name.toLowerCase().trim()]) return productVasanMap[prod.name.toLowerCase().trim()];
    const name = prod.name.toLowerCase();
    if (prod.unit === 'POUCH' || name.includes('pouch') || name.includes('bottle') || name.includes('dahi') || name.includes('chaas')) return 'Carat';
    if (name.includes('matho') || name.includes('shrikhand') || name.includes('rabdi') || name.includes('basundi') || name.includes('kheer')) return 'Milton';
    if (name.includes('barfi') || name.includes('penda') || name.includes('kaju') || name.includes('katli') || name.includes('laddoo') || name.includes('choki')) return 'Choki';
    return 'NONE';
  };

  const handleSelectProduct = (index: number, prod: Product | null) => {
    if (!prod) return;
    const updated = [...items];
    const current = updated[index];
    const qty = current.quantity === '' ? 1 : Number(current.quantity);
    const lastRateObj = customerLastRates[prod.id];
    const rate = (lastRateObj && Number(lastRateObj.rate) > 0) ? Number(lastRateObj.rate) : (prod.selling_rate || 0);
    const disc = current.discount_pct || 0;
    const gross = qty * rate;
    const discountVal = gross * (disc / 100);

    const smartVasan = (current.vasan_type && current.vasan_type !== 'NONE') ? current.vasan_type : getSmartVasanType(prod);
    const vasanQty = smartVasan !== 'NONE' ? Math.max(1, Math.ceil(qty / 15)) : '';

    updated[index] = {
      ...current,
      product_id: prod.id,
      product_name: prod.name,
      item_code: prod.code || '',
      unit: prod.unit || 'KG',
      rate: rate,
      quantity: qty,
      vasan_type: smartVasan,
      vasan_qty: vasanQty,
      amount: Math.round((gross - discountVal) * 100) / 100
    };

    if (index === updated.length - 1) {
      updated.push(createEmptyRow());
    }

    setItems(updated);
    setActiveItemDropdownIdx(null);
  };

  const handleRemoveRow = (index: number) => {
    if (items.length <= 1) {
      setItems([createEmptyRow()]);
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculations
  const validItems = items.filter(i => (i.product_name && i.product_name.trim() !== '') || Number(i.quantity) > 0);
  const totalItemsCount = validItems.length;
  const totalWeightKg = Math.round(validItems.reduce((sum, i) => {
    const q = Number(i.quantity) || 0;
    return i.unit === 'KG' ? sum + q : (i.unit === 'GM' ? sum + (q / 1000) : sum);
  }, 0) * 100) / 100;

  const itemsSubtotal = Math.round(validItems.reduce((sum, i) => sum + (Number(i.amount) || 0), 0) * 100) / 100;
  const chargeNum = Number(customerDeliveryCharge) || 0;
  const grandTotal = Math.round((itemsSubtotal + chargeNum) * 100) / 100;
  const advNum = Number(advancePaid) || 0;
  const balanceDue = Math.max(0, Math.round((grandTotal - advNum) * 100) / 100);

  // Vasan Summary
  const vasanSummaryMap: { [key: string]: number } = {};
  validItems.forEach(i => {
    if (i.vasan_type && i.vasan_type !== 'NONE' && Number(i.vasan_qty) > 0) {
      vasanSummaryMap[i.vasan_type] = (vasanSummaryMap[i.vasan_type] || 0) + Number(i.vasan_qty);
    }
  });
  const vasanSummaryList = Object.entries(vasanSummaryMap).map(([type, qty]) => `${type}: ${qty}`);

  const filteredLocations = locations.filter(loc => {
    if (!venueSearchQuery) return true;
    const q = venueSearchQuery.toLowerCase();
    return (
      loc.venue_name.toLowerCase().includes(q) ||
      (loc.area_landmark && loc.area_landmark.toLowerCase().includes(q)) ||
      (loc.address && loc.address.toLowerCase().includes(q))
    );
  });

  const handleSubmit = async () => {
    if (validItems.length === 0) {
      setError('Please add at least 1 sweet or item to the order');
      return;
    }

    if (!customerName.trim()) {
      setError('Please provide customer or caterer name');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const payload = {
        customer_id: customerId ? Number(customerId) : null,
        customer_name: customerName.trim(),
        customer_mobile: customerMobile.trim(),
        delivery_date: deliveryDate,
        delivery_slot: deliverySlot,
        delivery_time: deliveryTime,
        delivery_venue: deliveryVenue || venueSearchQuery || deliveryAddress,
        customer_delivery_charge: Number(customerDeliveryCharge) || 0,
        driver_delivery_rate: Number(driverDeliveryRate) || 0,
        trip_type: tripType,
        advance_paid: Number(advancePaid) || 0,
        status: status,
        notes: notes,
        items: validItems.map(i => ({
          product_id: i.product_id || null,
          item_name: i.product_name,
          quantity: Number(i.quantity) || 0,
          unit: i.unit || 'KG',
          rate: Number(i.rate) || 0,
          amount: Number(i.amount) || 0,
          notes: i.notes || `${i.vasan_type !== 'NONE' ? i.vasan_type + ' (' + i.vasan_qty + ')' : ''}`
        }))
      };

      let result: any;
      if (order?.id) {
        result = await api.updateAdvanceOrder(order.id, payload);
      } else {
        result = await api.createAdvanceOrder(payload);
      }

      const savedData = (result as any).data || result;
      setSavedOrderSuccess(savedData);
    } catch (err: any) {
      setError(err.message || 'Failed to save advance order');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      width: '100vw',
      height: '100vh',
      background: '#f8fafc',
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Inter, -apple-system, sans-serif'
    }}>
      {/* 1. TOP VYAPAR APP HEADER BAR */}
      <div style={{
        height: '52px',
        background: '#ffffff',
        borderBottom: '1.5px solid #e2e8f0',
        padding: '0 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: '#dbeafe', color: '#1d4ed8', padding: '6px', borderRadius: '6px', display: 'flex' }}>
              <Calendar size={18} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>
                {order?.id ? `Edit Advance Order #${order.order_no}` : 'Book Advance Caterer Order'}
              </h2>
            </div>
          </div>

          {/* Time Slot Toggle: 🌅 Morning | 🌇 Evening | 🕒 All Day */}
          <div style={{
            display: 'flex',
            background: '#f1f5f9',
            padding: '2px',
            borderRadius: '20px',
            border: '1px solid #cbd5e1'
          }}>
            <button
              type="button"
              style={{
                padding: '4px 14px',
                borderRadius: '16px',
                border: 'none',
                background: deliverySlot === 'MORNING' ? '#f59e0b' : 'transparent',
                color: deliverySlot === 'MORNING' ? '#0f172a' : '#475569',
                fontWeight: 900,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              onClick={() => {
                setDeliverySlot('MORNING');
                if (deliveryTime.includes('05:00 PM')) setDeliveryTime('08:00 AM');
              }}
            >
              <Sun size={13} /> 🌅 Morning (8:00 AM)
            </button>
            <button
              type="button"
              style={{
                padding: '4px 14px',
                borderRadius: '16px',
                border: 'none',
                background: deliverySlot === 'EVENING' ? '#3b82f6' : 'transparent',
                color: deliverySlot === 'EVENING' ? '#ffffff' : '#475569',
                fontWeight: 900,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              onClick={() => {
                setDeliverySlot('EVENING');
                if (deliveryTime.includes('08:00 AM')) setDeliveryTime('05:00 PM');
              }}
            >
              <Moon size={13} /> 🌇 Evening (5:00 PM)
            </button>
            <button
              type="button"
              style={{
                padding: '4px 12px',
                borderRadius: '16px',
                border: 'none',
                background: deliverySlot === 'ALL_DAY' ? '#64748b' : 'transparent',
                color: deliverySlot === 'ALL_DAY' ? '#ffffff' : '#475569',
                fontWeight: 800,
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
              onClick={() => setDeliverySlot('ALL_DAY')}
            >
              🕒 All Day
            </button>
          </div>
        </div>

        {/* Top Right: Status Selector & Close */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#475569' }}>Status:</span>
            <select
              className="form-select"
              style={{
                fontSize: '0.8rem',
                fontWeight: 800,
                padding: '4px 8px',
                height: '32px',
                borderColor: status === 'READY' ? '#22c55e' : (status === 'IN_PRODUCTION' ? '#f59e0b' : '#cbd5e1'),
                background: status === 'READY' ? '#f0fdf4' : (status === 'IN_PRODUCTION' ? '#fffbeb' : '#ffffff')
              }}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="PENDING">🕒 PENDING</option>
              <option value="IN_PRODUCTION">🥣 IN PROD</option>
              <option value="READY">✅ READY</option>
              <option value="DISPATCHED">🚚 DISPATCHED</option>
              <option value="CANCELLED">❌ CANCELLED</option>
            </select>
          </div>

          <span style={{ fontSize: '0.76rem', color: '#64748b', background: '#f1f5f9', padding: '3px 8px', borderRadius: '4px' }}>
            Press <strong>Esc</strong> to close | <strong>Ctrl+S</strong> to save
          </span>

          <button
            onClick={handleRequestClose}
            style={{
              background: '#fee2e2',
              border: 'none',
              borderRadius: '50%',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#dc2626',
              cursor: 'pointer'
            }}
            title="Close (Esc)"
          >
            <X size={17} />
          </button>
        </div>
      </div>

      {/* 2. MAIN SCROLLABLE CONTENT CANVAS */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}>
        {error && (
          <div style={{ padding: '8px 14px', background: '#fee2e2', border: '1px solid #f87171', color: '#991b1b', borderRadius: '6px', fontSize: '0.86rem' }}>
            ⚠️ {error}
          </div>
        )}

        {/* TOP COMPACT 2-COLUMN HEADER (Customer & Delivery Details) */}
        <div style={{
          background: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '14px 18px',
          display: 'grid',
          gridTemplateColumns: '2.5fr 1fr',
          gap: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          {/* Left Column: Customer and Delivery Inputs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Row 1: Searchable Party Box, Party Name, Phone */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: '10px' }}>
              <div ref={partySearchRef} style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#334155', marginBottom: '3px' }}>
                  🔍 Search Caterer / Party Name / Mobile *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{
                      width: '100%',
                      fontSize: '0.84rem',
                      padding: '6px 28px 6px 8px',
                      fontWeight: 700,
                      borderColor: isPartyDropdownOpen ? '#3b82f6' : '#cbd5e1',
                      background: '#ffffff'
                    }}
                    placeholder="Type name (Arvind, Paresh...) or mobile..."
                    value={partySearchQuery}
                    onFocus={() => setIsPartyDropdownOpen(true)}
                    onChange={(e) => {
                      const q = e.target.value;
                      setPartySearchQuery(q);
                      setCustomerName(q);
                      setIsPartyDropdownOpen(true);
                    }}
                  />
                  {partySearchQuery ? (
                    <button
                      type="button"
                      onClick={() => {
                        setPartySearchQuery('');
                        setCustomerId('');
                        setCustomerName('');
                        setCustomerMobile('');
                        setCustomerBalance(0);
                        setIsPartyDropdownOpen(false);
                      }}
                      style={{
                        position: 'absolute',
                        right: '6px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 900
                      }}
                    >
                      ✕
                    </button>
                  ) : (
                    <ChevronDown
                      size={14}
                      color="#64748b"
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        pointerEvents: 'none'
                      }}
                    />
                  )}
                </div>

                {/* Dropdown Results list */}
                {isPartyDropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    maxHeight: '260px',
                    overflowY: 'auto',
                    background: '#ffffff',
                    border: '1.5px solid #3b82f6',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
                    zIndex: 10000,
                    marginTop: '2px'
                  }}>
                    {(() => {
                      const filtered = allParties.filter(p => {
                        if (!partySearchQuery.trim()) return true;
                        const q = partySearchQuery.toLowerCase().trim();
                        return (
                          p.name.toLowerCase().includes(q) ||
                          (p.mobile && p.mobile.includes(q))
                        );
                      });

                      if (filtered.length === 0) {
                        return (
                          <div style={{ padding: '10px 12px', fontSize: '0.8rem', color: '#64748b' }}>
                            No party found matching &quot;{partySearchQuery}&quot;. You can type a new custom party name directly!
                          </div>
                        );
                      }

                      return filtered.map(p => (
                        <div
                          key={`${p.party_type}_${p.id}`}
                          onClick={() => {
                            const matchingCust = customers.find(c => c.name.toLowerCase().trim() === p.name.toLowerCase().trim());
                            const finalCustId = matchingCust ? String(matchingCust.id) : (p.party_type === 'CUSTOMER' ? String(p.id) : '');
                            setCustomerId(finalCustId);
                            setCustomerName(p.name);
                            setCustomerMobile(p.mobile || '');
                            setCustomerBalance(p.current_balance || 0);
                            setPartySearchQuery(p.name);
                            if (p.address && !deliveryAddress) {
                              setDeliveryAddress(p.address);
                            }
                            setIsPartyDropdownOpen(false);
                            if (finalCustId) {
                              loadSmartRecommendations(Number(finalCustId));
                            } else {
                              setFrequentVenues([]);
                              setFrequentProducts([]);
                            }
                          }}
                          style={{
                            padding: '8px 12px',
                            borderBottom: '1px solid #f1f5f9',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: customerId === String(p.id) ? '#eff6ff' : '#ffffff'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = customerId === String(p.id) ? '#eff6ff' : '#ffffff')}
                        >
                          <div>
                            <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>
                              {p.name}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', gap: '8px', alignItems: 'center' }}>
                              {p.mobile && <span>📞 {p.mobile}</span>}
                              <span style={{
                                padding: '1px 5px',
                                borderRadius: '4px',
                                fontSize: '0.65rem',
                                fontWeight: 800,
                                background: p.party_type === 'CUSTOMER' ? '#dcfce7' : '#fef3c7',
                                color: p.party_type === 'CUSTOMER' ? '#15803d' : '#b45309'
                              }}>
                                {p.party_type === 'CUSTOMER' ? '👤 Customer' : '🏢 Caterer / Supplier'}
                              </span>
                            </div>
                          </div>

                          {p.current_balance ? (
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: p.current_balance > 0 ? '#dc2626' : '#16a34a' }}>
                              ₹{Math.abs(p.current_balance).toLocaleString('en-IN')}
                            </span>
                          ) : null}
                        </div>
                      ));
                    })()}
                  </div>
                )}

                {customerBalance > 0 && (
                  <div style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 800, marginTop: '3px' }}>
                    ⚠️ Prev Ledger Due: {formatCurrency(customerBalance)}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#334155', marginBottom: '3px' }}>
                  Caterer / Party Name *
                </label>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%', fontSize: '0.84rem', padding: '6px 8px', fontWeight: 700 }}
                  placeholder="e.g. Paresh Caterers / Wedding Party"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#334155', marginBottom: '3px' }}>
                  Mobile / Phone No.
                </label>
                <input
                  type="text"
                  className="form-input font-mono"
                  style={{ width: '100%', fontSize: '0.84rem', padding: '6px 8px' }}
                  placeholder="+91..."
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value)}
                />
              </div>
            </div>

            {/* Row 2: Delivery Date, Delivery Time, Delivery Venue Search */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#1e40af', marginBottom: '3px' }}>
                  📅 Delivery Date *
                </label>
                <input
                  type="date"
                  className="form-input font-mono"
                  style={{ width: '100%', fontSize: '0.84rem', padding: '6px 8px', fontWeight: 700, borderColor: '#93c5fd' }}
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#1e40af', marginBottom: '3px' }}>
                  ⏰ Delivery Time *
                </label>
                <input
                  type="text"
                  className="form-input font-mono"
                  style={{ width: '100%', fontSize: '0.84rem', padding: '6px 8px', fontWeight: 700 }}
                  placeholder="e.g. 08:00 AM / 05:30 PM"
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                />
              </div>

              {/* Delivery Venue / Plot Autocomplete */}
              <div ref={venueSearchRef} style={{ position: 'relative' }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem', fontWeight: 800, color: '#1e40af', marginBottom: '3px' }}>
                  <span><MapPin size={12} style={{ verticalAlign: 'middle' }} /> Delivery Venue / Area</span>
                  <button
                    type="button"
                    onClick={() => setIsAddNewVenueOpen(true)}
                    style={{
                      fontSize: '0.70rem',
                      fontWeight: 800,
                      color: '#1d4ed8',
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '4px',
                      padding: '1px 7px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                  >
                    <Plus size={11} /> Add New Venue
                  </button>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ width: '100%', fontSize: '0.84rem', padding: '6px 8px', paddingRight: '26px', borderColor: '#93c5fd', background: '#f8fafc', fontWeight: 600 }}
                    placeholder="Search venue (Sarthana, Katargam, Avadh, Varachha...)"
                    value={venueSearchQuery}
                    onFocus={() => setIsVenueDropdownOpen(true)}
                    onChange={(e) => {
                      setVenueSearchQuery(e.target.value);
                      setDeliveryVenue(e.target.value);
                      setIsVenueDropdownOpen(true);
                      matchAndApplyArea(e.target.value);
                    }}
                  />
                  <ChevronDown size={14} color="#94a3b8" style={{ position: 'absolute', right: '8px', top: '9px', pointerEvents: 'none' }} />
                </div>

                {isVenueDropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    maxHeight: '220px',
                    overflowY: 'auto',
                    background: '#ffffff',
                    border: '1.5px solid #3b82f6',
                    borderRadius: '6px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
                    zIndex: 1000,
                    marginTop: '3px'
                  }}>
                    {/* + Add New Venue Option at top */}
                    <div
                      onClick={() => {
                        setIsVenueDropdownOpen(false);
                        setIsAddNewVenueOpen(true);
                      }}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        background: '#eff6ff',
                        borderBottom: '1px solid #bfdbfe',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        color: '#1d4ed8',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Plus size={14} /> Add &quot;{venueSearchQuery || 'New Venue'}&quot; to Venue Master List
                    </div>

                    {/* AI Frequent Venues for Selected Customer */}
                    {frequentVenues.length > 0 && !venueSearchQuery && (
                      <div style={{ background: '#f0fdf4', borderBottom: '1.5px solid #86efac', padding: '6px 10px' }}>
                        <div style={{ fontSize: '0.70rem', fontWeight: 900, color: '#15803d', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                          <Sparkles size={11} color="#16a34a" /> ⭐ AI SUGGESTED VENUES FOR {customerName ? customerName.toUpperCase() : 'PARTY'}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {frequentVenues.map((fv, idx) => (
                            <div
                              key={`fv_${idx}`}
                              onClick={() => {
                                setDeliveryVenue(fv.venue_name);
                                setVenueSearchQuery(fv.venue_name);
                                if (fv.address) setDeliveryAddress(fv.address);
                                if (fv.customer_charge) setCustomerDeliveryCharge(fv.customer_charge);
                                if (fv.driver_rent) setDriverDeliveryRate(fv.driver_rent);
                                setIsVenueDropdownOpen(false);
                              }}
                              style={{
                                padding: '5px 8px',
                                background: '#ffffff',
                                border: '1px solid #bbf7d0',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.78rem',
                                fontWeight: 800,
                                color: '#166534',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = '#dcfce7')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                            >
                              <span>📍 {fv.venue_name} {fv.area_landmark ? `(${fv.area_landmark})` : ''}</span>
                              <span style={{ fontSize: '0.68rem', color: '#15803d', fontWeight: 700, background: '#dcfce7', padding: '1px 6px', borderRadius: '10px' }}>
                                Used {fv.usage_count}x
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {filteredLocations.map(loc => (
                      <div
                        key={loc.id}
                        onClick={() => handleSelectVenueLocation(loc)}
                        style={{
                          padding: '7px 12px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #f1f5f9',
                          fontSize: '0.82rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f0fdf4')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <strong style={{ color: '#1e3a8a' }}>{loc.venue_name}</strong>
                            {loc.area_landmark && (
                              <span style={{
                                color: '#b45309',
                                background: '#fef3c7',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontSize: '0.70rem',
                                fontWeight: 800,
                                border: '1px solid #fde68a'
                              }}>
                                📍 {loc.area_landmark}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                            {loc.address}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                          <span style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#15803d', padding: '1px 5px', borderRadius: '3px', fontWeight: 800, display: 'block' }}>
                            Cust ₹{loc.customer_charge || 0}
                          </span>
                          {Number(loc.driver_rent) > 0 && (
                            <span style={{ color: '#b91c1c', fontSize: '0.68rem', fontWeight: 700 }}>
                              Driver ₹{loc.driver_rent}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Row 3: Trip Type Toggle, Delivery Charges & Driver Rates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1.6fr', gap: '10px', alignItems: 'center' }}>
              {/* Trip Type Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#0f172a', marginBottom: '3px' }}>
                  🔄 Trip Type (ટ્રીપ પ્રકાર) *
                </label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => handleTripTypeChange('ROUND_TRIP')}
                    style={{
                      flex: 1,
                      padding: '4px 6px',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      borderRadius: '4px',
                      border: `1.5px solid ${tripType === 'ROUND_TRIP' ? '#2563eb' : '#cbd5e1'}`,
                      background: tripType === 'ROUND_TRIP' ? '#2563eb' : '#ffffff',
                      color: tripType === 'ROUND_TRIP' ? '#ffffff' : '#475569',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    🔄 Round Trip
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTripTypeChange('ONE_WAY')}
                    style={{
                      flex: 1,
                      padding: '4px 6px',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      borderRadius: '4px',
                      border: `1.5px solid ${tripType === 'ONE_WAY' ? '#0891b2' : '#cbd5e1'}`,
                      background: tripType === 'ONE_WAY' ? '#0891b2' : '#ffffff',
                      color: tripType === 'ONE_WAY' ? '#ffffff' : '#475569',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    ➡️ One Way
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#047857', marginBottom: '3px' }}>
                  📦 Cust. Charge (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  className="form-input font-mono"
                  style={{ width: '100%', fontSize: '0.84rem', padding: '5px 8px', fontWeight: 800, color: '#047857', background: '#f0fdf4' }}
                  value={customerDeliveryCharge}
                  onChange={(e) => setCustomerDeliveryCharge(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#b91c1c', marginBottom: '3px' }}>
                  🛺 Rickshaw Rent (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  className="form-input font-mono"
                  style={{ width: '100%', fontSize: '0.84rem', padding: '5px 8px', fontWeight: 800, color: '#b91c1c', background: '#fef2f2' }}
                  value={driverDeliveryRate}
                  onChange={(e) => setDriverDeliveryRate(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>

              <div style={{ paddingTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ fontSize: '0.76rem', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                  Trip: <strong style={{ color: tripType === 'ONE_WAY' ? '#0891b2' : '#2563eb' }}>{tripType === 'ONE_WAY' ? '➡️ One Way' : '🔄 Round'}</strong>
                </div>
                {Number(customerDeliveryCharge) > 0 && (
                  <span style={{
                    fontSize: '0.74rem',
                    background: Number(customerDeliveryCharge) >= Number(driverDeliveryRate) ? '#dcfce7' : '#fee2e2',
                    color: Number(customerDeliveryCharge) >= Number(driverDeliveryRate) ? '#15803d' : '#b91c1c',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontWeight: 800
                  }}>
                    💰 Margin: ₹{(Number(customerDeliveryCharge) || 0) - (Number(driverDeliveryRate) || 0)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Order Number, Advance Paid, Notes */}
          <div style={{
            borderLeft: '1px solid #e2e8f0',
            paddingLeft: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.8rem' }}>
                <span style={{ color: '#64748b' }}>Order Number:</span>
                <strong style={{ color: '#0f172a', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                  {order?.order_no || 'ORD-Auto'}
                </strong>
              </div>

              {/* Advance Paid Input */}
              <div style={{ marginBottom: '8px', background: '#ecfdf5', border: '1px solid #6ee7b7', padding: '8px', borderRadius: '6px' }}>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#065f46', marginBottom: '3px' }}>
                  💰 Advance Paid (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  className="form-input font-mono"
                  style={{ width: '100%', fontSize: '0.9rem', fontWeight: 800, padding: '5px 8px', borderColor: '#34d399', color: '#065f46' }}
                  placeholder="₹ 0"
                  value={advancePaid}
                  onChange={(e) => setAdvancePaid(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>

              {/* Special Notes & Packing Instructions */}
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#334155', marginBottom: '3px' }}>
                  📝 Special Kitchen / Packing Notes
                </label>
                <textarea
                  className="form-input"
                  rows={2}
                  style={{ width: '100%', fontSize: '0.8rem', padding: '5px 8px', resize: 'none' }}
                  placeholder="e.g. Milton can packing, send at 8 AM sharp, Dryfruit extra..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 3. VYAPAR SPACIOUS ITEM GRID (With Live Autocomplete, Rates & Vasan) */}
        <div style={{
          background: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #cbd5e1', fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                  <th style={{ width: '38px', textAlign: 'center', padding: '8px 4px' }}>#</th>
                  <th style={{ minWidth: '300px', padding: '8px 10px' }}>SWEET / ITEM NAME</th>
                  <th style={{ width: '180px', padding: '8px 8px', background: '#fffbeb', color: '#92400e' }}>CHAKI / VASAN</th>
                  <th style={{ width: '100px', textAlign: 'center', padding: '8px 6px' }}>QTY</th>
                  <th style={{ width: '90px', textAlign: 'center', padding: '8px 6px' }}>UNIT</th>
                  <th style={{ width: '120px', textAlign: 'right', padding: '8px 8px' }}>RATE (₹)</th>
                  <th style={{ width: '90px', textAlign: 'right', padding: '8px 6px' }}>DISC %</th>
                  <th style={{ width: '130px', textAlign: 'right', padding: '8px 12px' }}>AMOUNT (₹)</th>
                  <th style={{ width: '40px', textAlign: 'center', padding: '8px 4px' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((row, idx) => {
                  const filteredProducts = products.filter(p => 
                    !itemSearchText || 
                    p.name.toLowerCase().includes(itemSearchText.toLowerCase()) || 
                    p.code.toLowerCase().includes(itemSearchText.toLowerCase())
                  );

                  return (
                    <tr 
                      key={idx} 
                      style={{ 
                        borderBottom: '1px solid #f1f5f9',
                        background: idx % 2 === 0 ? '#ffffff' : '#fafafa'
                      }}
                    >
                      {/* Row # */}
                      <td style={{ textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700, padding: '4px' }}>
                        {idx + 1}
                      </td>

                      {/* ITEM Column with Live Search Autocomplete */}
                      <td style={{ padding: '3px 8px', position: 'relative' }} className="item-autocomplete-wrapper">
                        <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                          <input
                            ref={el => { itemInputRefs.current[idx] = el; }}
                            type="text"
                            className="form-input"
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              fontSize: '0.86rem',
                              fontWeight: row.product_id ? 700 : 500,
                              color: row.product_id ? '#0f172a' : '#475569',
                              borderColor: activeItemDropdownIdx === idx ? '#3b82f6' : '#e2e8f0',
                              background: '#ffffff'
                            }}
                            placeholder="Type sweet name (e.g. Kalakand Barfi, Kesar Matho, Buttermilk)..."
                            value={row.product_name}
                            onFocus={() => {
                              setActiveItemDropdownIdx(idx);
                              setItemSearchText(row.product_name);
                            }}
                            onChange={(e) => {
                              handleItemFieldChange(idx, 'product_name', e.target.value);
                              setItemSearchText(e.target.value);
                              setActiveItemDropdownIdx(idx);
                            }}
                          />
                        </div>

                        {/* Autocomplete Dropdown popup (Shows Item, Sale Price, Stock) */}
                        {activeItemDropdownIdx === idx && (
                          <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: '8px',
                            width: '450px',
                            maxHeight: '260px',
                            overflowY: 'auto',
                            background: '#ffffff',
                            border: '1.5px solid #3b82f6',
                            borderRadius: '6px',
                            boxShadow: '0 12px 28px -5px rgba(0,0,0,0.2)',
                            zIndex: 9999,
                            marginTop: '2px'
                          }}>
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: '2fr 1fr 1fr',
                              padding: '5px 10px',
                              background: '#f8fafc',
                              borderBottom: '1px solid #e2e8f0',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              color: '#64748b'
                            }}>
                              <span>ITEM NAME</span>
                              <span style={{ textAlign: 'right' }}>RATE</span>
                              <span style={{ textAlign: 'right' }}>STOCK</span>
                            </div>

                            {/* AI Frequent Sweets for Selected Customer */}
                            {frequentProducts.length > 0 && !row.product_name && (
                              <div style={{ background: '#f0fdf4', borderBottom: '1.5px solid #86efac', padding: '6px 10px' }}>
                                <div style={{ fontSize: '0.70rem', fontWeight: 900, color: '#15803d', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                                  <Sparkles size={11} color="#16a34a" /> ⭐ {customerName ? customerName.toUpperCase() : 'PARTY'}'S MOST ORDERED SWEETS
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                                  {frequentProducts.map((fp, fpIdx) => {
                                    const matchingProd = products.find(p => p.id === fp.product_id || p.name.toLowerCase() === fp.item_name.toLowerCase());
                                    return (
                                      <div
                                        key={`fp_${fpIdx}`}
                                        onClick={() => {
                                          if (matchingProd) {
                                            handleSelectProduct(idx, matchingProd);
                                          } else {
                                            handleItemFieldChange(idx, 'product_name', fp.item_name);
                                            handleItemFieldChange(idx, 'rate', fp.rate);
                                            handleItemFieldChange(idx, 'unit', fp.unit);
                                            setActiveItemDropdownIdx(null);
                                          }
                                        }}
                                        style={{
                                          padding: '5px 8px',
                                          background: '#ffffff',
                                          border: '1px solid #bbf7d0',
                                          borderRadius: '4px',
                                          cursor: 'pointer',
                                          fontSize: '0.76rem',
                                          fontWeight: 800,
                                          color: '#166534',
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center'
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.background = '#dcfce7')}
                                        onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                                      >
                                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>🍬 {fp.item_name}</span>
                                        <span style={{ fontSize: '0.68rem', color: '#047857', fontFamily: 'monospace', fontWeight: 800 }}>
                                          ₹{fp.rate}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {filteredProducts.map(prod => (
                              <div
                                key={prod.id}
                                onClick={() => handleSelectProduct(idx, prod)}
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: '2fr 1fr 1fr',
                                  padding: '7px 10px',
                                  cursor: 'pointer',
                                  borderBottom: '1px solid #f1f5f9',
                                  fontSize: '0.82rem',
                                  alignItems: 'center'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#eff6ff'}
                                onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
                              >
                                <div>
                                  <strong style={{ color: '#0f172a' }}>{prod.name}</strong>
                                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Code: {prod.code}</div>
                                </div>
                                <div style={{ textAlign: 'right', fontWeight: 800, color: '#047857', fontFamily: 'monospace' }}>
                                  ₹{customerLastRates[prod.id] ? customerLastRates[prod.id].rate : (prod.selling_rate || 0)}
                                  {customerLastRates[prod.id] && (
                                    <div style={{ fontSize: '0.66rem', color: '#15803d', fontWeight: 800, background: '#dcfce7', padding: '1px 4px', borderRadius: '3px', marginTop: '1px' }}>
                                      ⭐ Party Rate ₹{customerLastRates[prod.id].rate}
                                    </div>
                                  )}
                                </div>
                                <div style={{ textAlign: 'right', fontSize: '0.74rem', color: prod.current_stock < 0 ? '#dc2626' : '#475569' }}>
                                  {prod.current_stock || 0} {prod.unit}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* CHAKI / VASAN Column */}
                      <td style={{ padding: '3px 8px', background: '#fffdf5' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <select
                            className="form-select"
                            style={{
                              flex: 1,
                              fontSize: '0.82rem',
                              padding: '4px 6px',
                              fontWeight: 700,
                              borderColor: '#fcd34d',
                              background: '#ffffff'
                            }}
                            value={row.vasan_type}
                            onChange={(e) => handleItemFieldChange(idx, 'vasan_type', e.target.value)}
                          >
                            <option value="NONE">None</option>
                            <option value="Milton">Milton (Can)</option>
                            <option value="Choki">Choki (Tray)</option>
                            <option value="Dol">Bucket (Dol)</option>
                            <option value="Carat">Crate (Carat)</option>
                            <option value="Steel Dabba">Steel Dabba</option>
                            <option value="Petharo">Petharo (Box)</option>
                            <option value="Plastic Tub">Plastic Tub</option>
                            <option value="Other">Other</option>
                          </select>
                          {row.vasan_type !== 'NONE' && (
                            <input
                              type="number"
                              min="0"
                              style={{
                                width: '45px',
                                padding: '4px 2px',
                                textAlign: 'center',
                                fontSize: '0.86rem',
                                fontWeight: 800,
                                color: '#92400e',
                                borderColor: '#fcd34d',
                                background: '#fef3c7',
                                borderRadius: '4px',
                                border: '1px solid #fcd34d'
                              }}
                              value={row.vasan_qty}
                              onChange={(e) => handleItemFieldChange(idx, 'vasan_qty', e.target.value)}
                            />
                          )}
                        </div>
                      </td>

                      {/* QTY Column */}
                      <td style={{ padding: '3px 6px', textAlign: 'center' }}>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="0"
                          className="form-input font-mono"
                          style={{
                            width: '85px',
                            padding: '5px 6px',
                            textAlign: 'center',
                            fontSize: '0.92rem',
                            fontWeight: 800,
                            margin: '0 auto',
                            borderColor: '#cbd5e1'
                          }}
                          value={row.quantity}
                          onChange={(e) => handleItemFieldChange(idx, 'quantity', e.target.value)}
                        />
                      </td>

                      {/* UNIT Column */}
                      <td style={{ padding: '3px 6px', textAlign: 'center' }}>
                        <select
                          className="form-select"
                          style={{ fontSize: '0.8rem', padding: '4px 4px', textAlign: 'center', borderColor: '#e2e8f0' }}
                          value={row.unit}
                          onChange={(e) => handleItemFieldChange(idx, 'unit', e.target.value)}
                        >
                          <option value="KG">KG</option>
                          <option value="GM">GM</option>
                          <option value="POUCH">POUCH</option>
                          <option value="PCS">PCS</option>
                          <option value="BOX">BOX</option>
                          <option value="CONTAINER">CONTAINER</option>
                          <option value="LITRE">LITRE</option>
                        </select>
                      </td>

                      {/* PRICE / RATE */}
                      <td style={{ padding: '3px 8px', textAlign: 'right' }}>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="0"
                          className="form-input font-mono"
                          style={{
                            width: '95px',
                            padding: '5px 6px',
                            textAlign: 'right',
                            fontSize: '0.88rem',
                            fontWeight: 700,
                            marginLeft: 'auto',
                            borderColor: '#cbd5e1'
                          }}
                          value={row.rate}
                          onChange={(e) => handleItemFieldChange(idx, 'rate', e.target.value)}
                        />
                      </td>

                      {/* DISC % */}
                      <td style={{ padding: '3px 6px', textAlign: 'right' }}>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="0"
                          className="form-input font-mono"
                          style={{
                            width: '60px',
                            padding: '5px 4px',
                            textAlign: 'right',
                            fontSize: '0.82rem',
                            marginLeft: 'auto',
                            borderColor: '#e2e8f0'
                          }}
                          value={row.discount_pct || ''}
                          onChange={(e) => handleItemFieldChange(idx, 'discount_pct', e.target.value)}
                        />
                      </td>

                      {/* AMOUNT Column */}
                      <td style={{ padding: '3px 12px', textAlign: 'right', fontWeight: 900, fontSize: '0.92rem', color: '#0f172a', fontFamily: 'monospace' }}>
                        ₹{row.amount ? row.amount.toFixed(2) : '0.00'}
                      </td>

                      {/* REMOVE ROW */}
                      <td style={{ textAlign: 'center', padding: '3px 4px' }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: '4px'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                          title="Remove row"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Add Row Bar */}
          <div style={{
            padding: '8px 16px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setItems([...items, createEmptyRow()])}
              style={{ fontWeight: 800, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Plus size={14} /> + Add Item
            </button>

            {vasanSummaryList.length > 0 && (
              <div style={{ fontSize: '0.78rem', color: '#b45309', background: '#fef3c7', padding: '4px 10px', borderRadius: '4px', border: '1px solid #fde68a', fontWeight: 700 }}>
                🥣 Utensil Packing: {vasanSummaryList.join(' | ')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. BOTTOM FIXED VYAPAR FOOTER SUMMARY & ACTION BAR */}
      <div style={{
        height: '64px',
        background: '#ffffff',
        borderTop: '1.5px solid #cbd5e1',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        boxShadow: '0 -4px 12px rgba(0,0,0,0.05)'
      }}>
        {/* Left Side Totals: Items, Weight, Subtotal, Delivery */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '0.86rem' }}>
          <div>
            Total Items: <strong style={{ color: '#0f172a' }}>{totalItemsCount}</strong>
          </div>
          <div>
            Total Weight: <strong style={{ color: '#d32f2f', fontSize: '0.98rem' }}>{totalWeightKg} KG</strong>
          </div>
          <div>
            Items Total: <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>₹{itemsSubtotal.toFixed(2)}</strong>
          </div>
          {chargeNum > 0 && (
            <div>
              Delivery: <strong style={{ color: '#2563eb' }}>+ ₹{chargeNum}</strong>
            </div>
          )}
          {advNum > 0 && (
            <div>
              Advance Paid: <strong style={{ color: '#16a34a' }}>- ₹{advNum}</strong>
            </div>
          )}
        </div>

        {/* Right Side Grand Total & Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
              Grand Total
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace', lineHeight: 1.1 }}>
              ₹{grandTotal.toFixed(2)}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleRequestClose}
              style={{ fontWeight: 800, padding: '8px 18px' }}
            >
              Cancel (Esc)
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={saving}
              style={{
                fontWeight: 900,
                fontSize: '0.92rem',
                padding: '8px 24px',
                background: '#16a34a',
                borderColor: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 6px -1px rgba(22, 163, 74, 0.4)'
              }}
            >
              <Save size={18} />
              {saving ? 'Saving...' : (order?.id ? 'Update Order (Ctrl+S)' : 'Save Advance Order (Ctrl+S)')}
            </button>
          </div>
        </div>
      </div>

      {/* Close Confirmation Dialog */}
      {showCloseConfirm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          zIndex: 100000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(2px)'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '420px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#0f172a', fontSize: '1.1rem', fontWeight: 800 }}>
              Discard Advance Order?
            </h3>
            <p style={{ margin: '0 0 20px 0', color: '#64748b', fontSize: '0.88rem' }}>
              You have filled details in the order. Are you sure you want to discard without saving?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowCloseConfirm(false)}
                style={{ fontWeight: 700 }}
              >
                No, Keep Editing
              </button>
              <button
                type="button"
                className="btn btn-vyapar-red btn-sm"
                onClick={() => {
                  setShowCloseConfirm(false);
                  onClose();
                }}
                style={{ fontWeight: 800 }}
              >
                Yes, Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🎉 ORDER BOOKED SUCCESS CONFIRMATION MODAL */}
      {savedOrderSuccess && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          zIndex: 100001,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(4px)',
          padding: '16px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            maxWidth: '520px',
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
            overflow: 'hidden',
            animation: 'scaleUp 0.2s ease-out'
          }}>
            {/* Success Header Banner */}
            <div style={{
              background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
              color: '#ffffff',
              padding: '24px 20px',
              textAlign: 'center'
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                background: '#ffffff',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px auto',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)'
              }}>
                <CheckCircle2 size={38} color="#16a34a" />
              </div>
              <h2 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', fontWeight: 900 }}>
                🎉 Advance Order Booked Successfully!
              </h2>
              <div style={{ fontSize: '0.84rem', opacity: 0.9 }}>
                Caterer advance order has been recorded successfully.
              </div>
            </div>

            {/* Order Details Receipt Card */}
            <div style={{ padding: '20px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>Order Number</span>
                <span style={{
                  fontSize: '0.92rem',
                  fontWeight: 900,
                  fontFamily: 'monospace',
                  background: '#dcfce7',
                  color: '#166534',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  border: '1px solid #86efac'
                }}>
                  #{savedOrderSuccess.order_no}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.86rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Customer / Caterer:</span>
                  <strong style={{ color: '#0f172a' }}>{savedOrderSuccess.customer_name}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Delivery Date & Time:</span>
                  <strong style={{ color: '#1d4ed8' }}>
                    {formatDate(savedOrderSuccess.delivery_date)} ({savedOrderSuccess.delivery_time} • {savedOrderSuccess.delivery_slot === 'MORNING' ? '🌅 Morning' : '🌇 Evening'})
                  </strong>
                </div>

                {savedOrderSuccess.delivery_venue && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Delivery Venue:</span>
                    <strong style={{ color: '#0f172a' }}>{savedOrderSuccess.delivery_venue}</strong>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Total Sweets Weight:</span>
                  <strong style={{ color: '#d32f2f' }}>{savedOrderSuccess.total_items} Items • {savedOrderSuccess.total_weight_kg} KG</strong>
                </div>

                <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, color: '#334155' }}>Grand Total:</span>
                  <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace' }}>
                    {formatCurrency(savedOrderSuccess.total_amount)}
                  </span>
                </div>

                {savedOrderSuccess.advance_paid > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: 800, fontSize: '0.82rem' }}>
                    <span>Advance Received:</span>
                    <span>{formatCurrency(savedOrderSuccess.advance_paid)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ padding: '16px 20px', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={async () => {
                  try {
                    const res = await api.getDailyOrdersSummary(savedOrderSuccess.delivery_date);
                    setChefDailySummary((res as any).data || res);
                    setIsChefPrintSuccessOpen(true);
                  } catch (e) {
                    console.error(e);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '10px',
                  fontWeight: 900,
                  fontSize: '0.88rem',
                  background: '#f59e0b',
                  borderColor: '#f59e0b',
                  color: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 6px -1px rgba(245, 158, 11, 0.4)'
                }}
              >
                <ChefHat size={18} /> 🖨️ Print Chef Sheet (Hindi)
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1, fontWeight: 800, fontSize: '0.84rem', padding: '8px' }}
                  onClick={() => {
                    setSavedOrderSuccess(null);
                    // Reset fields for fresh new booking
                    setCustomerId('');
                    setCustomerName('');
                    setCustomerMobile('');
                    setDeliveryVenue('');
                    setCustomerDeliveryCharge(0);
                    setDriverDeliveryRate(0);
                    setAdvancePaid(0);
                    setNotes('');
                    setItems([
                      createEmptyRow(),
                      createEmptyRow(),
                      createEmptyRow(),
                      createEmptyRow(),
                      createEmptyRow(),
                      createEmptyRow()
                    ]);
                  }}
                >
                  + Book Another Order
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  style={{
                    flex: 1,
                    fontWeight: 900,
                    fontSize: '0.84rem',
                    padding: '8px',
                    background: '#16a34a',
                    borderColor: '#16a34a'
                  }}
                  onClick={() => {
                    const saved = savedOrderSuccess;
                    setSavedOrderSuccess(null);
                    onSuccess(saved);
                  }}
                >
                  ✅ Done / Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chef Production Sheet from Success Modal */}
      {isChefPrintSuccessOpen && chefDailySummary && (
        <ChefProductionPrintModal
          isOpen={isChefPrintSuccessOpen}
          summary={chefDailySummary}
          onClose={() => setIsChefPrintSuccessOpen(false)}
        />
      )}

      {/* Add New Venue Modal */}
      <AddNewVenueModal
        isOpen={isAddNewVenueOpen}
        initialVenueName={venueSearchQuery}
        onClose={() => setIsAddNewVenueOpen(false)}
        onSuccess={(newLoc) => {
          setLocations(prev => [...prev, newLoc]);
          handleSelectVenueLocation(newLoc);
        }}
      />
    </div>
  );
};
