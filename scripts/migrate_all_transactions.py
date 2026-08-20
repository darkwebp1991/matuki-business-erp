import sqlite3
import os
import sys
import time

vyapar_db_path = r"F:\Matuki Business ERP\scratch\extracted_vyapar\9099093394__t_2025_11_11_10_23_46_4f49_1763203953451.vyp"
matuki_db_path = r"F:\Matuki Business ERP\data\matuki.db"

print("======================================================================")
print("   MATUKI BUSINESS ERP -- IMPORTING ALL PAST SALES & PURCHASES")
print("======================================================================")

v_conn = sqlite3.connect(vyapar_db_path)
v_cur = v_conn.cursor()

m_conn = sqlite3.connect(matuki_db_path)
m_cur = m_conn.cursor()

# ----------------------------------------------------------------------
# 1. LOAD MAPS
# ----------------------------------------------------------------------
print("[1/4] Loading customer, supplier, and item mappings...")

m_cur.execute("SELECT id, name, mobile FROM customers")
cust_rows = m_cur.fetchall()
cust_by_name = {r[1].strip().lower(): (r[0], r[1], r[2]) for r in cust_rows}

m_cur.execute("SELECT id, name, mobile FROM suppliers")
supp_rows = m_cur.fetchall()
supp_by_name = {r[1].strip().lower(): (r[0], r[1], r[2]) for r in supp_rows}

m_cur.execute("SELECT id, name, unit, selling_rate FROM products")
prod_rows = m_cur.fetchall()
prod_by_name = {r[1].strip().lower(): (r[0], r[1], r[2], r[3]) for r in prod_rows}

m_cur.execute("SELECT id, name, unit, current_purchase_rate FROM raw_materials")
raw_rows = m_cur.fetchall()
raw_by_name = {r[1].strip().lower(): (r[0], r[1], r[2], r[3]) for r in raw_rows}

v_cur.execute("SELECT unit_id, unit_short_name FROM kb_item_units")
unit_map = {r[0]: (r[1] or 'KG').upper() for r in v_cur.fetchall()}

v_cur.execute("SELECT name_id, full_name, phone_number FROM kb_names")
v_party_map = {r[0]: ((r[1] or '').strip(), (r[2] or '').strip()) for r in v_cur.fetchall()}

v_cur.execute("SELECT item_id, item_name FROM kb_items")
v_item_name_map = {r[0]: (r[1] or '').strip() for r in v_cur.fetchall()}

# ----------------------------------------------------------------------
# 2. IMPORT ALL SALES (txn_type == 1)
# ----------------------------------------------------------------------
print("\n[2/4] Fetching all Sales Invoices & Line Items from Vyapar...")
v_cur.execute("""
    SELECT 
        txn_id, txn_date, txn_ref_number_char, txn_name_id, txn_display_name,
        txn_cash_amount, txn_balance_amount, txn_discount_amount, txn_tax_amount,
        txn_round_off_amount, txn_description
    FROM kb_transactions
    WHERE txn_type = 1
    ORDER BY txn_date ASC, txn_id ASC
""")
sales_txns = v_cur.fetchall()
print(f"Found {len(sales_txns)} Sales Invoices to import.")

v_cur.execute("""
    SELECT 
        lineitem_txn_id, item_id, quantity, priceperunit, total_amount,
        lineitem_discount_amount, lineitem_tax_amount, lineitem_unit_id
    FROM kb_lineitems
""")
all_lineitems = v_cur.fetchall()
lineitems_by_txn = {}
for li in all_lineitems:
    txn_id = li[0]
    if txn_id not in lineitems_by_txn:
        lineitems_by_txn[txn_id] = []
    lineitems_by_txn[txn_id].append(li)

m_cur.execute("DELETE FROM sale_items")
m_cur.execute("DELETE FROM sales")

sales_inserted = 0
sale_items_inserted = 0
seen_invoice_nos = set()

t_start = time.time()

