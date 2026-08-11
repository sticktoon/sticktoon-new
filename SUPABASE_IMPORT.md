# Supabase Import Guide

How to take a StickToon backup and load it into a Supabase (Postgres) database.

The backup emails contain two kinds of attachment:

| File | Purpose |
|---|---|
| `users-<date>.csv`, `orders-<date>.csv`, … (one per collection) | **Use these for Supabase.** Readable, importable anywhere. |
| `RESTORE-<date>.json.gz` | For restoring back into MongoDB only. Not used here. Do not unzip it — the restore tools read the `.gz` directly. |

> **Images are not in the CSVs.** Custom-order artwork is stored as a base64
> `data:` URI on the order item, up to half a megabyte each. A CSV cell cannot
> hold that (Excel stops at 32,767 characters), so the CSVs carry a placeholder
> like `<image/png, 452 KB - see RESTORE json>` instead. The full bytes are in
> `RESTORE-<date>.json.gz`.

---

## Step 1 — Get the CSVs

1. Admin panel → **Dashboard**
2. *Data Backup* card → **Create Backup**
3. Backup email arrives at the addresses in `BACKUP_EMAIL`
4. Download the CSV files

A backup also arrives automatically every **Sunday at 9:00 AM IST**, so you can just use that email instead.

---

## Step 2 — Import each CSV

Repeat for every file:

1. Supabase project → sidebar → **Table Editor**
2. **New table** dropdown → **Import data from CSV**
3. Drop the CSV file in
4. Fix the table name — the file is `users-2026-08-07.csv`, the table should be just `users`. Drop the date.
5. **Import**

Supabase creates the columns itself. Everything lands as `text`.

### Table names

Postgres dislikes hyphens in identifiers, so two names change:

| CSV file | Table name |
|---|---|
| `users-*.csv` | `users` |
| `orders-*.csv` | `orders` |
| `user-orders-*.csv` | `user_orders` |
| `invoices-*.csv` | `invoices` |
| `leads-*.csv` | `leads` |
| `products-*.csv` | `products` |
| `promo-codes-*.csv` | `promo_codes` |
| `reviews-*.csv` | `reviews` |
| `withdrawal-requests-*.csv` | `withdrawal_requests` |
| `influencer-earnings-*.csv` | `influencer_earnings` |
| `support-messages-*.csv` | `support_messages` |
| `tasks-*.csv` | `tasks` |
| `image-uploads-*.csv` | `image_uploads` |

**If you only need to store and read the data, stop here. You are done.**

---

## Step 3 — Fix column types (optional)

Only needed if you want to *query* the data — sums, date ranges, filters. After Step 2 every column is `text`, so `sum(amount)` and `where createdAt > ...` will not work.

Supabase → **SQL Editor** → run this.

