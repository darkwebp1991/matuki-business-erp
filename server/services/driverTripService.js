import { getDatabase } from '../database/connection.js';
import { salesService } from './salesService.js';
import { settingsService } from './settingsService.js';
import { whatsappGatewayService } from './whatsappGatewayService.js';


export const driverTripService = {
  // 1. Get all deliveries grouped by driver for a date
  getDriverTripsByDate(date) {
    const db = getDatabase();
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Fetch all sales for this date with delivery or driver assigned
    const sales = db.prepare(`
      SELECT s.*, c.mobile as customer_registered_mobile, c.address as customer_registered_address, c.city as customer_city
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.date = ? AND s.status != 'CANCELLED'
      ORDER BY s.id ASC
    `).all(targetDate);

    // Group sales by driver
    const driverMap = {};

    for (const sale of sales) {
      const driverKey = sale.driver_name ? sale.driver_name.trim() : (sale.driver_id ? `Driver #${sale.driver_id}` : 'Unassigned / Counter Pickup');
      if (!driverMap[driverKey]) {
        driverMap[driverKey] = {
          driver_key: driverKey,
          driver_id: sale.driver_id || null,
          driver_name: sale.driver_name || 'Unassigned Delivery',
          driver_mobile: sale.driver_mobile || '',
          date: targetDate,
          total_stops: 0,
          total_amount: 0,
          total_due_amount: 0,
          total_rickshaw_rent: 0,
          total_items_count: 0,
          vasan_summary_map: {},
          stops: []
        };
      }

      // Fetch items & vasan for this sale
      const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(sale.id);
      const vasanEntries = db.prepare('SELECT * FROM vasan_ledger WHERE sale_id = ?').all(sale.id);

      // Extract vasan breakdown
      const vasanCounts = {};
      for (const itm of items) {
        if (itm.vasan_type && itm.vasan_type !== 'NONE' && itm.vasan_qty > 0) {
          vasanCounts[itm.vasan_type] = (vasanCounts[itm.vasan_type] || 0) + Number(itm.vasan_qty);
          driverMap[driverKey].vasan_summary_map[itm.vasan_type] = (driverMap[driverKey].vasan_summary_map[itm.vasan_type] || 0) + Number(itm.vasan_qty);
        }
      }

      const vasanText = Object.entries(vasanCounts).map(([type, qty]) => `${qty} ${type}`).join(', ') || 'No Containers';

      driverMap[driverKey].total_stops += 1;
      driverMap[driverKey].total_amount += Number(sale.grand_total) || 0;
      driverMap[driverKey].total_due_amount += Number(sale.due_amount) || 0;
      driverMap[driverKey].total_rickshaw_rent += Number(sale.rickshaw_rent) || 0;
      driverMap[driverKey].total_items_count += items.length;

      driverMap[driverKey].stops.push({
        stop_number: driverMap[driverKey].total_stops,
        sale_id: sale.id,
        invoice_no: sale.invoice_no,
        customer_id: sale.customer_id,
        customer_name: sale.customer_name,
        customer_mobile: sale.customer_mobile || sale.customer_registered_mobile || '',
        delivery_venue: sale.delivery_venue || sale.delivery_address || sale.customer_registered_address || 'Shop / Counter Delivery',
        delivery_address: sale.delivery_address || sale.customer_registered_address || '',
        grand_total: Number(sale.grand_total) || 0,
        due_amount: Number(sale.due_amount) || 0,
        paid_amount: Number(sale.paid_amount) || 0,
        payment_mode: sale.payment_mode,
        rickshaw_rent: Number(sale.rickshaw_rent) || 0,
        rickshaw_rent_status: sale.rickshaw_rent_status || 'PENDING',
        trip_type: sale.trip_type || 'ROUND_TRIP',
        google_map_link: sale.google_map_link || '',
        vasan_summary: vasanText,
        vasan_counts: vasanCounts,
        items: items.map(it => ({
          product_name: it.product_name,
          quantity: it.quantity,
          unit: it.unit,
          vasan_type: it.vasan_type,
          vasan_qty: it.vasan_qty
        }))
      });
    }

    return Object.values(driverMap);
  },

  // 2. Format Crisp Copy-Pasteable / Clickable Stop Message for a single Delivery
  formatSingleDeliveryMessage(saleId) {
    const db = getDatabase();
    const sale = salesService.getSaleById(saleId);
    if (!sale) throw new Error('Sale invoice not found');

    const settings = settingsService.getSettings();
    const businessName = settings.business_name || 'MATUKI SWEETS';

    const customerName = sale.customer_name || 'Customer';
    const customerMobile = sale.customer_mobile || (sale.customer_registered_mobile || 'No Mobile');
    const venue = sale.delivery_venue || sale.delivery_address || (sale.customer_address || 'Delivery Venue');
    const dueAmount = Number(sale.due_amount) || 0;
    const isCOD = dueAmount > 0;

    // Check for Google Map Link (from sale.google_map_link or URL embedded in venue/address)
    let mapLink = sale.google_map_link ? sale.google_map_link.trim() : '';
    if (!mapLink) {
      // Check if venue or address contains a URL (http / goo.gl / maps)
      const combined = `${venue} ${sale.delivery_address || ''}`;
      const urlMatch = combined.match(/(https?:\/\/[^\s]+)/i);
      if (urlMatch) {
        mapLink = urlMatch[0];
      }
    }

    // Items list
    const itemsList = (sale.items || []).map(it => {
      const vText = it.vasan_type && it.vasan_type !== 'NONE' && it.vasan_qty > 0 ? ` [${it.vasan_qty} ${it.vasan_type}]` : '';
      return `• ${it.product_name} — ${it.quantity} ${it.unit || 'KG'}${vText}`;
    }).join('\n') || '• Standard Items';

    // Vasan breakdown
    const vasanCounts = {};
    for (const itm of (sale.items || [])) {
      if (itm.vasan_type && itm.vasan_type !== 'NONE' && itm.vasan_qty > 0) {
        vasanCounts[itm.vasan_type] = (vasanCounts[itm.vasan_type] || 0) + Number(itm.vasan_qty);
      }
    }
    const vasanString = Object.entries(vasanCounts).map(([type, qty]) => `📦 ${qty} ${type}`).join('\n') || '• No special containers';

    const tripType = sale.trip_type === 'ONE_WAY' ? '➡️ વન વે (One Way)' : '🔄 રાઉન્ડ ટ્રીપ (Round Trip)';
    const rickshawRent = Number(sale.rickshaw_rent) || 0;

    return `🛺 *${businessName} — રિક્ષા ડિલિવરી ઓર્ડર*
━━━━━━━━━━━━━━━━━━━━
📄 *બિલ નં:* ${sale.invoice_no}
📅 *તારીખ:* ${sale.date}
🔄 *ટ્રીપ પ્રકાર:* ${tripType}
🛺 *રિક્ષા ભાડું (Driver Rent):* ₹${rickshawRent.toLocaleString('en-IN')}

👤 *પાર્ટીનું નામ:* ${customerName}
📞 *ગ્રાહક મોબાઈલ:* ${customerMobile}
📍 *ડિલિવરી સ્થળ:* ${venue}${mapLink ? `\n🗺️ *ગૂગલ મેપ લિંક:* ${mapLink}` : ''}

🍱 *આઈટમ્સ & વજન:*
${itemsList}

🛢️ *વાસણ વિગત (Vasan Loaded):*
${vasanString}

💰 *બિલ રકમ:* ₹${Number(sale.grand_total).toLocaleString('en-IN')}
${isCOD ? `🔴 *રોકડા ઉઘરાવવાના (COD Due):* ₹${dueAmount.toLocaleString('en-IN')}` : `🟢 *પેમેન્ટ સ્ટેટસ:* ✅ પૂર્ણ ભરાયેલ (Paid)`}

━━━━━━━━━━━━━━━━━━━━
⚠️ *સૂચના:* 
૧. ગ્રાહકને માલ ચેક કરાવીને આપવો.
૨. ખાલી વાસણ સાચવીને પરત દુકાને જમા કરાવવા.
📱 _માતૂકી સ્વીટ્સ — ડિલિવરી મેનેજમેન્ટ સિસ્ટમ_`;
  },

  // 3. Format Multi-Stop Consolidated Trip Sheet Message
  formatDriverTripSheetMessage(driverName, date) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const allTrips = this.getDriverTripsByDate(targetDate);
    const trip = allTrips.find(t => t.driver_name.toLowerCase().trim() === driverName.toLowerCase().trim() || t.driver_key === driverName);

    if (!trip || trip.stops.length === 0) {
      throw new Error(`No delivery stops found for ${driverName} on ${targetDate}`);
    }

    const settings = settingsService.getSettings();
    const businessName = settings.business_name || 'MATUKI SWEETS';

    // Vasan total string
    const vasanTotalStr = Object.entries(trip.vasan_summary_map).map(([type, qty]) => `• ${qty} ${type}`).join('\n') || '• No Containers';

    let stopsText = '';
    trip.stops.forEach((st, idx) => {
      const isDue = st.due_amount > 0;
      const tripTypeLabel = st.trip_type === 'ONE_WAY' ? '➡️ One Way' : '🔄 Round Trip';
      let stopMapLink = st.google_map_link ? st.google_map_link.trim() : '';
      if (!stopMapLink) {
        const combined = `${st.delivery_venue} ${st.delivery_address || ''}`;
        const urlMatch = combined.match(/(https?:\/\/[^\s]+)/i);
        if (urlMatch) stopMapLink = urlMatch[0];
      }

      stopsText += `\n📍 *સ્ટોપ #${idx + 1}: ${st.customer_name}*
📞 મોબાઈલ: ${st.customer_mobile || 'N/A'}
🏠 સ્થળ: ${st.delivery_venue}${stopMapLink ? `\n🗺️ મેપ: ${stopMapLink}` : ''}
🔄 ટ્રીપ: *${tripTypeLabel}* | 🛺 ભાડું: *₹${st.rickshaw_rent || 0}*
🛢️ વાસણ: ${st.vasan_summary}
💵 ઉઘરાણી: ${isDue ? `*₹${st.due_amount.toLocaleString('en-IN')} (રોકડા લો)*` : `✅ Paid`}
────────────────────`;
    });

    return `🛺 *${businessName} — ડ્રાઈવર ટ્રીપ શીટ (Trip Sheet)*
👤 *ડ્રાઈવર:* ${trip.driver_name} ${trip.driver_mobile ? `(${trip.driver_mobile})` : ''}
📅 *તારીખ:* ${targetDate} | 🛑 *કુલ સ્ટોપ:* ${trip.total_stops}

━━━━━━━━━━━━━━━━━━━━
🛢️ *કુલ વાસણ લોડ થયેલ (Total Vasan Loaded):*
${vasanTotalStr}

💵 *કુલ ઉઘરાવવાની રોકડ (Total COD Cash):* ₹${trip.total_due_amount.toLocaleString('en-IN')}
━━━━━━━━━━━━━━━━━━━━

📋 *દરેક સ્ટોપની વિગત (All Stops):*
${stopsText}

⚠️ *ડ્રાઈવર સૂચના:*
દરેક સ્ટોપ પર ગ્રાહકને સમયસર પહોંચાડવું અને ખાલી વાસણ સાથે પરત લાવવા.
_સિસ્ટમ જનરેટેડ ટ્રીપ શીટ — ${businessName}_`;
  },

  // 4. Send Single Stop Delivery WhatsApp to Driver
  async sendSingleStopWhatsApp(saleId, targetDriverMobile = null) {
    const sale = salesService.getSaleById(saleId);
    if (!sale) throw new Error('Sale not found');

    const mobile = targetDriverMobile || sale.driver_mobile;
    if (!mobile) throw new Error('Driver mobile number is required to send WhatsApp dispatch.');

    const messageText = this.formatSingleDeliveryMessage(saleId);

    const result = await whatsappGatewayService.sendMessage({
      toMobile: mobile,
      messageText
    });

    return {
      success: true,
      driver_name: sale.driver_name,
      driver_mobile: mobile,
      message: 'Single stop dispatch sent to driver on WhatsApp successfully!',
      result
    };
  },

  // 5. Send Full Multi-Stop Trip Sheet WhatsApp to Driver
  async sendDriverTripSheetWhatsApp(driverName, date, targetDriverMobile = null) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const allTrips = this.getDriverTripsByDate(targetDate);
    const trip = allTrips.find(t => t.driver_name.toLowerCase().trim() === driverName.toLowerCase().trim() || t.driver_key === driverName);

    if (!trip) throw new Error(`Trip not found for ${driverName}`);

    const mobile = targetDriverMobile || trip.driver_mobile;
    if (!mobile) throw new Error(`Mobile number for driver "${driverName}" is required.`);

    const messageText = this.formatDriverTripSheetMessage(driverName, targetDate);

    const result = await whatsappGatewayService.sendMessage({
      toMobile: mobile,
      messageText
    });

    return {
      success: true,
      driver_name: driverName,
      driver_mobile: mobile,
      total_stops: trip.total_stops,
      message: `Full trip sheet (${trip.total_stops} stops) sent to driver on WhatsApp!`,
      result
    };
  }
};
