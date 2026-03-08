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
    const { accountId, dryRun = false, skipDuplicateIds = [] } = req.body;

    // Debug logging
    console.log("Upload request received:");
    console.log("File:", req.file ? `${req.file.originalname} (${req.file.size} bytes)` : "No file");
    console.log("DryRun:", dryRun);
    console.log("SkipDuplicateIds:", skipDuplicateIds);

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
      const detectedCols = Object.keys(records[0]);
      const headers = detectedCols.map(h => h.toLowerCase()).join(", ");
      console.error(`[IMPORT ERROR] CSV format not detected for account ${accountId}`);
      console.error(`[IMPORT ERROR] Detected columns: ${headers}`);
      console.error(`[IMPORT ERROR] First row:`, records[0]);
      return res.status(400).json({ 
        message: "Unable to detect CSV format. Expected columns: DATE, DESCRIPTION (or DESCIPTION), and either AMOUNT or both DEBIT and CREDIT.",
        detectedColumns: detectedCols,
        detectedHeaders: headers
      });
    }

    const importedTransactions = [];
    const errors = [];
    const duplicates = [];
    let accountBalanceChange = 0;

    // First pass: parse all records and detect duplicates
    const parsedRecords = [];
    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      try {
        const transaction = parseCSVRow(row, mapping, userId, accountId);
        
        // Auto-categorize if no category provided
        if (!transaction.category) {
          transaction.category = categorizeTransaction(transaction.description || "");
        }

        // Check for duplicates
        const isDuplicate = await findDuplicateTransaction(userId, accountId, transaction);
        const duplicateKey = `${transaction.date.toDateString()}-${transaction.amount}-${transaction.description}`;
        
        if (isDuplicate) {
          duplicates.push({
            row: i + 1,
            key: duplicateKey,
            date: transaction.date,
            amount: transaction.amount,
            description: transaction.description,
            category: transaction.category,
            type: transaction.type
          });
        }

        parsedRecords.push({
          row: i + 1,
          transaction,
          isDuplicate,
          key: duplicateKey
        });
      } catch (err: any) {
        errors.push({ row: i + 1, error: err.message });
      }
    }

    // If dry run, just return detected duplicates without importing
    if (dryRun) {
      return res.json({
        message: "Dry run completed - duplicates detected",
        isDryRun: true,
        duplicates: duplicates.length,
        duplicateDetails: duplicates,
        totalRecords: parsedRecords.length,
        recordsToImport: parsedRecords.length - duplicates.length
      });
    }

    // Second pass: import records (skipping duplicates unless marked to keep)
    for (const record of parsedRecords) {
      if (record.isDuplicate && !skipDuplicateIds.includes(record.key)) {
        // Skip this duplicate
        continue;
      }

      try {
        const saved = await Transaction.create(record.transaction);
        importedTransactions.push(saved);
        
        console.log(`[IMPORT] Created transaction: ${record.transaction.description} - ${record.transaction.type} $${record.transaction.amount}`);

        // Update account balance
        if (record.transaction.type === "income") {
          accountBalanceChange += record.transaction.amount;
        } else if (record.transaction.type === "expense") {
          accountBalanceChange -= record.transaction.amount;
        }
      } catch (err: any) {
        errors.push({ row: record.row, error: err.message });
        console.error(`[IMPORT ERROR] Failed to create transaction at row ${record.row}:`, err.message);
      }
    }

    // Update account balance once
    // For credit cards, reverse the balance change (debits increase what you owe, credits decrease it)
    console.log(`[IMPORT] Account type: ${account.type}`);
    console.log(`[IMPORT] Balance change from transactions: ${accountBalanceChange}`);
    console.log(`[IMPORT] Previous balance: ${account.balance}`);
    
    if (account.type === "credit-card") {
      account.balance -= accountBalanceChange;
    } else {
      account.balance += accountBalanceChange;
    }
    
    console.log(`[IMPORT] New balance: ${account.balance}`);
    await account.save();

    return res.json({
      message: "Import completed",
      imported: importedTransactions.length,
      duplicatesSkipped: duplicates.length - parsedRecords.filter(r => r.isDuplicate && skipDuplicateIds.includes(r.key)).length,
      duplicatesImported: parsedRecords.filter(r => r.isDuplicate && skipDuplicateIds.includes(r.key)).length,
      errors: errors.length,
      errorDetails: errors,
      newBalance: account.balance,
      transactions: importedTransactions
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error during import" });
  }
});

