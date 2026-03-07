export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export interface Account {
  _id: string;
  userId: string;
  name: string;
  type: "checking" | "savings" | "credit" | "investment" | "other";
  balance: number;
  currency: string;
  createdAt: string;
}

export interface Transaction {
  _id: string;
  userId: string;
  accountId: string;
  type: "income" | "expense" | "transfer";
  amount: number;
  category?: string;
  description?: string;
  date: string;
  createdAt: string;
}

export interface Budget {
  _id: string;
  userId: string;
  category: string;
  amount: number;
  period: "weekly" | "monthly" | "yearly";
  startDate: string;
  endDate?: string;
  createdAt: string;
}

export interface Debt {
  _id: string;
  userId: string;
  name: string;
  type: "credit-card" | "student-loan" | "mortgage" | "auto-loan" | "personal-loan" | "other";
  principal: number;
  currentBalance: number;
  interestRate: number;
  minimumPayment: number;
  dueDate?: string;
  accountNumber?: string;
  lender?: string;
  createdAt: string;
}

export interface SpendingByCategory {
  category: string;
  amount: number;
}

export interface SpendingTrend {
  month: string;
  income: number;
  expenses: number;
  netSavings: number;
}

export interface BudgetComparison {
  category: string;
  budgeted: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  isOverBudget: boolean;
}

export interface FinancialOverview {
  totalBalance: number;
  totalDebt: number;
  netWorth: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlySavings: number;
  savingsRate: number;
  accountsCount: number;
  debtsCount: number;
}

export interface PayoffStrategy {
  method: "avalanche" | "snowball";
  totalMonths: number;
  totalYears: string;
  totalInterestPaid: number;
  payoffSchedule: Array<{
    debtId: string;
    debtName: string;
    payoffMonth: number;
  }>;
  monthlyPayment: number;
}
