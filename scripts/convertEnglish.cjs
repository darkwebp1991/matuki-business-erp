const fs = require('fs');

// 1. AdvanceOrderModal.tsx
let advContent = fs.readFileSync('src/components/orders/AdvanceOrderModal.tsx', 'utf8');

const advReplacements = [
  ["setError('કૃપા કરીને ઓછામાં ઓછી ૧ મીઠાઈ અથવા આઈટમ ઉમેરો (Please add at least 1 item)');", "setError('Please add at least 1 sweet or item to the order');"],
  ["setError('કૃપા કરીને કેટરર / ગ્રાહકનું નામ દાખલ કરો (Please provide caterer name)');", "setError('Please provide customer or caterer name');"],
  ["{order?.id ? `Edit Advance Order #${order.order_no}` : 'Book Advance Caterer Order (એડવાન્સ ઓર્ડર બુકિંગ)'}", "{order?.id ? `Edit Advance Order #${order.order_no}` : 'Book Advance Caterer Order'}"],
  ["<Sun size={13} /> 🌅 સવાર (Morning)", "<Sun size={13} /> 🌅 Morning (8:00 AM)"],
  ["<Moon size={13} /> 🌇 સાંજ (Evening)", "<Moon size={13} /> 🌇 Evening (5:00 PM)"],
  ["🕒 આખો દિવસ (All Day)", "🕒 All Day"],
  ["<span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#475569' }}>સ્ટેટસ:</span>", "<span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#475569' }}>Status:</span>"],
  ['<option value="PENDING">🕒 PENDING (બુક થયેલ)</option>', '<option value="PENDING">🕒 PENDING</option>'],
  ['<option value="IN_PRODUCTION">🥣 IN PROD (બનાવટ ચાલુ)</option>', '<option value="IN_PRODUCTION">🥣 IN PROD</option>'],
  ['<option value="READY">✅ READY (પેકિંગ તૈયાર)</option>', '<option value="READY">✅ READY</option>'],
  ['<option value="DISPATCHED">🚚 DISPATCHED (રવાના)</option>', '<option value="DISPATCHED">🚚 DISPATCHED</option>'],
  ["Select Caterer / Party * (કેટરર્સ ગ્રાહક પસંદ કરો)", "Select Caterer / Party *"],
  ['placeholder="e.g. Paresh Caterers / લગ્ન પાર્ટી"', 'placeholder="e.g. Paresh Caterers / Wedding Party"'],
  ["📅 Delivery Date (તારીખ) *", "📅 Delivery Date *"],
  ["⏰ Delivery Time (સમય) *", "⏰ Delivery Time *"],
  ["<span><MapPin size={12} style={{ verticalAlign: 'middle' }} /> Delivery Venue / Area (સ્થળ)</span>", "<span><MapPin size={12} style={{ verticalAlign: 'middle' }} /> Delivery Venue / Area</span>"],
  ["💰 Advance Paid (મળેલ એડવાન્સ રકમ)", "💰 Advance Paid (₹)"],
  ["<th style={{ minWidth: '300px', padding: '8px 10px' }}>SWEET / ITEM NAME (મીઠાઈનું નામ)</th>", "<th style={{ minWidth: '300px', padding: '8px 10px' }}>SWEET / ITEM NAME</th>"],
  ["<th style={{ width: '100px', textAlign: 'center', padding: '8px 6px' }}>QTY (જથ્થો)</th>", "<th style={{ width: '100px', textAlign: 'center', padding: '8px 6px' }}>QTY</th>"],
  ["<th style={{ width: '120px', textAlign: 'right', padding: '8px 8px' }}>RATE (ભાવ ₹)</th>", "<th style={{ width: '120px', textAlign: 'right', padding: '8px 8px' }}>RATE (₹)</th>"],
  ['<option value="NONE">None (સામાન્ય)</option>', '<option value="NONE">None</option>'],
  ['<option value="Milton">Milton (મિલ્ટન કેન)</option>', '<option value="Milton">Milton (Can)</option>'],
  ['<option value="Choki">Choki (ચોકી / ટ્રે)</option>', '<option value="Choki">Choki (Tray)</option>'],
  ['<option value="Dol">Dol (ડોલ / ડબ્બો)</option>', '<option value="Dol">Bucket (Dol)</option>'],
  ['<option value="Carat">Carat (કેરેટ)</option>', '<option value="Carat">Crate (Carat)</option>'],
  ['<option value="Steel Dabba">Steel Dabba (ડબ્બો)</option>', '<option value="Steel Dabba">Steel Dabba</option>'],
  ['<option value="Petharo">Petharo (પેથારો)</option>', '<option value="Petharo">Petharo (Box)</option>'],
  ['<option value="Plastic Tub">Plastic Tub (ટબ)</option>', '<option value="Plastic Tub">Plastic Tub</option>'],
  ['<option value="Other">Other (અન્ય)</option>', '<option value="Other">Other</option>'],
  ["<Plus size={14} /> + Add Row (નવી આઈટમ ઉમેરો)", "<Plus size={14} /> + Add Item"],
  ["🥣 કુલ વાસણ પેકિંગ:", "🥣 Utensil Packing:"],
  ["કુલ આઈટમ્સ:", "Total Items:"],
  ["કુલ વજન:", "Total Weight:"],
  ["માલ રકમ:", "Items Total:"],
  ["ડિલિવરી:", "Delivery:"],
  ["મળેલ એડવાન્સ:", "Advance Paid:"],
  ["કુલ ઓર્ડર રકમ (Grand Total)", "Grand Total"],
  ["{saving ? 'સેવ થઈ રહ્યું છે...' : (order?.id ? 'Update Order (Ctrl+S)' : 'Save Advance Order (Ctrl+S)')}", "{saving ? 'Saving...' : (order?.id ? 'Update Order (Ctrl+S)' : 'Save Advance Order (Ctrl+S)')}"],
  ["તમે ઓર્ડરમાં વિગતો ભરેલી છે. શું તમે ખરેખર સેવ કર્યા વગર બંધ કરવા માંગો છો?", "You have filled details in the order. Are you sure you want to discard without saving?"],
  ["ના, પાછા જાઓ", "No, Keep Editing"],
  ["હા, બંધ કરો (Discard)", "Yes, Discard"],
  ["કેટરર્સ એડવાન્સ ઓર્ડર સફળતાપૂર્વક નોંધાઈ ગયો છે.", "Caterer advance order has been recorded successfully."],
  ["<span style={{ color: '#64748b' }}>કેટરર / ગ્રાહક:</span>", "<span style={{ color: '#64748b' }}>Customer / Caterer:</span>"],
  ["<span style={{ color: '#64748b' }}>ડિલિવરી તારીખ & સમય:</span>", "<span style={{ color: '#64748b' }}>Delivery Date & Time:</span>"],
  ["? '🌅 સવાર' : '🌇 સાંજ'", "? '🌅 Morning' : '🌇 Evening'"],
  ["<span style={{ color: '#64748b' }}>ડિલિવરી સ્થળ:</span>", "<span style={{ color: '#64748b' }}>Delivery Venue:</span>"],
  ["<span style={{ color: '#64748b' }}>કુલ મીઠાઈ જથ્થો:</span>", "<span style={{ color: '#64748b' }}>Total Sweets Weight:</span>"],
  ["આઈટમ્સ •", "Items •"],
  ["<span style={{ fontWeight: 800, color: '#334155' }}>કુલ રકમ (Grand Total):</span>", "<span style={{ fontWeight: 800, color: '#334155' }}>Grand Total:</span>"],
  ["<span>મળેલ એડવાન્સ રકમ:</span>", "<span>Advance Received:</span>"],
  ["<ChefHat size={18} /> 🖨️ રસોઈયા ઉત્પાદન પત્રક પ્રિન્ટ (Print Chef Sheet)", "<ChefHat size={18} /> 🖨️ Print Chef Sheet (Hindi)"],
  ["+ બીજો ઓર્ડર બુક કરો (Book Another)", "+ Book Another Order"],
  ["✅ ડેશબોર્ડ પર જુઓ (Done)", "✅ Done / Close"]
];

advReplacements.forEach(([from, to]) => {
  advContent = advContent.split(from).join(to);
});

fs.writeFileSync('src/components/orders/AdvanceOrderModal.tsx', advContent, 'utf8');
console.log('AdvanceOrderModal.tsx updated to English.');
