import http from 'node:http';
import url from 'node:url';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { DB_PATH, getDatabase } from './database/connection.js';
import { initDatabase } from './database/migrations.js';
import { seedSweetsData } from './database/seeder.js';
import { settingsService } from './services/settingsService.js';
import { productService } from './services/productService.js';
import { recipeService } from './services/recipeService.js';
import { manufacturingService } from './services/manufacturingService.js';
import { purchaseService } from './services/purchaseService.js';
import { salesService } from './services/salesService.js';
import { partyService } from './services/partyService.js';
import { inventoryService } from './services/inventoryService.js';
import { expenseService } from './services/expenseService.js';
import { reportService } from './services/reportService.js';
import { accountService } from './services/accountService.js';
import { backupService } from './services/backupService.js';
import { resetService } from './services/resetService.js';
import { auditService } from './services/auditService.js';
import { advanceOrderService } from './services/advanceOrderService.js';
import { whatsappService } from './services/whatsappService.js';
import { whatsappGatewayService } from './services/whatsappGatewayService.js';
import { goalService } from './services/goalService.js';
import { vasanMasterService } from './services/vasanMasterService.js';
import { todoService } from './services/todoService.js';
import { userService } from './services/userService.js';
import { autoInvoiceDispatchService } from './services/autoInvoiceDispatchService.js';
import { attendanceService } from './services/attendanceService.js';
import { stockAuditService } from './services/stockAuditService.js';
import { eventService } from './services/eventService.js';
import { driverTripService } from './services/driverTripService.js';
import { autoDaybookService } from './services/autoDaybookService.js';
import { domainRotationService } from './services/domainRotationService.js';

// Initialize Database schema and migrations on start
try {
  initDatabase();
  // Auto-seed if first run
  seedSweetsData(false);

  // Auto-heal / self-sync ledger entries if sales exist but ledger is missing
  try {
    const dbCheck = getDatabase();
    const salesCnt = dbCheck.prepare('SELECT COUNT(*) as c FROM sales').get()?.c || 0;
    const ledgerCnt = dbCheck.prepare("SELECT COUNT(*) as c FROM ledger_entries WHERE party_type = 'CUSTOMER' AND voucher_type = 'SALE'").get()?.c || 0;
    if (salesCnt > 0 && ledgerCnt < salesCnt) {
      console.log(`[AUTO-HEAL] Syncing ${salesCnt} sales to ledger_entries...`);
      dbCheck.exec(`
        INSERT OR IGNORE INTO ledger_entries (entry_date, party_type, party_id, party_name, voucher_type, voucher_id, voucher_no, debit_amount, credit_amount, notes)
        SELECT s.date, 'CUSTOMER', s.customer_id, COALESCE(s.customer_name, 'Walk-in Customer'), 'SALE', s.id, s.invoice_no, s.grand_total, 0.0, 'Bill #' || s.invoice_no
        FROM sales s WHERE s.status = 'ACTIVE' AND s.customer_id IS NOT NULL;
      `);
    }
  } catch (e) {
    console.warn('Ledger auto-heal note:', e.message);
  }
  // Re-arm pending 5-minute auto WhatsApp invoice dispatches
  autoInvoiceDispatchService.initDispatcher();
  // Start daily 8:45 PM auto daybook snapshot scheduler
  autoDaybookService.initDailyScheduler();
  // Start daily 9:00 PM auto database backup scheduler
  backupService.initDailyBackupScheduler();
  // Start 10th & 25th midnight auto security domain rotation scheduler
  domainRotationService.initScheduler();
} catch (err) {
  console.error('Database initialization error:', err);
}

const PORT = process.env.PORT || 4321;

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Helper to parse JSON body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

// Send standard JSON response and auto-broadcast data mutations across all connected PCs
function sendJson(res, statusCode, data, req = null) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
  });
  res.end(JSON.stringify(data));

  // If a data mutation occurred (POST/PUT/DELETE), broadcast real-time SSE update to all PCs
  if (req && req.method && !['GET', 'OPTIONS', 'HEAD'].includes(req.method) && statusCode >= 200 && statusCode < 300) {
    const pName = req.url ? req.url.split('?')[0] : '';
    eventService.broadcast('DATA_CHANGED', { method: req.method, path: pName });
  }
}

// Send error response
function sendError(res, statusCode, message, err = null) {
  if (err) console.error('API Error:', err);
  sendJson(res, statusCode, {
    success: false,
    error: message,
    details: err ? err.message : null
  });
}