for idx, s in enumerate(sales_txns):
    txn_id, txn_date, ref_no, name_id, disp_name, cash_amt, bal_amt, disc_amt, tax_amt, round_off, desc = s
    
    date_str = str(txn_date)[:10] if txn_date else '2026-08-18'
    base_inv = str(ref_no).strip() if ref_no else f"INV-{txn_id}"
    
    invoice_no = base_inv
    if invoice_no in seen_invoice_nos:
        invoice_no = f"{base_inv}/{date_str[:4]}-{txn_id}"
    seen_invoice_nos.add(invoice_no)
    
    party_name = ''
    party_phone = ''
    if name_id and name_id in v_party_map:
        party_name, party_phone = v_party_map[name_id]
    elif disp_name:
        party_name = disp_name.strip()
    
    if not party_name:
        party_name = "Walk-in Customer"
    
    cust_id = None
    if party_name.lower() in cust_by_name:
        cust_id, party_name, party_phone = cust_by_name[party_name.lower()]
    
    cash_amt = float(cash_amt or 0.0)
    bal_amt = float(bal_amt or 0.0)
    grand_total = cash_amt + bal_amt
    disc_amt = float(disc_amt or 0.0)
    tax_amt = float(tax_amt or 0.0)
    round_off = float(round_off or 0.0)
    subtotal = grand_total + disc_amt - tax_amt - round_off
    
    pay_mode = 'CASH' if bal_amt == 0 else ('PARTIAL' if cash_amt > 0 else 'CREDIT')
    
    m_cur.execute("""
        INSERT INTO sales (
            invoice_no, date, customer_id, customer_name, customer_mobile,
            subtotal, discount_amount, tax_amount, round_off, grand_total,
            paid_amount, due_amount, payment_mode, status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
    """, (
        invoice_no, date_str, cust_id, party_name, party_phone,
        subtotal, disc_amt, tax_amt, round_off, grand_total,
        cash_amt, bal_amt, pay_mode, desc or ''
    ))
    new_sale_id = m_cur.lastrowid
    sales_inserted += 1

    # Insert Line items
    if txn_id in lineitems_by_txn:
        for li in lineitems_by_txn[txn_id]:
            _, itm_id, qty, rate, amt, li_disc, li_tax, u_id = li
            itm_name = v_item_name_map.get(itm_id, 'Sweet Item')
            prod_id = None
            if itm_name.lower() in prod_by_name:
                prod_id = prod_by_name[itm_name.lower()][0]
            
            unit = unit_map.get(u_id, 'KG')
            qty = float(qty or 1.0)
            rate = float(rate or 0.0)
            amt = float(amt or (qty * rate))
            li_disc = float(li_disc or 0.0)
            li_tax = float(li_tax or 0.0)

            m_cur.execute("""
                INSERT INTO sale_items (
                    sale_id, product_id, product_name, quantity, unit,
                    rate, discount, gst_rate, gst_amount, amount
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 0.0, ?, ?)
            """, (new_sale_id, prod_id, itm_name, qty, unit, rate, li_disc, li_tax, amt))
            sale_items_inserted += 1

    if (idx + 1) % 5000 == 0:
        print(f"  Processed {idx + 1}/{len(sales_txns)} sales invoices...")

m_conn.commit()
print(f"SUCCESS: Inserted {sales_inserted} Sales Invoices and {sale_items_inserted} Line Items in {time.time() - t_start:.2f}s.")

# ----------------------------------------------------------------------
# 3. IMPORT ALL PURCHASES (txn_type == 2)
# ----------------------------------------------------------------------
print("\n[3/4] Fetching all Purchase Bills from Vyapar...")
v_cur.execute("""
    SELECT 
        txn_id, txn_date, txn_ref_number_char, txn_name_id, txn_display_name,
        txn_cash_amount, txn_balance_amount, txn_discount_amount, txn_tax_amount,
        txn_round_off_amount, txn_description
    FROM kb_transactions
    WHERE txn_type = 2
    ORDER BY txn_date ASC, txn_id ASC
""")
purchases_txns = v_cur.fetchall()
print(f"Found {len(purchases_txns)} Purchase Bills to import.")

m_cur.execute("DELETE FROM purchase_items")
m_cur.execute("DELETE FROM purchases")

purchases_inserted = 0
purchase_items_inserted = 0
seen_purchase_nos = set()
auto_supp_counter = 5000

t_start = time.time()

