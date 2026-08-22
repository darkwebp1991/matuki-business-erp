const getApiBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location) {
    const protocol = window.location.protocol;
    const host = window.location.hostname || 'localhost';
    const port = window.location.port;

    if (port === '5173') {
      return `${protocol}//${host}:4321/api`;
    }
    // Standard Port 80 / Production: /api (100% Firewall Safe)
    return '/api';
  }
  return 'http://localhost:4321/api';
};

const BASE_URL = getApiBaseUrl();

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  const result = await response.json();
  if (!response.ok || result.success === false) {
    throw new Error(result.error || result.details || `API request failed: ${response.status}`);
  }

  return result.data !== undefined ? result.data : result;
}

export const api = {
  // Health
  checkHealth: () => request<any>('/health'),

  // Real-Time Server-Sent Events (Instant Live Sync across PCs on LAN / WiFi)
  subscribeToEvents: (onEvent: (data: any) => void) => {
    try {
      const sseUrl = `${BASE_URL}/events`;
      const eventSource = new EventSource(sseUrl);
      eventSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          onEvent(data);
        } catch (err) {
          console.error('SSE JSON parse error:', err);
        }
      };
      eventSource.onerror = () => {
        // Auto-reconnects natively by browser
      };
      return () => {
        eventSource.close();
      };
    } catch (e) {
      console.warn('SSE not supported or failed to connect:', e);
      return () => {};
    }
  },

  // Auth
  login: (username: string, password: string) => request<any>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  }),

  // Settings
  getSettings: () => request<any>('/settings'),
  getNextDocumentNumber: (type: string) => request<{ number: string; type: string }>(`/settings/next-number/${type}`),
  updateSettings: (data: any) => request<any>('/settings', {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  uploadQRImage: (imageBase64: string, upiId?: string) => request<any>('/settings/upload-qr', {
    method: 'POST',
    body: JSON.stringify({ image_base64: imageBase64, upi_id: upiId })
  }),

  // Units & Categories
  getUnits: () => request<any[]>('/units'),
  createUnit: (data: any) => request<any>('/units', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateUnit: (id: number, data: any) => request<any>(`/units/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteUnit: (id: number) => request<any>(`/units/${id}`, {
    method: 'DELETE'
  }),

  getCategories: (type?: string) => request<any[]>(`/categories${type ? `?type=${type}` : ''}`),
  createCategory: (data: any) => request<any>('/categories', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateCategory: (id: number, data: any) => request<any>(`/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteCategory: (id: number) => request<any>(`/categories/${id}`, {
    method: 'DELETE'
  }),

  // Products
  getProducts: (params: any = {}) => {
    const q = new URLSearchParams(params).toString();
    return request<any[]>(`/products${q ? `?${q}` : ''}`);
  },
  getProductById: (id: number) => request<any>(`/products/${id}`),
  createProduct: (data: any) => request<any>('/products', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateProduct: (id: number, data: any) => request<any>(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteProduct: (id: number) => request<any>(`/products/${id}`, {
    method: 'DELETE'
  }),

  // Raw Materials
  getRawMaterials: (params: any = {}) => {
    const q = new URLSearchParams(params).toString();
    return request<any[]>(`/raw-materials${q ? `?${q}` : ''}`);
  },
  getRawMaterialById: (id: number) => request<any>(`/raw-materials/${id}`),
  createRawMaterial: (data: any) => request<any>('/raw-materials', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateRawMaterial: (id: number, data: any) => request<any>(`/raw-materials/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteRawMaterial: (id: number) => request<any>(`/raw-materials/${id}`, {
    method: 'DELETE'
  }),

  // Recipes
  getRecipes: (params: any = {}) => {
    const q = new URLSearchParams(params).toString();
    return request<any[]>(`/recipes${q ? `?${q}` : ''}`);
  },
  getRecipeById: (id: number) => request<any>(`/recipes/${id}`),
  createRecipe: (data: any) => request<any>('/recipes', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateRecipe: (id: number, data: any) => request<any>(`/recipes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  createRecipeVersion: (id: number, data: any) => request<any>(`/recipes/${id}/version`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  calculateRecipeCost: (data: { recipe_id: number; version_id?: number; target_batch_size?: number; costing_method?: string }) => request<any>('/recipes/calculate-cost', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Manufacturing
  getManufacturingOrders: (params: any = {}) => {
    const q = new URLSearchParams(params).toString();
    return request<any[]>(`/manufacturing${q ? `?${q}` : ''}`);
  },
  getManufacturingOrderById: (id: number) => request<any>(`/manufacturing/${id}`),
  createManufacturingBatch: (data: any) => request<any>('/manufacturing', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Purchases
  getPurchases: (params: any = {}) => {
    const q = new URLSearchParams(params).toString();
    return request<any[]>(`/purchases${q ? `?${q}` : ''}`);
  },
  getPurchaseById: (id: number) => request<any>(`/purchases/${id}`),
  createPurchase: (data: any) => request<any>('/purchases', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Sales
  getSales: (params: any = {}) => {
    const q = new URLSearchParams(params).toString();
    return request<any[]>(`/sales${q ? `?${q}` : ''}`);
  },
  getSaleById: (id: number) => request<any>(`/sales/${id}`),
  createSale: (data: any) => request<any>('/sales', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateSale: (id: number, data: any) => request<any>(`/sales/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteSale: (id: number) => request<{ success: boolean; message: string }>(`/sales/${id}`, {
    method: 'DELETE'
  }),
  cancelSale: (id: number, reason: string) => request<any>(`/sales/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason })
  }),

  // Customers & Suppliers
  getCustomers: (params: any = {}) => {
    const q = new URLSearchParams(params).toString();
    return request<any[]>(`/customers${q ? `?${q}` : ''}`);
  },
  getCustomerById: (id: number) => request<any>(`/customers/${id}`),
  createCustomer: (data: any) => request<any>('/customers', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateCustomer: (id: number, data: any) => request<any>(`/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  getCustomerLastRates: (customerId: number) => request<Record<number, { rate: number; discount: number; last_date: string; invoice_no: string }>>(`/customers/${customerId}/last-rates`),
  getCustomerSmartRecommendations: (customerId: number) => request<{
    frequentVenues: Array<{ venue_name: string; usage_count: number; address?: string; area_landmark?: string; customer_charge?: number; driver_rent?: number }>;
    frequentProducts: Array<{ product_id: number | null; item_name: string; order_count: number; total_qty: number; unit: string; rate: number; code?: string }>;
  }>(`/customers/${customerId}/smart-recommendations`),

  getSuppliers: (params: any = {}) => {
    const q = new URLSearchParams(params).toString();
    return request<any[]>(`/suppliers${q ? `?${q}` : ''}`);
  },
  getSupplierById: (id: number) => request<any>(`/suppliers/${id}`),
  createSupplier: (data: any) => request<any>('/suppliers', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateSupplier: (id: number, data: any) => request<any>(`/suppliers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  // Rickshaw Drivers & Delivery Locations & Area Delivery Rates
  getDrivers: () => request<any[]>('/drivers'),
  createDriver: (data: any) => request<any>('/drivers', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  setDefaultDriver: (id: number) => request<any>(`/drivers/${id}/set-default`, {
    method: 'POST'
  }),
  getAreaDeliveryRates: () => request<any[]>('/area-rates'),
  createAreaDeliveryRate: (data: any) => request<any>('/area-rates', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateAreaDeliveryRate: (id: number, data: any) => request<any>(`/area-rates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteAreaDeliveryRate: (id: number) => request<any>(`/area-rates/${id}`, {
    method: 'DELETE'
  }),
  getDeliveryLocations: () => request<any[]>('/delivery-locations'),
  createDeliveryLocation: (data: any) => request<any>('/delivery-locations', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateDeliveryLocation: (id: number, data: any) => request<any>(`/delivery-locations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteDeliveryLocation: (id: number) => request<any>(`/delivery-locations/${id}`, {
    method: 'DELETE'
  }),

  // Rickshaw Driver Delivery & Rent Hisab Report
  getDriverTripsReport: (params: any = {}) => {
    const q = new URLSearchParams(params).toString();
    return request<any>(`/reports/driver-trips${q ? `?${q}` : ''}`);
  },
  settleDriverRent: (sale_ids: number[]) => request<any>('/reports/driver-trips/settle', {
    method: 'POST',
    body: JSON.stringify({ sale_ids })
  }),

  // Rickshaw Driver Trip Dispatch & Multi-Stop Trip Sheets
  getDriverTrips: (date?: string) => request<any[]>(`/driver-trips${date ? `?date=${date}` : ''}`),
  getDriverSingleMessage: (saleId: number) => request<any>(`/driver-trips/single-message/${saleId}`),
  getDriverTripSheetMessage: (driverName: string, date?: string) => request<any>(`/driver-trips/sheet-message?driver=${encodeURIComponent(driverName)}${date ? `&date=${date}` : ''}`),
  sendDriverSingleStopWhatsApp: (saleId: number, driverMobile?: string) => request<any>('/driver-trips/send-single-whatsapp', {
    method: 'POST',
    body: JSON.stringify({ sale_id: saleId, driver_mobile: driverMobile })
  }),
  sendDriverTripSheetWhatsApp: (driverName: string, date?: string, driverMobile?: string) => request<any>('/driver-trips/send-sheet-whatsapp', {
    method: 'POST',
    body: JSON.stringify({ driver_name: driverName, date, driver_mobile: driverMobile })
  }),

  // Daily 8:45 PM Auto Daybook (Rojmel) Snapshot to 3 Partners
  getAutoDaybookMessage: (date?: string) => request<any>(`/auto-daybook/message${date ? `?date=${date}` : ''}`),
  dispatchDaybookToPartners: (date?: string, partners?: string[], imageBase64?: string) => request<any>('/auto-daybook/dispatch-partners', {
    method: 'POST',
    body: JSON.stringify({ date, partners, image_base64: imageBase64 })
  }),

  // Sales Returns with Vasan Return
  getSalesReturns: (params: any = {}) => {
    const q = new URLSearchParams(params).toString();
    return request<any[]>(`/sales-returns${q ? `?${q}` : ''}`);
  },
  createSalesReturn: (data: any) => request<any>('/sales-returns', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Vasan (Container / Milton / Choki / Carat) Tracking & Vasan Yadi
  getVasanTracker: (params: any = {}) => {
    const q = new URLSearchParams(params).toString();
    return request<any>(`/reports/vasan-tracker${q ? `?${q}` : ''}`);
  },
  getVasanYadi: (params: any = {}) => {
    const q = new URLSearchParams(params).toString();
    return request<any>(`/reports/vasan-yadi${q ? `?${q}` : ''}`);
  },
  returnVasan: (id: number, returned_qty: number, notes = '') => request<any>('/vasan/return', {
    method: 'POST',
    body: JSON.stringify({ id, returned_qty, notes })
  }),
  chargeMissingVasan: (data: any) => request<any>('/vasan/charge-customer', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Ledger & Payments
  getPartyLedgerStatement: (party_type: string, party_id: number, startDate?: string, endDate?: string) => {
    let q = `party_type=${party_type}&party_id=${party_id}`;
    if (startDate) q += `&startDate=${startDate}`;
    if (endDate) q += `&endDate=${endDate}`;
    return request<any>(`/ledger/statement?${q}`);
  },
  getPayments: (params: any = {}) => {
    const q = new URLSearchParams(params).toString();
    return request<any[]>(`/payments${q ? `?${q}` : ''}`);
  },
  recordPayment: (data: any) => request<any>('/payments', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Returns / Credit & Debit Notes
  getPurchaseReturns: (params: any = {}) => {
    const q = new URLSearchParams(params).toString();
    return request<any[]>(`/purchase-returns${q ? `?${q}` : ''}`);
  },
  createPurchaseReturn: (data: any) => request<any>('/purchase-returns', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Expenses
  getExpenses: (params: any = {}) => {
    const q = new URLSearchParams(params).toString();
    return request<any[]>(`/expenses${q ? `?${q}` : ''}`);
  },
  getExpenseCategories: () => request<string[]>('/expenses/categories'),
  createExpense: (data: any) => request<any>('/expenses', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Inventory
  getInventorySummary: () => request<any>('/inventory/summary'),
  getInventoryItems: (params: any = {}) => {
    const q = new URLSearchParams(params).toString();
    return request<any[]>(`/inventory/items${q ? `?${q}` : ''}`);
  },
  getStockMovements: (params: any = {}) => {
    const q = new URLSearchParams(params).toString();
    return request<any[]>(`/inventory/movements${q ? `?${q}` : ''}`);
  },
  adjustStock: (data: any) => request<any>('/inventory/adjust', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  // Stock Audits & 3-Branch Physical Verification
  getStockAuditTemplate: (month?: string) => {
    return request<any>(`/stock-audits/template${month ? `?month=${month}` : ''}`);
  },
  getLatestStockAudit: (month?: string) => {
    return request<any>(`/stock-audits/latest${month ? `?month=${month}` : ''}`);
  },
  getStockAuditHistory: () => {
    return request<any[]>('/stock-audits/history');
  },
  saveStockAudit: (data: any) => request<any>('/stock-audits', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  importStockAuditData: (data: any) => request<any>('/stock-audits/import', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Reports
  getDashboardMetrics: (period: string = 'THIS_MONTH', startDate?: string, endDate?: string) => {
    let q = `period=${period}`;
    if (startDate) q += `&startDate=${startDate}`;
    if (endDate) q += `&endDate=${endDate}`;
    return request<any>(`/reports/dashboard?${q}`);
  },
  getGoogleSheetPnL: (startDate?: string, endDate?: string) => {
    let q = '';
    if (startDate) q += `startDate=${startDate}`;
    if (endDate) q += `${q ? '&' : ''}endDate=${endDate}`;
    return request<any>(`/reports/google-sheet-pnl${q ? `?${q}` : ''}`);
  },
  getSaleReport: (startDate?: string, endDate?: string) => {
    let q = '';
    if (startDate) q += `startDate=${startDate}`;
    if (endDate) q += `${q ? '&' : ''}endDate=${endDate}`;
    return request<any>(`/reports/sales${q ? `?${q}` : ''}`);
  },
  getPurchaseReport: (startDate?: string, endDate?: string) => {
    let q = '';
    if (startDate) q += `startDate=${startDate}`;
    if (endDate) q += `${q ? '&' : ''}endDate=${endDate}`;
    return request<any>(`/reports/purchases${q ? `?${q}` : ''}`);
  },
  getDayBook: (date?: string) => {
    return request<any>(`/reports/daybook${date ? `?date=${date}` : ''}`);
  },
  getAllTransactionsReport: (startDate?: string, endDate?: string) => {
    let q = '';
    if (startDate) q += `startDate=${startDate}`;
    if (endDate) q += `${q ? '&' : ''}endDate=${endDate}`;
    return request<any[]>(`/reports/all-transactions${q ? `?${q}` : ''}`);
  },
  getBillWiseProfit: (startDate?: string, endDate?: string) => {
    let q = '';
    if (startDate) q += `startDate=${startDate}`;
    if (endDate) q += `${q ? '&' : ''}endDate=${endDate}`;
    return request<any>(`/reports/bill-wise-profit${q ? `?${q}` : ''}`);
  },
  getCashFlowReport: (startDate?: string, endDate?: string) => {
    let q = '';
    if (startDate) q += `startDate=${startDate}`;
    if (endDate) q += `${q ? '&' : ''}endDate=${endDate}`;
    return request<any[]>(`/reports/cash-flow${q ? `?${q}` : ''}`);
  },
  getTrialBalanceReport: () => request<any>('/reports/trial-balance'),
  getBalanceSheetReport: () => request<any>('/reports/balance-sheet'),
  getPartyWiseProfitReport: (startDate?: string, endDate?: string) => {
    let q = '';
    if (startDate) q += `startDate=${startDate}`;
    if (endDate) q += `${q ? '&' : ''}endDate=${endDate}`;
    return request<any[]>(`/reports/party-wise-profit${q ? `?${q}` : ''}`);
  },
  getPartyReportByItem: (startDate?: string, endDate?: string) => {
    let q = '';
    if (startDate) q += `startDate=${startDate}`;
    if (endDate) q += `${q ? '&' : ''}endDate=${endDate}`;
    return request<any[]>(`/reports/party-report-by-item${q ? `?${q}` : ''}`);
  },
  getSalePurchaseByPartyReport: () => request<any[]>('/reports/sale-purchase-by-party'),
  getItemWiseProfitReport: (startDate?: string, endDate?: string) => {
    let q = '';
    if (startDate) q += `startDate=${startDate}`;
    if (endDate) q += `${q ? '&' : ''}endDate=${endDate}`;
    return request<any[]>(`/reports/item-wise-profit${q ? `?${q}` : ''}`);
  },
  getItemCategoryProfitReport: (startDate?: string, endDate?: string) => {
    let q = '';
    if (startDate) q += `startDate=${startDate}`;
    if (endDate) q += `${q ? '&' : ''}endDate=${endDate}`;
    return request<any[]>(`/reports/item-category-profit${q ? `?${q}` : ''}`);
  },
  getItemMovementReport: (startDate?: string, endDate?: string) => {
    let q = '';
    if (startDate) q += `startDate=${startDate}`;
    if (endDate) q += `${q ? '&' : ''}endDate=${endDate}`;
    return request<any>(`/reports/item-movement${q ? `?${q}` : ''}`);
  },
  getLowStockSummaryReport: () => request<any[]>('/reports/low-stock-summary'),
  getManufacturingYieldReport: (startDate?: string, endDate?: string) => {
    let q = '';
    if (startDate) q += `startDate=${startDate}`;
    if (endDate) q += `${q ? '&' : ''}endDate=${endDate}`;
    return request<any>(`/reports/manufacturing-yield${q ? `?${q}` : ''}`);
  },

  // Backup & Restore
  getBackupStats: () => request<any>('/backup/stats'),
  getBackupHistory: () => request<any[]>('/backup/history'),
  createBackupNow: (type = 'MANUAL') => request<any>('/backup/now', {
    method: 'POST',
    body: JSON.stringify({ type })
  }),
  restoreBackup: (file_path: string) => request<any>('/backup/restore', {
    method: 'POST',
    body: JSON.stringify({ file_path })
  }),
  uploadAndRestoreBackup: async (file: File) => {
    const res = await fetch(`${BASE_URL}/backup/upload-restore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream'
      },
      body: file
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || json.details || 'Restore failed');
    }
    return json;
  },
  exportAllBusinessData: () => request<any>('/backup/export-all-data'),
  getDatabaseDownloadUrl: () => `${BASE_URL}/backup/download-db`,

  // Audit & Users
  getAuditLogs: (limit = 100) => request<any[]>(`/audit/logs?limit=${limit}`),
  getUsers: () => request<any[]>('/users'),
  createUser: (data: any) => request<any>('/users', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateUser: (id: number, data: any) => request<any>(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteUser: (id: number) => request<any>(`/users/${id}`, {
    method: 'DELETE'
  }),

  // Vasan (Utensil / Container) Master & Replacement Rates
  getVasanMasterList: (includeInactive = false) => request<any[]>(`/vasan-master?include_inactive=${includeInactive}`),
  getVasanMasterById: (id: number) => request<any>(`/vasan-master/${id}`),
  createVasanMasterItem: (data: any) => request<any>('/vasan-master', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateVasanMasterItem: (id: number, data: any) => request<any>(`/vasan-master/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteVasanMasterItem: (id: number) => request<any>(`/vasan-master/${id}`, {
    method: 'DELETE'
  }),

  // Daily To-Do Task Management & Productivity
  getTodos: (params: { timeframe?: string; view_mode?: string; user_id?: number | null; assigned_to?: string; category?: string; status?: string; search?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.timeframe) q.append('timeframe', params.timeframe);
    if (params.view_mode) q.append('view_mode', params.view_mode);
    if (params.user_id) q.append('user_id', String(params.user_id));
    if (params.assigned_to) q.append('assigned_to', params.assigned_to);
    if (params.category) q.append('category', params.category);
    if (params.status) q.append('status', params.status);
    if (params.search) q.append('search', params.search);
    return request<any[]>(`/todos?${q.toString()}`);
  },
  getTodoSummary: (user?: string | number | null) => request<any>(`/todos/summary${user ? `?assigned_to=${encodeURIComponent(String(user))}` : ''}`),
  getPendingTodoCount: (username?: string) => request<{ count: number }>(`/todos/pending-count${username ? `?username=${encodeURIComponent(username)}` : ''}`),
  getTodoWhatsAppBriefing: (timeframe = 'TODAY', assignedTo = 'All') => request<{ text: string }>(`/todos/whatsapp-briefing?timeframe=${timeframe}&assigned_to=${encodeURIComponent(assignedTo)}`),
  createTodo: (data: any) => request<any>('/todos', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  acceptTodo: (id: number, username?: string) => request<any>(`/todos/${id}/accept`, {
    method: 'POST',
    body: JSON.stringify({ username })
  }),
  rejectTodo: (id: number, reason: string, username?: string) => request<any>(`/todos/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason, username })
  }),
  updateTodo: (id: number, data: any) => request<any>(`/todos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  toggleTodoStatus: (id: number) => request<any>(`/todos/${id}/toggle`, {
    method: 'POST'
  }),
  toggleTodoStar: (id: number) => request<any>(`/todos/${id}/star`, {
    method: 'POST'
  }),
  rescheduleTodoToToday: (id: number) => request<any>(`/todos/${id}/reschedule-today`, {
    method: 'POST'
  }),
  rescheduleAllOverdueTodos: (userId?: number | null) => request<{ success: boolean; updated_count: number }>('/todos/reschedule-all-overdue', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId })
  }),
  deleteTodo: (id: number) => request<any>(`/todos/${id}`, {
    method: 'DELETE'
  }),

  // System Reset & Trial Data Clearing
  resetTrialTransactions: () => request<any>('/system/reset-transactions', {
    method: 'POST'
  }),
  factoryResetSystem: () => request<any>('/system/factory-reset', {
    method: 'POST'
  }),
  reloadDemoData: () => request<any>('/system/reload-demo', {
    method: 'POST'
  }),
  seedDemoData: () => request<any>('/system/seed-demo', {
    method: 'POST'
  }),

  // Payment Modes & Bank Accounts Master
  getPaymentAccounts: (activeOnly = true) => request<any[]>(`/payment-accounts?activeOnly=${activeOnly}`),
  getPaymentAccountById: (id: number) => request<any>(`/payment-accounts/${id}`),
  createPaymentAccount: (data: any) => request<any>('/payment-accounts', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updatePaymentAccount: (id: number, data: any) => request<any>(`/payment-accounts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deletePaymentAccount: (id: number) => request<any>(`/payment-accounts/${id}`, {
    method: 'DELETE'
  }),
  transferFunds: (data: any) => request<any>('/payment-accounts/transfer', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Daily Rojmel Daybook
  getRojmel: (startDate?: string, endDate?: string, accountId?: string) => {
    let q = '';
    if (startDate) q += `startDate=${startDate}`;
    if (endDate) q += `${q ? '&' : ''}endDate=${endDate}`;
    if (accountId && accountId !== 'ALL') q += `${q ? '&' : ''}accountId=${accountId}`;
    return request<any>(`/reports/rojmel${q ? `?${q}` : ''}`);
  },

  // Advance Caterer Orders & Production Planner
  getAdvanceOrders: (params: any = {}) => {
    const q = new URLSearchParams();
    if (params.startDate) q.set('startDate', params.startDate);
    if (params.endDate) q.set('endDate', params.endDate);
    if (params.deliveryDate) q.set('deliveryDate', params.deliveryDate);
    if (params.status) q.set('status', params.status);
    if (params.slot) q.set('slot', params.slot);
    if (params.customerId) q.set('customerId', String(params.customerId));
    if (params.search) q.set('search', params.search);
    const qs = q.toString();
    return request<any[]>(`/advance-orders${qs ? `?${qs}` : ''}`);
  },
  getAdvanceOrderById: (id: number) => request<any>(`/advance-orders/${id}`),
  getDailyOrdersSummary: (date?: string) => request<any>(`/advance-orders/daily-summary${date ? `?date=${date}` : ''}`),
  createAdvanceOrder: (data: any) => request<any>('/advance-orders', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateAdvanceOrder: (id: number, data: any) => request<any>(`/advance-orders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  updateAdvanceOrderStatus: (id: number, status: string) => request<any>(`/advance-orders/${id}/status`, {
    method: 'POST',
    body: JSON.stringify({ status })
  }),
  convertAdvanceOrderToSale: (id: number, saleId: number, invoiceNo: string) => request<any>(`/advance-orders/${id}/convert-to-sale`, {
    method: 'POST',
    body: JSON.stringify({ saleId, invoiceNo })
  }),
  deleteAdvanceOrder: (id: number) => request<any>(`/advance-orders/${id}`, {
    method: 'DELETE'
  }),

  // WhatsApp Inbound Orders & Outlet Sync
  getWhatsAppInboundOrders: (params: any = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.set('status', params.status);
    if (params.outlet_name) q.set('outlet_name', params.outlet_name);
    const qs = q.toString();
    return request<any[]>(`/whatsapp/inbound-orders${qs ? `?${qs}` : ''}`);
  },
  getWhatsAppInboundOrderById: (id: number) => request<any>(`/whatsapp/inbound-orders/${id}`),
  createWhatsAppInboundOrder: (data: { raw_message: string; outlet_name?: string; customer_name?: string; customer_mobile?: string; advance_amount?: number; notes?: string }) => request<any>('/whatsapp/inbound', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  parseWhatsAppPreview: (raw_message: string, outlet_name?: string) => request<any>('/whatsapp/parse-preview', {
    method: 'POST',
    body: JSON.stringify({ raw_message, outlet_name })
  }),
  approveWhatsAppOrder: (id: number, username = 'Admin') => request<any>(`/whatsapp/inbound-orders/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ username })
  }),
  updateWhatsAppOrder: (id: number, data: any) => request<any>(`/whatsapp/inbound-orders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  rejectWhatsAppOrder: (id: number, reason = 'Rejected') => request<any>(`/whatsapp/inbound-orders/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason })
  }),

  // Online Item Toggle & Public Self-Order Portal
  toggleProductOnline: (id: number, available_online: number) => request<any>(`/products/${id}/toggle-online`, {
    method: 'PUT',
    body: JSON.stringify({ available_online })
  }),
  getPublicOnlineMenu: () => request<{ items: any[]; settings: any }>('/public/menu'),
  submitPublicOnlineOrder: (data: any) => request<any>('/public/orders', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Kitchen Shortage & Network Info
  getKitchenShortageCalculator: (date?: string, slot?: string) => {
    const q = new URLSearchParams();
    if (date) q.set('date', date);
    if (slot) q.set('slot', slot);
    const qs = q.toString();
    return request<any>(`/kitchen/shortage-calculator${qs ? `?${qs}` : ''}`);
  },
  getNetworkInfo: () => request<any>('/system/network-info'),

  // WhatsApp Web Gateway Automation
  getWhatsAppGatewayStatus: () => request<{
    isConnected: boolean;
    isConnecting: boolean;
    phone: string | null;
    name: string | null;
    qrCode: string | null;
    qrGeneratedAt: number | null;
    lastError: string | null;
  }>('/whatsapp-gateway/status'),
  connectWhatsAppGateway: (forceNew = false) => request<any>('/whatsapp-gateway/connect', {
    method: 'POST',
    body: JSON.stringify({ force_new: forceNew })
  }),
  disconnectWhatsAppGateway: () => request<any>('/whatsapp-gateway/disconnect', {
    method: 'POST'
  }),
  logoutWhatsAppGateway: () => request<any>('/whatsapp-gateway/logout', {
    method: 'POST'
  }),
  sendWhatsAppGatewayMessage: (data: {
    to_mobile: string;
    message_text: string;
    media_file_path?: string | null;
    media_type?: 'image' | 'document';
  }) => request<any>('/whatsapp-gateway/send', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  sendWhatsAppGatewayBatch: (data: {
    list: Array<{
      id?: any;
      to_mobile: string;
      message_text: string;
      media_file_path?: string | null;
      media_type?: 'image' | 'document';
    }>;
    delay_ms?: number;
  }) => request<any>('/whatsapp-gateway/send-batch', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Sales Goals & Targets
  getGoals: (year?: string) => request<any>(`/goals${year ? `?year=${year}` : ''}`),
  saveGoals: (data: any) => request<any>('/goals', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Bill & Voucher Photo Attachments
  uploadBillPhoto: (base64Image: string) => request<{ success: boolean; url: string; filename: string }>('/upload', {
    method: 'POST',
    body: JSON.stringify({ image: base64Image })
  }),

  // 5-Minute WhatsApp Auto-Dispatch Queue
  getPendingAutoDispatches: () => request<any[]>('/sales/auto-dispatch/pending'),
  sendSaleWhatsAppNow: (saleId: number) => request<any>(`/sales/${saleId}/send-whatsapp-now`, {
    method: 'POST'
  }),
  sendSaleReturnWhatsAppNow: (returnId: number) => request<any>(`/sales/returns/${returnId}/send-whatsapp-now`, {
    method: 'POST'
  }),

  // Staff Attendance & Salary System
  getBranches: () => request<any[]>('/attendance/branches'),
  createBranch: (data: any) => request<any>('/attendance/branches', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateBranch: (id: number, data: any) => request<any>(`/attendance/branches/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteBranch: (id: number) => request<any>(`/attendance/branches/${id}`, {
    method: 'DELETE'
  }),

  getEmployees: (params?: any) => {
    const q = new URLSearchParams();
    if (params?.branch_id) q.append('branch_id', params.branch_id);
    if (params?.search) q.append('search', params.search);
    const qs = q.toString();
    return request<any[]>(`/attendance/employees${qs ? `?${qs}` : ''}`);
  },
  getEmployeeById: (id: number) => request<any>(`/attendance/employees/${id}`),
  createEmployee: (data: any) => request<any>('/attendance/employees', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateEmployee: (id: number, data: any) => request<any>(`/attendance/employees/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteEmployee: (id: number) => request<any>(`/attendance/employees/${id}`, {
    method: 'DELETE'
  }),

  getDailyAttendance: (date?: string, branchId?: number | null) => {
    const q = new URLSearchParams();
    if (date) q.append('date', date);
    if (branchId) q.append('branch_id', String(branchId));
    const qs = q.toString();
    return request<any[]>(`/attendance/daily${qs ? `?${qs}` : ''}`);
  },
  markAttendance: (data: { employee_id: number; date: string; status: string; in_time?: string; out_time?: string; notes?: string }) => request<any>('/attendance/mark', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  bulkMarkAttendance: (records: any[], date?: string) => request<any>('/attendance/bulk-mark', {
    method: 'POST',
    body: JSON.stringify({ records, date })
  }),

  getSalaryReport: (month?: number, year?: number, branchId?: number | null) => {
    const q = new URLSearchParams();
    if (month) q.append('month', String(month));
    if (year) q.append('year', String(year));
    if (branchId) q.append('branch_id', String(branchId));
    const qs = q.toString();
    return request<any>(`/attendance/salary-report${qs ? `?${qs}` : ''}`);
  },

  getEmployeeAdvances: (params?: any) => {
    const q = new URLSearchParams();
    if (params?.employee_id) q.append('employee_id', params.employee_id);
    if (params?.startDate) q.append('startDate', params.startDate);
    if (params?.endDate) q.append('endDate', params.endDate);
    const qs = q.toString();
    return request<any[]>(`/attendance/advances${qs ? `?${qs}` : ''}`);
  },
  createEmployeeAdvance: (data: any) => request<any>('/attendance/advances', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  deleteEmployeeAdvance: (id: number) => request<any>(`/attendance/advances/${id}`, {
    method: 'DELETE'
  }),

  getAttendanceSettings: () => request<any>('/attendance/settings'),
  updateAttendanceSettings: (data: any) => request<any>('/attendance/settings', {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  verifyAttendancePin: (pin: string, branchId?: number | null) => request<{ success: boolean; role?: string; name?: string; employee?: any; message?: string }>('/attendance/verify-pin', {
    method: 'POST',
    body: JSON.stringify({ pin, branch_id: branchId })
  }),

  // Bulk Excel/CSV Imports
  bulkImportProducts: (items: any[]) => request<any>('/products/bulk-import', {
    method: 'POST',
    body: JSON.stringify({ items })
  }),
  bulkImportCustomers: (customers: any[]) => request<any>('/customers/bulk-import', {
    method: 'POST',
    body: JSON.stringify({ customers })
  }),
  bulkImportSuppliers: (suppliers: any[]) => request<any>('/suppliers/bulk-import', {
    method: 'POST',
    body: JSON.stringify({ suppliers })
  }),

  // System Trial Data Reset
  clearTrialTransactions: (username = 'Admin') => request<any>('/system/reset-transactions', {
    method: 'POST',
    body: JSON.stringify({ username })
  }),

  // Automated 10th & 25th Domain Rotation
  getDomainRotationStatus: () => request<any>('/system/domain-rotation/status'),
  rotateDomainNow: (reason?: string) => request<any>('/system/domain-rotation/rotate-now', {
    method: 'POST',
    body: JSON.stringify({ reason })
  }),
  updateDomainRotationConfig: (data: any) => request<any>('/system/domain-rotation/config', {
    method: 'PUT',
    body: JSON.stringify(data)
  })
};


