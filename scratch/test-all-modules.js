const BASE_URL = 'http://localhost:4321/api';

async function testAllModules() {
  console.log('================================================================');
  console.log('🧪 MATUKI BUSINESS ERP — FULL COMPREHENSIVE MODULE HEALTH CHECK');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  async function check(name, fn) {
    try {
      process.stdout.write(`⏳ Checking: ${name}... `);
      await fn();
      console.log('✅ OK');
      passed++;
    } catch (err) {
      console.log(`❌ FAILED: ${err.message}`);
      failed++;
    }
  }

  // 1. Settings & Numbering Series
  await check('1. Settings & Next Document Numbers (8 Series)', async () => {
    const types = ['SALE', 'SALE_RETURN', 'PAYMENT_IN', 'PAYMENT_OUT', 'EXPENSE', 'PURCHASE', 'PURCHASE_RETURN', 'ADVANCE_ORDER'];
    for (const t of types) {
      const res = await fetch(`${BASE_URL}/settings/next-number/${t}`).then(r => r.json());
      if (!res.success || !res.data.number) {
        throw new Error(`Failed to generate sequence for ${t}: ${JSON.stringify(res)}`);
      }
    }
  });

  // 2. Customers & Suppliers
  let testCustomerId = null;
  let testSupplierId = null;
  await check('2. Customer & Supplier Masters', async () => {
    const custs = await fetch(`${BASE_URL}/customers`).then(r => r.json());
    if (!custs.success || !custs.data.length) throw new Error('Failed to fetch customers');
    testCustomerId = custs.data[0].id;

    const supps = await fetch(`${BASE_URL}/suppliers`).then(r => r.json());
    if (!supps.success || !supps.data.length) throw new Error('Failed to fetch suppliers');
    testSupplierId = supps.data[0].id;
  });

  // 3. Party-Wise Last Billed Item Rates
  await check('3. Party-Wise Last Billed Item Rates Memory', async () => {
    const res = await fetch(`${BASE_URL}/customers/${testCustomerId}/last-rates`).then(r => r.json());
    if (!res.success || typeof res.data !== 'object') throw new Error('Failed to fetch customer last rates');
  });

  // 4. Products & Raw Materials
  let testProductId = null;
  let testRmId = null;
  await check('4. Products & Raw Materials Inventory', async () => {
    const prods = await fetch(`${BASE_URL}/products`).then(r => r.json());
    if (!prods.success || !prods.data.length) throw new Error('Failed to fetch products');
    testProductId = prods.data[0].id;

    const rms = await fetch(`${BASE_URL}/raw-materials`).then(r => r.json());
    if (!rms.success || !rms.data.length) throw new Error('Failed to fetch raw materials');
    testRmId = rms.data[0].id;
  });

  // 5. Sales Invoice Lifecycle (Create, Detail, Clean Delete)
  let testSaleId = null;
  await check('5. Sales Invoice Creation & Numbering', async () => {
    const nextSaleNo = await fetch(`${BASE_URL}/settings/next-number/SALE`).then(r => r.json());
    const salePayload = {
      date: new Date().toISOString().split('T')[0],
      customer_id: testCustomerId,
      customer_name: 'Health Check Customer',
      customer_mobile: '9898989898',
      delivery_venue: 'Matuki Testing Hall',
      delivery_charge: 50,
      rickshaw_rent: 150,
      payment_mode: 'CREDIT',
      paid_amount: 0,
      items: [
        {
          product_id: testProductId,
          product_name: 'Test Kaju Sweet',
          quantity: 5,
          rate: 500,
          unit: 'KG',
          vasan_type: 'Dol',
          vasan_qty: 1,
          amount: 2500
        }
      ],
      grand_total: 2550
    };
    const res = await fetch(`${BASE_URL}/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(salePayload)
    }).then(r => r.json());

    if (!res.success || !res.data?.id) throw new Error(`Sale creation failed: ${JSON.stringify(res)}`);
    testSaleId = res.data.id;
  });

  // 6. Payment In (Customer Receipt with Voucher Number)
  let testPaymentInId = null;
  await check('6. Payment In (Customer Receipt)', async () => {
    const nextPayIn = await fetch(`${BASE_URL}/settings/next-number/PAYMENT_IN`).then(r => r.json());
    const payPayload = {
      payment_no: nextPayIn.data.number,
      payment_date: new Date().toISOString().split('T')[0],
      party_type: 'CUSTOMER',
      party_id: testCustomerId,
      party_name: 'Health Check Customer',
      amount: 1000,
      payment_mode: 'CASH',
      reference_no: 'Test Receipt Ref',
      notes: 'Automated test receipt'
    };
    const res = await fetch(`${BASE_URL}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payPayload)
    }).then(r => r.json());

    if (!res.success || !res.data?.id) throw new Error(`Payment In failed: ${JSON.stringify(res)}`);
    testPaymentInId = res.data.id;
  });

  // 7. Payment Out (Supplier Voucher with Physical Voucher Book No)
  let testPaymentOutId = null;
  await check('7. Payment Out (Supplier Voucher / Voucher Book)', async () => {
    const nextPayOut = await fetch(`${BASE_URL}/settings/next-number/PAYMENT_OUT`).then(r => r.json());
    const payPayload = {
      payment_no: nextPayOut.data.number,
      payment_date: new Date().toISOString().split('T')[0],
      party_type: 'SUPPLIER',
      party_id: testSupplierId,
      party_name: 'Health Check Supplier',
      amount: 2500,
      payment_mode: 'CASH',
      reference_no: 'Voucher Book #705',
      notes: 'Automated test supplier payment'
    };
    const res = await fetch(`${BASE_URL}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payPayload)
    }).then(r => r.json());

    if (!res.success || !res.data?.id) throw new Error(`Payment Out failed: ${JSON.stringify(res)}`);
    testPaymentOutId = res.data.id;
  });

  // 8. Expense Voucher Creation
  let testExpenseId = null;
  await check('8. Expense Voucher Creation', async () => {
    const nextExp = await fetch(`${BASE_URL}/settings/next-number/EXPENSE`).then(r => r.json());
    const expPayload = {
      expense_no: nextExp.data.number,
      date: new Date().toISOString().split('T')[0],
      category: 'Commercial Gas',
      amount: 1800,
      payment_mode: 'CASH',
      reference_no: 'Gas Bill #4412',
      notes: 'Automated test commercial gas expense'
    };
    const res = await fetch(`${BASE_URL}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expPayload)
    }).then(r => r.json());

    if (!res.success || !res.data?.id) throw new Error(`Expense failed: ${JSON.stringify(res)}`);
    testExpenseId = res.data.id;
  });

  // 9. Purchases & Raw Material Inward
  let testPurchaseId = null;
  await check('9. Purchase Order / RM Inward', async () => {
    const nextPo = await fetch(`${BASE_URL}/settings/next-number/PURCHASE`).then(r => r.json());
    const poPayload = {
      purchase_no: nextPo.data.number,
      date: new Date().toISOString().split('T')[0],
      supplier_id: testSupplierId,
      supplier_name: 'Health Check Supplier',
      payment_mode: 'CREDIT',
      paid_amount: 0,
      items: [
        {
          raw_material_id: testRmId,
          item_name: 'Pure Mawa / Khoya',
          quantity: 20,
          rate: 260,
          unit: 'KG',
          amount: 5200
        }
      ],
      total_amount: 5200,
      grand_total: 5200
    };
    const res = await fetch(`${BASE_URL}/purchases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(poPayload)
    }).then(r => r.json());

    if (!res.success || !res.data?.id) throw new Error(`Purchase failed: ${JSON.stringify(res)}`);
    testPurchaseId = res.data.id;
  });

  // 10. Advance Orders Booking & Planning
  let testOrderId = null;
  await check('10. Advance Order Booking', async () => {
    const nextOrd = await fetch(`${BASE_URL}/settings/next-number/ADVANCE_ORDER`).then(r => r.json());
    const ordPayload = {
      order_no: nextOrd.data.number,
      order_date: new Date().toISOString().split('T')[0],
      delivery_date: new Date().toISOString().split('T')[0],
      delivery_time_slot: 'MORNING_1',
      customer_id: testCustomerId,
      customer_name: 'Health Check Customer',
      customer_mobile: '9898989898',
      delivery_venue: 'Patel Wadi, Rajkot',
      total_estimated_amount: 3000,
      advance_deposit_amount: 500,
      deposit_payment_mode: 'CASH',
      items: [
        {
          product_id: testProductId,
          item_name: 'Gulab Jamun (Live Catering)',
          quantity: 10,
          rate: 300,
          unit: 'KG',
          notes: 'Fresh hot delivery'
        }
      ]
    };
    const res = await fetch(`${BASE_URL}/advance-orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ordPayload)
    }).then(r => r.json());

    if (!res.success || !res.data?.id) throw new Error(`Advance order failed: ${JSON.stringify(res)}`);
    testOrderId = res.data.id;
  });

  // 11. Vasan & Container Ledger
  await check('11. Vasan & Container Tracking', async () => {
    const vasanRes = await fetch(`${BASE_URL}/reports/vasan-tracker`).then(r => r.json());
    if (!vasanRes.success) throw new Error(`Failed to fetch vasan tracker: ${JSON.stringify(vasanRes)}`);

    const yadiRes = await fetch(`${BASE_URL}/reports/vasan-yadi`).then(r => r.json());
    if (!yadiRes.success) throw new Error(`Failed to fetch vasan yadi: ${JSON.stringify(yadiRes)}`);
  });

  // 12. Rickshaw Dispatch & Delivery Rent
  await check('12. Rickshaw Drivers & Area Rates', async () => {
    const drvs = await fetch(`${BASE_URL}/drivers`).then(r => r.json());
    if (!drvs.success) throw new Error('Failed to fetch drivers');

    const areas = await fetch(`${BASE_URL}/area-rates`).then(r => r.json());
    if (!areas.success) throw new Error('Failed to fetch area rates');

    const venues = await fetch(`${BASE_URL}/delivery-locations`).then(r => r.json());
    if (!venues.success) throw new Error('Failed to fetch delivery venues');

    const trips = await fetch(`${BASE_URL}/reports/driver-trips`).then(r => r.json());
    if (!trips.success) throw new Error('Failed to fetch driver trips');
  });

  // 13. Rojmel / Daily Cash-Book Analytics
  await check('13. Daily Rojmel / Cash-Book Total Engine', async () => {
    const today = new Date().toISOString().split('T')[0];
    const rojmel = await fetch(`${BASE_URL}/reports/rojmel?startDate=${today}&endDate=${today}`).then(r => r.json());
    if (!rojmel.success) throw new Error(`Rojmel query failed: ${JSON.stringify(rojmel)}`);
  });

  // 14. Recipes, BOM & Production Costing
  await check('14. Sweet Recipes & Costing Engine', async () => {
    const recipes = await fetch(`${BASE_URL}/recipes`).then(r => r.json());
    if (!recipes.success) throw new Error('Failed to fetch recipes');
  });

  // 15. Manufacturing Batches
  await check('15. Manufacturing Orders & Batches', async () => {
    const mfg = await fetch(`${BASE_URL}/manufacturing`).then(r => r.json());
    if (!mfg.success) throw new Error('Failed to fetch manufacturing batches');
  });

  // 16. Financial Reports & Profitability
  await check('16. Profit & Loss, Balance Sheet & Reports', async () => {
    const pnl = await fetch(`${BASE_URL}/reports/google-sheet-pnl`).then(r => r.json());
    if (!pnl.success) throw new Error('Failed to fetch profit loss');

    const dbMetrics = await fetch(`${BASE_URL}/reports/dashboard`).then(r => r.json());
    if (!dbMetrics.success) throw new Error('Failed to fetch dashboard metrics');

    const bs = await fetch(`${BASE_URL}/reports/balance-sheet`).then(r => r.json());
    if (!bs.success) throw new Error('Failed to fetch balance sheet');
  });

  // 17. Clean Sale Deletion with 0 Trace
  await check('17. Permanent Sale Deletion (0 Trace Purge)', async () => {
    if (!testSaleId) throw new Error('No test sale ID available');
    const delRes = await fetch(`${BASE_URL}/sales/${testSaleId}`, { method: 'DELETE' }).then(r => r.json());
    if (!delRes.success) throw new Error(`Sale permanent deletion failed: ${JSON.stringify(delRes)}`);
  });

  console.log('\n================================================================');
  console.log(`📊 ALL MODULE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

testAllModules().catch(err => {
  console.error('Fatal Test Error:', err);
  process.exit(1);
});