for idx, p in enumerate(purchases_txns):
    txn_id, txn_date, ref_no, name_id, disp_name, cash_amt, bal_amt, disc_amt, tax_amt, round_off, desc = p
    
    date_str = str(txn_date)[:10] if txn_date else '2026-08-18'
    bill_no = str(ref_no or f"PUR-{txn_id}")
    
    pur_no = f"PUR-{txn_id:05d}"
    if pur_no in seen_purchase_nos:
        pur_no = f"PUR-{txn_id:05d}-{idx}"
    seen_purchase_nos.add(pur_no)
    
    party_name = ''
    party_phone = ''
    if name_id and name_id in v_party_map:
        party_name, party_phone = v_party_map[name_id]
    elif disp_name:
        party_name = disp_name.strip()
    
    if not party_name:
        party_name = "General Supplier"
    
    supp_id = None
    if party_name.lower() in supp_by_name:
        supp_id, party_name, party_phone = supp_by_name[party_name.lower()]
    else:
        auto_supp_counter += 1
        auto_supp_no = f"SUPP-TXN-{auto_supp_counter:05d}"
        m_cur.execute("""
            INSERT INTO suppliers (supplier_no, name, mobile, opening_balance, active)
            VALUES (?, ?, ?, 0.0, 1)
        """, (auto_supp_no, party_name, party_phone))
        supp_id = m_cur.lastrowid
        supp_by_name[party_name.lower()] = (supp_id, party_name, party_phone)
    
    cash_amt = float(cash_amt or 0.0)
    bal_amt = float(bal_amt or 0.0)
    grand_total = cash_amt + bal_amt
    disc_amt = float(disc_amt or 0.0)
    tax_amt = float(tax_amt or 0.0)
    round_off = float(round_off or 0.0)
    subtotal = grand_total + disc_amt - tax_amt - round_off
    
    pay_mode = 'CASH' if bal_amt == 0 else ('PARTIAL' if cash_amt > 0 else 'CREDIT')
    
    m_cur.execute("""
        INSERT INTO purchases (
            purchase_no, date, supplier_id, supplier_name, supplier_invoice_no,
            subtotal, discount_amount, tax_amount, round_off, grand_total,
            paid_amount, due_amount, payment_mode, status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
    """, (
        pur_no, date_str, supp_id, party_name, bill_no,
        subtotal, disc_amt, tax_amt, round_off, grand_total,
        cash_amt, bal_amt, pay_mode, desc or ''
    ))
    new_pur_id = m_cur.lastrowid
    purchases_inserted += 1

    # Insert Line items
    if txn_id in lineitems_by_txn:
        for li in lineitems_by_txn[txn_id]:
            _, itm_id, qty, rate, amt, li_disc, li_tax, u_id = li
            itm_name = v_item_name_map.get(itm_id, 'Raw Material')
            raw_id = None
            if itm_name.lower() in raw_by_name:
                raw_id = raw_by_name[itm_name.lower()][0]
            
            unit = unit_map.get(u_id, 'KG')
            qty = float(qty or 1.0)
            rate = float(rate or 0.0)
            amt = float(amt or (qty * rate))
            li_disc = float(li_disc or 0.0)
            li_tax = float(li_tax or 0.0)

            m_cur.execute("""
                INSERT INTO purchase_items (
                    purchase_id, item_type, raw_material_id, item_name, quantity,
                    unit, rate, discount, gst_rate, gst_amount, amount
                ) VALUES (?, 'RAW_MATERIAL', ?, ?, ?, ?, ?, ?, 0.0, ?, ?)
            """, (new_pur_id, raw_id, itm_name, qty, unit, rate, li_disc, li_tax, amt))
            purchase_items_inserted += 1

    if (idx + 1) % 2000 == 0:
        print(f"  Processed {idx + 1}/{len(purchases_txns)} purchase bills...")

m_conn.commit()
print(f"SUCCESS: Inserted {purchases_inserted} Purchase Bills and {purchase_items_inserted} Line Items in {time.time() - t_start:.2f}s.")

# ----------------------------------------------------------------------
# 4. IMPORT ALL EXPENSES (txn_type == 7)
# ----------------------------------------------------------------------
print("\n[4/4] Fetching all Expenses from Vyapar...")
v_cur.execute("""
    SELECT 
        txn_id, txn_date, txn_ref_number_char, txn_name_id, txn_display_name,
        txn_cash_amount, txn_balance_amount, txn_description
    FROM kb_transactions
    WHERE txn_type = 7
    ORDER BY txn_date ASC, txn_id ASC
""")
expense_txns = v_cur.fetchall()
print(f"Found {len(expense_txns)} Expenses to import.")

m_cur.execute("DELETE FROM expenses")
exp_inserted = 0

for idx, exp in enumerate(expense_txns):
    txn_id, txn_date, ref_no, name_id, disp_name, cash_amt, bal_amt, desc = exp
    date_str = str(txn_date)[:10] if txn_date else '2026-08-18'
    exp_no = f"EXP-{txn_id:05d}"
    amount = float(cash_amt or 0.0) + float(bal_amt or 0.0)
    
    party_name = ''
    if name_id and name_id in v_party_map:
        party_name, _ = v_party_map[name_id]
    elif disp_name:
        party_name = disp_name.strip()
    
    category = party_name if party_name else 'General Operating Expense'
    
    m_cur.execute("""
        INSERT INTO expenses (
            expense_no, date, category, amount, payment_mode, reference_no,
            notes, supplier_name, expense_type, pl_category
        ) VALUES (?, ?, ?, ?, 'CASH', ?, ?, ?, 'INDIRECT', 'OPERATING_EXPENSE')
    """, (exp_no, date_str, category, amount, ref_no or '', desc or '', party_name))
    exp_inserted += 1

m_conn.commit()
print(f"SUCCESS: Inserted {exp_inserted} Expenses.")

m_conn.close()
v_conn.close()

print("\n======================================================================")
print("ALL VYAPAR PAST TRANSACTIONS IMPORTED CLEANLY & SUCCESSFULLY!")
print("======================================================================")
