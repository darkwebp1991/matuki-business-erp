import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import pino from 'pino';
import qrcode from 'qrcode';

// Dynamic import helpers for Baileys
let baileysModule = null;
async function getBaileys() {
  if (!baileysModule) {
    const mod = await import('@whiskeysockets/baileys');
    baileysModule = mod.default || mod;
  }
  return baileysModule;
}

function getSessionDir() {
  if (process.env.MATUKI_WA_SESSION) {
    return process.env.MATUKI_WA_SESSION;
  }

  // Check local ./wa_session in current working directory first (portable mode)
  const localSession = path.join(process.cwd(), 'wa_session');
  if (fs.existsSync(localSession)) {
    return localSession;
  }

  const APPDATA_DIR = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  const sessionDir = path.join(APPDATA_DIR, 'Matuki Business ERP', 'wa_session');
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }
  return sessionDir;
}

const SESSION_DIR = getSessionDir();

class WhatsAppGatewayService {
  constructor() {
    this.sock = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.qrCodeDataUrl = null;
    this.qrGeneratedAt = null;
    this.user = null;
    this.lastError = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
  }

  // Check if session files already exist
  hasExistingSession() {
    try {
      if (!fs.existsSync(SESSION_DIR)) return false;
      const files = fs.readdirSync(SESSION_DIR);
      return files.some(f => f.startsWith('creds.json'));
    } catch {
      return false;
    }
  }