// Find duplicates for an account
router.get("/duplicates/:accountId", async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const { accountId } = req.params;

    // Verify account belongs to user
    const account = await Account.findOne({ _id: accountId, userId });
    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    // Get all transactions for the account
    const transactions = await Transaction.find({ userId, accountId }).sort({ date: 1 });

    // Group duplicates (same date + amount + description)
    const duplicateGroups: any[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < transactions.length; i++) {
      const tx1 = transactions[i];
      const key1 = `${tx1.date.toDateString()}-${tx1.amount}-${tx1.description}`;

      if (seen.has(key1)) continue;

      const group = [tx1];
      for (let j = i + 1; j < transactions.length; j++) {
        const tx2 = transactions[j];
        const key2 = `${tx2.date.toDateString()}-${tx2.amount}-${tx2.description}`;
        
        if (key1 === key2) {
          group.push(tx2);
          seen.add(key2);
        }
      }

      if (group.length > 1) {
        duplicateGroups.push(group);
        seen.add(key1);
      }
    }

    // Serialize duplicate groups to ensure _id and other ObjectIds are properly converted to string
    const serializedGroups = duplicateGroups.map((group: any[]) =>
      group.map((tx: any) => ({
        _id: tx._id ? tx._id.toString() : undefined,
        userId: tx.userId ? tx.userId.toString() : undefined,
        accountId: tx.accountId ? tx.accountId.toString() : undefined,
        type: tx.type,
        amount: tx.amount,
        category: tx.category || undefined,
        description: tx.description,
        date: tx.date,
        createdAt: tx.createdAt
      }))
    );

    return res.json({
      accountId,
      totalDuplicates: serializedGroups.reduce((sum, group) => sum + group.length, 0),
      duplicateGroups: serializedGroups
    });
  } catch (err) {
    console.error("Error in duplicates endpoint:", err);
    return res.status(500).json({ message: "Server error finding duplicates" });
  }
});

// Check if a transaction is a duplicate (same date, amount, description)
async function findDuplicateTransaction(userId: string, accountId: string, transaction: any): Promise<boolean> {
  const startOfDay = new Date(transaction.date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(transaction.date);
  endOfDay.setHours(23, 59, 59, 999);

  const existing = await Transaction.findOne({
    userId,
    accountId,
    amount: transaction.amount,
    description: transaction.description,
    date: { $gte: startOfDay, $lte: endOfDay }
  });

  return !!existing;
}

// Detect CSV format and map columns
function detectCSVFormat(firstRow: any): any {
  const headers = Object.keys(firstRow).map(h => h.toLowerCase());

  // Common date column names
  const dateCol = headers.find(h => 
    h.includes("date") || h === "posted" || h === "transaction date" || h === "trans. date"
  );

  // Common description column names - including the TD Bank typo "desciption"
  const descCol = headers.find(h => 
    h.includes("description") || h.includes("desciption") || h.includes("memo") || 
    h.includes("merchant") || h === "name" || h.includes("payee")
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
  const template = `DATE,DESCRIPTION,DEBIT,CREDIT,BALANCE
01/05/2026,Paycheck Deposit,,2500.00,5500.00
01/06/2026,Grocery Store,67.89,,5432.11
01/07/2026,Gas Station,45.25,,5386.86
01/08/2026,ATM Withdrawal,100.00,,5286.86
01/09/2026,Restaurant,32.50,,5254.36`;

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=transaction_template.csv");
  return res.send(template);
});

export default router;
