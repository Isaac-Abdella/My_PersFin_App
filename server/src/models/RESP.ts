import mongoose, { Schema, Document } from "mongoose";

export interface IRESPBeneficiary {
  _id?: mongoose.Types.ObjectId;
  name: string;
  birthYear: number;
  sin?: string;
}

export interface IRESPContribution {
  _id?: mongoose.Types.ObjectId;
  year: number;
  amount: number;
  beneficiaryName: string;
  cesgReceived: number;
  date: Date;
  note?: string;
}

export interface IRESP extends Document {
  userId: mongoose.Types.ObjectId;
  planType: "individual" | "family";
  institution: string;
  accountName: string;
  beneficiaries: IRESPBeneficiary[];
  currentBalance: number;
  contributions: IRESPContribution[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const beneficiarySchema = new Schema<IRESPBeneficiary>({
  name:      { type: String, required: true },
  birthYear: { type: Number, required: true },
  sin:       String,
});

const contributionSchema = new Schema<IRESPContribution>(
  {
    year:            { type: Number, required: true },
    amount:          { type: Number, required: true, min: 0 },
    beneficiaryName: { type: String, required: true },
    cesgReceived:    { type: Number, required: true, default: 0, min: 0 },
    date:            { type: Date,   required: true },
    note:            String,
  },
  { _id: true }
);

const respSchema = new Schema<IRESP>(
  {
    userId:         { type: Schema.Types.ObjectId, ref: "User", required: true },
    planType:       { type: String, enum: ["individual", "family"], required: true },
    institution:    { type: String, required: true },
    accountName:    { type: String, required: true },
    beneficiaries:  [beneficiarySchema],
    currentBalance: { type: Number, required: true, default: 0, min: 0 },
    contributions:  [contributionSchema],
    notes:          String,
  },
  { timestamps: true }
);

export const RESP = mongoose.model<IRESP>("RESP", respSchema);
