import { getDatabase, runInTransaction } from '../database/connection.js';
import { advanceOrderService } from './advanceOrderService.js';
import { partyService } from './partyService.js';
import { settingsService } from './settingsService.js';

// Gujarati Word Numbers to Arabic Numeral Converter
const GUJARATI_WORDS_TO_NUM = [
  { word: 'એક', num: '1' },
  { word: 'બે', num: '2' },
  { word: 'ત્રણ', num: '3' },
  { word: 'ચાર', num: '4' },
  { word: 'પાંચ', num: '5' },
  { word: 'છ', num: '6' },
  { word: 'સાત', num: '7' },
  { word: 'આઠ', num: '8' },
  { word: 'નવ', num: '9' },
  { word: 'દસ', num: '10' },
  { word: 'અગિયાર', num: '11' },
  { word: 'બાર', num: '12' },
  { word: 'તેર', num: '13' },
  { word: 'ચૌદ', num: '14' },
  { word: 'પંદર', num: '15' },
  { word: 'સોળ', num: '16' },
  { word: 'સત્તર', num: '17' },
  { word: 'અઢાર', num: '18' },
  { word: 'ઓગણીસ', num: '19' },
  { word: 'વીસ', num: '20' },
  { word: 'પચીસ', num: '25' },
  { word: 'ત્રીસ', num: '30' },
  { word: 'ચાલીસ', num: '40' },
  { word: 'પચાસ', num: '50' }
];

// Gujarati Sweet Aliases with synonyms & master matching
export const GUJARATI_SWEET_ALIASES = [
  { keywords: ['ગુલાબ જાંબુ', 'ગુલાબજાંબુ', 'જાંબુ', 'gulab jamun', 'jamun', 'gulab'], name: 'Gulab Jamun' },
  { keywords: ['કાજુ કતરી', 'કાજુકતરી', 'kaju katli', 'katli', 'kaju'], name: 'Kaju Katli' },
  { keywords: ['મોહનથાળ', 'મોહન થાળ', 'mohanthal', 'mohan thal'], name: 'Mohanthal' },
  { keywords: ['કલાકાંદ', 'કલાકાંડ', 'બર્ફી', 'kalakand', 'barfi'], name: 'Kalakand Barfi' },
  { keywords: ['પેંડા', 'પેડા', 'કેસર પેંડા', 'peda', 'kesar peda'], name: 'Kesar Peda' },
  { keywords: ['મઠો', 'શ્રીખંડ', 'matho', 'shrikhand', 'mango matho', 'rajbhog', 'કેસર ક્રિસ્ટલ મઠો', 'ક્રિસ્ટલ મઠો', 'ડ્રાયફ્રૂટ મઠો'], name: 'Rajbhog Matho' },
  { keywords: ['ચુરમા લાડુ', 'લાડુ', 'મોતીચુર', 'churma ladu', 'ladu', 'ladoo', 'motichur'], name: 'Churma Ladu' },
  { keywords: ['રસગુલ્લા', 'રસગુલ્લાં', 'rasgulla', 'rosogolla'], name: 'Rasgulla' },
  { keywords: ['અડદિયા', 'અડદીયા', 'adadiya', 'adadiya pak'], name: 'Adadiya Pak' },
  { keywords: ['કાજુ અંજીર રોલ', 'અંજીર રોલ', 'kaju anjeer', 'anjeer roll'], name: 'Kaju Anjeer Roll' },
  { keywords: ['દૂધપાક', 'ખીર', 'dudhpak', 'kheer'], name: 'Dudhpak' }
];

