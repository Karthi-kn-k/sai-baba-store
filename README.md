# Sai Baba Store's — Grocery Ordering + UPI Payment + Debt Ledger Web App

Full-stack web application designed for a small grocery store owner (Admin) and their customers. Customers can browse products, place orders, submit UPI payments, and defer transactions to a running ledger ("debt note" / khata). Admins manage product inventory, track customer balances, verify UPI payments, and audit ledger balances.

---

## 1. Project Directory Structure

```
SAI BABA STORE'S/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma   # MySQL Database Schema
│   │   └── seed.ts         # Database Seed Script (Admin, Customer, Sample Items)
│   ├── src/
│   │   ├── controllers/    # API Request Controllers (Auth, Catalog, Orders, Ledgers)
│   │   ├── middleware/     # JWT & Role Checking Middleware
│   │   ├── routes/         # Express API Routes
│   │   ├── app.ts          # Central Express configuration
│   │   ├── db.ts           # Prisma client instantiation
│   │   └── index.ts        # Server entry point
│   ├── .env.example        # Environment variables template
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/
    ├── src/
    │   ├── api/            # API Call Client Wrappers
    │   ├── components/     # Reusable Components (Navbar, modals, floating notifications)
    │   ├── context/        # React Context Providers (Auth, Cart, Toasts)
    │   ├── pages/          # Layout views (Login/Register, Customer Catalog, Admin Panel)
    │   ├── App.tsx         # Routing Controller
    │   ├── index.css       # Tailwind CSS v4 & custom styles
    │   └── main.tsx        # React Root mount
    ├── package.json
    └── vite.config.ts      # Vite configuration (Includes API backend Proxy)
```

---

## 2. Setup & Installation Instructions

### Prerequisites
- Node.js (v18 or higher recommended)
- A running MySQL database instance.

### Step 1: Clone or Open Workspace
Ensure you are in the project folder containing `backend` and `frontend`.

### Step 2: Configure Backend Environment Variables
1. Go into the `backend/` directory.
2. Edit the `.env` file or create one from `.env.example`.
3. Set your active MySQL connection string under `DATABASE_URL`. Format:
   `DATABASE_URL="mysql://username:password@localhost:3306/saibabastore"`
4. Set custom keys for `JWT_SECRET` and `JWT_REFRESH_SECRET`.

### Step 3: Run Database Migrations & Seeds
1. Ensure your local MySQL instance is running and has a database named `saibabastore` (or matches your URL).
2. Inside the `backend/` folder, run the following commands to initialize the schema:
   ```bash
   # Run migrations to create tables in MySQL
   npx prisma migrate dev --name init
   
   # Run the seed script to populate admin, customer, and 10 default products
   npm run prisma:seed
   ```

### Step 4: Run Development Servers

**For the Backend API (runs on Port 5000):**
```bash
cd backend
npm run dev
```

**For the Frontend Client (runs on Port 5173 with proxy to 5000):**
```bash
cd frontend
npm run dev
```

---

## 3. Demo Login Credentials (Seeded Automatically)

- **Admin Account (Store Owner):**
  - **Email:** `admin@saibabastores.com`
  - **Password:** `admin123`
  - **Permissions:** Full system oversight, product editing, order fulfillment, manual balance entries, payment approvals, entry corrections with audit logging.

- **Demo Customer Account:**
  - **Email:** `customer@saibabastores.com`
  - **Password:** `customer123`
  - **Permissions:** Profile access, catalog search, order checkout (UPI / Pickup / Ledger), statement logging.

---

## 4. API Routes Documentation

### 4.1 Authentication Router (`/api/auth`)

