import { Router, Request, Response } from "express";
import { Transaction } from "../models/Transaction";
import { Account } from "../models/Account";
import { requireAuth } from "../middleware/requireLogin";
import { categorizeTransaction } from "../utils/categorization";
import multer from "multer";
import { parse } from "csv-parse/sync";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// All routes require authentication
router.use(requireAuth);

// Upload and import transactions from CSV
router.post("/upload", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const { accountId } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    if (!accountId) {
      return res.status(400).json({ message: "Account ID is required" });
    }

    // Verify account belongs to user
    const account = await Account.findOne({ _id: accountId, userId });
    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    // Parse CSV
    const fileContent = req.file.buffer.toString("utf-8");
    let records: any[];

    try {
      records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
    } catch (parseErr) {
      return res.status(400).json({ message: "Failed to parse CSV file" });
    }

    if (records.length === 0) {
      return res.status(400).json({ message: "CSV file is empty" });
    }

    // Detect CSV format and map columns
    const mapping = detectCSVFormat(records[0]);
    if (!mapping) {
      return res.status(400).json({ 
        message: "Unable to detect CSV format. Please ensure columns are named: date, description, amount (or debit/credit)" 
      });
    }

    const importedTransactions = [];
    const errors = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      try {
        const transaction = parseCSVRow(row, mapping, userId, accountId);
        
        // Auto-categorize if no category provided
        if (!transaction.category) {
          transaction.category = categorizeTransaction(transaction.description || "");
        }

        const saved = await Transaction.create(transaction);
        importedTransactions.push(saved);

        // Update account balance
        if (transaction.type === "income") {
          account.balance += transaction.amount;
        } else if (transaction.type === "expense") {
          account.balance -= transaction.amount;
        }
      } catch (err: any) {
        errors.push({ row: i + 1, error: err.message });
      }
    }

    await account.save();

    return res.json({
      message: "Import completed",
      imported: importedTransactions.length,
      errors: errors.length,
      errorDetails: errors,
      transactions: importedTransactions
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error during import" });
  }
});

// Detect CSV format based on headers
function detectCSVFormat(firstRow: any): any {
  const headers = Object.keys(firstRow).map(h => h.toLowerCase());

  // Common date column names
  const dateCol = headers.find(h => 
    h.includes("date") || h === "posted" || h === "transaction date" || h === "trans. date"
  );

  // Common description column names
  const descCol = headers.find(h => 
    h.includes("description") || h.includes("memo") || h.includes("merchant") || 
    h === "name" || h.includes("payee")
  );

  // Amount columns - could be single amount or separate debit/credit
  const amountCol = headers.find(h => h === "amount" || h.includes("amount"));
  const debitCol = headers.find(h => h.includes("debit") || h === "withdrawal");
  const creditCol = headers.find(h => h.includes("credit") || h === "deposit");

  if (!dateCol || !descCol) {
    return null;
  }

  if (!amountCol && (!debitCol || !creditCol)) {
    return null;
  }

  // Get original case-sensitive column names
  const getOriginalName = (lowerName: string) => {
    return Object.keys(firstRow).find(k => k.toLowerCase() === lowerName) || lowerName;
  };

  return {
    dateCol: getOriginalName(dateCol),
    descCol: getOriginalName(descCol),
    amountCol: amountCol ? getOriginalName(amountCol) : null,
    debitCol: debitCol ? getOriginalName(debitCol) : null,
    creditCol: creditCol ? getOriginalName(creditCol) : null,
    categoryCol: headers.find(h => h.includes("category")) ? 
      getOriginalName(headers.find(h => h.includes("category"))!) : null
  };
}

// Parse a single CSV row into transaction data
function parseCSVRow(row: any, mapping: any, userId: string, accountId: string) {
  const dateStr = row[mapping.dateCol];
  const description = row[mapping.descCol];

  let amount = 0;
  let type: "income" | "expense" | "transfer" = "expense";

  if (mapping.amountCol) {
    // Single amount column
    amount = parseFloat(row[mapping.amountCol].replace(/[$,]/g, ""));
    type = amount < 0 ? "expense" : "income";
    amount = Math.abs(amount);
  } else {
    // Separate debit/credit columns
    const debitStr = row[mapping.debitCol] || "0";
    const creditStr = row[mapping.creditCol] || "0";
    
    const debit = parseFloat(debitStr.replace(/[$,]/g, "")) || 0;
    const credit = parseFloat(creditStr.replace(/[$,]/g, "")) || 0;

    if (credit > 0) {
      amount = credit;
      type = "income";
    } else if (debit > 0) {
      amount = debit;
      type = "expense";
    }
  }

  // Parse date (try multiple formats)
  let date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    // Try MM/DD/YYYY
    const parts = dateStr.split(/[\/\-]/);
    if (parts.length === 3) {
      date = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
    }
  }

  const category = mapping.categoryCol ? row[mapping.categoryCol] : null;

  return {
    userId,
    accountId,
    type,
    amount,
    description,
    category,
    date: isNaN(date.getTime()) ? new Date() : date
  };
}

// Get CSV template
router.get("/template", (req: Request, res: Response) => {
  const template = `date,description,amount
2026-01-01,Sample Income Transaction,100.50
2026-01-02,Sample Expense Transaction,-45.25
2026-01-03,Grocery Store,-67.89`;

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=transaction_template.csv");
  return res.send(template);
});

export default router;