const server = http.createServer(async (req, res) => {
  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
    });
    return res.end();
  }

  const parsedUrl = url.parse(req.url, true);
  const rawPath = parsedUrl.pathname || '/';
  const pathname = rawPath.startsWith('/api') ? rawPath : `/api${rawPath === '/' ? '' : rawPath}`;
  const query = parsedUrl.query;
  const method = req.method;

  // Scoped helper that binds req for auto-broadcasting
  const reply = (statusCode, data) => sendJson(res, statusCode, data, req);

  try {
    // --- REAL-TIME SSE MULTI-PC SYNC STREAM ---
    if (pathname === '/api/events' && method === 'GET') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });
      res.write(`data: ${JSON.stringify({ type: 'CONNECTED', clients: eventService.getClientCount() + 1 })}\n\n`);
      eventService.addClient(res);
      req.on('close', () => eventService.removeClient(res));
      return;
    }

    // --- HEALTH & STATUS ---
    if (pathname === '/api/health' && method === 'GET') {
      return reply(200, {
        status: 'ONLINE_LOCAL',
        app: 'MATUKI SWEETS OFFLINE ERP',
        db_path: DB_PATH,
        timestamp: new Date().toISOString()
      });
    }

    // --- AUTH & USERS PERMISSION MANAGEMENT ---
    if (pathname === '/api/auth/login' && method === 'POST') {
      const body = await parseBody(req);
      const user = auditService.login(body.username, body.password);
      return sendJson(res, 200, { success: true, user });
    }
    if (pathname === '/api/users' && method === 'GET') {
      const users = auditService.getUsers();
      return sendJson(res, 200, { success: true, data: users });
    }
    if (pathname === '/api/users' && method === 'POST') {
      const body = await parseBody(req);
      const user = auditService.createUser(body, body.admin_user || 'Admin');
      return sendJson(res, 201, { success: true, data: user });
    }
    if (pathname.match(/^\/api\/users\/(\d+)$/) && method === 'PUT') {
      const id = pathname.split('/')[3];
      const body = await parseBody(req);
      const user = auditService.updateUser(Number(id), body, body.admin_user || 'Admin');
      return sendJson(res, 200, { success: true, data: user });
    }
    if (pathname.match(/^\/api\/users\/(\d+)$/) && method === 'DELETE') {
      const id = pathname.split('/')[3];
      const result = auditService.deleteUser(Number(id), query.admin_user || 'Admin');
      return sendJson(res, 200, result);
    }
    if (pathname === '/api/audit-logs' && method === 'GET') {
      const logs = auditService.getAuditLogs(Number(query.limit) || 100);
      return sendJson(res, 200, { success: true, data: logs });
    }

    // --- SETTINGS ---
    if (pathname === '/api/settings' && method === 'GET') {
      const settings = settingsService.getSettings();
      return sendJson(res, 200, { success: true, data: settings });
    }
    if (pathname.startsWith('/api/settings/next-number/') && method === 'GET') {
      const type = pathname.split('/')[4];
      const nextNo = settingsService.getNextDocumentNumber(type);
      return sendJson(res, 200, { success: true, data: { number: nextNo, type } });
    }
    if (pathname === '/api/settings' && method === 'PUT') {
      const body = await parseBody(req);
      const updated = settingsService.updateSettings(body, body.username || 'Admin');
      return sendJson(res, 200, { success: true, data: updated });
    }
    if (pathname === '/api/settings/upload-qr' && method === 'POST') {
      const body = await parseBody(req);
      if (!body.image_base64) {
        return sendError(res, 400, 'Image data is required');
      }
      const base64Data = body.image_base64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const filename = `payment_qr_${Date.now()}.png`;

      const publicDir = path.join(process.cwd(), 'public');
      if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

      fs.writeFileSync(path.join(publicDir, filename), buffer);
      fs.writeFileSync(path.join(publicDir, 'payment_qr.png'), buffer);

      const db = getDatabase();
      const qrUrl = `/${filename}`;
      db.prepare('UPDATE business_settings SET upi_qr_image = ? WHERE id = 1').run(qrUrl);
      if (body.upi_id) {
        db.prepare('UPDATE business_settings SET upi_id = ? WHERE id = 1').run(body.upi_id);
      }
      return sendJson(res, 200, { success: true, url: qrUrl, upi_id: body.upi_id });
    }

    // --- SALES GOALS & TARGETS ---
    if (pathname === '/api/goals' && method === 'GET') {
      const year = query.year ? String(query.year) : undefined;
      const goals = goalService.getGoals(year);
      return sendJson(res, 200, { success: true, data: goals });
    }
    if (pathname === '/api/goals' && (method === 'POST' || method === 'PUT')) {
      const body = await parseBody(req);
      const updated = goalService.saveGoals(body);
      return sendJson(res, 200, { success: true, data: updated });
    }

    // --- WHATSAPP WEB GATEWAY AUTOMATION ---
    if (pathname === '/api/whatsapp-gateway/status' && method === 'GET') {
      const status = whatsappGatewayService.getStatus();
      return sendJson(res, 200, { success: true, data: status });
    }
    if (pathname === '/api/whatsapp-gateway/connect' && method === 'POST') {
      const body = await parseBody(req);
      const status = await whatsappGatewayService.connect(Boolean(body?.force_new));
      return sendJson(res, 200, { success: true, data: status });
    }
    if (pathname === '/api/whatsapp-gateway/disconnect' && method === 'POST') {
      await whatsappGatewayService.disconnect();
      return sendJson(res, 200, { success: true, message: 'Disconnected' });
    }
    if (pathname === '/api/whatsapp-gateway/logout' && method === 'POST') {
      await whatsappGatewayService.logout();
      return sendJson(res, 200, { success: true, message: 'Logged out and session cleared' });
    }
    if (pathname === '/api/whatsapp-gateway/send' && method === 'POST') {
      const body = await parseBody(req);
      if (!body.to_mobile) {
        return sendError(res, 400, 'Customer mobile number (to_mobile) is required');
      }
      const result = await whatsappGatewayService.sendMessage({
        toMobile: body.to_mobile,
        messageText: body.message_text,
        mediaFilePath: body.media_file_path || null,
        mediaType: body.media_type || 'image'
      });
      return sendJson(res, 200, { success: true, data: result });
    }
    if (pathname === '/api/whatsapp-gateway/send-batch' && method === 'POST') {
      const body = await parseBody(req);
      if (!Array.isArray(body.list) || body.list.length === 0) {
        return sendError(res, 400, 'A non-empty list array is required');
      }
      const summary = await whatsappGatewayService.sendBatchMessages({
        list: body.list,
        delayMs: Number(body.delay_ms) || 2500
      });
      return sendJson(res, 200, { success: true, data: summary });
    }

    // --- RICKSHAW DRIVER TRIP DISPATCH & TRIP SHEETS ---
    if (pathname === '/api/driver-trips' && method === 'GET') {
      const trips = driverTripService.getDriverTripsByDate(query.date);
      return sendJson(res, 200, { success: true, data: trips });
    }
    if (pathname.match(/^\/api\/driver-trips\/single-message\/(\d+)$/) && method === 'GET') {
      const id = pathname.split('/')[4];
      const message = driverTripService.formatSingleDeliveryMessage(Number(id));
      return sendJson(res, 200, { success: true, message });
    }
    if (pathname === '/api/driver-trips/sheet-message' && method === 'GET') {
      const message = driverTripService.formatDriverTripSheetMessage(query.driver || '', query.date);
      return sendJson(res, 200, { success: true, message });
    }
    if (pathname === '/api/driver-trips/send-single-whatsapp' && method === 'POST') {
      const body = await parseBody(req);
      const result = await driverTripService.sendSingleStopWhatsApp(Number(body.sale_id), body.driver_mobile);
      return sendJson(res, 200, result);
    }
    if (pathname === '/api/driver-trips/send-sheet-whatsapp' && method === 'POST') {
      const body = await parseBody(req);
      const result = await driverTripService.sendDriverTripSheetWhatsApp(body.driver_name, body.date, body.driver_mobile);
      return sendJson(res, 200, result);
    }

    // --- DAILY 8:45 PM AUTO DAYBOOK (ROJMEL) SNAPSHOT TO 3 PARTNERS ---
    if (pathname === '/api/auto-daybook/message' && method === 'GET') {
      const message = autoDaybookService.generateDaybookPartnerMessage(query.date);
      return sendJson(res, 200, { success: true, message });
    }
    if (pathname === '/api/auto-daybook/dispatch-partners' && method === 'POST') {
      const body = await parseBody(req);
      const result = await autoDaybookService.dispatchDaybookSnapshotToPartners(body?.date, body?.partners, body?.image_base64);
      return sendJson(res, 200, result);
    }

    // --- UNITS & CATEGORIES ---
    if (pathname === '/api/units' && method === 'GET') {
      const units = productService.getUnits();
      return sendJson(res, 200, { success: true, data: units });
    }
    if (pathname === '/api/units' && method === 'POST') {
      const body = await parseBody(req);
      const unit = productService.createUnit(body);
      eventService.emit({ type: 'DATA_CHANGED', module: 'products' });
      return sendJson(res, 201, { success: true, data: unit });
    }
    if (pathname.match(/^\/api\/units\/(\d+)$/) && method === 'PUT') {
      const id = pathname.split('/')[3];
      const body = await parseBody(req);
      const unit = productService.updateUnit(id, body);
      eventService.emit({ type: 'DATA_CHANGED', module: 'products' });
      return sendJson(res, 200, { success: true, data: unit });
    }
    if (pathname.match(/^\/api\/units\/(\d+)$/) && method === 'DELETE') {
      const id = pathname.split('/')[3];
      const result = productService.deleteUnit(id);
      eventService.emit({ type: 'DATA_CHANGED', module: 'products' });
      return sendJson(res, 200, { success: true, data: result });
    }

    if (pathname === '/api/categories' && method === 'GET') {
      const cats = productService.getCategories(query.type);
      return sendJson(res, 200, { success: true, data: cats });
    }
    if (pathname === '/api/categories' && method === 'POST') {
      const body = await parseBody(req);
      const cat = productService.createCategory(body);
      eventService.emit({ type: 'DATA_CHANGED', module: 'products' });
      return sendJson(res, 201, { success: true, data: cat });
    }
    if (pathname.match(/^\/api\/categories\/(\d+)$/) && method === 'PUT') {
      const id = pathname.split('/')[3];
      const body = await parseBody(req);
      const cat = productService.updateCategory(id, body);
      eventService.emit({ type: 'DATA_CHANGED', module: 'products' });
      return sendJson(res, 200, { success: true, data: cat });
    }
    if (pathname.match(/^\/api\/categories\/(\d+)$/) && method === 'DELETE') {
      const id = pathname.split('/')[3];
      const result = productService.deleteCategory(id);
      eventService.emit({ type: 'DATA_CHANGED', module: 'products' });
      return sendJson(res, 200, { success: true, data: result });
    }

    // --- PRODUCTS ---
    if (pathname === '/api/products' && method === 'GET') {
      const products = productService.getProducts(query);
      return sendJson(res, 200, { success: true, data: products });
    }
    if (pathname.match(/^\/api\/products\/(\d+)$/) && method === 'GET') {
      const id = pathname.split('/')[3];
      const product = productService.getProductById(id);
      return sendJson(res, 200, { success: true, data: product });
    }
    if (pathname === '/api/products' && method === 'POST') {
      const body = await parseBody(req);
      const product = productService.createProduct(body, body.username || 'Admin');
      return sendJson(res, 201, { success: true, data: product });
    }
    if (pathname.match(/^\/api\/products\/(\d+)$/) && method === 'PUT') {
      const match = pathname.match(/^\/api\/products\/(\d+)$/);
      const id = match ? match[1] : null;
      const body = await parseBody(req);
      const product = productService.updateProduct(id, body, body.username || 'Admin');
      eventService.emit({ type: 'DATA_CHANGED', module: 'products' });
      return sendJson(res, 200, { success: true, data: product });
    }
    if (pathname.match(/^\/api\/products\/(\d+)$/) && method === 'DELETE') {
      const match = pathname.match(/^\/api\/products\/(\d+)$/);
      const id = match ? match[1] : null;
      const result = productService.deleteProduct(id, query.username || 'Admin');
      eventService.emit({ type: 'DATA_CHANGED', module: 'products' });
      return sendJson(res, 200, { success: true, data: result });
    }
    if (pathname.match(/^\/api\/products\/(\d+)\/toggle-online$/) && method === 'PUT') {
      const match = pathname.match(/^\/api\/products\/(\d+)\/toggle-online$/);
      const id = match ? match[1] : null;
      const body = await parseBody(req);
      const product = productService.toggleOnlineStatus(id, body.available_online, body.username || 'Admin');
      return sendJson(res, 200, { success: true, data: product });
    }
    if (pathname === '/api/products/bulk-import' && method === 'POST') {
      const body = await parseBody(req);
      const result = productService.bulkImportProducts(body.items || [], body.username || 'Admin');
      return sendJson(res, 200, result);
    }

    // --- PUBLIC CUSTOMER / CATERER SELF-ORDER & MENU ---
    if (pathname === '/api/public/menu' && method === 'GET') {
      const menu = productService.getOnlineMenu();
      const settings = settingsService.getSettings();
      return sendJson(res, 200, { success: true, data: { items: menu, settings } });
    }
    if (pathname === '/api/public/orders' && method === 'POST') {
      const body = await parseBody(req);
      const itemsList = body.items || [];
      const itemLines = itemsList.map(i => `- ${i.item_name}: ${i.quantity} ${i.unit} (@ ₹${i.rate || 0})`).join('\n');
      const rawMsg = `[🌐 Web/QR Customer Order - ${body.outlet_name || 'Outlet 1'}]\n` +
        `👤 ${body.customer_name || 'Customer'} (📞 ${body.customer_mobile || '-'})\n` +
        `📅 Date: ${body.delivery_date} (${body.delivery_slot === 'MORNING_1' || body.delivery_slot === 'MORNING' ? '🌅 Morning' : '🌇 Evening'} ${body.delivery_time || ''})\n` +
        `📍 Venue: ${body.delivery_venue || '-'}\n` +
        `🧁 Items:\n${itemLines}\n` +
        `💰 Advance: ₹${body.advance_amount || 0} (${body.deposit_mode || 'CASH'})\n` +
        (body.notes ? `📝 Notes: ${body.notes}` : '');

      const order = whatsappService.createInboundOrder({
        raw_message: rawMsg,
        outlet_name: body.outlet_name || 'Outlet 1 - Sarthana Branch',
        sender_name: body.customer_name || 'Web Customer',
        sender_mobile: body.customer_mobile || '',
        customer_name: body.customer_name,
        customer_mobile: body.customer_mobile,
        delivery_date: body.delivery_date,
        delivery_slot: body.delivery_slot,
        delivery_venue: body.delivery_venue,
        advance_amount: body.advance_amount,
        deposit_mode: body.deposit_mode,
        items: itemsList,
        notes: body.notes || 'Placed via Customer QR / Web Portal'
      });

      return sendJson(res, 201, { success: true, tracking_no: `WEB-${order.id}`, data: order });
    }

    // --- RAW MATERIALS ---
    if (pathname === '/api/raw-materials' && method === 'GET') {
      const rawMaterials = productService.getRawMaterials(query);
      return sendJson(res, 200, { success: true, data: rawMaterials });
    }
    if (pathname.match(/^\/api\/raw-materials\/(\d+)$/) && method === 'GET') {
      const id = pathname.split('/')[3];
      const rm = productService.getRawMaterialById(id);
      return sendJson(res, 200, { success: true, data: rm });
    }
    if (pathname === '/api/raw-materials' && method === 'POST') {
      const body = await parseBody(req);
      const rm = productService.createRawMaterial(body, body.username || 'Admin');
      return sendJson(res, 201, { success: true, data: rm });
    }
    if (pathname.match(/^\/api\/raw-materials\/(\d+)$/) && method === 'PUT') {
      const id = pathname.split('/')[3];
      const body = await parseBody(req);
      const rm = productService.updateRawMaterial(id, body, body.username || 'Admin');
      eventService.emit({ type: 'DATA_CHANGED', module: 'products' });
      return sendJson(res, 200, { success: true, data: rm });
    }
    if (pathname.match(/^\/api\/raw-materials\/(\d+)$/) && method === 'DELETE') {
      const id = pathname.split('/')[3];
      const result = productService.deleteRawMaterial(id, query.username || 'Admin');
      eventService.emit({ type: 'DATA_CHANGED', module: 'products' });
      return sendJson(res, 200, { success: true, data: result });
    }

    // --- RECIPES ---
    if (pathname === '/api/recipes' && method === 'GET') {
      const recipes = recipeService.getRecipes(query);
      return sendJson(res, 200, { success: true, data: recipes });
    }
    if (pathname.match(/^\/api\/recipes\/(\d+)$/) && method === 'GET') {
      const id = pathname.split('/')[3];
      const recipe = recipeService.getRecipeById(id);
      return sendJson(res, 200, { success: true, data: recipe });
    }
    if (pathname === '/api/recipes' && method === 'POST') {
      const body = await parseBody(req);
      const recipe = recipeService.createRecipe(body, body.username || 'Admin');
      return sendJson(res, 201, { success: true, data: recipe });
    }
    if (pathname.match(/^\/api\/recipes\/(\d+)$/) && method === 'PUT') {
      const id = pathname.split('/')[3];
      const body = await parseBody(req);
      const recipe = recipeService.updateRecipe(Number(id), body, body.username || 'Admin');
      return sendJson(res, 200, { success: true, data: recipe });
    }
    if (pathname.match(/^\/api\/recipes\/(\d+)\/version$/) && method === 'POST') {
      const id = pathname.split('/')[3];
      const body = await parseBody(req);
      const recipe = recipeService.createNewVersion(id, body, body.username || 'Admin');
      return sendJson(res, 201, { success: true, data: recipe });
    }
    if (pathname === '/api/recipes/calculate-cost' && method === 'POST') {
      const body = await parseBody(req);
      const calc = recipeService.calculateRecipeCost(body.recipe_id, body.version_id, body.target_batch_size, body.costing_method);
      return sendJson(res, 200, { success: true, data: calc });
    }

    // --- MANUFACTURING ---
    if (pathname === '/api/manufacturing' && method === 'GET') {
      const orders = manufacturingService.getOrders(query);
      return sendJson(res, 200, { success: true, data: orders });
    }
    if (pathname.match(/^\/api\/manufacturing\/(\d+)$/) && method === 'GET') {
      const id = pathname.split('/')[3];
      const order = manufacturingService.getOrderById(id);
      return sendJson(res, 200, { success: true, data: order });
    }
    if (pathname === '/api/manufacturing' && method === 'POST') {
      const body = await parseBody(req);
      const order = manufacturingService.createManufacturingBatch(body, body.username || 'Admin');
      return sendJson(res, 201, { success: true, data: order });
    }
    if (pathname === '/api/kitchen/shortage-calculator' && method === 'GET') {
      const data = manufacturingService.getKitchenShortageCalculator(query.date, query.slot || 'ALL');
      return sendJson(res, 200, { success: true, data });
    }

    // --- PURCHASES ---
    if (pathname === '/api/purchases' && method === 'GET') {
      const purchases = purchaseService.getPurchases(query);
      return sendJson(res, 200, { success: true, data: purchases });
    }
    if (pathname.match(/^\/api\/purchases\/(\d+)$/) && method === 'GET') {
      const id = pathname.split('/')[3];
      const purchase = purchaseService.getPurchaseById(id);
      return sendJson(res, 200, { success: true, data: purchase });
    }
    if (pathname === '/api/purchases' && method === 'POST') {
      const body = await parseBody(req);
      const purchase = purchaseService.createPurchase(body, body.username || 'Admin');
      return sendJson(res, 201, { success: true, data: purchase });
    }

    // --- SALES ---
    if (pathname === '/api/sales' && method === 'GET') {
      const sales = salesService.getSales(query);
      return sendJson(res, 200, { success: true, data: sales });
    }
    if (pathname.match(/^\/api\/sales\/(\d+)$/) && method === 'GET') {
      const id = pathname.split('/')[3];
      const sale = salesService.getSaleById(id);
      return sendJson(res, 200, { success: true, data: sale });
    }
    if (pathname === '/api/sales' && method === 'POST') {
      const body = await parseBody(req);
      const sale = salesService.createSale(body, body.username || 'Cashier');
      return sendJson(res, 201, { success: true, data: sale });
    }
    if (pathname.match(/^\/api\/sales\/(\d+)$/) && method === 'PUT') {
      const id = pathname.split('/')[3];
      const body = await parseBody(req);
      const sale = salesService.updateSale(id, body, body.username || 'Cashier');
      return sendJson(res, 200, { success: true, data: sale });
    }
    if (pathname.match(/^\/api\/sales\/(\d+)$/) && method === 'DELETE') {
      const id = pathname.split('/')[3];
      const result = salesService.deleteSale(id, 'Admin');
      return sendJson(res, 200, { success: true, data: result });
    }
    if (pathname.match(/^\/api\/sales\/(\d+)\/cancel$/) && method === 'POST') {
      const id = pathname.split('/')[3];
      const body = await parseBody(req);
      const result = salesService.deleteSale(id, body.username || 'Admin');
      return sendJson(res, 200, { success: true, data: result });
    }

    // --- SALES RETURNS WITH VASAN RETURN ---
    if (pathname === '/api/sales-returns' && method === 'GET') {
      const returns = salesService.getSalesReturns(query);
      return sendJson(res, 200, { success: true, data: returns });
    }
    if (pathname === '/api/sales-returns' && method === 'POST') {
      const body = await parseBody(req);
      const ret = salesService.createSalesReturn(body, body.username || 'Cashier');
      return sendJson(res, 201, { success: true, data: ret });
    }

    // --- RICKSHAW DRIVERS & DELIVERY LOCATIONS ---
    if (pathname === '/api/drivers' && method === 'GET') {
      const drivers = salesService.getDrivers();
      return sendJson(res, 200, { success: true, data: drivers });
    }
    if (pathname === '/api/drivers' && method === 'POST') {
      const body = await parseBody(req);
      const driver = salesService.createDriver(body);
      return sendJson(res, 201, { success: true, data: driver });
    }
    if (pathname.match(/^\/api\/drivers\/(\d+)\/set-default$/) && method === 'POST') {
      const id = pathname.split('/')[3];
      const updated = salesService.setDefaultDriver(id);
      return sendJson(res, 200, { success: true, data: updated });
    }
    // --- AREA DELIVERY & RICKSHAW RATES ---
    if (pathname === '/api/area-rates' && method === 'GET') {
      const rates = salesService.getAreaDeliveryRates();
      return sendJson(res, 200, { success: true, data: rates });
    }
    if (pathname === '/api/area-rates' && method === 'POST') {
      const body = await parseBody(req);
      const rate = salesService.createAreaDeliveryRate(body);
      return sendJson(res, 201, { success: true, data: rate });
    }
    if (pathname.match(/^\/api\/area-rates\/(\d+)$/) && method === 'PUT') {
      const id = pathname.split('/')[3];
      const body = await parseBody(req);
      const updated = salesService.updateAreaDeliveryRate(id, body);
      return sendJson(res, 200, { success: true, data: updated });
    }
    if (pathname.match(/^\/api\/area-rates\/(\d+)$/) && method === 'DELETE') {
      const id = pathname.split('/')[3];
      const result = salesService.deleteAreaDeliveryRate(id);
      return sendJson(res, 200, { success: true, data: result });
    }

    if (pathname === '/api/delivery-locations' && method === 'GET') {
      const locs = salesService.getDeliveryLocations();
      return sendJson(res, 200, { success: true, data: locs });
    }
    if (pathname === '/api/delivery-locations' && method === 'POST') {
      const body = await parseBody(req);
      const loc = salesService.createDeliveryLocation(body);
      return sendJson(res, 201, { success: true, data: loc });
    }
    if (pathname.match(/^\/api\/delivery-locations\/(\d+)$/) && method === 'PUT') {
      const id = pathname.split('/')[3];
      const body = await parseBody(req);
      const updated = salesService.updateDeliveryLocation(id, body);
      return sendJson(res, 200, { success: true, data: updated });
    }
    if (pathname.match(/^\/api\/delivery-locations\/(\d+)$/) && method === 'DELETE') {
      const id = pathname.split('/')[3];
      const result = salesService.deleteDeliveryLocation(id);
      return sendJson(res, 200, { success: true, data: result });
    }

    // --- RICKSHAW DRIVER HISAB & VASAN YADI & CHARGING ---
    if (pathname === '/api/reports/driver-trips' && method === 'GET') {
      const data = salesService.getDriverTripsReport(query);
      return sendJson(res, 200, { success: true, data });
    }
    if (pathname === '/api/reports/driver-trips/settle' && method === 'POST') {
      const body = await parseBody(req);
      const data = salesService.settleDriverRent(body.sale_ids || []);
      return sendJson(res, 200, { success: true, data });
    }
    if (pathname === '/api/reports/vasan-tracker' && method === 'GET') {
      const data = salesService.getVasanLedger(query);
      return sendJson(res, 200, { success: true, data });
    }
    if (pathname === '/api/reports/vasan-yadi' && method === 'GET') {
      const data = salesService.getVasanYadi(query);
      return sendJson(res, 200, { success: true, data });
    }
    if (pathname === '/api/vasan/return' && method === 'POST') {
      const body = await parseBody(req);
      const data = salesService.returnVasan(body.id, body.returned_qty, body.notes);
      return sendJson(res, 200, { success: true, data });
    }
    if (pathname === '/api/vasan/charge-customer' && method === 'POST') {
      const body = await parseBody(req);
      const data = salesService.chargeMissingVasanToCustomer(body, body.username || 'Admin');
      return sendJson(res, 200, { success: true, data });
    }

    // --- CUSTOMERS & SUPPLIERS ---
    if (pathname === '/api/customers' && method === 'GET') {
      const customers = partyService.getCustomers(query);
      return sendJson(res, 200, { success: true, data: customers });
    }
    if (pathname.match(/^\/api\/customers\/(\d+)$/) && method === 'GET') {
      const id = pathname.split('/')[3];
      const customer = partyService.getCustomerById(id);
      return sendJson(res, 200, { success: true, data: customer });
    }
    if (pathname === '/api/customers' && method === 'POST') {
      const body = await parseBody(req);
      const customer = partyService.createCustomer(body, body.username || 'Admin');
      return sendJson(res, 201, { success: true, data: customer });
    }
    if (pathname.match(/^\/api\/customers\/(\d+)$/) && method === 'PUT') {
      const id = pathname.split('/')[3];
      const body = await parseBody(req);
      const customer = partyService.updateCustomer(id, body, body.username || 'Admin');
      return sendJson(res, 200, { success: true, data: customer });
    }
    if (pathname.match(/^\/api\/customers\/(\d+)\/last-rates$/) && method === 'GET') {
      const id = pathname.split('/')[3];
      const rates = salesService.getCustomerLastItemRates(id);
      return sendJson(res, 200, { success: true, data: rates });
    }
    if (pathname.match(/^\/api\/customers\/(\d+)\/smart-recommendations$/) && method === 'GET') {
      const id = pathname.split('/')[3];
      const recs = partyService.getCustomerSmartRecommendations(id);
      return sendJson(res, 200, { success: true, data: recs });
    }

    if (pathname === '/api/customers/bulk-import' && method === 'POST') {
      const body = await parseBody(req);
      const result = partyService.bulkImportCustomers(body.customers || [], body.username || 'Admin');
      return sendJson(res, 200, result);
    }
    if (pathname === '/api/suppliers/bulk-import' && method === 'POST') {
      const body = await parseBody(req);
      const result = partyService.bulkImportSuppliers(body.suppliers || [], body.username || 'Admin');
      return sendJson(res, 200, result);
    }

    if (pathname === '/api/suppliers' && method === 'GET') {
      const suppliers = partyService.getSuppliers(query);
      return sendJson(res, 200, { success: true, data: suppliers });
    }
    if (pathname.match(/^\/api\/suppliers\/(\d+)$/) && method === 'GET') {
      const id = pathname.split('/')[3];
      const supplier = partyService.getSupplierById(id);
      return sendJson(res, 200, { success: true, data: supplier });
    }
    if (pathname === '/api/suppliers' && method === 'POST') {
      const body = await parseBody(req);
      const supplier = partyService.createSupplier(body, body.username || 'Admin');
      return sendJson(res, 201, { success: true, data: supplier });
    }
    if (pathname.match(/^\/api\/suppliers\/(\d+)$/) && method === 'PUT') {
      const id = pathname.split('/')[3];
      const body = await parseBody(req);
      const supplier = partyService.updateSupplier(id, body, body.username || 'Admin');
      return sendJson(res, 200, { success: true, data: supplier });
    }

    // --- LEDGER & PAYMENTS (ચુકવણી, જમા અને ઉધાર વ્યવહારો) ---
    if (pathname === '/api/ledger/statement' && method === 'GET') {
      const stmt = partyService.getPartyLedgerStatement(query.party_type, query.party_id, query.startDate, query.endDate);
      return sendJson(res, 200, { success: true, data: stmt });
    }
    if (pathname === '/api/payments' && method === 'GET') {
      const payments = partyService.getPayments(query);
      return sendJson(res, 200, { success: true, data: payments });
    }
    if (pathname === '/api/payments' && method === 'POST') {
      const body = await parseBody(req);
      const pay = partyService.recordPaymentReceipt(body, body.username || 'Cashier');
      return sendJson(res, 201, { success: true, data: pay });
    }

    // --- SALES RETURNS & CREDIT NOTES (સેલ્સ રિટર્ન અને ક્રેડિટ નોટ) ---
    if ((pathname === '/api/sales-returns' || pathname === '/api/credit-notes') && method === 'GET') {
      const returns = salesService.getSalesReturns(query);
      return sendJson(res, 200, { success: true, data: returns });
    }
    if ((pathname === '/api/sales-returns' || pathname === '/api/credit-notes') && method === 'POST') {
      const body = await parseBody(req);
      const ret = salesService.createSalesReturn(body, body.username || 'Cashier');
      return sendJson(res, 201, { success: true, data: ret });
    }

    // --- PURCHASE RETURNS & DEBIT NOTES (પર્ચેઝ રિટર્ન અને ડેબિટ નોટ) ---
    if ((pathname === '/api/purchase-returns' || pathname === '/api/debit-notes') && method === 'GET') {
      const returns = purchaseService.getPurchaseReturns(query);
      return sendJson(res, 200, { success: true, data: returns });
    }
    if ((pathname === '/api/purchase-returns' || pathname === '/api/debit-notes') && method === 'POST') {
      const body = await parseBody(req);
      const ret = purchaseService.createPurchaseReturn(body, body.username || 'Admin');
      return sendJson(res, 201, { success: true, data: ret });
    }

    // --- EXPENSES ---
    if (pathname === '/api/expenses' && method === 'GET') {
      const expenses = expenseService.getExpenses(query);
      return sendJson(res, 200, { success: true, data: expenses });
    }
    if (pathname === '/api/expenses/categories' && method === 'GET') {
      const cats = expenseService.getExpenseCategories();
      return sendJson(res, 200, { success: true, data: cats });
    }
    if (pathname === '/api/expenses' && method === 'POST') {
      const body = await parseBody(req);
      const exp = expenseService.createExpense(body, body.username || 'Admin');
      return sendJson(res, 201, { success: true, data: exp });
    }

    // --- INVENTORY ---
    if (pathname === '/api/inventory/summary' && method === 'GET') {
      const summary = inventoryService.getInventorySummary();
      return sendJson(res, 200, { success: true, data: summary });
    }
    if (pathname === '/api/inventory/items' && method === 'GET') {
      const items = inventoryService.getAllStockItems(query);
      return sendJson(res, 200, { success: true, data: items });
    }
    if (pathname === '/api/inventory/movements' && method === 'GET') {
      const movements = inventoryService.getStockMovements(query);
      return sendJson(res, 200, { success: true, data: movements });
    }
    if (pathname === '/api/inventory/adjust' && method === 'POST') {
      const body = await parseBody(req);
      const adj = inventoryService.adjustStock(body, body.username || 'Admin');
      return sendJson(res, 200, { success: true, data: adj });
    }

    // --- 3-BRANCH PHYSICAL STOCK AUDIT & VERIFICATION (3 શાખાઓનો ભૌતિક સ્ટોક ઓડિટ) ---
    if (pathname === '/api/stock-audits/template' && method === 'GET') {
      const template = stockAuditService.getAuditTemplate(query.month);
      return sendJson(res, 200, { success: true, data: template });
    }
    if (pathname === '/api/stock-audits/latest' && method === 'GET') {
      const audit = stockAuditService.getAuditByMonth(query.month);
      return sendJson(res, 200, { success: true, data: audit });
    }
    if (pathname === '/api/stock-audits/history' && method === 'GET') {
      const history = stockAuditService.getAuditHistory();
      return sendJson(res, 200, { success: true, data: history });
    }
    if (pathname === '/api/stock-audits' && method === 'POST') {
      const body = await parseBody(req);
      const result = stockAuditService.saveBranchStockAudit(body, body.username || 'Admin');
      return sendJson(res, 200, result);
    }
    if (pathname === '/api/stock-audits/import' && method === 'POST') {
      const body = await parseBody(req);
      const result = stockAuditService.importAuditData(body.rows, body.month, body.auditorName, body.username || 'Admin');
      return sendJson(res, 200, result);
    }

    // --- REPORTS ---
    if (pathname === '/api/reports/dashboard' && method === 'GET') {
      const data = reportService.getDashboardMetrics(query.period, query.startDate, query.endDate);
      return sendJson(res, 200, { success: true, data });
    }
    if (pathname === '/api/reports/google-sheet-pnl' && method === 'GET') {
      const data = reportService.getGoogleSheetPnL(query.startDate, query.endDate);
      return sendJson(res, 200, { success: true, data });
    }
    if (pathname === '/api/reports/sales' && method === 'GET') {
      const data = reportService.getSaleReport(query.startDate, query.endDate);
      return sendJson(res, 200, { success: true, data });
    }
    if (pathname === '/api/reports/party-statement' && method === 'GET') {
      const data = partyService.getPartyLedgerStatement(query.party_type || 'CUSTOMER', Number(query.party_id), query.startDate, query.endDate);
      return sendJson(res, 200, { success: true, data });
    }
    if (pathname === '/api/reports/purchases' && method === 'GET') {
      const data = reportService.getPurchaseReport(query.startDate, query.endDate);
      return sendJson(res, 200, { success: true, data });
    }
    if (pathname === '/api/reports/daybook' && method === 'GET') {
      const data = reportService.getDayBook(query.date);
      return sendJson(res, 200, { success: true, data });
    }
    if (pathname === '/api/reports/all-transactions' && method === 'GET') {
      const data = reportService.getAllTransactions(query.startDate, query.endDate);
      return sendJson(res, 200, { success: true, data });
    }
    if (pathname === '/api/reports/bill-wise-profit' && method === 'GET') {
      const data = reportService.getBillWiseProfit(query.startDate, query.endDate);
      return sendJson(res, 200, { success: true, data });
    }
    if (pathname === '/api/reports/cash-flow' && method === 'GET') {
      const data = reportService.getCashFlow(query.startDate, query.endDate);
      return sendJson(res, 200, { success: true, data });
    }
    if (pathname === '/api/reports/trial-balance' && method === 'GET') {
      const data = reportService.getTrialBalance();
      return sendJson(res, 200, { success: true, data });
    }
    if (pathname === '/api/reports/balance-sheet' && method === 'GET') {
      const data = reportService.getBalanceSheet();
      return sendJson(res, 200, { success: true, data });
    }
    if (pathname === '/api/reports/party-wise-profit' && method === 'GET') {
      const data = reportService.getPartyWiseProfitAndLoss(query.startDate, query.endDate);
      return sendJson(res, 200, { success: true, data });
    }
    if (pathname === '/api/reports/party-report-by-item' && method === 'GET') {
      const data = reportService.getPartyReportByItem(query.startDate, query.endDate);
      return sendJson(res, 200, { success: true, data });
    }
    if (pathname === '/api/reports/sale-purchase-by-party' && method === 'GET') {
      const data = reportService.getSalePurchaseByParty();
      return sendJson(res, 200, { success: true, data });
    }
    if (pathname === '/api/reports/item-wise-profit' && method === 'GET') {
      const data = reportService.getItemWiseProfitAndLoss(query.startDate, query.endDate);
      return sendJson(res, 200, { success: true, data });
    }
    if (pathname === '/api/reports/item-category-profit' && method === 'GET') {
      const data = reportService.getItemCategoryWiseProfitAndLoss(query.startDate, query.endDate);
      return sendJson(res, 200, { success: true, data });
    }
    if (pathname === '/api/reports/low-stock-summary' && method === 'GET') {
      const data = reportService.getLowStockSummary();
      return sendJson(res, 200, { success: true, data });
    }
    if (pathname === '/api/reports/manufacturing-yield' && method === 'GET') {
      const data = reportService.getManufacturingYieldReport(query.startDate, query.endDate);
      return sendJson(res, 200, { success: true, data });
    }
    if (pathname === '/api/reports/item-movement' && method === 'GET') {
      const data = reportService.getItemMovementAnalysis(query.startDate, query.endDate);
      return sendJson(res, 200, { success: true, data });
    }
    if (pathname === '/api/reports/rojmel' && method === 'GET') {
      const data = reportService.getRojmel(query.startDate, query.endDate, query.accountId);
      return sendJson(res, 200, { success: true, data });
    }

    // --- PAYMENT MODES & BANK ACCOUNTS (રોકડ, બેંક અને યુપીઆઇ ખાતાઓ) ---
    if (pathname === '/api/payment-accounts' && method === 'GET') {
      const accounts = accountService.getPaymentAccounts(query.activeOnly !== 'false');
      return sendJson(res, 200, { success: true, data: accounts });
    }
    if (pathname.match(/^\/api\/payment-accounts\/(\d+)$/) && method === 'GET') {
      const id = pathname.split('/')[3];
      const account = accountService.getPaymentAccountById(id);
      return sendJson(res, 200, { success: true, data: account });
    }
    if (pathname === '/api/payment-accounts' && method === 'POST') {
      const body = await parseBody(req);
      const account = accountService.createPaymentAccount(body, body.username || 'Admin');
      return sendJson(res, 201, { success: true, data: account });
    }
    if (pathname.match(/^\/api\/payment-accounts\/(\d+)$/) && method === 'PUT') {
      const id = pathname.split('/')[3];
      const body = await parseBody(req);
      const account = accountService.updatePaymentAccount(id, body, body.username || 'Admin');
      return sendJson(res, 200, { success: true, data: account });
    }
    if (pathname.match(/^\/api\/payment-accounts\/(\d+)$/) && method === 'DELETE') {
      const id = pathname.split('/')[3];
      const result = accountService.deletePaymentAccount(id, query.username || 'Admin');
      return sendJson(res, 200, result);
    }
    if (pathname === '/api/payment-accounts/transfer' && method === 'POST') {
      const body = await parseBody(req);
      const result = accountService.transferFunds(body, body.username || 'Admin');
      return sendJson(res, 200, result);
    }

    // --- ADVANCE CATERER ORDERS & PRODUCTION BOOKINGS (એડવાન્સ ઓર્ડર પ્લાનર) ---
    if (pathname === '/api/advance-orders' && method === 'GET') {
      const orders = advanceOrderService.getAdvanceOrders({
        startDate: query.startDate,
        endDate: query.endDate,
        deliveryDate: query.deliveryDate,
        status: query.status,
        slot: query.slot,
        customerId: query.customerId,
        search: query.search
      });
      return sendJson(res, 200, { success: true, data: orders });
    }
    if (pathname === '/api/advance-orders/daily-summary' && method === 'GET') {
      const summary = advanceOrderService.getDailyOrdersSummary(query.date);
      return sendJson(res, 200, { success: true, data: summary });
    }
    if (pathname.match(/^\/api\/advance-orders\/(\d+)$/) && method === 'GET') {
      const id = pathname.split('/')[3];
      const order = advanceOrderService.getOrderById(id);
      if (!order) return sendError(res, 404, 'Advance order not found');
      return sendJson(res, 200, { success: true, data: order });
    }
    if (pathname === '/api/advance-orders' && method === 'POST') {
      const body = await parseBody(req);
      const order = advanceOrderService.createAdvanceOrder(body);
      return sendJson(res, 201, { success: true, data: order });
    }
    if (pathname.match(/^\/api\/advance-orders\/(\d+)$/) && method === 'PUT') {
      const match = pathname.match(/^\/api\/advance-orders\/(\d+)$/);
      const id = match ? match[1] : null;
      const body = await parseBody(req);
      const order = advanceOrderService.updateAdvanceOrder(id, body);
      return sendJson(res, 200, { success: true, data: order });
    }
    if (pathname.match(/^\/api\/advance-orders\/(\d+)\/status$/) && method === 'POST') {
      const match = pathname.match(/^\/api\/advance-orders\/(\d+)\/status$/);
      const id = match ? match[1] : null;
      const body = await parseBody(req);
      const order = advanceOrderService.updateStatus(id, body.status);
      return sendJson(res, 200, { success: true, data: order });
    }
    if (pathname.match(/^\/api\/advance-orders\/(\d+)\/convert-to-sale$/) && method === 'POST') {
      const match = pathname.match(/^\/api\/advance-orders\/(\d+)\/convert-to-sale$/);
      const id = match ? match[1] : null;
      const body = await parseBody(req);
      const order = advanceOrderService.convertToSale(id, body.saleId, body.invoiceNo);
      return sendJson(res, 200, { success: true, data: order });
    }
    if (pathname.match(/^\/api\/advance-orders\/(\d+)$/) && method === 'DELETE') {
      const match = pathname.match(/^\/api\/advance-orders\/(\d+)$/);
      const id = match ? match[1] : null;
      const result = advanceOrderService.deleteAdvanceOrder(id);
      return sendJson(res, 200, result);
    }

    // --- WHATSAPP INBOUND ORDERS & OUTLET SYNC INBOX (આઉટલેટ ૧ & ૨ વોટ્સએપ ઓર્ડર) ---
    if (pathname === '/api/whatsapp/inbound-orders' && method === 'GET') {
      const orders = whatsappService.getInboundOrders(query);
      return sendJson(res, 200, { success: true, data: orders });
    }
    if (pathname.match(/^\/api\/whatsapp\/inbound-orders\/(\d+)$/) && method === 'GET') {
      const match = pathname.match(/^\/api\/whatsapp\/inbound-orders\/(\d+)$/);
      const id = match ? match[1] : null;
      const order = whatsappService.getInboundOrderById(id);
      return sendJson(res, 200, { success: true, data: order });
    }
    if (pathname === '/api/whatsapp/inbound' && method === 'POST') {
      const body = await parseBody(req);
      const order = whatsappService.createInboundOrder(body);
      return sendJson(res, 201, { success: true, data: order });
    }
    if (pathname === '/api/whatsapp/parse-preview' && method === 'POST') {
      const body = await parseBody(req);
      const parsed = whatsappService.parseWhatsAppMessage(body.raw_message, body.outlet_name || 'Outlet 1');
      return sendJson(res, 200, { success: true, data: parsed });
    }
    if (pathname.match(/^\/api\/whatsapp\/inbound-orders\/(\d+)\/approve$/) && method === 'POST') {
      const match = pathname.match(/^\/api\/whatsapp\/inbound-orders\/(\d+)\/approve$/);
      const id = match ? match[1] : null;
      const body = await parseBody(req);
      const result = whatsappService.approveInboundOrder(id, body.username || 'Admin');
      return sendJson(res, 200, { success: true, data: result });
    }
    if (pathname.match(/^\/api\/whatsapp\/inbound-orders\/(\d+)$/) && method === 'PUT') {
      const match = pathname.match(/^\/api\/whatsapp\/inbound-orders\/(\d+)$/);
      const id = match ? match[1] : null;
      const body = await parseBody(req);
      const order = whatsappService.updateInboundOrder(id, body);
      return sendJson(res, 200, { success: true, data: order });
    }
    if (pathname.match(/^\/api\/whatsapp\/inbound-orders\/(\d+)\/reject$/) && method === 'POST') {
      const match = pathname.match(/^\/api\/whatsapp\/inbound-orders\/(\d+)\/reject$/);
      const id = match ? match[1] : null;
      const body = await parseBody(req);
      const result = whatsappService.rejectInboundOrder(id, body.reason || 'Rejected');
      return sendJson(res, 200, { success: true, data: result });
    }

    // --- BACKUP & RESTORE ---
    if (pathname === '/api/backup/stats' && method === 'GET') {
      const stats = backupService.getDatabaseStats();
      return sendJson(res, 200, { success: true, data: stats });
    }
    if (pathname === '/api/backup/history' && method === 'GET') {
      const history = backupService.getBackupHistory();
      return sendJson(res, 200, { success: true, data: history });
    }
    if (pathname === '/api/backup/now' && method === 'POST') {
      const body = await parseBody(req);
      const resData = backupService.createBackup(body.type || 'MANUAL', body.username || 'Admin');
      return sendJson(res, 200, resData);
    }
    if (pathname === '/api/backup/restore' && method === 'POST') {
      const body = await parseBody(req);
      const resData = backupService.restoreBackup(body.file_path, body.username || 'Admin');
      return sendJson(res, 200, resData);
    }
    if (pathname === '/api/backup/download-db' && method === 'GET') {
      const db = backupService.getDatabaseStats();
      const fs = (await import('node:fs')).default;
      const { DB_PATH } = await import('./database/connection.js');
      
      const timestamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
      const filename = `matuki_sweets_backup_${timestamp}.db`;

      if (!fs.existsSync(DB_PATH)) {
        return sendError(res, 404, 'Database file not found');
      }

      const stat = fs.statSync(DB_PATH);
      res.writeHead(200, {
        'Content-Type': 'application/x-sqlite3',
        'Content-Length': stat.size,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Access-Control-Allow-Origin': '*'
      });

      const readStream = fs.createReadStream(DB_PATH);
      return readStream.pipe(res);
    }
    if (pathname === '/api/backup/upload-restore' && method === 'POST') {
      const chunks = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', () => {
        try {
          const buffer = Buffer.concat(chunks);
          if (!buffer || buffer.length === 0) {
            return sendError(res, 400, 'Uploaded file buffer is empty');
          }
          const result = backupService.restoreFromBuffer(buffer, 'uploaded_backup.db', 'Admin');
          return sendJson(res, 200, result);
        } catch (err) {
          return sendError(res, 400, `Restore failed: ${err.message}`, err);
        }
      });
      req.on('error', (err) => {
        sendError(res, 500, `Upload error: ${err.message}`, err);
      });
      return;
    }
    if (pathname === '/api/backup/export-all-data' && method === 'GET') {
      const allData = backupService.exportAllDataForExcel();
      return sendJson(res, 200, { success: true, data: allData });
    }

    // --- VASAN (UTENSIL / CONTAINER) MASTER & REPLACEMENT PRICING ---
    if (pathname === '/api/vasan-master' && method === 'GET') {
      const includeInactive = query.include_inactive === 'true';
      const items = vasanMasterService.getAllVasans(includeInactive);
      return sendJson(res, 200, { success: true, data: items });
    }
    if (pathname.startsWith('/api/vasan-master/') && method === 'GET') {
      const id = pathname.split('/')[3];
      const item = vasanMasterService.getVasanById(Number(id));
      if (!item) return sendError(res, 404, 'Vasan item not found');
      return sendJson(res, 200, { success: true, data: item });
    }
    if (pathname === '/api/vasan-master' && method === 'POST') {
      const body = await parseBody(req);
      const created = vasanMasterService.createVasan(body, body.username || 'Admin');
      return sendJson(res, 201, { success: true, data: created });
    }
    if (pathname.startsWith('/api/vasan-master/') && method === 'PUT') {
      const id = pathname.split('/')[3];
      const body = await parseBody(req);
      const updated = vasanMasterService.updateVasan(Number(id), body, body.username || 'Admin');
      return sendJson(res, 200, { success: true, data: updated });
    }
    if (pathname.startsWith('/api/vasan-master/') && method === 'DELETE') {
      const id = pathname.split('/')[3];
      const result = vasanMasterService.deleteVasan(Number(id));
      return sendJson(res, 200, result);
    }

    // --- DAILY TO-DO & TASK MANAGEMENT ---
    if (pathname === '/api/todos' && method === 'GET') {
      const todos = todoService.getTodos({
        timeframe: query.timeframe,
        viewMode: query.view_mode || query.viewMode,
        userId: query.user_id ? Number(query.user_id) : null,
        username: query.username || query.assigned_to,
        assignedToName: query.assigned_to,
        category: query.category,
        status: query.status,
        search: query.search
      });
      return sendJson(res, 200, { success: true, data: todos });
    }
    if (pathname === '/api/todos/summary' && method === 'GET') {
      const username = query.username || query.assigned_to;
      const summary = todoService.getTodaySummary(username);
      return sendJson(res, 200, { success: true, data: summary });
    }
    if (pathname === '/api/todos/pending-count' && method === 'GET') {
      const username = query.username || query.assigned_to || 'Admin';
      const count = todoService.getPendingRequestsCount(username);
      return sendJson(res, 200, { success: true, data: { count } });
    }
    if (pathname === '/api/todos/whatsapp-briefing' && method === 'GET') {
      const briefingText = todoService.generateWhatsAppBriefingText(query.timeframe || 'TODAY', query.assigned_to || 'All');
      return sendJson(res, 200, { success: true, data: { text: briefingText } });
    }
    if (pathname === '/api/todos' && method === 'POST') {
      const body = await parseBody(req);
      const created = todoService.createTodo(body, body.username || body.assigned_by_name || 'Admin');
      eventService.emit({ type: 'DATA_CHANGED', module: 'todos' });
      return sendJson(res, 201, { success: true, data: created });
    }
    if (pathname.match(/^\/api\/todos\/(\d+)\/accept$/) && (method === 'POST' || method === 'PATCH')) {
      const match = pathname.match(/^\/api\/todos\/(\d+)\/accept$/);
      const id = match ? match[1] : null;
      const body = await parseBody(req);
      const updated = todoService.acceptTodo(Number(id), body.username || 'Admin');
      eventService.emit({ type: 'DATA_CHANGED', module: 'todos' });
      return sendJson(res, 200, { success: true, data: updated });
    }
    if (pathname.match(/^\/api\/todos\/(\d+)\/reject$/) && (method === 'POST' || method === 'PATCH')) {
      const match = pathname.match(/^\/api\/todos\/(\d+)\/reject$/);
      const id = match ? match[1] : null;
      const body = await parseBody(req);
      const updated = todoService.rejectTodo(Number(id), body.reason || body.rejection_reason, body.username || 'Admin');
      eventService.emit({ type: 'DATA_CHANGED', module: 'todos' });
      return sendJson(res, 200, { success: true, data: updated });
    }
    if (pathname.startsWith('/api/todos/') && pathname.endsWith('/toggle') && (method === 'PATCH' || method === 'POST')) {
      const id = pathname.split('/')[3];
      const updated = todoService.toggleTodoStatus(Number(id));
      eventService.emit({ type: 'DATA_CHANGED', module: 'todos' });
      return sendJson(res, 200, { success: true, data: updated });
    }
    if (pathname.startsWith('/api/todos/') && pathname.endsWith('/star') && (method === 'PATCH' || method === 'POST')) {
      const id = pathname.split('/')[3];
      const updated = todoService.toggleStar(Number(id));
      eventService.emit({ type: 'DATA_CHANGED', module: 'todos' });
      return sendJson(res, 200, { success: true, data: updated });
    }
    if (pathname.startsWith('/api/todos/') && pathname.endsWith('/reschedule-today') && method === 'POST') {
      const id = pathname.split('/')[3];
      const updated = todoService.rescheduleToToday(Number(id));
      eventService.emit({ type: 'DATA_CHANGED', module: 'todos' });
      return sendJson(res, 200, { success: true, data: updated });
    }
    if (pathname === '/api/todos/reschedule-all-overdue' && method === 'POST') {
      const body = await parseBody(req);
      const result = todoService.rescheduleAllOverdueToToday(body.user_id ? Number(body.user_id) : null);
      eventService.emit({ type: 'DATA_CHANGED', module: 'todos' });
      return sendJson(res, 200, result);
    }
    if (pathname.startsWith('/api/todos/') && method === 'PUT') {
      const id = pathname.split('/')[3];
      const body = await parseBody(req);
      const updated = todoService.updateTodo(Number(id), body);
      eventService.emit({ type: 'DATA_CHANGED', module: 'todos' });
      return sendJson(res, 200, { success: true, data: updated });
    }
    if (pathname.startsWith('/api/todos/') && method === 'DELETE') {
      const id = pathname.split('/')[3];
      const result = todoService.deleteTodo(Number(id));
      eventService.emit({ type: 'DATA_CHANGED', module: 'todos' });
      return sendJson(res, 200, result);
    }

    // --- AUDIT & USERS ---
    if (pathname === '/api/audit/logs' && method === 'GET') {
      const logs = auditService.getAuditLogs(Number(query.limit) || 100);
      return sendJson(res, 200, { success: true, data: logs });
    }
    if (pathname === '/api/users' && method === 'GET') {
      const users = userService.getAllUsers();
      return sendJson(res, 200, { success: true, data: users });
    }
    if (pathname === '/api/users' && method === 'POST') {
      const body = await parseBody(req);
      const user = userService.createUser(body);
      return sendJson(res, 201, { success: true, data: user });
    }
    if (pathname.startsWith('/api/users/') && method === 'PUT') {
      const id = pathname.split('/')[3];
      const body = await parseBody(req);
      const updated = userService.updateUser(Number(id), body);
      return sendJson(res, 200, { success: true, data: updated });
    }
    if (pathname.startsWith('/api/users/') && method === 'DELETE') {
      const id = pathname.split('/')[3];
      const result = userService.deleteUser(Number(id));
      return sendJson(res, 200, result);
    }

    // --- BILL PHOTO / FILE UPLOADS ---
    if (pathname.startsWith('/uploads/') && method === 'GET') {
      const filename = path.basename(pathname);
      const filePath = path.join(UPLOADS_DIR, filename);
      if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath).toLowerCase();
        let mime = 'image/png';
        if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
        else if (ext === '.webp') mime = 'image/webp';
        else if (ext === '.pdf') mime = 'application/pdf';

        const data = fs.readFileSync(filePath);
        res.writeHead(200, {
          'Content-Type': mime,
          'Access-Control-Allow-Origin': '*'
        });
        return res.end(data);
      } else {
        return sendError(res, 404, 'Attached bill image not found');
      }
    }

    if (pathname === '/api/upload' && method === 'POST') {
      const body = await parseBody(req);
      const rawImage = body.image || body.file_base64;
      if (!rawImage) {
        return sendError(res, 400, 'No image data provided');
      }

      const matches = rawImage.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let ext = 'png';
      let buffer;

      if (matches && matches.length === 3) {
        const mime = matches[1];
        if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
        else if (mime.includes('webp')) ext = 'webp';
        else if (mime.includes('pdf')) ext = 'pdf';
        buffer = Buffer.from(matches[2], 'base64');
      } else {
        buffer = Buffer.from(rawImage, 'base64');
      }

      const timestamp = Date.now();
      const randomSuffix = Math.floor(Math.random() * 1000);
      const filename = `bill_${timestamp}_${randomSuffix}.${ext}`;
      const filePath = path.join(UPLOADS_DIR, filename);

      fs.writeFileSync(filePath, buffer);
      return sendJson(res, 200, {
        success: true,
        url: `/uploads/${filename}`,
        filename
      });
    }

    // --- AUTO-DISPATCH WHATSAPP (5-MINUTE DEBOUNCE QUEUE) ---
    if (pathname === '/api/sales/auto-dispatch/pending' && method === 'GET') {
      const pending = autoInvoiceDispatchService.getPendingDispatches();
      return sendJson(res, 200, { success: true, data: pending });
    }
    if (pathname.startsWith('/api/sales/') && pathname.endsWith('/send-whatsapp-now') && method === 'POST') {
      const id = pathname.split('/')[3];
      const result = await autoInvoiceDispatchService.dispatchSaleInvoiceNow(Number(id));
      return sendJson(res, 200, result);
    }
    if (pathname.startsWith('/api/sales/returns/') && pathname.endsWith('/send-whatsapp-now') && method === 'POST') {
      const id = pathname.split('/')[4];
      const result = await autoInvoiceDispatchService.dispatchSaleReturnNow(Number(id));
      return sendJson(res, 200, result);
    }

    // --- STAFF ATTENDANCE & SALARY MANAGEMENT ---
    if (pathname === '/api/attendance/branches' && method === 'GET') {
      const branches = attendanceService.getBranches();
      return sendJson(res, 200, { success: true, data: branches });
    }
    if (pathname === '/api/attendance/branches' && method === 'POST') {
      const body = await parseBody(req);
      const created = attendanceService.createBranch(body);
      return sendJson(res, 201, { success: true, data: created });
    }
    if (pathname.startsWith('/api/attendance/branches/') && method === 'PUT') {
      const id = pathname.split('/')[4];
      const body = await parseBody(req);
      const updated = attendanceService.updateBranch(Number(id), body);
      return sendJson(res, 200, { success: true, data: updated });
    }
    if (pathname.startsWith('/api/attendance/branches/') && method === 'DELETE') {
      const id = pathname.split('/')[4];
      const result = attendanceService.deleteBranch(Number(id));
      return sendJson(res, 200, result);
    }

    if (pathname === '/api/attendance/employees' && method === 'GET') {
      const employees = attendanceService.getEmployees(query);
      return sendJson(res, 200, { success: true, data: employees });
    }
    if (pathname.startsWith('/api/attendance/employees/') && method === 'GET') {
      const id = pathname.split('/')[4];
      const employee = attendanceService.getEmployeeById(Number(id));
      return sendJson(res, 200, { success: true, data: employee });
    }
    if (pathname === '/api/attendance/employees' && method === 'POST') {
      const body = await parseBody(req);
      const created = attendanceService.createEmployee(body);
      return sendJson(res, 201, { success: true, data: created });
    }
    if (pathname.startsWith('/api/attendance/employees/') && method === 'PUT') {
      const id = pathname.split('/')[4];
      const body = await parseBody(req);
      const updated = attendanceService.updateEmployee(Number(id), body);
      return sendJson(res, 200, { success: true, data: updated });
    }
    if (pathname.startsWith('/api/attendance/employees/') && method === 'DELETE') {
      const id = pathname.split('/')[4];
      const result = attendanceService.deleteEmployee(Number(id));
      return sendJson(res, 200, result);
    }

    if (pathname === '/api/attendance/daily' && method === 'GET') {
      const records = attendanceService.getDailyAttendance(query.date, query.branch_id);
      return sendJson(res, 200, { success: true, data: records });
    }
    if (pathname === '/api/attendance/mark' && method === 'POST') {
      const body = await parseBody(req);
      const result = attendanceService.markAttendance(body.employee_id, body.date, body.status, body.in_time, body.out_time, body.notes);
      return sendJson(res, 200, { success: true, data: result });
    }
    if (pathname === '/api/attendance/bulk-mark' && method === 'POST') {
      const body = await parseBody(req);
      const result = attendanceService.bulkMarkAttendance(body.records, body.date);
      return sendJson(res, 200, result);
    }

    if (pathname === '/api/attendance/salary-report' && method === 'GET') {
      const report = attendanceService.calculateMonthlySalaryReport(query.month, query.year, query.branch_id);
      return sendJson(res, 200, { success: true, data: report });
    }
    if (pathname === '/api/attendance/advances' && method === 'GET') {
      const advances = attendanceService.getAdvances(query);
      return sendJson(res, 200, { success: true, data: advances });
    }
    if (pathname === '/api/attendance/advances' && method === 'POST') {
      const body = await parseBody(req);
      const created = attendanceService.createAdvance(body, body.username || 'Admin');
      return sendJson(res, 201, { success: true, data: created });
    }
    if (pathname.startsWith('/api/attendance/advances/') && method === 'DELETE') {
      const id = pathname.split('/')[4];
      const result = attendanceService.deleteAdvance(Number(id));
      return sendJson(res, 200, result);
    }

    if (pathname === '/api/attendance/settings' && method === 'GET') {
      const settings = attendanceService.getSettings();
      return sendJson(res, 200, { success: true, data: settings });
    }
    if (pathname === '/api/attendance/settings' && method === 'PUT') {
      const body = await parseBody(req);
      const updated = attendanceService.updateSettings(body);
      return sendJson(res, 200, { success: true, data: updated });
    }
    if (pathname === '/api/attendance/verify-pin' && method === 'POST') {
      const body = await parseBody(req);
      const result = attendanceService.verifyPin(body.pin, body.branch_id);
      return sendJson(res, 200, result);
    }

    // --- SYSTEM RESET & TRIAL DATA CLEARING ---
    if (pathname === '/api/system/reset-transactions' && method === 'POST') {
      const body = await parseBody(req);
      const result = resetService.clearTrialTransactions(body.username || 'Admin');
      return sendJson(res, 200, result);
    }
    if (pathname === '/api/system/factory-reset' && method === 'POST') {
      const body = await parseBody(req);
      const result = resetService.factoryReset(body.username || 'Admin');
      return sendJson(res, 200, result);
    }
    if (pathname === '/api/system/reload-demo' && method === 'POST') {
      const body = await parseBody(req);
      const result = resetService.reloadDemoData(body.username || 'Admin');
      return sendJson(res, 200, result);
    }
    // --- SECURITY DOMAIN ROTATION (10TH & 25TH MIDNIGHT AUTO ROTATION) ---
    if (pathname === '/api/system/domain-rotation/status' && method === 'GET') {
      const config = domainRotationService.getConfig();
      const history = domainRotationService.getHistory();
      return sendJson(res, 200, { success: true, data: { config, history } });
    }
    if (pathname === '/api/system/domain-rotation/rotate-now' && method === 'POST') {
      const body = await parseBody(req);
      const result = domainRotationService.rotateDomainNow(body.reason || 'Manual Admin Trigger', body.username || 'Admin');
      return sendJson(res, 200, result);
    }
    if (pathname === '/api/system/domain-rotation/config' && method === 'PUT') {
      const body = await parseBody(req);
      const updated = domainRotationService.updateConfig(body);
      return sendJson(res, 200, { success: true, data: updated });
    }

    if (pathname === '/api/system/network-info' && method === 'GET') {
      const nets = os.networkInterfaces();
      let detectedIp = 'localhost';
      for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
          // Skip internal/loopback and non-IPv4
          if (net.family === 'IPv4' && !net.internal) {
            detectedIp = net.address;
            break;
          }
        }
        if (detectedIp !== 'localhost') break;
      }
      return sendJson(res, 200, {
        success: true,
        data: {
          hostname: os.hostname(),
          local_ip: detectedIp,
          frontend_port: 5173,
          backend_port: PORT,
          mobile_url: `http://${detectedIp}:5173`,
          api_url: `http://${detectedIp}:${PORT}`
        }
      });
    }

    // Not found
    sendError(res, 404, `Endpoint not found: ${method} ${pathname}`);
  } catch (err) {
    sendError(res, 500, err.message || 'Internal server error', err);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`MATUKI SWEETS Backend Server running on http://0.0.0.0:${PORT}`);
  console.log(`Database connected at: ${DB_PATH}`);
});