```sql
-- ORDERS
alter table orders
  alter column "amount"          type integer     using nullif("amount",'')::integer,
  alter column "subtotal"        type integer     using nullif("subtotal",'')::integer,
  alter column "discount"        type integer     using nullif("discount",'')::integer,
  alter column "deliveryCharges" type integer     using nullif("deliveryCharges",'')::integer,
  alter column "isDelivered"     type boolean     using nullif("isDelivered",'')::boolean,
  alter column "createdAt"       type timestamptz using nullif("createdAt",'')::timestamptz,
  alter column "updatedAt"       type timestamptz using nullif("updatedAt",'')::timestamptz,
  alter column "deliveredAt"     type timestamptz using nullif("deliveredAt",'')::timestamptz,
  alter column "items"           type jsonb       using nullif("items",'')::jsonb,
  alter column "address"         type jsonb       using nullif("address",'')::jsonb;

-- USERS
alter table users
  alter column "createdAt"         type timestamptz using nullif("createdAt",'')::timestamptz,
  alter column "updatedAt"         type timestamptz using nullif("updatedAt",'')::timestamptz,
  alter column "addresses"         type jsonb       using nullif("addresses",'')::jsonb,
  alter column "influencerProfile" type jsonb       using nullif("influencerProfile",'')::jsonb,
  alter column "adminPermissions"  type jsonb       using nullif("adminPermissions",'')::jsonb;

-- PRODUCTS
alter table products
  alter column "price"      type numeric     using nullif("price",'')::numeric,
  alter column "weight"     type numeric     using nullif("weight",'')::numeric,
  alter column "stock"      type integer     using nullif("stock",'')::integer,
  alter column "height"     type integer     using nullif("height",'')::integer,
  alter column "width"      type integer     using nullif("width",'')::integer,
  alter column "length"     type integer     using nullif("length",'')::integer,
  alter column "packCount"  type integer     using nullif("packCount",'')::integer,
  alter column "isActive"   type boolean     using nullif("isActive",'')::boolean,
  alter column "isCombo"    type boolean     using nullif("isCombo",'')::boolean,
  alter column "createdAt"  type timestamptz using nullif("createdAt",'')::timestamptz,
  alter column "updatedAt"  type timestamptz using nullif("updatedAt",'')::timestamptz,
  alter column "images"     type jsonb       using nullif("images",'')::jsonb,
  alter column "comboItems" type jsonb       using nullif("comboItems",'')::jsonb;

-- INVOICES
alter table invoices
  alter column "amount"    type integer     using nullif("amount",'')::integer,
  alter column "discount"  type integer     using nullif("discount",'')::integer,
  alter column "address"   type jsonb       using nullif("address",'')::jsonb,
  alter column "createdAt" type timestamptz using nullif("createdAt",'')::timestamptz,
  alter column "updatedAt" type timestamptz using nullif("updatedAt",'')::timestamptz;

-- LEADS
alter table leads
  alter column "expectedAmount"  type integer     using nullif("expectedAmount",'')::integer,
  alter column "nextFollowUpAt"  type timestamptz using nullif("nextFollowUpAt",'')::timestamptz,
  alter column "createdAt"       type timestamptz using nullif("createdAt",'')::timestamptz,
  alter column "updatedAt"       type timestamptz using nullif("updatedAt",'')::timestamptz;

-- PROMO CODES
alter table promo_codes
  alter column "discountValue"  type integer     using nullif("discountValue",'')::integer,
  alter column "minOrderAmount" type integer     using nullif("minOrderAmount",'')::integer,
  alter column "maxDiscount"    type integer     using nullif("maxDiscount",'')::integer,
  alter column "usedCount"      type integer     using nullif("usedCount",'')::integer,
  alter column "earningPerUnit" type integer     using nullif("earningPerUnit",'')::integer,
  alter column "totalEarnings"  type integer     using nullif("totalEarnings",'')::integer,
  alter column "totalUnitsSold" type integer     using nullif("totalUnitsSold",'')::integer,
  alter column "isActive"       type boolean     using nullif("isActive",'')::boolean,
  alter column "validFrom"      type timestamptz using nullif("validFrom",'')::timestamptz,
  alter column "validUntil"     type timestamptz using nullif("validUntil",'')::timestamptz,
  alter column "createdAt"      type timestamptz using nullif("createdAt",'')::timestamptz,
  alter column "updatedAt"      type timestamptz using nullif("updatedAt",'')::timestamptz,
  alter column "usageHistory"   type jsonb       using nullif("usageHistory",'')::jsonb;

-- USER ORDERS
alter table user_orders
  alter column "createdAt" type timestamptz using nullif("createdAt",'')::timestamptz,
  alter column "updatedAt" type timestamptz using nullif("updatedAt",'')::timestamptz;
```

### Why `nullif(...,'')`

A missing value in the CSV is an empty cell, which arrives as an empty string. Casting `''` straight to `integer` fails with:

```
invalid input syntax for type integer: ""
```

`nullif(col,'')` turns the empty string into `NULL` first, which casts cleanly. Without it these statements error out on the first empty cell.

---

## Step 4 — Primary keys (optional)

```sql
alter table users       add primary key ("_id");
alter table orders      add primary key ("_id");
alter table invoices    add primary key ("_id");
alter table products    add primary key ("_id");
alter table leads       add primary key ("_id");
alter table user_orders add primary key ("_id");
alter table promo_codes add primary key ("_id");
```

