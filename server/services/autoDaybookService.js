import { getDatabase } from '../database/connection.js';
import { settingsService } from './settingsService.js';
import { reportService } from './reportService.js';
import { whatsappGatewayService } from './whatsappGatewayService.js';

class AutoDaybookService {
  constructor() {
    this.intervalHandle = null;
    this.targetHour = 20;   // 8 PM
    this.targetMinute = 45; // 45 minutes -> 8:45 PM
    this.isProcessing = false;
  }

  initDailyScheduler() {
    if (this.intervalHandle) clearInterval(this.intervalHandle);

    console.log('⏰ Auto Daybook (Rojmel) Partner Scheduler initialized (Target: 8:45 PM daily)...');

    // Run check every 30 seconds
    this.intervalHandle = setInterval(() => {
      this.checkAndTriggerDailyReport();
    }, 30000);
  }

  async checkAndTriggerDailyReport() {
    if (this.isProcessing) return;

    try {
      const db = getDatabase();
      const settings = settingsService.getSettings();
      if (!settings || settings.auto_rojmel_enabled === 0) return;

      const now = new Date();
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();

      // Check if time is 20:45 or later (up to 23:59)
      const targetTimeStr = settings.auto_rojmel_time || '20:45';
      const [tHour, tMin] = targetTimeStr.split(':').map(Number);
      const isTimePassed = (currentHour > tHour) || (currentHour === tHour && currentMin >= tMin);

      if (!isTimePassed) return;

      const todayStr = now.toISOString().split('T')[0];

      // Check if already sent today
      if (settings.last_auto_rojmel_date === todayStr) {
        return;
      }

      this.isProcessing = true;
      console.log(`🚀 [8:45 PM AUTO TRIGGER] Dispatching Daily Daybook Snapshot to 3 Partners for ${todayStr}...`);

      const result = await this.dispatchDaybookSnapshotToPartners(todayStr);

      // Record dispatch date
      db.prepare('UPDATE business_settings SET last_auto_rojmel_date = ? WHERE id = ?').run(todayStr, settings.id || 1);
      console.log('✅ Daily 8:45 PM Daybook Snapshot sent successfully to partners:', result);
    } catch (err) {
      console.error('Error during auto daybook partner dispatch:', err);
    } finally {
      this.isProcessing = false;
    }
  }

