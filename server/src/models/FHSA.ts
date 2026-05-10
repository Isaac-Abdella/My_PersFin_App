import mongoose, { Schema, Document } from "mongoose";

export interface IFHSAContribution {
  _id?: mongoose.Types.ObjectId;
  year: number;
  amount: number;
  date: Date;
  note?: string;
}

export interface IFHSA extends Document {
  userId: mongoose.Types.ObjectId;
  institution: string;
  accountName: string;
  openedYear: number;
  currentBalance: number;
  contributions: IFHSAContribution[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const contributionSchema = new Schema<IFHSAContribution>(
  {
    year:   { type: Number, required: true },
    amount: { type: Number, required: true, min: 0 },
    date:   { type: Date,   required: true },
    note:   String,
  },
  { _id: true }
);

const fhsaSchema = new Schema<IFHSA>(
  {
    userId:         { type: Schema.Types.ObjectId, ref: "User", required: true },
    institution:    { type: String, required: true },
    accountName:    { type: String, required: true },
    openedYear:     { type: Number, required: true, min: 2023 },
    currentBalance: { type: Number, required: true, default: 0, min: 0 },
    contributions:  [contributionSchema],
    notes:          String,
  },
  { timestamps: true }
);

export const FHSA = mongoose.model<IFHSA>("FHSA", fhsaSchema);
