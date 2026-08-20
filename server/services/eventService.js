// Real-Time Server-Sent Events (SSE) Broadcaster for Live Multi-PC Sync
const clients = new Set();

export const eventService = {
  addClient(res) {
    clients.add(res);
  },

  removeClient(res) {
    clients.delete(res);
  },

  broadcast(type = 'DATA_CHANGED', payload = {}) {
    const message = `data: ${JSON.stringify({ type, payload, timestamp: Date.now() })}\n\n`;
    for (const client of clients) {
      try {
        client.write(message);
      } catch (e) {
        clients.delete(client);
      }
    }
  },

  emit(event = { type: 'DATA_CHANGED' }) {
    const payload = typeof event === 'object' ? event : { type: event };
    const message = `data: ${JSON.stringify({ ...payload, timestamp: Date.now() })}\n\n`;
    for (const client of clients) {
      try {
        client.write(message);
      } catch (e) {
        clients.delete(client);
      }
    }
  },

  getClientCount() {
    return clients.size;
  }
};