---

## Gotchas

### `_id` must be `text`, never `uuid`

MongoDB ids are 24-character hex (`68f2a1b4c9d3e0f512345678`), not UUIDs. Choosing `uuid` makes the import fail. The same applies to every reference column: `userId`, `orderId`, `invoiceId`, `createdBy`.

### BOM in the first column name

The CSVs carry a UTF-8 BOM so Excel renders non-ASCII names correctly. Most importers strip it, but if the first column shows up as `﻿_id` with an invisible character in front, that is the BOM. Open the file in Notepad++ → *Encoding → UTF-8 without BOM* → save → import again.

### Nested data stays as one JSON column

`orders.items`, `users.addresses`, `invoices.address` are whole JSON documents inside a single cell. Supabase will not split them into child tables. Convert to `jsonb` (Step 3) and query them in place:

```sql
-- every line item across all orders
select "_id", jsonb_array_elements("items")->>'name' as item_name
from orders;

-- pincode out of the shipping address
select "_id", "address"->>'pincode' as pincode
from orders;
```

### Passwords are not in the export

Password hashes and reset tokens are stripped from every backup file on purpose, so credentials never travel through email. The `users` table in Supabase will have no password column. This is a data copy, not a working auth system.

### Re-importing later

The importer creates a new table; it does not merge into an existing one. To refresh with a newer backup, either drop the table first:

```sql
drop table orders;
```

…or import to a dated name like `orders_2026_08_14` and compare.

---

## Column reference

Counts are from the 2026-08-07 backup and cover the seven collections the backup
carried at the time. `reviews`, `withdrawal_requests`, `influencer_earnings`,
`support_messages`, `tasks` and `image_uploads` were added afterwards and follow
the same pattern: every column arrives as `text`, cast the ones you want to query.

| Table | Rows | Columns |
|---|---|---|
| `users` | 30 | `_id`, `name`, `email`, `phone`, `avatar`, `provider`, `role`, `adminPermissions`, `addresses`, `influencerProfile`, `createdAt`, `updatedAt` |
| `orders` | 177 | `_id`, `userId`, `userEmail`, `items`, `subtotal`, `discount`, `deliveryCharges`, `amount`, `currency`, `promoCode`, `status`, `address`, `paymentGateway`, `paymentMethod`, `gatewayOrderId`, `gatewayPaymentId`, `invoiceId`, `isDelivered`, `deliveredAt`, `shiprocketOrderId`, `shiprocketShipmentId`, `shiprocketStatus`, `shiprocketErrorMessage`, `createdAt`, `updatedAt` |
| `user_orders` | 64 | `_id`, `userId`, `orderId`, `invoiceId`, `createdAt`, `updatedAt` |
| `invoices` | 113 | `_id`, `orderId`, `userId`, `email`, `invoiceNumber`, `amount`, `discount`, `currency`, `promoCode`, `address`, `paymentMethod`, `paymentGateway`, `createdAt`, `updatedAt` |
| `leads` | 19 | `_id`, `firstName`, `lastName`, `company`, `email`, `phone`, `leadSource`, `status`, `expectedAmount`, `nextFollowUpAt`, `createdAt`, `updatedAt` |
| `products` | 188 | `_id`, `name`, `sku`, `description`, `type`, `category`, `subcategory`, `price`, `stock`, `size`, `height`, `width`, `length`, `weight`, `packCount`, `image`, `images`, `printImage`, `isActive`, `isCombo`, `comboItems`, `createdAt`, `updatedAt` |
| `promo_codes` | 7 | `_id`, `code`, `promoType`, `description`, `discountType`, `discountValue`, `minOrderAmount`, `maxDiscount`, `usageLimit`, `usedCount`, `usageHistory`, `earningPerUnit`, `totalEarnings`, `totalUnitsSold`, `validFrom`, `validUntil`, `isActive`, `createdBy`, `createdAt`, `updatedAt` |

Column lists come from the live data, so a field that exists in the schema but was never populated will not appear. Newer backups can carry extra columns.
