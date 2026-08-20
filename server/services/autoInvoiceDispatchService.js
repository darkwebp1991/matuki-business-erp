import { getDatabase } from '../database/connection.js';
import { salesService } from './salesService.js';
import { settingsService } from './settingsService.js';
import { whatsappGatewayService } from './whatsappGatewayService.js';
import { whatsappService } from './whatsappService.js';

class AutoInvoiceDispatchService {
  constructor() {
    this.activeTimers = new Map(); // key: "SALE_12" -> { timerId, scheduledAt, saleId }
    this.defaultDelayMs = 5 * 60 * 1000; // 5 Minutes (300,000 ms)
  }

  // Initialize and re-arm pending dispatches upon server startup
  initDispatcher() {
    try {
      const db = getDatabase();
      const pendings = db.prepare(`
        SELECT * FROM scheduled_invoice_dispatches
        WHERE status = 'PENDING'
      `).all();

      console.log(`⏳ Re-arming ${pendings.length} pending auto-invoice dispatches...`);
      const now = Date.now();

      for (const item of pendings) {
        const scheduledTime = new Date(item.scheduled_at).getTime();
        const remainingDelay = Math.max(5000, scheduledTime - now); // At least 5s grace if past due

        if (item.reference_type === 'SALE') {
          this.scheduleSaleInvoice(item.reference_id, remainingDelay, false);
        } else if (item.reference_type === 'SALES_RETURN') {
          this.scheduleSaleReturnInvoice(item.reference_id, remainingDelay, false);
        }
      }
    } catch (err) {
      console.warn('AutoInvoiceDispatch init notice:', err.message);
    }
  }

