import { getDatabase } from '../server/database/connection.js';

const db = getDatabase();
try {
  db.exec("ALTER TABLE sales ADD COLUMN trip_type TEXT DEFAULT 'ROUND_TRIP';");
  console.log('Added trip_type column to sales');
} catch (e) {
  console.log('sales:', e.message);
}

try {
  db.exec("ALTER TABLE advance_orders ADD COLUMN trip_type TEXT DEFAULT 'ROUND_TRIP';");
  console.log('Added trip_type column to advance_orders');
} catch (e) {
  console.log('advance_orders:', e.message);
}

console.log('Schema migration complete.');
