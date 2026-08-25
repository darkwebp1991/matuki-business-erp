export interface BusinessSettings {
  id: number;
  business_name: string;
  subtitle: string;
  address: string;
  mobile: string;
  email: string;
  gstin: string;
  invoice_prefix: string;
  sale_start_seq?: number;
  sale_return_prefix?: string;
  sale_return_start_seq?: number;
  purchase_prefix: string;
  purchase_start_seq?: number;
  purchase_return_prefix?: string;
  purchase_return_start_seq?: number;
  payment_in_prefix?: string;
  payment_in_start_seq?: number;
  payment_out_prefix?: string;
  payment_out_start_seq?: number;
  expense_prefix?: string;
  expense_start_seq?: number;
  advance_order_prefix?: string;
  advance_order_start_seq?: number;
  manufacturing_prefix: string;
  financial_year: string;
  currency_symbol: string;
  costing_method: 'WEIGHTED_AVERAGE' | 'LAST_PURCHASE' | 'STANDARD';
  allow_negative_stock: number;
  default_tax_rate: number;
  default_units: string;
  backup_folder: string;
  invoice_terms: string;
  upi_id?: string;
  upi_qr_image?: string;
  template_polite?: string | null;
  template_weekly?: string | null;
  template_urgent?: string | null;
  template_dispatch?: string | null;
  partner_1_mobile?: string;
  partner_2_mobile?: string;
  partner_3_mobile?: string;
  auto_rojmel_time?: string;
  auto_rojmel_enabled?: number;
  last_auto_rojmel_date?: string;
}

export type ModuleAccessLevel = 'NONE' | 'VIEW' | 'EDIT' | 'FULL';

export interface User {
  id: number;
  username: string;
  full_name: string;
  role: 'ADMIN' | 'MANAGER' | 'CASHIER' | 'STOREKEEPER' | 'PRODUCTION' | 'ACCOUNTANT' | 'DELIVERY_STAFF' | 'CHEF' | 'STAFF';
  mobile?: string;
  permissions?: Record<string, ModuleAccessLevel | boolean>;
  active: number;
  created_at?: string;
  last_login?: string | null;
}

export interface VasanMasterItem {
  id: number;
  name: string;
  gujarati_name?: string;
  unit: string;
  replacement_price: number;
  default_deposit: number;
  total_inventory_qty: number;
  notes?: string;
  active: number;
  created_at?: string;
  updated_at?: string;
}

