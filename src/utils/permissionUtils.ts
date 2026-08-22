import { User, ModuleAccessLevel } from '../types';

export const ALL_ERP_MODULES = [
  { id: 'dashboard', label: 'Dashboard & Financial KPIs', guLabel: 'લાઇવ ડેશબોર્ડ & નફો-નુકસાન' },
  { id: 'sales', label: 'Sales & Counter Billing', guLabel: 'સેલ્સ કાઉન્ટર બિલિંગ (WhatsApp)' },
  { id: 'advance_orders', label: 'Advance Orders (Catering)', guLabel: 'એડવાન્સ ઓર્ડર & કેટરર્સ બુકિંગ' },
  { id: 'customers', label: 'Customers & Khata Ledgers', guLabel: 'ગ્રાહક ખાતાવહી & ઉઘરાણી' },
  { id: 'suppliers', label: 'Suppliers & Vendors', guLabel: 'વેપારી ખાતાઓ & ખરીદી હિસાબ' },
  { id: 'products', label: 'Products & Recipe Batch Scaler', guLabel: 'મીઠાઈ માસ્ટર & રેસિપી માપ કેલ્ક્યુલેટર' },
  { id: 'purchases', label: 'Purchases & Kharidi Book', guLabel: 'માલ ખરીદી રજિસ્ટર' },
  { id: 'expenses', label: 'Daily Business Expenses', guLabel: 'રોજના ફેક્ટરી & દુકાન ખર્ચા' },
  { id: 'rojmel', label: 'Daily Daybook (Rojmel)', guLabel: 'આજનો રોજમેળ (કેશ ડ્રોઅર & ગલ્લો)' },
  { id: 'reports', label: 'Reports & Analytics', guLabel: 'બિઝનેસ રિપોર્ટ્સ & ઓડિટ' },
  { id: 'google_sheet_pnl', label: '3-Branch Stock & Google Sheet', guLabel: '૩ શાખા ભૌતિક સ્ટોક ઓડિટ' },
  { id: 'attendance', label: 'Staff Attendance & Salary', guLabel: 'કારીગર & સ્ટાફ હાજરી (HAJRI)' },
  { id: 'todos', label: 'Daily Task Planner', guLabel: 'રોજિંદા કામ લિસ્ટ (My Day)' },
  { id: 'settings', label: 'System Settings & Masters', guLabel: 'માસ્ટર સેટિંગ્સ & ડ્રાઇવર ભાડું' },
  { id: 'backup', label: 'Database Backup & Restore', guLabel: 'ડેટાબેઝ બેકઅપ & રિસ્ટોર' }
] as const;

export type ERPModuleId = typeof ALL_ERP_MODULES[number]['id'];

// Get normalized access level for a module
export function getModuleAccessLevel(user: User | null | undefined, moduleId: string): ModuleAccessLevel {
  if (!user) return 'FULL'; // Default for non-auth dev mode
  if (user.role === 'ADMIN' || user.username?.toLowerCase() === 'admin') {
    return 'FULL';
  }

  const raw = user.permissions ? (user.permissions as any)[moduleId] : undefined;

  if (raw === 'FULL' || raw === true) return 'FULL';
  if (raw === 'EDIT') return 'EDIT';
  if (raw === 'VIEW') return 'VIEW';
  if (raw === 'NONE' || raw === false) return 'NONE';

  // Every role gets FULL access to their own Daily Task Planner (todos) and at
  // least VIEW on the dashboard, regardless of role — a user should never be
  // locked out of every module just because their role has no explicit rule.
  if (moduleId === 'todos') return 'FULL';

  // Fallbacks by role if not explicitly set
  if (user.role === 'MANAGER') return moduleId === 'settings' || moduleId === 'backup' ? 'NONE' : 'FULL';
  if (user.role === 'STOREKEEPER') return ['products', 'purchases', 'google_sheet_pnl', 'dashboard', 'advance_orders', 'attendance'].includes(moduleId) ? 'VIEW' : 'NONE';
  if (user.role === 'PRODUCTION') return ['products', 'advance_orders', 'google_sheet_pnl', 'dashboard', 'attendance'].includes(moduleId) ? 'VIEW' : 'NONE';
  if (user.role === 'CASHIER') return ['sales', 'advance_orders'].includes(moduleId) ? 'FULL' : ['customers'].includes(moduleId) ? 'EDIT' : ['dashboard', 'products', 'rojmel', 'expenses', 'attendance'].includes(moduleId) ? 'VIEW' : 'NONE';
  if (user.role === 'ACCOUNTANT') return ['reports', 'rojmel', 'expenses', 'customers', 'suppliers'].includes(moduleId) ? 'FULL' : ['dashboard', 'purchases', 'sales'].includes(moduleId) ? 'VIEW' : 'NONE';
  if (user.role === 'DELIVERY_STAFF') return ['advance_orders'].includes(moduleId) ? 'EDIT' : moduleId === 'dashboard' ? 'VIEW' : 'NONE';
  if (user.role === 'CHEF') return ['products', 'advance_orders'].includes(moduleId) ? 'VIEW' : moduleId === 'dashboard' ? 'VIEW' : 'NONE';
  if (user.role === 'STAFF') return moduleId === 'dashboard' || moduleId === 'attendance' ? 'VIEW' : 'NONE';

  return 'NONE';
}

// Can user see the module in navigation and open it?
export function hasModuleAccess(user: User | null | undefined, moduleId: string): boolean {
  const level = getModuleAccessLevel(user, moduleId);
  return level !== 'NONE';
}

// Can user modify/create in this module?
export function canEditModule(user: User | null | undefined, moduleId: string): boolean {
  const level = getModuleAccessLevel(user, moduleId);
  return level === 'EDIT' || level === 'FULL';
}

// Can user delete / full manage in this module?
export function canDeleteModule(user: User | null | undefined, moduleId: string): boolean {
  const level = getModuleAccessLevel(user, moduleId);
  return level === 'FULL';
}

// Is user strictly in read-only / view-only mode for this module?
export function isViewOnlyModule(user: User | null | undefined, moduleId: string): boolean {
  const level = getModuleAccessLevel(user, moduleId);
  return level === 'VIEW';
}