  // Get current connection and pairing status
  getStatus() {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      phone: this.user?.phone || null,
      name: this.user?.name || null,
      qrCode: this.qrCodeDataUrl,
      qrGeneratedAt: this.qrGeneratedAt,
      lastError: this.lastError
    };
  }

  // Initialize socket and connect
  async connect(forceNew = false) {
    if (this.isConnected && this.sock && !forceNew) {
      return this.getStatus();
    }

    try {
      this.isConnecting = true;
      this.lastError = null;

      if (forceNew) {
        await this.logout();
      }

      const baileys = await getBaileys();
      const makeWASocket = baileys.default || baileys.makeWASocket;
      const {
        useMultiFileAuthState,
        makeCacheableSignalKeyStore,
        fetchLatestBaileysVersion,
        DisconnectReason,
        Browsers
      } = baileys;

      // Fetch the exact current WA Web version
      let version = [2, 3000, 1043857760];
      try {
        const vInfo = await fetchLatestBaileysVersion();
        if (vInfo?.version) version = vInfo.version;
      } catch (vErr) {
        console.warn('Could not fetch latest WA version, using fallback:', vErr.message);
      }

      const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

      const socketConfig = {
        version,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
        },
        logger: pino({ level: 'silent' }),
        browser: Browsers.macOS('Desktop'),
        syncFullHistory: false,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 25000,
        emitOwnEvents: false,
        generateHighQualityLinkPreview: false
      };

      this.sock = makeWASocket(socketConfig);

      // Save credentials whenever updated
      this.sock.ev.on('creds.update', saveCreds);

      // Handle Connection Updates (QR Code & Status)
      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            this.qrCodeDataUrl = await qrcode.toDataURL(qr, {
              width: 300,
              margin: 2,
              color: {
                dark: '#0f172a',
                light: '#ffffff'
              }
            });
            this.qrGeneratedAt = Date.now();
            this.isConnecting = false;
            console.log('⚡ WhatsApp Web pairing QR code generated and ready to scan!');
          } catch (qrErr) {
            console.error('Error generating QR data URL:', qrErr);
          }
        }

        if (connection === 'open') {
          this.isConnected = true;
          this.isConnecting = false;
          this.qrCodeDataUrl = null;
          this.qrGeneratedAt = null;
          this.lastError = null;
          this.reconnectAttempts = 0;

          const rawId = this.sock.user?.id || '';
          const cleanPhone = rawId.split(':')[0] || rawId.split('@')[0] || '';
          this.user = {
            phone: cleanPhone.length > 0 ? `+${cleanPhone}` : 'Connected',
            name: this.sock.user?.name || this.sock.user?.notify || 'MATUKI SWEETS'
          };
          console.log(`✅ WhatsApp Gateway CONNECTED as ${this.user.name} (${this.user.phone})`);
        }

        if (connection === 'close') {
          this.isConnected = false;
          this.isConnecting = false;

          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          console.log(`⚠️ WhatsApp Gateway connection closed. Status: ${statusCode}. Should reconnect: ${shouldReconnect}`);

          if (statusCode === DisconnectReason.loggedOut) {
            this.logout();
          } else if (shouldReconnect) {
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
              this.reconnectAttempts++;
              const delay = Math.min(this.reconnectAttempts * 2500, 15000);
              console.log(`Reconnecting WhatsApp in ${delay}ms (attempt ${this.reconnectAttempts})...`);
              setTimeout(() => this.connect(), delay);
            }
          }
        }
      });

      return this.getStatus();
    } catch (err) {
      this.isConnecting = false;
      this.isConnected = false;
      this.lastError = err.message;
      console.error('WhatsApp Gateway connection error:', err);
      throw err;
    }
  }

  // Format mobile phone number into WhatsApp JID
  formatJid(mobile) {
    if (!mobile) throw new Error('Customer mobile number is required');
    let clean = String(mobile).replace(/\D/g, '');
    if (clean.startsWith('0')) clean = clean.substring(1);
    if (clean.length === 10) clean = `91${clean}`;
    if (!clean.endsWith('@s.whatsapp.net')) {
      clean = `${clean}@s.whatsapp.net`;
    }
    return clean;
  }

  // Send single text message or media message
  async sendMessage({ toMobile, messageText, mediaFilePath = null, imageBase64 = null, mediaBuffer = null, mediaType = 'image' }) {
    if (!this.isConnected || !this.sock) {
      throw new Error('WhatsApp Gateway is not connected. Please scan the QR code in settings to link your WhatsApp account.');
    }

    const jid = this.formatJid(toMobile);

    // If direct image base64 provided (e.g. from html2canvas snapshot)
    if (imageBase64) {
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const buf = Buffer.from(base64Data, 'base64');
      return await this.sock.sendMessage(jid, {
        image: buf,
        caption: messageText || ''
      });
    }

    // If direct buffer provided
    if (mediaBuffer) {
      const buf = Buffer.isBuffer(mediaBuffer) ? mediaBuffer : Buffer.from(mediaBuffer);
      if (mediaType === 'image') {
        return await this.sock.sendMessage(jid, {
          image: buf,
          caption: messageText || ''
        });
      } else if (mediaType === 'document') {
        return await this.sock.sendMessage(jid, {
          document: buf,
          mimetype: 'application/pdf',
          fileName: 'Daybook_Snapshot.pdf',
          caption: messageText || ''
        });
      }
    }

    // If media file path provided (e.g. PhonePe QR or Bill Image)
    if (mediaFilePath) {
      let resolvedPath = mediaFilePath;
      if (!path.isAbsolute(resolvedPath)) {
        resolvedPath = path.join(process.cwd(), resolvedPath.startsWith('/') ? resolvedPath.slice(1) : resolvedPath);
      }

      if (!fs.existsSync(resolvedPath)) {
        // Fallback to public folder
        resolvedPath = path.join(process.cwd(), 'public', path.basename(mediaFilePath));
      }

      if (fs.existsSync(resolvedPath)) {
        const fileBuffer = fs.readFileSync(resolvedPath);

        if (mediaType === 'image') {
          return await this.sock.sendMessage(jid, {
            image: fileBuffer,
            caption: messageText || ''
          });
        } else if (mediaType === 'document') {
          return await this.sock.sendMessage(jid, {
            document: fileBuffer,
            mimetype: 'application/pdf',
            fileName: path.basename(resolvedPath),
            caption: messageText || ''
          });
        }
      }
    }

    // Default plain text message
    return await this.sock.sendMessage(jid, {
      text: messageText || ''
    });
  }

  // Send batch messages with controlled delay to prevent rate-limiting
  async sendBatchMessages({ list, delayMs = 2500 }) {
    if (!this.isConnected || !this.sock) {
      throw new Error('WhatsApp Gateway is not connected.');
    }

    const results = [];
    let sentCount = 0;
    let failCount = 0;

    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      try {
        await this.sendMessage(item);
        results.push({ id: item.id || i, mobile: item.toMobile, status: 'SENT' });
        sentCount++;
      } catch (err) {
        results.push({ id: item.id || i, mobile: item.toMobile, status: 'FAILED', error: err.message });
        failCount++;
      }

      // Delay between messages
      if (i < list.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return {
      total: list.length,
      sent: sentCount,
      failed: failCount,
      results
    };
  }

  // Disconnect & log out
  async logout() {
    try {
      if (this.sock) {
        await this.sock.logout().catch(() => {});
        this.sock = null;
      }
    } catch {}

    this.isConnected = false;
    this.isConnecting = false;
    this.qrCodeDataUrl = null;
    this.qrGeneratedAt = null;
    this.user = null;

    try {
      if (fs.existsSync(SESSION_DIR)) {
        fs.rmSync(SESSION_DIR, { recursive: true, force: true });
        fs.mkdirSync(SESSION_DIR, { recursive: true });
      }
    } catch (err) {
      console.warn('Error clearing session dir:', err);
    }

    console.log('🔒 WhatsApp Gateway disconnected and logged out.');
    return { success: true };
  }

  // Disconnect without removing session files
  async disconnect() {
    try {
      if (this.sock) {
        this.sock.end(undefined);
        this.sock = null;
      }
    } catch {}

    this.isConnected = false;
    this.isConnecting = false;
    this.qrCodeDataUrl = null;
    return { success: true };
  }
}

export const whatsappGatewayService = new WhatsAppGatewayService();

// Auto-start connection on server boot if existing session is present
if (whatsappGatewayService.hasExistingSession()) {
  console.log('🔄 Found existing WhatsApp session. Auto-connecting...');
  whatsappGatewayService.connect().catch(err => {
    console.log('Initial WhatsApp auto-connect notice:', err.message);
  });
}