export interface TodoItem {
  id: number;
  title: string;
  description?: string;
  user_id?: number | null;
  assigned_to?: string;
  assigned_to_name?: string;
  assigned_by_name?: string;
  assignment_status?: 'ACCEPTED' | 'PENDING_ASSIGNMENT' | 'REJECTED';
  rejection_reason?: string;
  due_date: string;
  due_time?: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category?: string;
  list_category?: string;
  status: string;
  is_recurring?: number;
  recurring_frequency?: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  starred?: number | boolean;
  is_starred?: number;
  subtasks?: Array<{ id: string; text: string; completed: boolean }>;
  subtasks_json?: string;
  is_overdue?: number;
  completed_at?: string | null;
  proof_screenshot_url?: string;
  rescheduled_count?: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TodoSummary {
  date: string;
  total: number;
  completed: number;
  pending: number;
  percentage: number;
  has_high_pending_count: boolean;
  overdue_count?: number;
  overdue_tasks?: TodoItem[];
  tasks: TodoItem[];
  exact_time_tasks: TodoItem[];
}

export interface Unit {
  id: number;
  name: string;
  symbol: string;
  short_name?: string;
  code?: string;
  unit_type: 'WEIGHT' | 'VOLUME' | 'COUNT';
  base_unit: string;
  conversion_to_base: number;
  is_base: number;
}

export interface Category {
  id: number;
  name: string;
  type: string;
  description: string;
  product_count?: number;
  raw_material_count?: number;
}

export interface Product {
  id: number;
  code: string;
  barcode?: string;
  name: string;
  gujarati_name?: string;
  category_id?: number;
  category_name?: string;
  subcategory?: string;
  product_type: 'FINISHED_PRODUCT' | 'SEMI_FINISHED_PRODUCT' | 'RAW_MATERIAL' | 'PACKAGING' | 'SERVICE';
  unit: string;
  purchase_rate: number;
  selling_rate: number;
  wholesale_rate: number;
  min_stock: number;
  max_stock: number;
  gst_rate: number;
  hsn_code: string;
  opening_stock: number;
  opening_stock_rate: number;
  current_stock: number;
  available_online?: number;
  active: number;
  recipe_id?: number;
  recipe_name?: string;
}

export interface RawMaterial {
  id: number;
  code: string;
  name: string;
  category_id?: number;
  category_name?: string;
  unit: string;
  current_purchase_rate: number;
  average_purchase_rate: number;
  last_purchase_rate: number;
  standard_rate: number;
  min_stock: number;
  opening_stock: number;
  current_stock: number;
  default_supplier_id?: number;
  default_supplier_name?: string;
  gst_rate: number;
  hsn_code: string;
  active: number;
}

export interface RecipeItem {
  id?: number;
  recipe_version_id?: number;
  item_type: 'RAW_MATERIAL' | 'SEMI_FINISHED' | 'PACKAGING';
  raw_material_id?: number | null;
  semi_finished_product_id?: number | null;
  item_name?: string;
  item_code?: string;
  available_stock?: number;
  quantity: number;
  scaled_quantity?: number;
  unit: string;
  rate_used?: number;
  standard_rate?: number;
  current_purchase_rate?: number;
  average_purchase_rate?: number;
  last_purchase_rate?: number;
  line_cost?: number;
  notes?: string;
}

export interface RecipeVersion {
  id: number;
  recipe_id: number;
  version_number: number;
  effective_date: string;
  expected_yield: number;
  expected_yield_unit: string;
  expected_wastage_pct: number;
  labour_cost_type: 'PER_BATCH' | 'PER_KG' | 'FIXED';
  labour_cost_rate: number;
  overhead_cost_type: 'PER_BATCH' | 'PER_KG' | 'PCT_MATERIAL';
  overhead_cost_rate: number;
  packaging_cost: number;
  notes: string;
  status: 'DRAFT' | 'APPROVED' | 'ACTIVE' | 'ARCHIVED';
  created_by?: string;
  approved_by?: string;
}

export interface Recipe {
  id: number;
  code: string;
  name: string;
  product_id: number;
  product_name?: string;
  product_code?: string;
  selling_rate?: number;
  product_unit?: string;
  batch_size: number;
  batch_unit: string;
  description: string;
  active_version_id?: number;
  version_number?: number;
  version_status?: string;
  is_semi_finished: number;
  active: number;
  versions?: RecipeVersion[];
  activeVersion?: RecipeVersion;
  items?: RecipeItem[];
}

export interface ManufacturingOrder {
  id: number;
  manufacturing_no: string;
  date: string;
  finished_product_id: number;
  finished_product_name?: string;
  finished_product_code?: string;
  recipe_id: number;
  recipe_name?: string;
  recipe_code?: string;
  recipe_version_id: number;
  version_number?: number;
  batch_number: string;
  planned_quantity: number;
  planned_unit: string;
  actual_output: number;
  actual_unit: string;
  wastage_quantity: number;
  wastage_pct: number;
  wastage_reason: string;
  production_location: string;
  operator: string;
  notes: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  total_material_cost: number;
  total_labour_cost: number;
  total_overhead_cost: number;
  total_packaging_cost: number;
  total_batch_cost: number;
  cost_per_unit: number;
  standard_cost_per_unit: number;
  cost_variance: number;
  cost_variance_pct: number;
  costing_method_used: string;
  created_by: string;
  items?: any[];
  wastages?: any[];
}

export interface Driver {
  id: number;
  name: string;
  mobile: string;
  vehicle_no: string;
  default_rent: number;
  is_default?: number;
  is_personal?: number;
  active: number;
}

export interface AreaDeliveryRate {
  id: number;
  area_name: string;
  customer_charge: number;
  driver_rent: number;
  notes?: string;
  active?: number;
  created_at?: string;
}

export interface DeliveryLocation {
  id: number;
  venue_name: string;
  address: string;
  area_landmark: string;
  customer_charge?: number;
  driver_rent?: number;
  contact_person: string;
  contact_mobile: string;
  google_map_link?: string;
  active: number;
}

export interface VasanLedgerEntry {
  id: number;
  sale_id: number;
  invoice_no?: string;
  customer_id?: number;
  customer_name: string;
  driver_id?: number;
  driver_name?: string;
  delivery_venue?: string;
  delivery_address?: string;
  date: string;
  item_name: string;
  vasan_type: string; // Milton, Choki, Carat, Steel Dabba, Petharo, Tray, Plastic Tub
  issued_qty: number;
  returned_qty: number;
  due_qty: number;
  status: 'PENDING_RETURN' | 'RETURNED' | 'PARTIAL' | 'CHARGED_TO_CUSTOMER';
  return_date?: string;
  notes?: string;
}

export interface VasanYadiContainer {
  id: number;
  item_name: string;
  vasan_type: string;
  issued_qty: number;
  returned_qty: number;
  due_qty: number;
  status: string;
  rate: number;
  missing_amount: number;
  notes?: string;
}

export interface VasanYadiBill {
  sale_id: number;
  invoice_no: string;
  date: string;
  customer_id?: number | null;
  customer_name: string;
  customer_mobile: string;
  delivery_venue: string;
  delivery_address: string;
  driver_name: string;
  driver_mobile: string;
  containers: VasanYadiContainer[];
  total_due_count: number;
  total_missing_value: number;
  is_all_returned: boolean;
}

export interface SalesReturn {
  id: number;
  return_no: string;
  date: string;
  sale_id: number;
  invoice_no: string;
  customer_id?: number;
  total_amount: number;
  refund_mode: string;
  reason: string;
  status: string;
  created_by: string;
}

export interface DriverTrip {
  sale_id: number;
  date: string;
  invoice_no: string;
  customer_name: string;
  customer_mobile: string;
  delivery_venue: string;
  delivery_address: string;
  driver_id: number;
  driver_name: string;
  driver_mobile: string;
  rickshaw_rent: number;
  rickshaw_rent_status: 'PENDING' | 'PAID';
  vasan_summary: string;
  grand_total: number;
  status: string;
  trip_type?: string;
}

export interface SaleItem {
  id?: number;
  sale_id?: number;
  product_id?: number | null;
  product_name: string;
  product_code?: string;
  quantity: number;
  unit: string;
  rate: number;
  discount: number;
  gst_rate?: number;
  gst_amount?: number;
  amount: number;
  vasan_type?: string;
  vasan_qty?: number;
  vasan_type_2?: string;
  vasan_qty_2?: number;
}

export interface Sale {
  id: number;
  invoice_no: string;
  date: string;
  customer_id?: number | null;
  customer_name: string;
  customer_mobile?: string;
  customer_registered_mobile?: string;
  customer_address?: string;
  delivery_venue?: string;
  delivery_address?: string;
  driver_id?: number | null;
  driver_name?: string;
  driver_mobile?: string;
  delivery_charge?: number;
  advance_adjusted?: number;
  rickshaw_rent?: number;
  rickshaw_rent_status?: 'PENDING' | 'PAID';
  vasan_summary?: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  round_off: number;
  grand_total: number;
  paid_amount: number;
  due_amount: number;
  payment_mode: string;
  status: 'ACTIVE' | 'CANCELLED';
  notes?: string;
  created_by?: string;
  trip_type?: 'ROUND_TRIP' | 'ONE_WAY' | string;
  google_map_link?: string;
  items?: SaleItem[];
}

export interface PurchaseItem {
  id?: number;
  purchase_id?: number;
  item_type: 'RAW_MATERIAL' | 'PRODUCT' | 'PACKAGING';
  raw_material_id?: number | null;
  product_id?: number | null;
  item_name: string;
  item_code?: string;
  quantity: number;
  unit: string;
  rate: number;
  discount: number;
  gst_rate: number;
  gst_amount: number;
  amount: number;
}

export interface Purchase {
  id: number;
  purchase_no: string;
  date: string;
  supplier_id: number;
  supplier_name: string;
  supplier_mobile?: string;
  supplier_invoice_no?: string;
  supplier_invoice_date?: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  round_off: number;
  grand_total: number;
  paid_amount: number;
  due_amount: number;
  payment_mode: string;
  status: 'ACTIVE' | 'CANCELLED';
  notes?: string;
  created_by?: string;
  items?: PurchaseItem[];
}

export interface Customer {
  id: number;
  customer_no: string;
  name: string;
  mobile: string;
  email?: string;
  address: string;
  city?: string;
  gstin: string;
  opening_balance: number;
  advance_balance?: number;
  credit_limit: number;
  current_balance: number;
  notes?: string;
  total_invoices?: number;
  total_sales_amount?: number;
  active: number;
}

export interface Supplier {
  id: number;
  supplier_no: string;
  name: string;
  contact_person?: string;
  mobile: string;
  email?: string;
  address: string;
  city?: string;
  gstin: string;
  credit_terms: string;
  expense_type?: 'DIRECT' | 'INDIRECT';
  pl_category?: string;
  allocated_location?: string;
  bank_name?: string;
  bank_account_no?: string;
  bank_ifsc?: string;
  upi_id?: string;
  opening_balance: number;
  current_balance: number;
  notes?: string;
  total_purchases?: number;
  total_purchase_amount?: number;
  active: number;
}

export interface LedgerEntry {
  id: number;
  entry_date: string;
  party_type: string;
  party_id: number;
  party_name: string;
  voucher_type: string;
  voucher_id: number;
  voucher_no: string;
  debit_amount: number;
  credit_amount: number;
  running_balance?: number;
  notes: string;
}

export interface Expense {
  id: number;
  expense_no: string;
  date: string;
  category: string;
  amount: number;
  payment_mode: string;
  reference_no: string;
  notes: string;
  is_manufacturing_overhead: number;
  created_by: string;
  supplier_id?: number | null;
  supplier_name?: string;
  expense_type?: 'DIRECT' | 'INDIRECT';
  pl_category?: string;
  location?: string;
  account_id?: number | null;
  account_name?: string;
  bill_photo_url?: string;
}

export interface StockMovement {
  id: number;
  movement_date: string;
  item_type: string;
  item_id: number;
  item_name: string;
  movement_type: string;
  quantity: number;
  unit: string;
  cost_rate: number;
  total_cost_value: number;
  reference_type: string;
  reference_no: string;
  notes: string;
  created_by: string;
}

export interface PnLPeriodData {
  revenue: number;
  raw_purchases: number;
  direct_labour: number;
  direct_overhead: number;
  cogs: number;
  gross_profit: number;
  gross_margin_pct: number;
  operating_expenses: number;
  net_profit: number;
  net_margin_pct: number;
  direct_breakdown: Array<{ category: string; total: number }>;
  indirect_breakdown: Array<{ category: string; total: number }>;
}

export interface GoogleSheetPnLReport {
  startDate: string;
  endDate: string;
  columns: Array<{
    key: string;
    label: string;
    data: PnLPeriodData;
  }>;
  current_inventory_valuation: number;
}

export interface PaymentAccount {
  id: number;
  account_name: string;
  account_type: 'CASH' | 'BANK' | 'UPI' | 'OTHER';
  account_number: string;
  bank_name: string;
  ifsc_code: string;
  opening_balance: number;
  current_balance: number;
  is_default: number;
  active: number;
  notes: string;
  total_transactions?: number;
  opening_balance_for_period?: number;
  created_at?: string;
  updated_at?: string;
}

export interface RojmelEntry {
  id: number;
  entry_date: string;
  party_type: string;
  party_id?: number;
  party_name: string;
  voucher_type: string;
  voucher_id?: number;
  voucher_no: string;
  inflow_amount: number;
  outflow_amount: number;
  running_balance: number;
  account_id?: number;
  account_name: string;
  account_type: string;
  notes: string;
  created_at?: string;
}

export interface RojmelSalesSummary {
  total_sales: number;
  cash_sales: number;
  credit_sales: number;
  total_bills: number;
  total_kg: number;
}

export interface RojmelData {
  fromDate: string;
  toDate: string;
  accountId: string;
  opening_balance: number;
  opening_cash: number;
  opening_bank: number;
  opening_upi: number;
  total_inflow: number;
  total_outflow: number;
  net_flow: number;
  closing_balance: number;
  total_sales?: number;
  sales_summary?: RojmelSalesSummary;
  accounts: PaymentAccount[];
  entries: RojmelEntry[];
}

export interface AdvanceOrderItem {
  id?: number;
  order_id?: number;
  product_id?: number | null;
  item_name: string;
  quantity: number;
  unit: string;
  rate: number;
  total_amount: number;
  notes?: string;
}

export interface AdvanceOrder {
  id: number;
  order_no: string;
  customer_id?: number | null;
  customer_name: string;
  customer_mobile?: string;
  customer_address?: string;
  customer_current_balance?: number;
  delivery_date: string;
  delivery_slot: 'MORNING' | 'EVENING' | 'ALL_DAY';
  delivery_time: string;
  delivery_venue: string;
  customer_delivery_charge: number;
  driver_delivery_rate: number;
  status: 'PENDING' | 'IN_PRODUCTION' | 'READY' | 'DISPATCHED' | 'BILLED' | 'CANCELLED';
  total_items: number;
  total_weight_kg: number;
  total_amount: number;
  advance_paid: number;
  converted_sale_id?: number | null;
  converted_invoice_no?: string;
  notes: string;
  trip_type?: 'ROUND_TRIP' | 'ONE_WAY' | string;
  google_map_link?: string;
  items?: AdvanceOrderItem[];
  created_at?: string;
  updated_at?: string;
}

export interface KitchenItemBreakdown {
  customer_name: string;
  qty: number;
  unit: string;
  time?: string;
  notes?: string;
}

export interface KitchenItemRequirement {
  product_id?: number;
  item_name: string;
  unit: string;
  total_qty: number;
  order_count: number;
  caterers: string[];
  breakdown_formula?: string;
  breakdown_list?: KitchenItemBreakdown[];
  notes_list?: string[];
}

export interface SlotOrdersData {
  slot_name: string;
  orders_count: number;
  total_amount: number;
  total_weight_kg: number;
  orders: AdvanceOrder[];
  kitchen_summary: KitchenItemRequirement[];
}

export interface DailyOrdersSummary {
  date: string;
  total_orders_count: number;
  total_day_amount: number;
  total_day_weight_kg: number;
  morning: SlotOrdersData;
  evening: SlotOrdersData;
  all_kitchen_summary: KitchenItemRequirement[];
}

export interface WhatsAppParsedItem {
  product_id?: number | null;
  item_name: string;
  quantity: number;
  unit: string;
  rate: number;
  total_amount: number;
  notes?: string;
}

export interface WhatsAppInboundOrder {
  id: number;
  outlet_name: string;
  sender_mobile: string;
  sender_name: string;
  raw_message: string;
  received_at: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  parsed_customer_name: string;
  parsed_customer_mobile: string;
  parsed_delivery_date: string;
  parsed_delivery_slot: 'MORNING_1' | 'EVENING_2' | string;
  parsed_delivery_venue: string;
  parsed_advance_amount: number;
  parsed_deposit_mode: 'CASH' | 'UPI' | string;
  parsed_items_json?: string;
  items: WhatsAppParsedItem[];
  converted_order_id?: number | null;
  converted_order_no?: string;
  notes: string;
  created_at?: string;
  updated_at?: string;
}

// Auto-Dispatch 5-Minute WhatsApp Queue
export interface ScheduledDispatch {
  key: string;
  reference_type: 'SALE' | 'SALES_RETURN';
  reference_id: number;
  invoice_no: string;
  customer_name: string;
  recipient_mobile: string;
  scheduled_at: string;
  remaining_seconds: number;
}

// Staff Attendance & Salary System
export interface Branch {
  id: number;
  name: string;
  code?: string;
  pin: string;
  address?: string;
  active: number;
  created_at?: string;
}

export interface Employee {
  id: number;
  branch_id: number;
  branch_name?: string;
  branch_code?: string;
  name: string;
  phone?: string;
  designation?: string;
  pin?: string;
  aadhar_number?: string;
  address?: string;
  monthly_salary: number;
  daily_rate: number;
  join_date: string;
  active: number;
  created_at?: string;
  updated_at?: string;
}

export interface AttendanceRecord {
  employee_id: number;
  name: string;
  phone?: string;
  designation?: string;
  pin?: string;
  branch_id?: number;
  branch_name?: string;
  monthly_salary?: number;
  attendance_id?: number | null;
  status: 'P' | 'A' | 'H' | 'L' | 'UNMARKED';
  in_time?: string;
  out_time?: string;
  total_hours?: number;
  notes?: string;
}

export interface EmployeeAdvance {
  id: number;
  employee_id: number;
  employee_name?: string;
  designation?: string;
  branch_name?: string;
  date: string;
  amount: number;
  payment_mode: string;
  note: string;
  status: string;
  created_by?: string;
  created_at?: string;
}

export interface SalaryReportItem {
  employee_id: number;
  name: string;
  phone?: string;
  designation?: string;
  branch_name?: string;
  monthly_salary: number;
  days_in_month: number;
  present_days: number;
  absent_days: number;
  half_days: number;
  leave_days: number;
  total_worked_days: number;
  gross_earned: number;
  total_advances: number;
  net_payable: number;
}

export interface SalaryReportResponse {
  month: number;
  year: number;
  start_date: string;
  end_date: string;
  days_in_month: number;
  report: SalaryReportItem[];
}

export interface AttendanceSettings {
  id: number;
  master_pin: string;
  company_name: string;
  salary_cycle_day: number;
  working_hours_per_day?: number;
  updated_at?: string;
}