  // Schedule or Reschedule (Debounce) a Sale Bill WhatsApp Dispatch
  scheduleSaleInvoice(saleId, delayMs = this.defaultDelayMs, updateDb = true) {
    const key = `SALE_${saleId}`;

    // 1. Clear existing timeout if already scheduled (Debounce on Edit!)
    if (this.activeTimers.has(key)) {
      const existing = this.activeTimers.get(key);
      clearTimeout(existing.timerId);
      this.activeTimers.delete(key);
      console.log(`🔄 Resetting 5-minute auto WhatsApp timer for Sale #${saleId} (debounced due to edit)`);
    }

    const db = getDatabase();
    const sale = salesService.getSaleById(saleId);
    if (!sale) return null;

    const recipientMobile = sale.customer_mobile || (sale.customer_registered_mobile || '');
    const scheduledAt = new Date(Date.now() + delayMs).toISOString();

    if (updateDb) {
      // Upsert record in scheduled_invoice_dispatches
      const existingRecord = db.prepare(`
        SELECT id FROM scheduled_invoice_dispatches 
        WHERE reference_type = 'SALE' AND reference_id = ? AND status = 'PENDING'
      `).get(saleId);

      if (existingRecord) {
        db.prepare(`
          UPDATE scheduled_invoice_dispatches
          SET recipient_mobile = ?, scheduled_at = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(recipientMobile, scheduledAt, existingRecord.id);
      } else {
        db.prepare(`
          INSERT INTO scheduled_invoice_dispatches (reference_type, reference_id, recipient_mobile, scheduled_at, status)
          VALUES ('SALE', ?, ?, ?, 'PENDING')
        `).run(saleId, recipientMobile, scheduledAt);
      }
    }

    // Set background timer
    const timerId = setTimeout(async () => {
      await this.dispatchSaleInvoiceNow(saleId);
    }, delayMs);

    this.activeTimers.set(key, {
      timerId,
      scheduledAt,
      referenceType: 'SALE',
      referenceId: saleId,
      recipientMobile,
      invoiceNo: sale.invoice_no,
      customerName: sale.customer_name
    });

    console.log(`⏰ Scheduled auto WhatsApp invoice for Bill #${sale.invoice_no} in ${Math.round(delayMs / 1000)} seconds (to: ${recipientMobile || 'No Mobile'})`);
    return { success: true, scheduled_at: scheduledAt, delay_seconds: Math.round(delayMs / 1000) };
  }

  // Schedule or Reschedule a Sale Return WhatsApp Dispatch
  scheduleSaleReturnInvoice(returnId, delayMs = this.defaultDelayMs, updateDb = true) {
    const key = `SALES_RETURN_${returnId}`;

    if (this.activeTimers.has(key)) {
      const existing = this.activeTimers.get(key);
      clearTimeout(existing.timerId);
      this.activeTimers.delete(key);
    }

    const db = getDatabase();
    const ret = db.prepare('SELECT * FROM sales_returns WHERE id = ?').get(returnId);
    if (!ret) return null;

    const sale = salesService.getSaleById(ret.sale_id);
    const recipientMobile = sale?.customer_mobile || sale?.customer_registered_mobile || '';
    const scheduledAt = new Date(Date.now() + delayMs).toISOString();

    if (updateDb) {
      db.prepare(`
        INSERT INTO scheduled_invoice_dispatches (reference_type, reference_id, recipient_mobile, scheduled_at, status)
        VALUES ('SALES_RETURN', ?, ?, ?, 'PENDING')
      `).run(returnId, recipientMobile, scheduledAt);
    }

    const timerId = setTimeout(async () => {
      await this.dispatchSaleReturnNow(returnId);
    }, delayMs);

    this.activeTimers.set(key, {
      timerId,
      scheduledAt,
      referenceType: 'SALES_RETURN',
      referenceId: returnId,
      recipientMobile,
      invoiceNo: ret.return_no,
      customerName: sale?.customer_name || 'Customer'
    });

    return { success: true, scheduled_at: scheduledAt };
  }

  // Cancel schedule (e.g. if bill is deleted or cancelled)
  cancelSchedule(referenceType, referenceId) {
    const key = `${referenceType}_${referenceId}`;
    if (this.activeTimers.has(key)) {
      const existing = this.activeTimers.get(key);
      clearTimeout(existing.timerId);
      this.activeTimers.delete(key);
    }

    const db = getDatabase();
    db.prepare(`
      UPDATE scheduled_invoice_dispatches
      SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
      WHERE reference_type = ? AND reference_id = ? AND status = 'PENDING'
    `).run(referenceType, referenceId);

    console.log(`🚫 Cancelled scheduled auto WhatsApp invoice for ${referenceType} #${referenceId}`);
    return { success: true };
  }

  // Execute immediate WhatsApp dispatch for a Sale Bill
  async dispatchSaleInvoiceNow(saleId) {
    const key = `SALE_${saleId}`;
    if (this.activeTimers.has(key)) {
      const existing = this.activeTimers.get(key);
      clearTimeout(existing.timerId);
      this.activeTimers.delete(key);
    }

    const db = getDatabase();
    const sale = salesService.getSaleById(saleId);
    if (!sale || sale.status !== 'ACTIVE') {
      db.prepare(`
        UPDATE scheduled_invoice_dispatches
        SET status = 'CANCELLED', last_error = 'Sale is inactive or deleted', updated_at = CURRENT_TIMESTAMP
        WHERE reference_type = 'SALE' AND reference_id = ? AND status = 'PENDING'
      `).run(saleId);
      return { success: false, reason: 'Sale is inactive or not found' };
    }

    const recipientMobile = sale.customer_mobile || sale.customer_registered_mobile;
    if (!recipientMobile || recipientMobile.replace(/\D/g, '').length < 10) {
      db.prepare(`
        UPDATE scheduled_invoice_dispatches
        SET status = 'CANCELLED', last_error = 'No valid recipient phone number provided', updated_at = CURRENT_TIMESTAMP
        WHERE reference_type = 'SALE' AND reference_id = ? AND status = 'PENDING'
      `).run(saleId);
      console.log(`⚠️ Auto WhatsApp for Bill #${sale.invoice_no} skipped: No valid phone number (${recipientMobile})`);
      return { success: false, reason: 'No phone number' };
    }

    if (!whatsappGatewayService.isConnected) {
      db.prepare(`
        UPDATE scheduled_invoice_dispatches
        SET status = 'FAILED', last_error = 'WhatsApp Gateway offline', attempts = attempts + 1, updated_at = CURRENT_TIMESTAMP
        WHERE reference_type = 'SALE' AND reference_id = ? AND status = 'PENDING'
      `).run(saleId);
      console.log(`⚠️ Auto WhatsApp for Bill #${sale.invoice_no} postponed: Gateway is offline.`);
      return { success: false, reason: 'Gateway offline' };
    }

    try {
      const settings = settingsService.getSettings();
      const messageText = whatsappService.generateSaleInvoiceMessage(sale, settings);

      await whatsappGatewayService.sendMessage({
        toMobile: recipientMobile,
        messageText
      });

      db.prepare(`
        UPDATE scheduled_invoice_dispatches
        SET status = 'SENT', sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE reference_type = 'SALE' AND reference_id = ? AND status = 'PENDING'
      `).run(saleId);

      db.prepare(`
        INSERT INTO audit_logs (username, action, module, record_id, notes)
        VALUES ('System Auto-Dispatch', 'WHATSAPP_SEND', 'SALES', ?, ?)
      `).run(String(saleId), `Auto-dispatched WhatsApp bill #${sale.invoice_no} to ${sale.customer_name} (${recipientMobile}) after 5-min buffer`);

      console.log(`✅ [AUTO-DISPATCH SUCCESS] WhatsApp Bill #${sale.invoice_no} delivered to ${sale.customer_name} (${recipientMobile})`);
      return { success: true, delivered_to: recipientMobile };
    } catch (err) {
      console.error(`❌ [AUTO-DISPATCH FAILED] Bill #${sale.invoice_no}:`, err.message);
      db.prepare(`
        UPDATE scheduled_invoice_dispatches
        SET status = 'FAILED', last_error = ?, attempts = attempts + 1, updated_at = CURRENT_TIMESTAMP
        WHERE reference_type = 'SALE' AND reference_id = ? AND status = 'PENDING'
      `).run(err.message, saleId);
      return { success: false, error: err.message };
    }
  }

  // Execute immediate WhatsApp dispatch for a Sale Return
  async dispatchSaleReturnNow(returnId) {
    const key = `SALES_RETURN_${returnId}`;
    if (this.activeTimers.has(key)) {
      const existing = this.activeTimers.get(key);
      clearTimeout(existing.timerId);
      this.activeTimers.delete(key);
    }

    const db = getDatabase();
    const ret = db.prepare('SELECT * FROM sales_returns WHERE id = ?').get(returnId);
    if (!ret || ret.status !== 'ACTIVE') return { success: false };

    const sale = salesService.getSaleById(ret.sale_id);
    const recipientMobile = sale?.customer_mobile || sale?.customer_registered_mobile;
    if (!recipientMobile || recipientMobile.replace(/\D/g, '').length < 10) return { success: false };

    if (!whatsappGatewayService.isConnected) return { success: false, reason: 'Gateway offline' };

    try {
      const settings = settingsService.getSettings();
      const returnItems = db.prepare('SELECT * FROM sales_return_items WHERE return_id = ?').all(returnId);
      const messageText = whatsappService.generateSaleReturnMessage(ret, sale, returnItems, settings);

      await whatsappGatewayService.sendMessage({
        toMobile: recipientMobile,
        messageText
      });

      db.prepare(`
        UPDATE scheduled_invoice_dispatches
        SET status = 'SENT', sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE reference_type = 'SALES_RETURN' AND reference_id = ? AND status = 'PENDING'
      `).run(returnId);

      return { success: true, delivered_to: recipientMobile };
    } catch (err) {
      console.error(`❌ [AUTO-DISPATCH FAILED] Return #${ret.return_no}:`, err.message);
      return { success: false, error: err.message };
    }
  }

  // Get active pending dispatches list for UI countdown indicators
  getPendingDispatches() {
    const list = [];
    const now = Date.now();
    for (const [key, val] of this.activeTimers.entries()) {
      const targetTime = new Date(val.scheduledAt).getTime();
      const remainingSecs = Math.max(0, Math.round((targetTime - now) / 1000));
      list.push({
        key,
        reference_type: val.referenceType,
        reference_id: val.referenceId,
        invoice_no: val.invoiceNo,
        customer_name: val.customerName,
        recipient_mobile: val.recipientMobile,
        scheduled_at: val.scheduledAt,
        remaining_seconds: remainingSecs
      });
    }
    return list;
  }
}

export const autoInvoiceDispatchService = new AutoInvoiceDispatchService();
