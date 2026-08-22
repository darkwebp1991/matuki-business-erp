import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Printer, 
  Save, 
  MapPin, 
  Truck, 
  Search, 
  Clock, 
  Star, 
  Check, 
  X,
  ChevronDown,
  Navigation,
  CreditCard,
  Layers,
  ArrowDownLeft,
  Calendar,
  UserPlus,
  User,
  Phone,
  Mic,
  Sparkles
} from 'lucide-react';
import { api } from '../../api/client';
import { Product, Customer, Driver, DeliveryLocation, AreaDeliveryRate, AdvanceOrder, Sale, VasanMasterItem } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { CustomerModal } from '../parties/CustomerModal';
import { VoiceSearchButton } from '../common/VoiceSearchButton';
import { AddNewVenueModal } from '../common/AddNewVenueModal';

interface NewSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCustomerId?: number;
  initialOrder?: AdvanceOrder | null;
  editingSale?: Sale | null;
  duplicateSale?: Sale | null;
  onSuccess: (newSale: any, shouldPrint?: boolean) => void;
}

interface SaleRowItem {
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
}

export const NewSaleModal: React.FC<NewSaleModalProps> = ({
  isOpen,
  onClose,
  initialCustomerId,
  initialOrder,
  editingSale,
  duplicateSale,
  onSuccess
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [locations, setLocations] = useState<DeliveryLocation[]>([]);
  const [areaRates, setAreaRates] = useState<AreaDeliveryRate[]>([]);

  // Bill Basic Info
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [customerId, setCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('Cash Walk-in Customer');
  const [customerMobile, setCustomerMobile] = useState<string>('');
  const [customerBalance, setCustomerBalance] = useState<number>(0);
  const [customerSearchText, setCustomerSearchText] = useState<string>('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState<boolean>(false);
  const [selectedCustomerHighlightIdx, setSelectedCustomerHighlightIdx] = useState<number>(0);
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState<boolean>(false);
  const customerInputRef = useRef<HTMLInputElement>(null);
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  // Delivery & Dispatch Details (Toggleable Drawer for Clean Minimal Screen)
  const [showDeliveryDrawer, setShowDeliveryDrawer] = useState<boolean>(false);
  const [venueSearchQuery, setVenueSearchQuery] = useState<string>('');
  const [isVenueDropdownOpen, setIsVenueDropdownOpen] = useState<boolean>(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [selectedAreaId, setSelectedAreaId] = useState<string>('');
  const [deliveryVenue, setDeliveryVenue] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [googleMapLink, setGoogleMapLink] = useState<string>('');
  const [isAddNewVenueOpen, setIsAddNewVenueOpen] = useState<boolean>(false);
  const venueSearchRef = useRef<HTMLDivElement>(null);
  
  // Rickshaw Driver (Selected for delivery dispatch)
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [driverName, setDriverName] = useState<string>('');
  const [driverMobile, setDriverMobile] = useState<string>('');

  // Financials: Customer Delivery Charge & Rickshaw Driver Rent (Area-Wise Auto Calculated)
  const [tripType, setTripType] = useState<'ROUND_TRIP' | 'ONE_WAY'>('ROUND_TRIP');
  const [deliveryCharge, setDeliveryCharge] = useState<number>(0);
  const [rickshawRent, setRickshawRent] = useState<number>(150);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  
  // Advance Deposit Deductions (Auto-Applied from Customer Advance Held)
  const [customerAdvanceBalance, setCustomerAdvanceBalance] = useState<number>(0);
  const [advanceAdjusted, setAdvanceAdjusted] = useState<number>(0);

  // Party-Wise Last Billed Item Rates Map
  const [customerLastRates, setCustomerLastRates] = useState<Record<number, { rate: number; discount: number; last_date: string; invoice_no: string }>>({});

  // AI Smart Recommendation State
  const [frequentVenues, setFrequentVenues] = useState<Array<{ venue_name: string; usage_count: number; address?: string; area_landmark?: string; customer_charge?: number; driver_rent?: number }>>([]);
  const [frequentProducts, setFrequentProducts] = useState<Array<{ product_id: number | null; item_name: string; order_count: number; total_qty: number; unit: string; rate: number; code?: string }>>([]);
  const [productVasanMap, setProductVasanMap] = useState<Record<string | number, string>>({});

  // Vasan Master Rates
  const [vasanMasterList, setVasanMasterList] = useState<VasanMasterItem[]>([]);

  // Close Confirmation Dialog
  const [showCloseConfirm, setShowCloseConfirm] = useState<boolean>(false);

  // Payment Mode
  const [paymentMode, setPaymentMode] = useState<string>('CREDIT');
  const [paidAmount, setPaidAmount] = useState<number | ''>(0);
  const [notes, setNotes] = useState<string>('');

  // Active Item Autocomplete Dropdown State (per row index)
  const [activeItemDropdownIdx, setActiveItemDropdownIdx] = useState<number | null>(null);
  const [itemSearchText, setItemSearchText] = useState<string>('');
  const [itemHighlightIdx, setItemHighlightIdx] = useState<number>(0);
  const itemInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const qtyInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const rateInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const discountInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  const createEmptyRow = (isContainerRow = false, defaultVasan = 'NONE'): SaleRowItem => ({
    product_id: null,
    product_name: isContainerRow ? 'Outer Packing (Crate / Bucket)' : '',
    item_code: '',
    unit: isContainerRow ? 'CONTAINER' : 'KG',
    quantity: isContainerRow ? 0 : 1,
    rate: '',
    discount_pct: 0,
    vasan_type: defaultVasan,
    vasan_qty: isContainerRow ? 1 : 0,
    amount: 0
  });

  const [items, setItems] = useState<SaleRowItem[]>([
    createEmptyRow(),
    createEmptyRow(),
    createEmptyRow(),
    createEmptyRow(),
    createEmptyRow(),
    createEmptyRow()
  ]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Check if any bill information has been filled in
  const isDirty = () => {
    const hasItems = items.some(i => 
      (i.product_id !== null && i.product_id !== 0) || 
      (i.product_name && i.product_name !== 'Outer Packing (Crate / Bucket)' && i.product_name.trim() !== '') ||
      (i.quantity !== '' && Number(i.quantity) > 0 && i.product_id !== null) ||
      (i.amount > 0) ||
      (i.vasan_type !== 'NONE' && Number(i.vasan_qty) > 0)
    );
    const hasCustomer = Boolean(customerId);
    const hasDelivery = Boolean(deliveryVenue) || (deliveryAddress && deliveryAddress.trim() !== '');
    const hasPaid = paidAmount !== '' && Number(paidAmount) > 0;
    const hasNotes = Boolean(notes && notes.trim() !== '');

    return hasItems || hasCustomer || hasDelivery || hasPaid || hasNotes;
  };

  const handleRequestClose = () => {
    if (isDirty()) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  // Load masters on mount
  const fetchMasters = () => {
    Promise.all([
      api.getProducts({ active: true }),
      api.getCustomers({ active: true }),
      api.getDrivers(),
      api.getDeliveryLocations(),
      api.getAreaDeliveryRates(),
      api.getVasanMasterList()
    ]).then(([prods, custs, drvs, locs, areas, vasans]) => {
      setProducts(prods);
      setCustomers(custs);
      setDrivers(drvs);
      setLocations(locs);
      setAreaRates(areas || []);
      setVasanMasterList(vasans || []);

      const defaultDrv = 
        drvs.find(d => d.is_default === 1) || 
        drvs.find(d => d.is_personal === 1) || 
        drvs.find(d => d.name.toLowerCase().includes('personal') || d.name.toLowerCase().includes('self')) || 
        (drvs.length > 0 ? drvs[0] : null);

      if (defaultDrv && !selectedDriverId) {
        setSelectedDriverId(String(defaultDrv.id));
        setDriverName(defaultDrv.name);
        setDriverMobile(defaultDrv.mobile || '');
      }
    }).catch(console.error);
  };

  useEffect(() => {
    fetchMasters();
  }, []);

  // Handle outside click to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node) &&
          customerInputRef.current && !customerInputRef.current.contains(event.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
      if (venueSearchRef.current && !venueSearchRef.current.contains(event.target as Node)) {
        setIsVenueDropdownOpen(false);
      }
      const target = event.target as HTMLElement;
      if (!target.closest('.item-autocomplete-wrapper')) {
        setActiveItemDropdownIdx(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();

        if (activeItemDropdownIdx !== null) {
          setActiveItemDropdownIdx(null);
          return;
        }
        if (isCustomerDropdownOpen) {
          setIsCustomerDropdownOpen(false);
          return;
        }
        if (isVenueDropdownOpen) {
          setIsVenueDropdownOpen(false);
          return;
        }
        if (showCloseConfirm) {
          setShowCloseConfirm(false);
          return;
        }
        handleRequestClose();
        return;
      }

      // [F2] Focus Customer search
      if (e.key === 'F2') {
        e.preventDefault();
        customerInputRef.current?.focus();
        customerInputRef.current?.select();
        setIsCustomerDropdownOpen(true);
        return;
      }

      // [F3] Add Item Row
      if (e.key === 'F3') {
        e.preventDefault();
        handleAddRow();
        return;
      }

      // [Ctrl+S] or [F8] Save Voucher
      if ((e.ctrlKey && e.key.toLowerCase() === 's') || e.key === 'F8') {
        e.preventDefault();
        handleSave(false);
        return;
      }

      // [Ctrl+P] Save and Print
      if (e.ctrlKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handleSave(true);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, items, customerId, deliveryVenue, deliveryAddress, paidAmount, notes, activeItemDropdownIdx, isVenueDropdownOpen, isCustomerDropdownOpen, showCloseConfirm]);

  // Helper: Trip Type Toggle with automatic 50% / 100% rate adjustment
  const handleTripTypeChange = (newType: 'ROUND_TRIP' | 'ONE_WAY') => {
    if (newType === tripType) return;
    setTripType(newType);
    if (newType === 'ONE_WAY') {
      setDeliveryCharge(prev => prev > 0 ? Math.round(prev / 2) : prev);
      setRickshawRent(prev => prev > 0 ? Math.round(prev / 2) : prev);
    } else {
      setDeliveryCharge(prev => prev > 0 ? Math.round(prev * 2) : prev);
      setRickshawRent(prev => prev > 0 ? Math.round(prev * 2) : prev);
    }
  };

  // Helper: Auto-detect Area from address/venue text and apply Customer & Driver rates
  const matchAndApplyArea = (text: string, currentTripType: 'ROUND_TRIP' | 'ONE_WAY' = tripType) => {
    if (!text || areaRates.length === 0) return;
    const lower = text.toLowerCase();
    const matched = areaRates.find(a => {
      const clean = a.area_name.toLowerCase().replace(/\(.*?\)/g, '').trim();
      return lower.includes(clean) || (a.notes && a.notes.toLowerCase().split(',').some(n => lower.includes(n.trim())));
    });
    if (matched) {
      setSelectedAreaId(String(matched.id));
      const mult = currentTripType === 'ONE_WAY' ? 0.5 : 1.0;
      setDeliveryCharge(Math.round(matched.customer_charge * mult));
      setRickshawRent(Math.round(matched.driver_rent * mult));
    }
  };

  // Filter 100+ Customers by Name, Mobile, City, or Code
  const filteredCustomers = customers.filter(c => {
    if (!customerSearchText) return true;
    const q = customerSearchText.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.mobile && c.mobile.includes(q)) ||
      (c.customer_no && c.customer_no.toLowerCase().includes(q)) ||
      (c.city && c.city.toLowerCase().includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q))
    );
  });

  const handleSelectCustomer = (cust: Customer | null) => {
    if (cust) {
      setCustomerId(String(cust.id));
      setCustomerName(cust.name);
      setCustomerSearchText(cust.name);
      setCustomerMobile(cust.mobile || '');
      setCustomerBalance(cust.current_balance || 0);

      // Fetch customer's available advance deposit
      const adv = Number(cust.advance_balance || 0) || (cust.current_balance < 0 ? Math.abs(cust.current_balance) : 0);
      setCustomerAdvanceBalance(adv);
      if (adv > 0) {
        setAdvanceAdjusted(adv);
      } else {
        setAdvanceAdjusted(0);
      }

      if (cust.address && !deliveryAddress) {
        setDeliveryAddress(cust.address);
        setDeliveryVenue(cust.name + ' Kitchen/Site');
        setVenueSearchQuery(cust.name);
        matchAndApplyArea(cust.address);
      }

      // Fetch party-specific previous item rates
      api.getCustomerLastRates(cust.id).then(rateMap => {
        const rates = rateMap || {};
        setCustomerLastRates(rates);

        setItems(prevItems => prevItems.map(row => {
          if (row.product_id) {
            const prod = products.find(p => p.id === row.product_id);
            const customRate = (rates[row.product_id] !== undefined && rates[row.product_id].rate > 0) 
              ? rates[row.product_id].rate 
              : (prod?.selling_rate || row.rate);
            
            const qty = row.quantity === '' ? 0 : Number(row.quantity);
            const currentRate = customRate === '' ? 0 : Number(customRate);
            const disc = Number(row.discount_pct || 0);
            const amt = (qty * currentRate) * (1 - disc / 100);
            return {
              ...row,
              rate: Number(customRate) > 0 ? customRate : '',
              amount: Math.round(amt * 100) / 100
            };
          }
          return row;
        }));
      }).catch(console.error);

      // Fetch AI Smart Recommendations
      api.getCustomerSmartRecommendations(cust.id).then(res => {
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
            if (top.customer_charge) setDeliveryCharge(top.customer_charge);
            if (top.driver_rent) setRickshawRent(top.driver_rent);
          }
          if (res.frequentDriver && res.frequentDriver.id && !selectedDriverId) {
            setSelectedDriverId(String(res.frequentDriver.id));
            setDriverName(res.frequentDriver.name);
          }
        }
      }).catch(console.error);
    } else {
      setCustomerId('');
      setCustomerName('Cash Walk-in Customer');
      setCustomerSearchText('');
      setCustomerMobile('');
      setCustomerBalance(0);
      setCustomerAdvanceBalance(0);
      setAdvanceAdjusted(0);
      setCustomerLastRates({});
      setFrequentVenues([]);
      setFrequentProducts([]);

      setItems(prevItems => prevItems.map(row => {
        if (row.product_id) {
          const prod = products.find(p => p.id === row.product_id);
          const defRate = prod?.selling_rate || row.rate;
          const qty = row.quantity === '' ? 0 : Number(row.quantity);
          const currentRate = defRate === '' ? 0 : Number(defRate);
          const disc = Number(row.discount_pct || 0);
          const amt = (qty * currentRate) * (1 - disc / 100);
          return {
            ...row,
            rate: Number(defRate) > 0 ? defRate : '',
            amount: Math.round(amt * 100) / 100
          };
        }
        return row;
      }));
    }

    setIsCustomerDropdownOpen(false);

    // Auto-focus first item row after selecting customer
    setTimeout(() => {
      itemInputRefs.current[0]?.focus();
    }, 100);
  };

  // Pre-fill from Advance Order or Editing/Duplicating Sale
  useEffect(() => {
    if (!isOpen) return;

    if (initialOrder) {
      if (initialOrder.customer_id) {
        const c = customers.find(x => x.id === initialOrder.customer_id);
        if (c) handleSelectCustomer(c);
      } else {
        setCustomerName(initialOrder.customer_name);
        setCustomerSearchText(initialOrder.customer_name);
        setCustomerMobile(initialOrder.customer_mobile || '');
      }

      if (initialOrder.delivery_venue) {
        setDeliveryVenue(initialOrder.delivery_venue);
        setDeliveryAddress(initialOrder.delivery_venue);
        setVenueSearchQuery(initialOrder.delivery_venue);
        matchAndApplyArea(initialOrder.delivery_venue);
      }

      if (initialOrder.customer_delivery_charge) {
        setDeliveryCharge(Number(initialOrder.customer_delivery_charge));
      }
      if (initialOrder.driver_delivery_rate) {
        setRickshawRent(Number(initialOrder.driver_delivery_rate));
      }

      if (initialOrder.notes) {
        setNotes(`[Advance Order #${initialOrder.order_no}] ${initialOrder.notes}`);
      } else {
        setNotes(`[Advance Order #${initialOrder.order_no}]`);
      }

      if (initialOrder.items && initialOrder.items.length > 0) {
        const orderRows: SaleRowItem[] = initialOrder.items.map(it => {
          const qty = Number(it.quantity) || 0;
          const matchedProd = (it.product_id ? products.find(p => p.id === it.product_id) : null) ||
                              products.find(p => p.name.toLowerCase().trim() === (it.item_name || '').toLowerCase().trim());
          
          const prodId = it.product_id || matchedProd?.id || null;
          let currentRate = Number(it.rate) || 0;
          if (matchedProd && Number(matchedProd.selling_rate) > 0) {
            currentRate = Number(matchedProd.selling_rate);
          }

          return {
            product_id: prodId,
            product_name: it.item_name,
            item_code: matchedProd?.code || '',
            unit: it.unit || matchedProd?.unit || 'KG',
            quantity: qty,
            rate: currentRate > 0 ? currentRate : (Number(it.rate) || ''),
            discount_pct: 0,
            vasan_type: 'Milton',
            vasan_qty: Math.max(1, Math.ceil(qty / 15)),
            amount: Math.round(qty * currentRate * 100) / 100
          };
        });

        while (orderRows.length < 6) {
          orderRows.push(createEmptyRow());
        }
        setItems(orderRows);
      }
    } else if (editingSale || duplicateSale) {
      const targetSale = (editingSale || duplicateSale)!;
      const isDuplicate = Boolean(duplicateSale);

      const applySaleData = (saleData: any) => {
        if (isDuplicate) {
          setDate(new Date().toISOString().split('T')[0]);
        } else {
          setDate(saleData.date || new Date().toISOString().split('T')[0]);
        }

        if (saleData.customer_id) {
          const c = customers.find(x => x.id === saleData.customer_id);
          if (c) {
            handleSelectCustomer(c);
          } else {
            setCustomerId(String(saleData.customer_id));
            setCustomerName(saleData.customer_name || 'Cash Walk-in Customer');
            setCustomerSearchText(saleData.customer_name || '');
            setCustomerMobile(saleData.customer_mobile || '');
          }
        } else {
          setCustomerId('');
          setCustomerName(saleData.customer_name || 'Cash Walk-in Customer');
          setCustomerSearchText('');
          setCustomerMobile(saleData.customer_mobile || '');
          setCustomerLastRates({});
        }

        setDeliveryVenue(saleData.delivery_venue || '');
        setDeliveryAddress(saleData.delivery_address || '');
        setGoogleMapLink((saleData as any).google_map_link || '');
        setVenueSearchQuery(saleData.delivery_venue || '');
        if (saleData.delivery_venue || saleData.delivery_address || (saleData as any).google_map_link) {
          setShowDeliveryDrawer(true);
        }

        if (saleData.driver_id) {
          setSelectedDriverId(String(saleData.driver_id));
          setDriverName(saleData.driver_name || '');
          setDriverMobile(saleData.driver_mobile || '');
        }

        setDeliveryCharge(Number(saleData.delivery_charge || 0));
        setRickshawRent(Number(saleData.rickshaw_rent || 0));
        setDiscountAmount(Number(saleData.discount_amount || 0));
        setTripType(saleData.trip_type === 'ONE_WAY' ? 'ONE_WAY' : 'ROUND_TRIP');

        if (isDuplicate) {
          setPaymentMode('CREDIT');
          setPaidAmount(0);
          setAdvanceAdjusted(0);
          setNotes(saleData.notes ? `[Repeat Bill] ${saleData.notes}` : '');
        } else {
          setAdvanceAdjusted(Number(saleData.advance_adjusted || 0));
          setPaymentMode(saleData.payment_mode || 'CREDIT');
          setPaidAmount(Number(saleData.paid_amount || 0));
          setNotes(saleData.notes || '');
        }

        if (saleData.items && saleData.items.length > 0) {
          const saleRows: SaleRowItem[] = saleData.items.map((it: any) => {
            const qty = Number(it.quantity) || 0;
            const rate = Number(it.rate) || 0;
            const disc = Number(it.discount) || 0;
            const discPct = (qty * rate) > 0 ? (disc / (qty * rate)) * 100 : 0;
            return {
              product_id: it.product_id || null,
              product_name: it.product_name,
              item_code: it.product_code || '',
              unit: it.unit || 'KG',
              quantity: qty,
              rate: rate,
              discount_pct: Math.round(discPct * 100) / 100,
              vasan_type: it.vasan_type || 'NONE',
              vasan_qty: Number(it.vasan_qty) || 0,
              amount: Number(it.amount) || (qty * rate - disc)
            };
          });

          while (saleRows.length < 6) {
            saleRows.push(createEmptyRow());
          }
          setItems(saleRows);
        }
      };

      if (!targetSale.items || targetSale.items.length === 0) {
        api.getSaleById(targetSale.id).then(res => {
          const fullData = (res as any).data || res;
          applySaleData(fullData);
        }).catch(err => {
          console.error('Error fetching full sale details for modal:', err);
          applySaleData(targetSale);
        });
      } else {
        applySaleData(targetSale);
      }
    } else if (initialCustomerId) {
      const c = customers.find(x => x.id === initialCustomerId);
      if (c) handleSelectCustomer(c);
    }
  }, [isOpen, initialOrder, editingSale, duplicateSale, initialCustomerId, customers]);

  const handleSelectVenueLocation = (loc: DeliveryLocation) => {
    setSelectedLocationId(String(loc.id));
    const formattedVenue = loc.area_landmark ? `${loc.venue_name} (${loc.area_landmark})` : loc.venue_name;
    setDeliveryVenue(formattedVenue);
    setVenueSearchQuery(formattedVenue);
    setDeliveryAddress(`${loc.address}${loc.area_landmark ? ' (' + loc.area_landmark + ')' : ''}`);
    if ((loc as any).google_map_link) {
      setGoogleMapLink((loc as any).google_map_link);
    }
    setIsVenueDropdownOpen(false);

    const mult = tripType === 'ONE_WAY' ? 0.5 : 1.0;
    const custCharge = Number(loc.customer_charge ?? 0);
    const drivRent = Number(loc.driver_rent ?? 0);

    setDeliveryCharge(Math.round(custCharge * mult));
    setRickshawRent(Math.round(drivRent * mult));
  };

  const handleDriverChange = (drvId: string) => {
    setSelectedDriverId(drvId);
    if (drvId) {
      const drv = drivers.find(d => d.id === Number(drvId));
      if (drv) {
        setDriverName(drv.name);
        setDriverMobile(drv.mobile);
      }
    } else {
      setDriverName('');
      setDriverMobile('');
    }
  };

  const handleSelectProduct = (index: number, prod: Product | null) => {
    const updated = [...items];
    if (!prod) {
      updated[index] = {
        ...updated[index],
        product_id: null,
        product_name: updated[index].product_name || 'Outer Packing (Crate / Bucket)',
        quantity: 0,
        rate: 0,
        amount: 0
      };
      setItems(updated);
      setActiveItemDropdownIdx(null);
      return;
    }

    const qty = updated[index].quantity !== '' ? Number(updated[index].quantity) : 1;

    let rate = Number(prod.selling_rate || 0);
    if (prod.id && customerLastRates[prod.id] && Number(customerLastRates[prod.id].rate) > 0) {
      rate = Number(customerLastRates[prod.id].rate);
    }

    const discPct = Number(updated[index].discount_pct || 0);
    const amt = (qty * rate) * (1 - discPct / 100);

    const getSmartVasanType = (p: Product) => {
      if (p.id && productVasanMap[p.id]) return productVasanMap[p.id];
      if (p.name && productVasanMap[p.name.toLowerCase().trim()]) return productVasanMap[p.name.toLowerCase().trim()];
      const lName = p.name.toLowerCase();
      if (p.unit === 'POUCH' || lName.includes('pouch') || lName.includes('bottle') || lName.includes('dahi') || lName.includes('chaas')) return 'Carat';
      if (lName.includes('jamun') || lName.includes('gulab') || lName.includes('rasgulla')) return 'Dol';
      if (lName.includes('matho') || lName.includes('shrikhand') || lName.includes('rabdi') || lName.includes('basundi') || lName.includes('kheer') || lName.includes('syrup')) return 'Milton';
      if (lName.includes('barfi') || lName.includes('penda') || lName.includes('kaju') || lName.includes('katli') || lName.includes('ladu') || lName.includes('choki')) return 'Choki';
      return 'NONE';
    };

    const suggestedVasan = getSmartVasanType(prod);
    const suggestedVasanQty = suggestedVasan !== 'NONE' ? (Math.ceil(qty / 15) || 1) : 0;

    updated[index] = {
      ...updated[index],
      product_id: prod.id,
      product_name: prod.name,
      item_code: prod.code,
      unit: prod.unit || 'KG',
      quantity: qty,
      rate: rate > 0 ? rate : '',
      discount_pct: discPct,
      vasan_type: suggestedVasan,
      vasan_qty: suggestedVasanQty,
      amount: Math.round(amt * 100) / 100
    };
    setItems(updated);
    setActiveItemDropdownIdx(null);

    // If this is the last row, automatically append a new row
    if (index === items.length - 1) {
      setItems([...updated, createEmptyRow()]);
    }

    // Auto-focus Quantity input
    setTimeout(() => {
      qtyInputRefs.current[index]?.focus();
      qtyInputRefs.current[index]?.select();
    }, 50);
  };

  const handleItemFieldChange = (index: number, field: keyof SaleRowItem, value: any) => {
    const updated = [...items];
    const row = { ...updated[index], [field]: value };

    const qty = row.quantity === '' ? 0 : Number(row.quantity);
    const rate = row.rate === '' ? 0 : Number(row.rate);
    const discPct = Number(row.discount_pct || 0);

    const baseAmount = qty * rate;
    const discountValue = baseAmount * (discPct / 100);
    row.amount = Math.round((baseAmount - discountValue) * 100) / 100;

    updated[index] = row;
    setItems(updated);
  };

  const handleAddRow = () => {
    setItems(prev => [...prev, createEmptyRow()]);
    setTimeout(() => {
      itemInputRefs.current[items.length]?.focus();
    }, 50);
  };

  const handleRemoveRow = (index: number) => {
    if (items.length <= 1) {
      setItems([createEmptyRow()]);
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const totalWithDelivery = subtotal + Number(deliveryCharge || 0) - Number(discountAmount || 0);
  const roundOff = Math.round(totalWithDelivery) - totalWithDelivery;
  const grandTotal = Math.round(totalWithDelivery);

  const currentAdvanceDeduction = Math.min(Number(advanceAdjusted || 0), customerAdvanceBalance, grandTotal);
  const netAfterAdvance = Math.max(0, grandTotal - currentAdvanceDeduction);
  const effectivePaid = paidAmount === '' ? 0 : Number(paidAmount);
  const balanceDue = paymentMode === 'CASH' ? 0 : Math.max(0, netAfterAdvance - effectivePaid);

  const handleSave = async (printAfter = false) => {
    const validItems = items.filter(i => 
      (i.product_id !== null && i.product_id !== 0) || 
      (i.product_name && i.product_name.trim() !== '') || 
      (i.vasan_type !== 'NONE' && Number(i.vasan_qty) > 0)
    );

    if (validItems.length === 0) {
      setError('Please add at least 1 item or Outer Packing row to the bill.');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const salePayload = {
        date,
        customer_id: customerId ? Number(customerId) : null,
        customer_name: customerName.trim() || 'Cash Walk-in Customer',
        customer_mobile: customerMobile.trim(),
        delivery_venue: deliveryVenue.trim(),
        delivery_address: deliveryAddress.trim(),
        google_map_link: googleMapLink.trim(),
        driver_id: selectedDriverId ? Number(selectedDriverId) : null,
        driver_name: driverName.trim(),
        driver_mobile: driverMobile.trim(),
        delivery_charge: Number(deliveryCharge) || 0,
        rickshaw_rent: Number(rickshawRent) || 0,
        trip_type: tripType,
        subtotal: Math.round(subtotal * 100) / 100,
        tax_amount: 0,
        discount_amount: Number(discountAmount) || 0,
        advance_adjusted: Math.round(currentAdvanceDeduction * 100) / 100,
        round_off: Math.round(roundOff * 100) / 100,
        grand_total: grandTotal,
        paid_amount: effectivePaid,
        due_amount: balanceDue,
        payment_mode: paymentMode,
        notes: notes.trim(),
        billed_by: (() => {
          try {
            const saved = localStorage.getItem('matuki_user');
            const u = saved ? JSON.parse(saved) : null;
            return u?.full_name || u?.username || 'Suraj Bhai';
          } catch (e) {
            return 'Suraj Bhai';
          }
        })(),
        items: validItems.map(it => ({
          product_id: it.product_id || null,
          product_name: it.product_name,
          product_code: it.item_code || '',
          unit: it.unit || 'KG',
          quantity: it.quantity === '' ? 0 : Number(it.quantity),
          rate: it.rate === '' ? 0 : Number(it.rate),
          discount: (Number(it.quantity || 0) * Number(it.rate || 0)) * (Number(it.discount_pct || 0) / 100),
          vasan_type: it.vasan_type || 'NONE',
          vasan_qty: Number(it.vasan_qty) || 0,
          amount: it.amount
        }))
      };

      let result: any;
      if (editingSale) {
        result = await api.updateSale(editingSale.id, salePayload);
      } else {
        result = await api.createSale(salePayload);
      }

      if (initialOrder && initialOrder.id) {
        try {
          await api.updateAdvanceOrderStatus(initialOrder.id, 'COMPLETED');
        } catch (linkErr) {
          console.error('Failed to link converted advance order:', linkErr);
        }
      }

      const actualSale = (result as any)?.data || result;
      onSuccess(actualSale, printAfter);
    } catch (err: any) {
      setError(err.message || 'Failed to save sales bill');
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
        height: '46px',
        background: '#ffffff',
        borderBottom: '1.5px solid #e2e8f0',
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {editingSale ? (
              `✏️ Edit Sale Bill #${editingSale.invoice_no}`
            ) : duplicateSale ? (
              <>
                <span style={{ color: '#2563eb' }}>📋 Duplicate Bill</span>
                <span style={{ fontSize: '0.72rem', background: '#dbeafe', color: '#1e40af', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                  (Copy of #{duplicateSale.invoice_no})
                </span>
              </>
            ) : (
              '🛒 Sale Invoice'
            )}
          </h2>

          {/* Credit / Cash / UPI Pill Toggle */}
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
                padding: '3px 12px',
                borderRadius: '16px',
                border: 'none',
                background: paymentMode === 'CREDIT' ? '#3b82f6' : 'transparent',
                color: paymentMode === 'CREDIT' ? '#ffffff' : '#475569',
                fontWeight: 800,
                fontSize: '0.76rem',
                cursor: 'pointer'
              }}
              onClick={() => {
                setPaymentMode('CREDIT');
                setPaidAmount(0);
              }}
            >
              Credit (Khata)
            </button>
            <button
              type="button"
              style={{
                padding: '3px 12px',
                borderRadius: '16px',
                border: 'none',
                background: paymentMode === 'CASH' ? '#10b981' : 'transparent',
                color: paymentMode === 'CASH' ? '#ffffff' : '#475569',
                fontWeight: 800,
                fontSize: '0.76rem',
                cursor: 'pointer'
              }}
              onClick={() => {
                setPaymentMode('CASH');
                setPaidAmount(netAfterAdvance);
              }}
            >
              Cash
            </button>
            <button
              type="button"
              style={{
                padding: '3px 12px',
                borderRadius: '16px',
                border: 'none',
                background: paymentMode === 'UPI' ? '#8b5cf6' : 'transparent',
                color: paymentMode === 'UPI' ? '#ffffff' : '#475569',
                fontWeight: 800,
                fontSize: '0.76rem',
                cursor: 'pointer'
              }}
              onClick={() => {
                setPaymentMode('UPI');
                setPaidAmount(netAfterAdvance);
              }}
            >
              UPI / QR
            </button>
          </div>
        </div>

        {/* Hotkey Legend & Close */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '6px', fontSize: '0.72rem', color: '#64748b' }}>
            <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}><strong>[F2]</strong> Party</span>
            <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}><strong>[F3]</strong> Add Row</span>
            <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}><strong>[Ctrl+S]</strong> Save</span>
            <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}><strong>[Ctrl+P]</strong> Print</span>
          </div>

          <button
            onClick={handleRequestClose}
            style={{
              background: '#fee2e2',
              border: 'none',
              borderRadius: '50%',
              width: '26px',
              height: '26px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#dc2626',
              cursor: 'pointer'
            }}
            title="Close (Esc)"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* 2. MINIMAL COMPACT HEADER SECTION (Customer Combobox + Fast Options) */}
      <div style={{
        background: '#ffffff',
        borderBottom: '1.5px solid #e2e8f0',
        padding: '10px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        flexShrink: 0
      }}>
        {error && (
          <div style={{ padding: '6px 12px', background: '#fee2e2', border: '1px solid #f87171', color: '#991b1b', borderRadius: '6px', fontSize: '0.82rem' }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1.2fr', gap: '12px', alignItems: 'flex-start' }}>
          {/* Col 1: Customer Live Combobox (Instant search for 100+ customers) */}
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
              <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <User size={13} color="#2563eb" /> Customer / Party Name *
                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>[F2]</span>
              </label>
              <button
                type="button"
                onClick={() => setIsAddCustomerModalOpen(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563eb',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  padding: 0
                }}
              >
                <UserPlus size={12} /> + New Customer
              </button>
            </div>

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '8px', pointerEvents: 'none' }} />
              <input
                ref={customerInputRef}
                type="text"
                className="form-input"
                style={{
                  width: '100%',
                  paddingLeft: '28px',
                  paddingRight: '60px',
                  paddingTop: '5px',
                  paddingBottom: '5px',
                  fontSize: '0.86rem',
                  fontWeight: customerId ? 800 : 500,
                  color: customerId ? '#0f172a' : '#475569',
                  borderColor: isCustomerDropdownOpen ? '#2563eb' : '#cbd5e1'
                }}
                placeholder="Type Customer Name or speak (e.g. Ramesh Bhai)..."
                value={customerSearchText}
                onFocus={() => setIsCustomerDropdownOpen(true)}
                onChange={(e) => {
                  setCustomerSearchText(e.target.value);
                  setIsCustomerDropdownOpen(true);
                  setSelectedCustomerHighlightIdx(0);
                }}
                onKeyDown={(e) => {
                  if (!isCustomerDropdownOpen) {
                    if (e.key === 'ArrowDown') {
                      setIsCustomerDropdownOpen(true);
                      return;
                    }
                  }

                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedCustomerHighlightIdx(prev => Math.min(prev + 1, filteredCustomers.length - 1));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedCustomerHighlightIdx(prev => Math.max(prev - 1, 0));
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (filteredCustomers[selectedCustomerHighlightIdx]) {
                      handleSelectCustomer(filteredCustomers[selectedCustomerHighlightIdx]);
                    } else if (filteredCustomers.length === 0 && customerSearchText) {
                      setCustomerName(customerSearchText);
                      setIsCustomerDropdownOpen(false);
                      itemInputRefs.current[0]?.focus();
                    }
                  }
                }}
              />
              <div style={{ position: 'absolute', right: '4px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                <VoiceSearchButton
                  onTranscript={(spoken) => {
                    setCustomerSearchText(spoken);
                    setIsCustomerDropdownOpen(true);
                    setSelectedCustomerHighlightIdx(0);
                  }}
                  title="🎙️ બોલીને ગ્રાહક શોધો (Speak customer name in Gujarati)"
                />
                {customerSearchText && (
                  <button
                    type="button"
                    onClick={() => {
                      handleSelectCustomer(null);
                      customerInputRef.current?.focus();
                    }}
                    style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontWeight: 800, fontSize: '0.75rem', padding: '2px 4px' }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Customer Dropdown Popup (100+ Customers) */}
            {isCustomerDropdownOpen && (
              <div 
                ref={customerDropdownRef}
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: '#ffffff',
                  border: '1.5px solid #2563eb',
                  borderRadius: '6px',
                  boxShadow: '0 12px 28px rgba(0,0,0,0.2)',
                  zIndex: 999999,
                  maxHeight: '260px',
                  overflowY: 'auto',
                  marginTop: '2px'
                }}
              >
                {/* Cash Walk-in Option */}
                <div
                  onMouseDown={() => handleSelectCustomer(null)}
                  style={{
                    padding: '7px 12px',
                    borderBottom: '1px dashed #cbd5e1',
                    background: '#f8fafc',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#475569'
                  }}
                >
                  🚶 Cash Walk-in Customer (Unregistered)
                </div>

                {filteredCustomers.length === 0 ? (
                  <div style={{ padding: '12px', textAlign: 'center', fontSize: '0.8rem', color: '#64748b' }}>
                    No customer found for "{customerSearchText}".
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomerDropdownOpen(false);
                        setIsAddCustomerModalOpen(true);
                      }}
                      style={{ display: 'block', margin: '6px auto 0', color: '#2563eb', fontWeight: 800, background: 'transparent', border: 'none', cursor: 'pointer' }}
                    >
                      + Create New Customer
                    </button>
                  </div>
                ) : (
                  filteredCustomers.map((c, idx) => {
                    const isHighlighted = idx === selectedCustomerHighlightIdx;
                    return (
                      <div
                        key={c.id}
                        onMouseDown={() => handleSelectCustomer(c)}
                        onMouseEnter={() => setSelectedCustomerHighlightIdx(idx)}
                        style={{
                          padding: '7px 12px',
                          borderBottom: '1px solid #f1f5f9',
                          cursor: 'pointer',
                          background: isHighlighted ? '#e0f2fe' : 'transparent',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.84rem', color: '#0f172a' }}>
                            {c.name}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', gap: '8px' }}>
                            {c.mobile && <span>📞 {c.mobile}</span>}
                            {c.city && <span>📍 {c.city}</span>}
                            {c.customer_no && <span>#{c.customer_no}</span>}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: (c.current_balance || 0) > 0 ? '#dc2626' : '#16a34a', fontFamily: 'monospace' }}>
                            {formatCurrency(c.current_balance || 0)}
                          </div>
                          <span style={{ fontSize: '0.65rem', color: (c.current_balance || 0) > 0 ? '#dc2626' : '#16a34a' }}>
                            {(c.current_balance || 0) > 0 ? 'To Collect' : 'Settled'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Selected Customer Live Badges */}
            {customerId && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px', fontSize: '0.72rem' }}>
                {customerMobile && (
                  <span style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px', color: '#334155' }}>
                    📞 {customerMobile}
                  </span>
                )}
                <span style={{
                  background: customerBalance > 0 ? '#fef2f2' : '#f0fdf4',
                  color: customerBalance > 0 ? '#b91c1c' : '#16a34a',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  fontWeight: 800,
                  border: `1px solid ${customerBalance > 0 ? '#fca5a5' : '#86efac'}`
                }}>
                  Khata Balance: {formatCurrency(customerBalance)} ({customerBalance > 0 ? 'To Collect' : 'Settled'})
                </span>
                {customerAdvanceBalance > 0 && (
                  <span style={{ background: '#ecfdf5', color: '#047857', padding: '1px 6px', borderRadius: '4px', fontWeight: 800, border: '1px solid #6ee7b7' }}>
                    💰 Advance Held: {formatCurrency(customerAdvanceBalance)}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Col 2: Invoice Date */}
          <div>
            <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#1e293b', display: 'block', marginBottom: '3px' }}>
              📅 Invoice Date
            </label>
            <input
              type="date"
              className="form-input font-mono"
              style={{ width: '100%', fontSize: '0.84rem', padding: '5px 8px', fontWeight: 700 }}
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>

          {/* Col 3: Invoice Number / Status */}
          <div>
            <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#1e293b', display: 'block', marginBottom: '3px' }}>
              🧾 Invoice #
            </label>
            <div style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '5px 8px',
              fontSize: '0.84rem',
              fontWeight: 800,
              fontFamily: 'monospace',
              color: '#0284c7'
            }}>
              {editingSale ? editingSale.invoice_no : 'Auto (Next Bill)'}
            </div>
          </div>

          {/* Col 4: Quick Delivery & Rickshaw Dispatch Toggle */}
          <div>
            <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#1e293b', display: 'block', marginBottom: '3px' }}>
              🚚 Delivery & Dispatch
            </label>
            <button
              type="button"
              onClick={() => setShowDeliveryDrawer(!showDeliveryDrawer)}
              style={{
                width: '100%',
                background: (deliveryVenue || selectedDriverId) ? '#eff6ff' : '#f8fafc',
                border: `1px solid ${(deliveryVenue || selectedDriverId) ? '#93c5fd' : '#cbd5e1'}`,
                color: (deliveryVenue || selectedDriverId) ? '#1e40af' : '#475569',
                padding: '5px 8px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span>{deliveryVenue ? `📍 ${deliveryVenue.slice(0, 18)}...` : 'Add Venue / Rickshaw'}</span>
              <ChevronDown size={14} />
            </button>
          </div>
        </div>

        {/* Expandable Delivery & Rickshaw Dispatch Drawer */}
        {showDeliveryDrawer && (
          <div style={{
            background: '#f8fafc',
            border: '1.5px solid #bfdbfe',
            borderRadius: '8px',
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            marginTop: '4px'
          }}>
            {/* Row 1: Venue / Plot Autocomplete, Full Address, Google Map Link, Rickshaw Driver */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 1.2fr 1.2fr 1fr',
              gap: '10px'
            }}>
              {/* Delivery Venue search (Surat 100+ Plots) */}
              <div ref={venueSearchRef} style={{ position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1e40af', margin: 0 }}>
                    📍 Delivery Venue / Plot
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddNewVenueOpen(true)}
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      color: '#1d4ed8',
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '4px',
                      padding: '0 6px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '2px'
                    }}
                  >
                    <Plus size={10} /> + New Venue
                  </button>
                </div>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%', fontSize: '0.82rem', padding: '4px 8px' }}
                  placeholder="Search venue (Avadh, Sarthana, Green Leaf...)"
                  value={venueSearchQuery}
                  onFocus={() => setIsVenueDropdownOpen(true)}
                  onChange={(e) => {
                    setVenueSearchQuery(e.target.value);
                    setDeliveryVenue(e.target.value);
                    setIsVenueDropdownOpen(true);
                    matchAndApplyArea(e.target.value);
                  }}
                />
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
                    boxShadow: '0 10px 25px rgba(0,0,0,0.18)',
                    zIndex: 999999,
                    marginTop: '2px'
                  }}>
                    <div
                      onClick={() => {
                        setIsVenueDropdownOpen(false);
                        setIsAddNewVenueOpen(true);
                      }}
                      style={{
                        padding: '8px 10px',
                        cursor: 'pointer',
                        background: '#eff6ff',
                        borderBottom: '1px solid #bfdbfe',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        color: '#1d4ed8',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Plus size={12} /> Add &quot;{venueSearchQuery || 'New Venue'}&quot; to Venue Master List
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
                              key={`fv_sale_${idx}`}
                              onClick={() => {
                                setDeliveryVenue(fv.venue_name);
                                setVenueSearchQuery(fv.venue_name);
                                if (fv.address) setDeliveryAddress(fv.address);
                                if (fv.customer_charge) setDeliveryCharge(fv.customer_charge);
                                if (fv.driver_rent) setRickshawRent(fv.driver_rent);
                                setIsVenueDropdownOpen(false);
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
                              <span>📍 {fv.venue_name} {fv.area_landmark ? `(${fv.area_landmark})` : ''}</span>
                              <span style={{ fontSize: '0.68rem', color: '#15803d', fontWeight: 700, background: '#dcfce7', padding: '1px 6px', borderRadius: '10px' }}>
                                Used {fv.usage_count}x
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {locations.filter(l => {
                      if (!venueSearchQuery) return true;
                      const q = venueSearchQuery.toLowerCase();
                      return l.venue_name.toLowerCase().includes(q) ||
                             (l.area_landmark && l.area_landmark.toLowerCase().includes(q)) ||
                             (l.address && l.address.toLowerCase().includes(q));
                    }).map(loc => (
                      <div
                        key={loc.id}
                        onClick={() => handleSelectVenueLocation(loc)}
                        style={{
                          padding: '7px 10px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #f1f5f9',
                          fontSize: '0.78rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f0fdf4')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#ffffff')}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <strong style={{ color: '#1e3a8a', fontSize: '0.82rem' }}>{loc.venue_name}</strong>
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
                          <div style={{ fontSize: '0.70rem', color: '#64748b', marginTop: '2px' }}>
                            {loc.address}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                          <span style={{ color: '#16a34a', fontWeight: 800, fontSize: '0.75rem', display: 'block' }}>
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

              {/* Full Delivery Address */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '2px' }}>
                  Full Delivery Address
                </label>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%', fontSize: '0.82rem', padding: '4px 8px' }}
                  placeholder="e.g. Katargam / Dumas Road"
                  value={deliveryAddress}
                  onChange={e => {
                    setDeliveryAddress(e.target.value);
                    matchAndApplyArea(e.target.value);
                  }}
                />
              </div>

              {/* Google Map Location Link */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#059669', display: 'block', marginBottom: '2px' }}>
                  🗺️ Google Map Link (ઓપ્શનલ)
                </label>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%', fontSize: '0.82rem', padding: '4px 8px' }}
                  placeholder="https://maps.app.goo.gl/..."
                  value={googleMapLink}
                  onChange={e => setGoogleMapLink(e.target.value)}
                />
              </div>

              {/* Rickshaw Driver */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#b45309', display: 'block', marginBottom: '2px' }}>
                  🛺 Rickshaw Driver
                </label>
                <select
                  className="form-select"
                  style={{ width: '100%', fontSize: '0.82rem', padding: '4px 6px' }}
                  value={selectedDriverId}
                  onChange={e => handleDriverChange(e.target.value)}
                >
                  <option value="">-- No Driver (Direct Delivery) --</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} (₹{d.default_rent || 150})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Trip Type Toggle, Customer Delivery Charge (₹), Rickshaw Driver Rent (₹), Delivery Margin Badge */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1.4fr 1fr 1fr 1.2fr',
              gap: '10px',
              alignItems: 'center',
              background: '#f1f5f9',
              padding: '8px 10px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0'
            }}>
              {/* Trip Type Selector (Round Trip vs One Way) */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: '4px' }}>
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
                    🔄 Round Trip (રાઉન્ડ)
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
                    ➡️ One Way (વન વે)
                  </button>
                </div>
              </div>

              {/* Customer Delivery Charge */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#047857', display: 'block', marginBottom: '2px' }}>
                  📦 Customer Charge (₹)
                </label>
                <input
                  type="number"
                  step="5"
                  min="0"
                  className="form-input font-mono"
                  style={{ width: '100%', fontSize: '0.84rem', padding: '4px 8px', fontWeight: 800, color: '#047857', background: '#f0fdf4' }}
                  value={deliveryCharge || ''}
                  placeholder="0"
                  onChange={e => setDeliveryCharge(Number(e.target.value) || 0)}
                />
              </div>

              {/* Rickshaw Driver Rent */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#b91c1c', display: 'block', marginBottom: '2px' }}>
                  🛺 Rickshaw Rent (₹)
                </label>
                <input
                  type="number"
                  step="5"
                  min="0"
                  className="form-input font-mono"
                  style={{ width: '100%', fontSize: '0.84rem', padding: '4px 8px', fontWeight: 800, color: '#b91c1c', background: '#fef2f2' }}
                  value={rickshawRent || ''}
                  placeholder="0"
                  onChange={e => setRickshawRent(Number(e.target.value) || 0)}
                />
              </div>

              {/* Margin & Summary */}
              <div style={{
                fontSize: '0.76rem',
                background: '#ffffff',
                padding: '5px 8px',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Trip:</span>
                  <strong style={{ color: tripType === 'ONE_WAY' ? '#0891b2' : '#2563eb' }}>
                    {tripType === 'ONE_WAY' ? '➡️ One Way' : '🔄 Round Trip'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Matuki Margin:</span>
                  <strong style={{ color: (deliveryCharge - rickshawRent) >= 0 ? '#15803d' : '#dc2626' }}>
                    {formatCurrency(deliveryCharge - rickshawRent)}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. HIGH-VISIBILITY SPATIAL ITEM GRID (Fits 20+ Items Easily!) */}
      <div style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f1f5f9', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
            <tr style={{ fontSize: '0.76rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', borderBottom: '2px solid #cbd5e1' }}>
              <th style={{ width: '36px', textAlign: 'center', padding: '9px 4px' }}>#</th>
              <th style={{ minWidth: '300px', padding: '9px 10px' }}>ITEM DESCRIPTION (SWEET / SNACK NAME)</th>
              <th style={{ width: '180px', padding: '9px 8px', background: '#fef3c7', color: '#92400e' }}>CHAKI / VASAN</th>
              <th style={{ width: '95px', textAlign: 'center', padding: '9px 6px' }}>QTY</th>
              <th style={{ width: '85px', textAlign: 'center', padding: '9px 6px' }}>UNIT</th>
              <th style={{ width: '115px', textAlign: 'right', padding: '9px 8px' }}>PRICE / UNIT (₹)</th>
              <th style={{ width: '80px', textAlign: 'right', padding: '9px 6px' }}>DISC %</th>
              <th style={{ width: '125px', textAlign: 'right', padding: '9px 12px' }}>AMOUNT (₹)</th>
              <th style={{ width: '36px', textAlign: 'center', padding: '9px 4px' }}></th>
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
                    borderBottom: '1px solid #e2e8f0',
                    background: idx % 2 === 0 ? '#ffffff' : '#f8fafc'
                  }}
                >
                  {/* Row # */}
                  <td style={{ textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700, padding: '4px' }}>
                    {idx + 1}
                  </td>

                  {/* ITEM Column with Live Search Autocomplete */}
                  <td style={{ padding: '4px 8px', position: 'relative' }} className="item-autocomplete-wrapper">
                    <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                      <input
                        ref={el => { itemInputRefs.current[idx] = el; }}
                        type="text"
                        className="form-input"
                        style={{
                          width: '100%',
                          padding: '6px 32px 6px 8px',
                          fontSize: '0.88rem',
                          fontWeight: row.product_id ? 800 : 500,
                          color: row.product_id ? '#0f172a' : '#475569',
                          borderColor: activeItemDropdownIdx === idx ? '#2563eb' : '#cbd5e1',
                          background: '#ffffff'
                        }}
                        placeholder="Type sweet name or speak (e.g. Gulab Jamun, Kaju Katli)..."
                        value={row.product_name}
                        onFocus={() => {
                          setActiveItemDropdownIdx(idx);
                          setItemSearchText(row.product_name);
                          setItemHighlightIdx(0);
                        }}
                        onChange={(e) => {
                          handleItemFieldChange(idx, 'product_name', e.target.value);
                          setItemSearchText(e.target.value);
                          setActiveItemDropdownIdx(idx);
                        }}
                        onKeyDown={(e) => {
                          if (activeItemDropdownIdx !== idx) {
                            if (e.key === 'ArrowDown') {
                              setActiveItemDropdownIdx(idx);
                              return;
                            }
                          }

                          if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setItemHighlightIdx(prev => Math.min(prev + 1, filteredProducts.length - 1));
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setItemHighlightIdx(prev => Math.max(prev - 1, 0));
                          } else if (e.key === 'Enter') {
                            e.preventDefault();
                            if (filteredProducts[itemHighlightIdx]) {
                              handleSelectProduct(idx, filteredProducts[itemHighlightIdx]);
                            } else {
                              qtyInputRefs.current[idx]?.focus();
                              qtyInputRefs.current[idx]?.select();
                            }
                          }
                        }}
                      />
                      <div style={{ position: 'absolute', right: '4px' }}>
                        <VoiceSearchButton
                          onTranscript={(spoken) => {
                            handleItemFieldChange(idx, 'product_name', spoken);
                            setItemSearchText(spoken);
                            setActiveItemDropdownIdx(idx);
                            setItemHighlightIdx(0);
                          }}
                          title="🎙️ બોલીને મીઠાઈ લખો (Speak Sweet name in Gujarati)"
                        />
                      </div>
                    </div>

                    {/* Autocomplete Dropdown popup */}
                    {activeItemDropdownIdx === idx && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: '8px',
                        width: '450px',
                        maxHeight: '260px',
                        overflowY: 'auto',
                        background: '#ffffff',
                        border: '2px solid #2563eb',
                        borderRadius: '6px',
                        boxShadow: '0 14px 32px rgba(0,0,0,0.25)',
                        zIndex: 99999,
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
                          <span style={{ textAlign: 'right' }}>SALE PRICE</span>
                          <span style={{ textAlign: 'right' }}>STOCK</span>
                        </div>

                        {/* Blank Outer Packing option */}
                        <div
                          onClick={() => {
                            handleSelectProduct(idx, null);
                            handleItemFieldChange(idx, 'product_name', 'Outer Packing (Crate / Bucket)');
                            handleItemFieldChange(idx, 'unit', 'CONTAINER');
                            handleItemFieldChange(idx, 'vasan_type', 'Carat');
                            handleItemFieldChange(idx, 'vasan_qty', 1);
                          }}
                          style={{
                            padding: '6px 10px',
                            cursor: 'pointer',
                            borderBottom: '1px dashed #cbd5e1',
                            background: '#fffbeb',
                            fontSize: '0.8rem',
                            color: '#92400e',
                            fontWeight: 700
                          }}
                        >
                          📦 + Blank Outer Packing Row (Only Carat / Dol)
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
                                    key={`fp_sale_${fpIdx}`}
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

                        {filteredProducts.map((prod, prodIdx) => {
                          const isHighlighted = prodIdx === itemHighlightIdx;
                          return (
                            <div
                              key={prod.id}
                              onClick={() => handleSelectProduct(idx, prod)}
                              onMouseEnter={() => setItemHighlightIdx(prodIdx)}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '2fr 1fr 1fr',
                                padding: '7px 10px',
                                cursor: 'pointer',
                                borderBottom: '1px solid #f1f5f9',
                                fontSize: '0.82rem',
                                alignItems: 'center',
                                background: isHighlighted ? '#e0f2fe' : '#ffffff'
                              }}
                            >
                              <div>
                                <strong style={{ color: '#0f172a' }}>{prod.name}</strong>
                                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Code: {prod.code}</div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                {customerLastRates[prod.id] && customerLastRates[prod.id].rate > 0 ? (
                                  <>
                                    <div style={{ fontWeight: 900, color: '#15803d', fontFamily: 'monospace' }}>
                                      ₹{customerLastRates[prod.id].rate}
                                    </div>
                                    <div style={{ fontSize: '0.65rem', color: '#059669', fontWeight: 700 }}>
                                      🏷️ Last Rate (Def: ₹{prod.selling_rate})
                                    </div>
                                  </>
                                ) : (
                                  <div style={{ fontWeight: 800, color: '#047857', fontFamily: 'monospace' }}>
                                    ₹{prod.selling_rate || 0}
                                  </div>
                                )}
                              </div>
                              <div style={{ textAlign: 'right', fontSize: '0.74rem', color: prod.current_stock < 0 ? '#dc2626' : '#475569' }}>
                                {prod.current_stock || 0} {prod.unit}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </td>

                  {/* CHAKI / VASAN Column */}
                  <td style={{ padding: '4px 8px', background: '#fffdf5' }}>
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
                        {vasanMasterList.length > 0 ? (
                          vasanMasterList.map(v => (
                            <option key={v.id} value={v.name}>
                              {v.name} {v.gujarati_name ? `(${v.gujarati_name})` : ''} - ₹{v.replacement_price}
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="Dol">Bucket (Dol)</option>
                            <option value="Carat">Crate (Carat)</option>
                            <option value="Milton">Milton (Can)</option>
                            <option value="Choki">Choki (Tray)</option>
                            <option value="Steel Dabba">Steel Dabba</option>
                            <option value="Petharo">Petharo (Box)</option>
                            <option value="Plastic Tub">Plastic Tub</option>
                            <option value="Tray">Tray</option>
                          </>
                        )}
                        <option value="Other">Other Container</option>
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
                  <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                    <input
                      ref={el => { qtyInputRefs.current[idx] = el; }}
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0"
                      className="form-input font-mono"
                      style={{
                        width: '80px',
                        padding: '6px 6px',
                        textAlign: 'center',
                        fontSize: '0.9rem',
                        fontWeight: 800,
                        margin: '0 auto',
                        borderColor: '#cbd5e1'
                      }}
                      value={row.quantity}
                      onChange={(e) => handleItemFieldChange(idx, 'quantity', e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          rateInputRefs.current[idx]?.focus();
                          rateInputRefs.current[idx]?.select();
                        }
                      }}
                    />
                  </td>

                  {/* UNIT Column */}
                  <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                    <select
                      className="form-select"
                      style={{ fontSize: '0.78rem', padding: '5px 4px', textAlign: 'center', borderColor: '#e2e8f0' }}
                      value={row.unit}
                      onChange={(e) => handleItemFieldChange(idx, 'unit', e.target.value)}
                    >
                      <option value="KG">KG</option>
                      <option value="GM">GM</option>
                      <option value="PCS">PCS</option>
                      <option value="BOX">BOX</option>
                      <option value="CONTAINER">CONTAINER</option>
                      <option value="LITRE">LITRE</option>
                    </select>
                  </td>

                  {/* PRICE / UNIT */}
                  <td style={{ padding: '4px 8px', textAlign: 'right' }}>
                    <input
                      ref={el => { rateInputRefs.current[idx] = el; }}
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0"
                      className="form-input font-mono"
                      style={{
                        width: '95px',
                        padding: '6px 6px',
                        textAlign: 'right',
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        marginLeft: 'auto',
                        borderColor: (row.product_id && customerLastRates[row.product_id] && Number(customerLastRates[row.product_id].rate) === Number(row.rate)) ? '#86efac' : '#cbd5e1',
                        background: (row.product_id && customerLastRates[row.product_id] && Number(customerLastRates[row.product_id].rate) === Number(row.rate)) ? '#f0fdf4' : '#ffffff'
                      }}
                      value={row.rate}
                      onChange={(e) => handleItemFieldChange(idx, 'rate', e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          discountInputRefs.current[idx]?.focus();
                          discountInputRefs.current[idx]?.select();
                        }
                      }}
                    />
                    {row.product_id && customerLastRates[row.product_id] && (
                      <div 
                        style={{ fontSize: '0.66rem', color: '#15803d', fontWeight: 800, marginTop: '2px', textAlign: 'right', cursor: 'pointer' }}
                        title={`Last Billed Rate: ₹${customerLastRates[row.product_id].rate} on ${customerLastRates[row.product_id].last_date}`}
                        onClick={() => handleItemFieldChange(idx, 'rate', customerLastRates[row.product_id!].rate)}
                      >
                        🏷️ Last: ₹{customerLastRates[row.product_id].rate}
                      </div>
                    )}
                  </td>

                  {/* DISCOUNT % */}
                  <td style={{ padding: '4px 6px', textAlign: 'right' }}>
                    <input
                      ref={el => { discountInputRefs.current[idx] = el; }}
                      type="number"
                      step="any"
                      min="0"
                      max="100"
                      placeholder="0"
                      className="form-input font-mono"
                      style={{ width: '60px', padding: '6px 4px', textAlign: 'right', fontSize: '0.82rem', marginLeft: 'auto', borderColor: '#cbd5e1' }}
                      value={row.discount_pct || ''}
                      onChange={(e) => handleItemFieldChange(idx, 'discount_pct', Number(e.target.value))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (idx < items.length - 1) {
                            itemInputRefs.current[idx + 1]?.focus();
                          } else {
                            handleAddRow();
                          }
                        }
                      }}
                    />
                  </td>

                  {/* AMOUNT */}
                  <td style={{ padding: '4px 12px', textAlign: 'right', fontWeight: 900, fontSize: '0.94rem', color: '#047857', fontFamily: 'monospace' }}>
                    {formatCurrency(row.amount)}
                  </td>

                  {/* Remove Row Button */}
                  <td style={{ padding: '4px 4px', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(idx)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: '4px'
                      }}
                      title="Remove Row"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Add Row Bar */}
        <div style={{ padding: '8px 16px', background: '#f8fafc', borderTop: '1px dashed #cbd5e1' }}>
          <button
            type="button"
            onClick={handleAddRow}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#2563eb',
              fontSize: '0.8rem',
              fontWeight: 800,
              padding: '5px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Plus size={14} /> + Add Item Row [F3]
          </button>
        </div>
      </div>

      {/* 4. BOTTOM STICKY VYAPAR TOTALS & ACTION FOOTER */}
      <div style={{
        background: '#ffffff',
        borderTop: '1.5px solid #cbd5e1',
        padding: '10px 20px',
        display: 'grid',
        gridTemplateColumns: '1.4fr 1fr 1.6fr',
        gap: '20px',
        alignItems: 'center',
        flexShrink: 0,
        boxShadow: '0 -4px 12px rgba(0,0,0,0.04)'
      }}>
        {/* Left: Notes & Advance Held */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <input
            type="text"
            className="form-input"
            style={{ width: '100%', fontSize: '0.8rem', padding: '5px 8px' }}
            placeholder="Notes / Remarks / Transport details..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
          {customerAdvanceBalance > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.74rem', color: '#065f46' }}>
              <span>💰 Advance Held: <strong>{formatCurrency(customerAdvanceBalance)}</strong></span>
              <span>• Deducting: <strong>₹{currentAdvanceDeduction}</strong></span>
              <button
                type="button"
                onClick={() => setAdvanceAdjusted(currentAdvanceDeduction > 0 ? 0 : customerAdvanceBalance)}
                style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline' }}
              >
                {currentAdvanceDeduction > 0 ? 'Remove' : 'Apply Full'}
              </button>
            </div>
          )}
        </div>

        {/* Middle: Paid Amount & Balance Due */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
            <span style={{ color: '#64748b', fontWeight: 700 }}>Paid (₹):</span>
            <input
              type="number"
              min="0"
              step="any"
              className="form-input font-mono"
              style={{ width: '100px', padding: '4px 6px', textAlign: 'right', fontWeight: 800, fontSize: '0.88rem', color: '#16a34a' }}
              value={paidAmount}
              onChange={e => setPaidAmount(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 800 }}>
            <span style={{ color: balanceDue > 0 ? '#dc2626' : '#16a34a' }}>Due Balance:</span>
            <span style={{ fontFamily: 'monospace', color: balanceDue > 0 ? '#dc2626' : '#16a34a', fontSize: '0.95rem' }}>
              {formatCurrency(balanceDue)}
            </span>
          </div>
        </div>

        {/* Right: Grand Total & Save / Print Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '16px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
              Subtotal: <strong>{formatCurrency(subtotal)}</strong>
              {deliveryCharge > 0 && <span> + Del: ₹{deliveryCharge}</span>}
              {discountAmount > 0 && <span> - Disc: ₹{discountAmount}</span>}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#15803d', fontFamily: 'monospace', lineHeight: 1.1 }}>
              {formatCurrency(grandTotal)}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(false)}
              className="btn btn-secondary"
              style={{ padding: '8px 16px', fontWeight: 800, fontSize: '0.84rem' }}
            >
              <Save size={15} /> Save [Ctrl+S]
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(true)}
              className="btn btn-primary"
              style={{ padding: '8px 18px', fontWeight: 800, fontSize: '0.84rem' }}
            >
              <Printer size={15} /> Save & Print [Ctrl+P]
            </button>
          </div>
        </div>
      </div>

      {/* 5. ADD NEW CUSTOMER MODAL POPUP */}
      {isAddCustomerModalOpen && (
        <CustomerModal
          isOpen={isAddCustomerModalOpen}
          onClose={() => setIsAddCustomerModalOpen(false)}
          onSuccess={(newCust) => {
            setIsAddCustomerModalOpen(false);
            api.getCustomers({ active: true }).then(freshCusts => {
              setCustomers(freshCusts);
              const found = freshCusts.find(c => c.id === newCust.id) || newCust;
              handleSelectCustomer(found);
            });
          }}
        />
      )}

      {/* 6. CLOSE CONFIRMATION POPUP */}
      {showCloseConfirm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999999
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '8px',
            padding: '20px',
            maxWidth: '380px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
              Discard Current Bill?
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.84rem', color: '#64748b' }}>
              You have unsaved items in this sale voucher. Are you sure you want to close without saving?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowCloseConfirm(false)}
              >
                Keep Editing
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => {
                  setShowCloseConfirm(false);
                  onClose();
                }}
              >
                Discard & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Venue Modal */}
      <AddNewVenueModal
        isOpen={isAddNewVenueOpen}
        initialVenueName={venueSearchQuery}
        onClose={() => setIsAddNewVenueOpen(false)}
        onSuccess={(newLoc) => {
          setIsAddNewVenueOpen(false);
          api.getDeliveryLocations().then(locs => {
            setLocations(locs || []);
            const found = locs.find(l => l.id === newLoc.id) || newLoc;
            handleSelectVenueLocation(found);
          }).catch(() => {
            setLocations(prev => [...prev, newLoc]);
            handleSelectVenueLocation(newLoc);
          });
        }}
      />
    </div>
  );
};
