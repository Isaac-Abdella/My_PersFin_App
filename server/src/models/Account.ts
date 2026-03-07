import mongoose, { Schema, Document } from "mongoose";

export interface IAccount extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  type: "checking" | "savings" | "credit" | "investment" | "other";
  balance: number;
  currency: string;
  createdAt: Date;
}

const accountSchema = new Schema<IAccount>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  type: { 
    type: String, 
    enum: ["checking", "savings", "credit", "investment", "other"],
    required: true 
  },
  balance: { type: Number, default: 0 },
  currency: { type: String, default: "USD" },
  createdAt: { type: Date, default: Date.now }
});

export const Account = mongoose.model<IAccount>("Account", accountSchema);
