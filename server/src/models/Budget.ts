import mongoose, { Schema, Document } from "mongoose";

export interface IBudget extends Document {
  userId: mongoose.Types.ObjectId;
  category: string;
  amount: number;
  period: "weekly" | "monthly" | "yearly";
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
}

const budgetSchema = new Schema<IBudget>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  category: { type: String, required: true },
  amount: { type: Number, required: true },
  period: { 
    type: String, 
    enum: ["weekly", "monthly", "yearly"],
    default: "monthly" 
  },
  startDate: { type: Date, required: true },
  endDate: Date,
  createdAt: { type: Date, default: Date.now }
});

export const Budget = mongoose.model<IBudget>("Budget", budgetSchema);