  // Generate Executive Summary WhatsApp Text for Partners
  generateDaybookPartnerMessage(date) {
    const db = getDatabase();
    const targetDate = date || new Date().toISOString().split('T')[0];
    const settings = settingsService.getSettings();
    const businessName = settings.business_name || 'MATUKI SWEETS';

    // 1. Sales Summary for the day
    const salesSummary = db.prepare(`
      SELECT 
        COUNT(*) as total_bills,
        COALESCE(SUM(grand_total), 0) as total_sales,
        COALESCE(SUM(paid_amount), 0) as total_paid,
        COALESCE(SUM(due_amount), 0) as total_due,
        COALESCE(SUM(CASE WHEN payment_mode = 'CASH' THEN grand_total ELSE 0 END), 0) as cash_sales,
        COALESCE(SUM(CASE WHEN payment_mode = 'UPI' THEN grand_total ELSE 0 END), 0) as upi_sales,
        COALESCE(SUM(CASE WHEN payment_mode = 'CREDIT' THEN grand_total ELSE 0 END), 0) as credit_sales
      FROM sales
      WHERE date = ? AND status != 'CANCELLED'
    `).get(targetDate);

    // Total Sweet Weight KG
    const weightSummary = db.prepare(`
      SELECT COALESCE(SUM(si.quantity), 0) as total_kg
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      WHERE s.date = ? AND s.status != 'CANCELLED' AND si.unit = 'KG'
    `).get(targetDate);

    // 2. Receipts & Payments Flow
    const inflow = db.prepare(`
      SELECT COALESCE(SUM(credit_amount), 0) as total_inflow
      FROM ledger_entries
      WHERE entry_date = ? AND credit_amount > 0
    `).get(targetDate)?.total_inflow || 0;

    const outflow = db.prepare(`
      SELECT COALESCE(SUM(debit_amount), 0) as total_outflow
      FROM ledger_entries
      WHERE entry_date = ? AND debit_amount > 0
    `).get(targetDate)?.total_outflow || 0;

    // 3. Payment Accounts Live Balances
    const accounts = db.prepare('SELECT * FROM payment_accounts WHERE active = 1 ORDER BY account_type ASC').all();
    const cashAcc = accounts.find(a => a.account_type === 'CASH');
    const bankAcc = accounts.find(a => a.account_type === 'BANK');
    const upiAcc = accounts.find(a => a.account_type === 'UPI');

    const cashBal = cashAcc ? Number(cashAcc.opening_balance || 0) : 0;
    const bankBal = bankAcc ? Number(bankAcc.opening_balance || 0) : 0;
    const upiBal = upiAcc ? Number(upiAcc.opening_balance || 0) : 0;

    // 4. Pending Vasan in Market
    const vasanPending = db.prepare(`
      SELECT vasan_type, SUM(due_qty) as total_due
      FROM vasan_ledger
      WHERE status = 'PENDING_RETURN' AND due_qty > 0
      GROUP BY vasan_type
    `).all();
    const vasanText = vasanPending.map(v => `${v.total_due} ${v.vasan_type}`).join(', ') || '0 Containers';

    // 5. Tomorrow's Advance Orders
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const tomorrowOrders = db.prepare(`
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total_amount), 0) as total_amount,
        COALESCE(SUM(total_weight_kg), 0) as total_weight
      FROM advance_orders
      WHERE delivery_date = ? AND status != 'CANCELLED'
    `).get(tomorrowStr);

    const nowFormatted = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    return `👑 *${businessName} — દૈનિક રોજમેળ સમરી (Daybook Snapshot)*
📅 *તારીખ:* ${targetDate} | ⏰ *સમય:* ${nowFormatted}
━━━━━━━━━━━━━━━━━━━━━━━━

🛍️ *આજનું કુલ વેચાણ (Today's Total Sales):* ₹${Number(salesSummary.total_sales).toLocaleString('en-IN')}
   • કુલ બિલ: ${salesSummary.total_bills} | વજન: ${Number(weightSummary.total_kg).toFixed(1)} KG
   • 💵 રોકડ વેચાણ (Cash): ₹${Number(salesSummary.cash_sales).toLocaleString('en-IN')}
   • 📱 UPI વેચાણ: ₹${Number(salesSummary.upi_sales).toLocaleString('en-IN')}
   • 📝 ઉધાર વેચાણ (Credit): ₹${Number(salesSummary.credit_sales).toLocaleString('en-IN')}

━━━━━━━━━━━━━━━━━━━━━━━━
💰 *રોકડ & બેંક બેલેન્સ (Live Cash & Bank):*
   • 💵 ગલ્લા રોકડ (Cash in Hand): ₹${cashBal.toLocaleString('en-IN')}
   • 🏦 બેંક ખાતું (Bank Balance): ₹${bankBal.toLocaleString('en-IN')}
   • 📱 UPI QR એકાઉન્ટ: ₹${upiBal.toLocaleString('en-IN')}

━━━━━━━━━━━━━━━━━━━━━━━━
🛢️ *બહાર ગયેલા બાકી વાસણ (Vasan in Market):*
   ${vasanText}

📅 *આવતીકાલના એડવાન્સ ઓર્ડર (${tomorrowStr}):*
   • ઓર્ડર સંખ્યા: ${tomorrowOrders.total_orders} ઓર્ડર
   • કુલ વજન: ${Number(tomorrowOrders.total_weight).toFixed(1)} KG
   • અંદાજિત રકમ: ₹${Number(tomorrowOrders.total_amount).toLocaleString('en-IN')}

━━━━━━━━━━━━━━━━━━━━━━━━
✅ _આ મેસેજ દરરોજ રાત્રે 8:45 કલાકે ઓટોમેટીક પાર્ટનર્સને સેન્ડ થાય છે._
🏪 *માતૂકી સ્વીટ્સ એન્ડ સ્નેક્સ — સુરત*`;
  }

  // Dispatch to 3 Configured Partner Mobile Numbers (Sends HD Snapshot Photo Only)
  async dispatchDaybookSnapshotToPartners(date, customPartners = null, imageBase64 = null) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const settings = settingsService.getSettings();

    // Determine partner numbers
    const partnerNumbers = customPartners || [
      settings.partner_1_mobile || settings.mobile || '+91 90818 22283',
      settings.partner_2_mobile || '',
      settings.partner_3_mobile || ''
    ].filter(m => m && m.trim().length >= 8);

    if (partnerNumbers.length === 0) {
      throw new Error('No partner mobile numbers configured in settings.');
    }

    const dispatchResults = [];

    for (const mobile of partnerNumbers) {
      try {
        const cleanMobile = mobile.trim();
        const res = await whatsappGatewayService.sendMessage({
          toMobile: cleanMobile,
          imageBase64: imageBase64 || null,
          messageText: imageBase64 ? '' : this.generateDaybookPartnerMessage(targetDate)
        });
        dispatchResults.push({ mobile: cleanMobile, success: true, res });
      } catch (err) {
        console.error(`Failed to send daily snapshot to partner ${mobile}:`, err.message);
        dispatchResults.push({ mobile, success: false, error: err.message });
      }
    }

    return {
      success: true,
      date: targetDate,
      total_recipients: partnerNumbers.length,
      dispatched: dispatchResults
    };
  }
}

export const autoDaybookService = new AutoDaybookService();