| Method | Path | Role Required | Request Body | Response Success Shape |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/api/auth/signup` | Public (or specific) | `{ name, email, phone, password, role }` | `{ message, user: { id, name, email, phone, role }, accessToken, refreshToken }` |
| **POST** | `/api/auth/login` | Public | `{ email, password }` | `{ message, user: { id, name, email, phone, role }, accessToken, refreshToken }` |
| **POST** | `/api/auth/refresh` | Public | `{ refreshToken }` | `{ message, accessToken, refreshToken }` |
| **POST** | `/api/auth/logout` | Public | *None* | `{ message: "Logged out successfully." }` |
| **GET** | `/api/auth/me` | `CUSTOMER` or `ADMIN` | *Headers: Bearer Token* | `{ user: { id, name, email, phone, role } }` |

### 4.2 Products Router (`/api/products`)

| Method | Path | Role Required | Query / Path Params | Request Body | Response Success Shape |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/products` | `CUSTOMER` or `ADMIN` | `?search=basmati&category=Grains&activeOnly=true` | *None* | `{ products: [{ id, name, price, stockQty, category, imageUrl, isActive }] }` |
| **GET** | `/api/products/:id` | `CUSTOMER` or `ADMIN` | `id` (uuid) in path | *None* | `{ product: { id, name, price, stockQty, category, imageUrl, isActive } }` |
| **POST** | `/api/products` | `ADMIN` | *None* | `{ name, price, stockQty, category, imageUrl, isActive }` | `{ message, product }` |
| **PUT** | `/api/products/:id` | `ADMIN` | `id` (uuid) in path | `{ name, price, stockQty, category, imageUrl, isActive }` | `{ message, product }` |
| **DELETE**| `/api/products/:id` | `ADMIN` | `id` (uuid) in path | *None* | `{ message }` *(Sets to inactive if product was already ordered)* |

### 4.3 Orders Router (`/api/orders`)

| Method | Path | Role Required | Request Body / Params | Response Success Shape |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/api/orders` | `CUSTOMER` | `{ items: [{ productId, quantity }], paymentMethod: "UPI" \| "PICKUP" \| "DEBT" }` | `{ message, order: { id, customerId, status, totalAmount, paymentMethod, items: [...] } }` *(Automatically registers ledger DEBIT)* |
| **GET** | `/api/orders` | `CUSTOMER` or `ADMIN` | *None* (Admins see all, customers see own) | `{ orders: [...] }` |
| **GET** | `/api/orders/:id` | `CUSTOMER` or `ADMIN` | `id` (uuid) in path | `{ order: { ... } }` |
| **PATCH**| `/api/orders/:id/status`| `CUSTOMER` or `ADMIN` | Path `id`, Body: `{ status: "CANCELLED" \| "CONFIRMED" \| "FULFILLED" }` | `{ message, order }` *(Cancelling restores product stock levels and registers reversing ledger CREDIT)* |

### 4.4 Ledger Router (`/api/ledger`)

| Method | Path | Role Required | Query / Body Params | Response Success Shape |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/ledger/detail` | `CUSTOMER` or `ADMIN` | `?customerId=uuid` (Query param admin-only) | `{ customer: {...}, balance, debits, credits, entries: [...] }` |
| **GET** | `/api/ledger/summary` | `ADMIN` | *None* | `{ summary: [{ id, name, email, phone, balance, debits, credits }] }` |
| **POST** | `/api/ledger/record-credit`| `ADMIN` | `{ customerId, amount, note }` | `{ message, entry }` *(Used for logging manual cash payments)* |
| **POST** | `/api/ledger/upi-submit` | `CUSTOMER` | `{ orderId, upiTxnRef, amount }` | `{ message, payment }` *(Submits UTR reference number for admin approval)* |
| **POST** | `/api/ledger/approve-payment`| `ADMIN` | `{ paymentId }` | `{ message, payment, ledgerEntry }` *(Changes payment status to PAID and logs ledger CREDIT)* |
| **POST** | `/api/ledger/adjust-entry` | `ADMIN` | `{ entryId, amount, type, note, reason }` | `{ message, entry, auditLog }` *(Performs balance correction, records old value/new value/reason in Audit log)* |