export function normalizeGujaratiText(text) {
  if (!text) return '';
  // 1. Gujarati digits ૦-૯ ➔ 0-9
  const gujMap = { '૦': '0', '૧': '1', '૨': '2', '૩': '3', '૪': '4', '૫': '5', '૬': '6', '૭': '7', '૮': '8', '૯': '9' };
  let normalized = text.replace(/[૦-૯]/g, m => gujMap[m] || m);

  // 2. Normalize spaces around date slashes/dashes/dots: "16/ 8 /2026" ➔ "16/8/2026"
  normalized = normalized.replace(/(\d{1,2})\s*[\/\-\.]\s*(\d{1,2})\s*[\/\-\.]\s*(\d{2,4})/g, '$1/$2/$3');

  // 3. Normalize Gujarati word numbers: "આઠ પોટલા" ➔ "8 પોટલા"
  for (const item of GUJARATI_WORDS_TO_NUM) {
    const regex = new RegExp(`(?<=\\s|^)${item.word}(?=\\s|$)`, 'g');
    normalized = normalized.replace(regex, item.num);
  }

  return normalized;
}

export const whatsappService = {
  // --- INTELLIGENT GUJARATI & ENGLISH WHATSAPP TEXT PARSER ---
  parseWhatsAppMessage(rawText, defaultOutlet = 'Outlet 1') {
    const text = normalizeGujaratiText(rawText || '').trim();
    if (!text) {
      return {
        outlet_name: defaultOutlet,
        customer_name: 'WhatsApp Customer',
        customer_mobile: '',
        delivery_date: new Date().toISOString().split('T')[0],
        delivery_slot: 'MORNING_1',
        delivery_time: '08:00 AM',
        delivery_venue: 'Counter Pickup',
        advance_amount: 0,
        deposit_mode: 'CASH',
        items: []
      };
    }

    const db = getDatabase();
    const allProducts = db.prepare('SELECT id, name, code, selling_rate, unit FROM products WHERE active = 1').all();

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    let customerName = '';
    let customerMobile = '';
    let deliveryDate = todayStr;
    let deliverySlot = 'MORNING_1';
    let deliveryTime = '08:00 AM';
    let deliveryVenue = '';
    let advanceAmount = 0;
    let depositMode = 'CASH';
    let outletName = defaultOutlet;

    // 1. Detect Outlet / Branch
    const outletMatch = text.match(/(?:આઉટલેટ|outlet|branch|શાખા)\s*[:=-]?\s*([12૧૨]|yagnik|kalawad|[a-z0-9\s-]+)/i);
    if (outletMatch) {
      const oVal = outletMatch[1].trim().toLowerCase();
      if (oVal.includes('1') || oVal.includes('yagnik')) outletName = 'Outlet 1 - Yagnik Road';
      else if (oVal.includes('2') || oVal.includes('kalawad')) outletName = 'Outlet 2 - Kalawad Road';
      else outletName = `Outlet ${outletMatch[1]}`;
    }

    // 2. Detect Mobile Number (10 digits starting with 6-9)
    const mobileMatch = text.match(/(?:(?:\+?91[\-\s]?)?[6-9]\d{9})/);
    if (mobileMatch) {
      customerMobile = mobileMatch[0].replace(/[\+\-\s]/g, '').slice(-10);
    }

    // 3. Detect Delivery Date
    if (text.includes('કાલે') || text.toLowerCase().includes('tomorrow') || text.includes('આવતીકાલે')) {
      const t = new Date(today);
      t.setDate(t.getDate() + 1);
      deliveryDate = t.toISOString().split('T')[0];
    } else if (text.includes('પરમદિવસે') || text.includes('પરમ દિવસે')) {
      const t = new Date(today);
      t.setDate(t.getDate() + 2);
      deliveryDate = t.toISOString().split('T')[0];
    } else {
      // Matches DD/MM/YYYY or DD/MM or DD-MM-YYYY or DD.MM.YYYY
      const dateMatch = text.match(/(\d{1,2})\s*[\/\-\.]\s*(\d{1,2})(?:\s*[\/\-\.]\s*(\d{2,4}))?/);
      if (dateMatch) {
        const day = String(dateMatch[1]).padStart(2, '0');
        const month = String(dateMatch[2]).padStart(2, '0');
        let year = dateMatch[3] ? String(dateMatch[3]) : String(today.getFullYear());
        if (year.length === 2) year = `20${year}`;
        deliveryDate = `${year}-${month}-${day}`;
      }
    }

    // 4. Detect Time & Slot (Morning vs Evening)
    const timeMatch = text.match(/(\d{1,2})(?::(\d{2}))?\s*(?:વાગે|વાગ્યે|am|pm|AM|PM)/i);
    const isEveningKeyword = text.includes('સાંજ') || text.includes('બપોર') || text.toLowerCase().includes('evening') || text.toLowerCase().includes('afternoon') || text.toLowerCase().includes('pm');

    if (timeMatch) {
      let hr = parseInt(timeMatch[1], 10);
      const min = timeMatch[2] ? String(timeMatch[2]).padStart(2, '0') : '00';
      const isEvening = isEveningKeyword || (hr >= 12 && hr < 24) || (hr >= 1 && hr <= 6 && !text.includes('સવાર'));
      if (isEvening) {
        deliverySlot = 'EVENING_2';
        deliveryTime = `${hr > 12 ? hr - 12 : hr}:${min} PM`;
      } else {
        deliverySlot = 'MORNING_1';
        deliveryTime = `${hr}:${min} AM`;
      }
    } else if (isEveningKeyword) {
      deliverySlot = 'EVENING_2';
      deliveryTime = '05:00 PM';
    } else {
      deliverySlot = 'MORNING_1';
      deliveryTime = '08:00 AM';
    }

    // 5. Detect Customer Name / Caterer Name
    // Matches: "વિમલભાઈ રસોઈયા નો ઓર્ડર છે", "પાર્ટી: પરેશભાઈ કેટરર્સ", "ગ્રાહક: રાજેશભાઈ"
    const partyPrefixMatch = text.match(/(?:પાર્ટી|ગ્રાહક|નામ|party|customer|name|client)\s*[:=-]?\s*([A-Za-z\u0A80-\u0AFF\s\.]+?)(?=\s+(?:મો|મોબાઇલ|mobile|તારીખ|date|ઓર્ડર|ભાવ|સ્થળ|લોકેશન|\d)|$|\n)/i);
    if (partyPrefixMatch) {
      customerName = partyPrefixMatch[1].trim();
    }

    if (!customerName) {
      const orderForMatch = text.match(/([A-Za-z\u0A80-\u0AFF\s]+?)\s*(?:રસોઈયા|કેટરર્સ|ભાઈ|શેઠ|કેટરિંગ|મહારાજ)?\s*(?:નો\s*ઓર્ડર|ઓર્ડર\s*છે|નો\s*છે)/i);
      if (orderForMatch) {
        let rawN = orderForMatch[0].replace(/\s*(?:નો\s*ઓર્ડર|ઓર્ડર\s*છે|નો\s*છે).*/i, '').trim();
        rawN = rawN.replace(/^(?:વાગે|વાગ્યે|સાંજે|સવારે|બપોરે|અને|ના|છે)\s+/gi, '').trim();
        customerName = rawN;
      }
    }

    if (!customerName) {
      // If first line of multi-line message is a name
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length > 1 && !lines[0].match(/\d/) && !lines[0].includes(':')) {
        customerName = lines[0];
      }
    }

    // 6. Detect Location / Venue / Notes
    const locMatch = text.match(/(?:લોકેશન|સ્થળ|સરનામું|એડ્રેસ|પ્લોટ|વાડી|location|venue|address)\s*[:=-]?\s*([A-Za-z\u0A80-\u0AFF\s\.,0-9]+?)(?=\s*(?:[6-9]\d{9}|તારીખ|ઓર્ડર|ભાવ|સવારે|સાંજે|એડવાન્સ)|$|\n)/i);
    if (locMatch) {
      deliveryVenue = locMatch[1].trim();
    }

    if (!deliveryVenue) {
      if (text.includes('ફોન કરીને પૂછી લેવું') || text.includes('પૂછી લેવું')) {
        deliveryVenue = 'ફોન કરીને પૂછી લેવું';
      } else {
        deliveryVenue = 'Counter Pickup / Delivery';
      }
    }

    // 7. Advance Token & Mode
    const advMatch = text.match(/(?:એડવાન્સ|ટોકન|advance|deposit|token|જમા)\s*[:=-]?\s*(?:₹|rs\.?)?\s*(\d+(?:\.\d+)?)/i);
    if (advMatch) {
      advanceAmount = parseFloat(advMatch[1]) || 0;
    }
    if (text.toLowerCase().includes('upi') || text.toLowerCase().includes('gpay') || text.toLowerCase().includes('google pay') || text.toLowerCase().includes('online') || text.includes('ઓનલાઇન')) {
      depositMode = 'UPI';
    } else {
      depositMode = 'CASH';
    }

    // 8. Robust Items & Inline Rates Extraction
    const items = [];

    // Pattern to extract: Item + Qty + Unit + optional second Qty/Potla + optional Rate
    const itemRegex = /([A-Za-z\u0A80-\u0AFF\s\d]+?)\s*(\d+(?:\.\d+)?)\s*(કિલો|કિ\.ગ્રા|લીટર|લિટર|પોટલા|નંગ|ગ્રામ|બોક્સ|ડબ્બા|ડબ્બી|kg|gm|pcs|box|litre|ltr|potla)\s*(?:ના\s*(\d+)\s*(?:પોટલા|નંગ|કિલો))?\s*(?:ભાવ|દર|રેટ|rate|@|₹|rs\.?)?\s*[:=-]?\s*(\d+(?:\.\d+)?)?\s*(?:રૂપિયા|રૂ|rs)?/gi;

    let match;
    while ((match = itemRegex.exec(text)) !== null) {
      let rawName = match[1] ? match[1].trim() : '';
      let qty1 = parseFloat(match[2]) || 0;
      let unit1 = match[3] || 'KG';
      let qty2 = match[4] ? parseFloat(match[4]) : null;
      let explicitRate = match[5] ? parseFloat(match[5]) : 0;

      // Clean leading/trailing noise from item name
      rawName = rawName.replace(/(?:તારીખ|date|dt)\s*[\d\/\-\.]+/gi, '');
      rawName = rawName.replace(/^(?:ઓર્ડર|order|items?|item|સવારે|સાંજે|સમય|time|ના|અને|am|pm)\s*[:=-]?\s*/gi, '');
      rawName = rawName.replace(/[-*•\d\.\:\,]+/g, ' ').trim();

      let finalQty = qty1;
      let finalUnit = unit1;
      let itemName = rawName;

      if (qty2 !== null) {
        itemName = `${rawName ? rawName + ' ' : ''}${qty1} ${unit1} ના પોટલા`.trim();
        finalQty = qty2;
        finalUnit = 'પોટલા (BAG)';
      } else {
        if (!itemName && unit1.includes('પોટલા')) {
          itemName = 'પોટલા';
        }
      }

      if (!itemName || itemName.length < 2) continue;

      if (itemName.match(/^(?:સવારે|સાંજે|વાગે|સ્થળ|લોકેશન|વિમલભાઈ|પરેશભાઈ|ઓર્ડર|રૂપિયા)$/i)) {
        continue;
      }

      // Match with catalog
      let matchedProduct = null;
      const cleanLower = itemName.toLowerCase();

      // 1. Gujarati Aliases
      for (const alias of GUJARATI_SWEET_ALIASES) {
        if (alias.keywords.some(kw => cleanLower.includes(kw.toLowerCase()) || kw.toLowerCase().includes(cleanLower))) {
          matchedProduct = allProducts.find(p => p.name.toLowerCase().includes(alias.name.toLowerCase()));
          if (matchedProduct) break;
        }
      }

      // 2. Direct catalog name fuzzy match
      if (!matchedProduct) {
        matchedProduct = allProducts.find(p => p.name.toLowerCase().includes(cleanLower) || cleanLower.includes(p.name.toLowerCase()));
      }

      const rate = explicitRate > 0 ? explicitRate : (matchedProduct ? Number(matchedProduct.selling_rate) : 0);
      const resolvedUnit = matchedProduct && !finalUnit.includes('પોટલા') ? matchedProduct.unit : finalUnit;
      const totalAmount = Math.round(finalQty * rate * 100) / 100;

      items.push({
        product_id: matchedProduct ? matchedProduct.id : null,
        item_name: matchedProduct && !itemName.includes('પોટલા') && !itemName.includes('ક્રિસ્ટલ') ? matchedProduct.name : itemName,
        quantity: finalQty,
        unit: resolvedUnit,
        rate: rate,
        total_amount: totalAmount,
        notes: explicitRate > 0 ? `Explicit Rate: ₹${explicitRate}` : (matchedProduct ? `Auto-matched (${matchedProduct.code})` : 'Custom Item')
      });
    }

    return {
      outlet_name: outletName,
      customer_name: customerName || 'વિમલભાઈ રસોઈયા',
      customer_mobile: customerMobile,
      delivery_date: deliveryDate,
      delivery_slot: deliverySlot,
      delivery_time: deliveryTime,
      delivery_venue: deliveryVenue,
      advance_amount: advanceAmount,
      deposit_mode: depositMode,
      items
    };
  },

  // --- GET INBOUND ORDERS ---
  getInboundOrders(filters = {}) {
    const db = getDatabase();
    let query = 'SELECT * FROM whatsapp_inbound_orders WHERE 1=1';
    const params = [];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.outlet_name) {
      query += ' AND outlet_name LIKE ?';
      params.push(`%${filters.outlet_name}%`);
    }

    query += ' ORDER BY received_at DESC, id DESC';
    const rows = db.prepare(query).all(...params);

    return rows.map(r => ({
      ...r,
      items: JSON.parse(r.parsed_items_json || '[]')
    }));
  },

  getInboundOrderById(id) {
    const db = getDatabase();
    const order = db.prepare('SELECT * FROM whatsapp_inbound_orders WHERE id = ?').get(id);
    if (!order) return null;
    return {
      ...order,
      items: JSON.parse(order.parsed_items_json || '[]')
    };
  },

  // --- RECEIVE & INGEST INBOUND WHATSAPP ORDER ---
  createInboundOrder(data) {
    const db = getDatabase();
    const parsed = this.parseWhatsAppMessage(data.raw_message, data.outlet_name || 'Outlet 1');

    const customerName = data.customer_name || parsed.customer_name || 'WhatsApp Customer';
    const customerMobile = data.customer_mobile || parsed.customer_mobile || '';
    const deliveryDate = data.delivery_date || parsed.delivery_date || new Date().toISOString().split('T')[0];
    const deliverySlot = data.delivery_slot || parsed.delivery_slot || 'MORNING_1';
    const deliveryVenue = data.delivery_venue || parsed.delivery_venue || '';
    const advanceAmount = data.advance_amount !== undefined ? Number(data.advance_amount) : parsed.advance_amount;
    const depositMode = data.deposit_mode || parsed.deposit_mode || 'CASH';
    const outletName = data.outlet_name || parsed.outlet_name || 'Outlet 1';
    const items = data.items && data.items.length > 0 ? data.items : parsed.items;

    const result = db.prepare(`
      INSERT INTO whatsapp_inbound_orders (
        outlet_name, sender_mobile, sender_name, raw_message, status,
        parsed_customer_name, parsed_customer_mobile, parsed_delivery_date,
        parsed_delivery_slot, parsed_delivery_venue, parsed_advance_amount,
        parsed_deposit_mode, parsed_items_json, notes
      ) VALUES (?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      outletName,
      data.sender_mobile || customerMobile,
      data.sender_name || customerName,
      data.raw_message,
      customerName,
      customerMobile,
      deliveryDate,
      deliverySlot,
      deliveryVenue,
      advanceAmount,
      depositMode,
      JSON.stringify(items),
      data.notes || `Received from ${outletName}`
    );

    return this.getInboundOrderById(result.lastInsertRowid);
  },

  // --- 1-CLICK APPROVE: CONVERT INBOUND WHATSAPP ORDER INTO ADVANCE ORDER ---
  approveInboundOrder(id, username = 'Admin') {
    const db = getDatabase();
    const inbound = this.getInboundOrderById(id);
    if (!inbound) throw new Error('WhatsApp inbound order not found');
    if (inbound.status === 'APPROVED') throw new Error('This WhatsApp order is already approved');

    // 1. Find or Auto-Create Customer Master
    let customerId = null;
    if (inbound.parsed_customer_name) {
      const existingCust = db.prepare(`
        SELECT id FROM customers WHERE name LIKE ? OR (mobile != '' AND mobile = ?) LIMIT 1
      `).get(inbound.parsed_customer_name.trim(), inbound.parsed_customer_mobile || '___');

      if (existingCust) {
        customerId = existingCust.id;
      } else {
        // Auto-create customer
        const newCust = partyService.createCustomer({
          name: inbound.parsed_customer_name,
          mobile: inbound.parsed_customer_mobile || '',
          address: inbound.parsed_delivery_venue || '',
          opening_balance: 0
        }, username);
        customerId = newCust.id;
      }
    }

    // 2. Calculate Total Estimated Amount
    let totalEstimated = 0;
    for (const it of (inbound.items || [])) {
      const rate = Number(it.rate) || 0;
      const qty = Number(it.quantity) || 0;
      totalEstimated += qty * rate;
    }

    // 3. Generate Next Advance Order Number
    const orderNo = settingsService.getNextDocumentNumber('ADVANCE_ORDER');

    // 4. Create Official Advance Order Record
    const createdOrder = advanceOrderService.createAdvanceOrder({
      order_no: orderNo,
      order_date: new Date().toISOString().split('T')[0],
      delivery_date: inbound.parsed_delivery_date,
      delivery_time_slot: inbound.parsed_delivery_slot || 'MORNING_1',
      customer_id: customerId,
      customer_name: inbound.parsed_customer_name,
      customer_mobile: inbound.parsed_customer_mobile || '',
      delivery_venue: inbound.parsed_delivery_venue || '',
      total_estimated_amount: totalEstimated,
      advance_deposit_amount: inbound.parsed_advance_amount || 0,
      deposit_payment_mode: inbound.parsed_deposit_mode || 'CASH',
      notes: `[Synced from ${inbound.outlet_name} via WhatsApp] ${inbound.notes || ''}`.trim(),
      items: (inbound.items || []).map(it => ({
        product_id: it.product_id || null,
        item_name: it.item_name,
        quantity: it.quantity,
        unit: it.unit || 'KG',
        rate: it.rate || 0,
        notes: it.notes || ''
      }))
    }, username);

    // 5. Update WhatsApp Inbound record to APPROVED
    db.prepare(`
      UPDATE whatsapp_inbound_orders SET
        status = 'APPROVED',
        converted_order_id = ?,
        converted_order_no = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(createdOrder.id, createdOrder.order_no, id);

    // 6. Audit Log
    db.prepare(`
      INSERT INTO audit_logs (username, action, module, record_id, notes)
      VALUES (?, 'APPROVE', 'WHATSAPP_INBOX', ?, ?)
    `).run(username, String(id), `Approved WhatsApp order from ${inbound.outlet_name} ➔ Created Advance Order #${createdOrder.order_no} (${inbound.parsed_customer_name})`);

    return {
      success: true,
      message: `WhatsApp order successfully converted into Advance Order #${createdOrder.order_no}!`,
      advance_order: createdOrder
    };
  },

  // --- UPDATE PARSED FIELDS BEFORE APPROVAL ---
  updateInboundOrder(id, data) {
    const db = getDatabase();
    const existing = this.getInboundOrderById(id);
    if (!existing) throw new Error('WhatsApp order not found');

    const customerName = data.parsed_customer_name ?? existing.parsed_customer_name;
    const customerMobile = data.parsed_customer_mobile ?? existing.parsed_customer_mobile;
    const deliveryDate = data.parsed_delivery_date ?? existing.parsed_delivery_date;
    const deliverySlot = data.parsed_delivery_slot ?? existing.parsed_delivery_slot;
    const deliveryVenue = data.parsed_delivery_venue ?? existing.parsed_delivery_venue;
    const advanceAmount = data.parsed_advance_amount !== undefined ? Number(data.parsed_advance_amount) : existing.parsed_advance_amount;
    const depositMode = data.parsed_deposit_mode ?? existing.parsed_deposit_mode;
    const outletName = data.outlet_name ?? existing.outlet_name;
    const itemsJson = data.items ? JSON.stringify(data.items) : existing.parsed_items_json;

    db.prepare(`
      UPDATE whatsapp_inbound_orders SET
        outlet_name = ?,
        parsed_customer_name = ?,
        parsed_customer_mobile = ?,
        parsed_delivery_date = ?,
        parsed_delivery_slot = ?,
        parsed_delivery_venue = ?,
        parsed_advance_amount = ?,
        parsed_deposit_mode = ?,
        parsed_items_json = ?,
        notes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      outletName,
      customerName,
      customerMobile,
      deliveryDate,
      deliverySlot,
      deliveryVenue,
      advanceAmount,
      depositMode,
      itemsJson,
      data.notes ?? existing.notes,
      id
    );

    return this.getInboundOrderById(id);
  },

  // --- REJECT / ARCHIVE INBOUND ORDER ---
  rejectInboundOrder(id, reason = 'Rejected by User') {
    const db = getDatabase();
    db.prepare(`
      UPDATE whatsapp_inbound_orders SET
        status = 'REJECTED',
        notes = notes || ' | ' || ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(reason, id);

    return { success: true, message: 'WhatsApp order archived / rejected' };
  },

  // --- GENERATE COMPLETE WHOLESALE SALE INVOICE WHATSAPP MESSAGE ---
  generateSaleInvoiceMessage(sale, settings = {}) {
    const shopName = settings.business_name || 'MATUKI SWEETS & SNACKS';
    const shopPhone = settings.mobile || '+91 90818 22283';
    const upiId = settings.upi_id || 'Q070321548@ybl';

    const itemsText = (sale.items || []).map((item, idx) => {
      const vasanStr = (item.vasan_type && item.vasan_type !== 'NONE' && item.vasan_qty > 0)
        ? ` [🪣 ${item.vasan_type}: ${item.vasan_qty}]`
        : '';
      const qtyStr = item.quantity > 0 ? `${item.quantity} ${item.unit || 'KG'}` : '';
      const rateStr = item.rate > 0 ? `@ ₹${item.rate}` : '';
      return `${idx + 1}. *${item.product_name}*\n   ➔ ${qtyStr} ${rateStr} = *₹${Number(item.amount || 0).toLocaleString('en-IN')}*${vasanStr}`;
    }).join('\n\n');

    let deliverySection = '';
    if (sale.delivery_venue || sale.delivery_address) {
      deliverySection = `\n📍 *Delivery Venue:* ${sale.delivery_venue || sale.delivery_address}`;
      if (sale.driver_name) {
        deliverySection += `\n🛺 *Driver / Rickshaw:* ${sale.driver_name} ${sale.driver_mobile ? `(${sale.driver_mobile})` : ''}`;
      }
    }

    let vasanSummarySection = '';
    if (sale.vasan_summary) {
      vasanSummarySection = `\n🪣 *Vasan Containers Issued:* ${sale.vasan_summary}`;
    }

    const subtotalStr = `₹${Number(sale.subtotal || 0).toLocaleString('en-IN')}`;
    const grandTotalStr = `₹${Number(sale.grand_total || 0).toLocaleString('en-IN')}`;
    const paidStr = `₹${Number(sale.paid_amount || 0).toLocaleString('en-IN')}`;
    const dueStr = `₹${Number(sale.due_amount || 0).toLocaleString('en-IN')}`;
    const advanceStr = (Number(sale.advance_adjusted || 0) > 0) 
      ? `\n🔖 *Advance Adjusted:* ₹${Number(sale.advance_adjusted).toLocaleString('en-IN')}` 
      : '';
    const deliveryChargeStr = (Number(sale.delivery_charge || 0) > 0)
      ? `\n🚚 *Delivery Charge:* ₹${Number(sale.delivery_charge).toLocaleString('en-IN')}`
      : '';
    const discountStr = (Number(sale.discount_amount || 0) > 0)
      ? `\n🎁 *Discount:* -₹${Number(sale.discount_amount).toLocaleString('en-IN')}`
      : '';

    const billedByStr = sale.billed_by || sale.created_by || 'Admin';

    return `✨ *${shopName.toUpperCase()}* ✨
_Wholesale Sweets & Live Catering Specialist_
━━━━━━━━━━━━━━━━━━━━
🧾 *TAX INVOICE / DELIVERY CHALLAN*
📄 *Bill No:* \`${sale.invoice_no}\`
📅 *Date:* ${sale.date || new Date().toISOString().split('T')[0]}
👤 *Customer:* *${sale.customer_name}*${deliverySection}
━━━━━━━━━━━━━━━━━━━━
🛒 *ITEMS ORDERED:*

${itemsText}
━━━━━━━━━━━━━━━━━━━━
📊 *BILL SUMMARY:*
Subtotal: ${subtotalStr}${discountStr}${deliveryChargeStr}${advanceStr}
💰 *Grand Total:* *${grandTotalStr}*
💵 *Paid Amount:* *${paidStr}* (${sale.payment_mode || 'CASH'})
⏳ *Balance Due on Bill:* *${dueStr}*${vasanSummarySection}

👤 *Billed By:* *${billedByStr}*
━━━━━━━━━━━━━━━━━━━━
💳 *Pay Online via UPI:* \`${upiId}\`
📞 *Contact / Support:* ${shopPhone}

_Thank you for your valued order! Please return empty containers within 24 hours._`;
  },

  // --- GENERATE SALE RETURN WHATSAPP MESSAGE ---
  generateSaleReturnMessage(ret, sale, returnItems = [], settings = {}) {
    const shopName = settings.business_name || 'MATUKI SWEETS & SNACKS';
    const shopPhone = settings.mobile || '+91 90818 22283';

    const itemsText = (returnItems || []).map((item, idx) => {
      return `${idx + 1}. *${item.product_name}* ➔ ${item.quantity} ${item.unit || 'KG'} @ ₹${item.rate} = *₹${Number(item.amount || 0).toLocaleString('en-IN')}*`;
    }).join('\n');

    const totalReturnStr = `₹${Number(ret.total_amount || 0).toLocaleString('en-IN')}`;
    const billedByStr = ret.billed_by || ret.created_by || 'Cashier';

    return `✨ *${shopName.toUpperCase()}* ✨
━━━━━━━━━━━━━━━━━━━━
🔄 *SALES RETURN / CREDIT NOTE*
📄 *Return No:* \`${ret.return_no}\`
🧾 *Against Bill No:* \`${sale?.invoice_no || ret.invoice_no}\`
📅 *Date:* ${ret.date || new Date().toISOString().split('T')[0]}
👤 *Customer:* *${sale?.customer_name || 'Customer'}*
━━━━━━━━━━━━━━━━━━━━
📦 *RETURNED ITEMS:*

${itemsText || 'Item details processed'}
━━━━━━━━━━━━━━━━━━━━
💰 *Total Credit / Refund Amount:* *${totalReturnStr}*
💳 *Mode:* ${ret.refund_mode || 'CREDIT_NOTE'}
👤 *Processed By:* *${billedByStr}*
━━━━━━━━━━━━━━━━━━━━
📞 *Contact:* ${shopPhone}
_Customer Khata ledger balance has been updated automatically._`;
  }
};

