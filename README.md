# Personal Finance App

A comprehensive personal finance management application with transaction tracking, budget management, debt payoff strategies, and CSV import capabilities.

## Features

### ✅ Implemented Features

1. **Account Management**
   - Multiple account types (checking, savings, credit, investment)
   - Real-time balance tracking

2. **Transaction Tracking**
   - Manual transaction entry
   - Income, expense, and transfer types
   - Automatic categorization based on merchant names
   - CSV import from bank statements

3. **Budget Management**
   - Create budgets by category
   - Weekly, monthly, or yearly budgets
   - Budget vs actual spending comparison
   - Excess spending alerts

4. **Debt Management**
   - Track multiple debts with interest rates
   - Debt payoff calculator with two strategies:
     - **Avalanche Method**: Pay highest interest rate first (saves most money)
     - **Snowball Method**: Pay lowest balance first (psychological wins)
   - Interest calculation and payoff timeline

5. **Spending Analysis**
   - Spending by category breakdown
   - Spending trends over time
   - Financial overview dashboard
   - Monthly savings rate tracking

6. **CSV Import**
   - Upload bank transaction files
   - Automatic format detection
   - Auto-categorization of imported transactions
   - Support for various CSV formats

7. **Authentication**
   - Session-based auth with Passport.js
   - Secure password hashing with bcrypt

## Getting Started

### Prerequisites

- Node.js v20+
- MongoDB running on localhost:27017

### Installation

1. **Install server dependencies:**
```bash
cd server
npm install
```

2. **Install web dependencies:**
```bash
cd ../web
npm install
```

3. **Set up MongoDB:**
   - Make sure MongoDB is running: `mongod`
   - Database will be created automatically: `persfin`

### Running the Application

1. **Start the backend server:**
```bash
cd server
npm run dev
```
Server will run on http://localhost:3000

2. **Start the frontend (in a new terminal):**
```bash
cd web
npm run dev
```
Frontend will run on http://localhost:5173

3. **Open your browser:**
   - Navigate to http://localhost:5173
   - Register a new account
   - Start managing your finances!

## Usage Guide

### 1. First Steps
- Register an account
- Go to Dashboard and explore your financial overview

### 2. Adding Accounts
- Click on Transactions → Add Account (create accounts before adding transactions)

### 3. Importing Transactions
- Go to "Import CSV"
- Download the template to see the format
- Upload your bank's CSV export
- Transactions will be auto-categorized!

### 4. Setting Budgets
- Go to "Budgets"
- Click "Add Budget"
- Set category and amount
- Monitor your spending against budgets on the Dashboard

### 5. Managing Debts
- Go to "Debts"
- Click "Add Debt"
- Enter your debt details (balance, interest rate, min payment)
- Use the Payoff Calculator to see the best strategy
- Compare Avalanche vs Snowball methods

### 6. Analyzing Spending
- Dashboard shows:
  - Net Worth
  - Monthly Savings Rate
  - Spending by Category (pie chart)
  - Budget vs Actual (bar chart)
  - Excess Spending Alerts

## CSV Import Format

Your CSV should have these columns:
- `date` - Transaction date (MM/DD/YYYY or YYYY-MM-DD)
- `description` - Merchant name or description
- `amount` - Amount (negative for expenses, positive for income)

OR separate debit/credit:
- `debit` - Expense amount
- `credit` - Income amount

Optional:
- `category` - Will auto-categorize if not provided

## Auto-Categorization

The app automatically categorizes transactions based on merchant names:
- Groceries (Walmart, Safeway, etc.)
- Restaurants (Starbucks, McDonald's, etc.)
- Gas & Fuel (Shell, Chevron, etc.)
- Utilities, Insurance, Healthcare, and more!

## Project Structure

```
My_PersFin_App/
├── server/
│   ├── src/
│   │   ├── models/          # MongoDB models
│   │   ├── routes/          # API endpoints
│   │   ├── middleware/      # Auth middleware
│   │   ├── utils/           # Categorization logic
│   │   ├── config.ts        # Environment config
│   │   ├── passport.ts      # Auth strategy
│   │   └── index.ts         # Server entry
│   ├── package.json
│   └── tsconfig.json
└── web/
    ├── src/
    │   ├── pages/           # React pages
    │   ├── api.ts           # API client
    │   ├── AuthContext.tsx  # Auth context
    │   ├── types.ts         # TypeScript types
    │   ├── App.tsx          # Main app component
    │   └── main.tsx         # Entry point
    └── package.json
```

## API Endpoints

### Auth
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login
- `POST /auth/logout` - Logout
- `GET /auth/me` - Get current user

### Accounts
- `GET /accounts` - List accounts
- `POST /accounts` - Create account
- `PUT /accounts/:id` - Update account
- `DELETE /accounts/:id` - Delete account

### Transactions
- `GET /transactions` - List transactions
- `POST /transactions` - Create transaction
- `DELETE /transactions/:id` - Delete transaction

### Budgets
- `GET /budgets` - List budgets
- `POST /budgets` - Create budget
- `GET /budgets/:id/spending` - Get budget with spending info

### Debts
- `GET /debts` - List debts
- `POST /debts` - Create debt
- `GET /debts/payoff/strategies` - Calculate payoff strategies
- `POST /debts/:id/payment` - Record payment

### Import
- `POST /import/upload` - Upload CSV file
- `GET /import/template` - Download CSV template

### Analytics
- `GET /analytics/overview` - Financial overview
- `GET /analytics/spending-by-category` - Spending breakdown
- `GET /analytics/spending-trends` - Spending over time
- `GET /analytics/budget-comparison` - Budget vs actual
- `GET /analytics/excess-spending` - Spending alerts

## Technologies Used

### Backend
- Node.js + Express
- TypeScript
- MongoDB + Mongoose
- Passport.js (session auth)
- Multer (file uploads)
- csv-parse (CSV parsing)
- bcryptjs (password hashing)

### Frontend
- React 19
- TypeScript
- React Router
- Recharts (data visualization)
- date-fns (date handling)
- Vite (build tool)

## Future Enhancements

- [ ] More bank CSV formats
- [ ] Machine learning for better categorization
- [ ] Recurring transaction templates
- [ ] Goals and savings targets
- [ ] Investment portfolio tracking
- [ ] Bill reminders
- [ ] Multi-currency support
- [ ] Export data to PDF/Excel
- [ ] Mobile responsive improvements
- [ ] Dark mode

## License

MIT
