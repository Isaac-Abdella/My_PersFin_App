import mongoose, { Schema, Document } from "mongoose";

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  accountId: mongoose.Types.ObjectId;
  type: "income" | "expense" | "transfer";
  amount: number;
  category?: string;
  description?: string;
  date: Date;
  createdAt: Date;
}

const transactionSchema = new Schema<ITransaction>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  accountId: { type: Schema.Types.ObjectId, ref: "Account", required: true },
  type: { 
    type: String, 
    enum: ["income", "expense", "transfer"],
    required: true 
  },
  amount: { type: Number, required: true },
  category: String,
  description: String,
  date: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

export const Transaction = mongoose.model<ITransaction>("Transaction", transactionSchema);
