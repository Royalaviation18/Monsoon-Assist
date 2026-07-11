import mongoose, { Schema, Document } from 'mongoose';

export interface IChecklistItem {
  id: string;
  item: string;
  category: string;
  quantity: string;
  requiredQuantity: string;
  completed: boolean;
}

export interface ISafetyInstruction {
  phase: 'before' | 'during' | 'after';
  action: string;
  details: string;
}

export interface IFamilyMember {
  name: string;
  age: number;
  gender: string;
  vulnerabilities: string[];
}

export interface IPreparednessPlan extends Document {
  profileName: string;
  location: string;
  householdSize: number;
  buildingType: 'ground_floor' | 'high_rise' | 'independent';
  vulnerabilities: string[];
  members: IFamilyMember[];
  riskLevel: 'low' | 'moderate' | 'high';
  checklist: IChecklistItem[];
  safetyInstructions: ISafetyInstruction[];
  language: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISafetyAlert extends Document {
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  location: string;
  recommendations: string[];
  createdAt: Date;
}

const FamilyMemberSchema = new Schema<IFamilyMember>({
  name: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, required: true },
  vulnerabilities: [{ type: String }]
});

const ChecklistItemSchema = new Schema<IChecklistItem>({
  id: { type: String, required: true },
  item: { type: String, required: true },
  category: { type: String, required: true },
  quantity: { type: String, required: true },
  requiredQuantity: { type: String, required: true },
  completed: { type: Boolean, default: false }
});

const SafetyInstructionSchema = new Schema<ISafetyInstruction>({
  phase: { type: String, enum: ['before', 'during', 'after'], required: true },
  action: { type: String, required: true },
  details: { type: String, required: true }
});

const PreparednessPlanSchema = new Schema<IPreparednessPlan>({
  profileName: { type: String, required: true },
  location: { type: String, required: true },
  householdSize: { type: Number, required: true },
  buildingType: { type: String, enum: ['ground_floor', 'high_rise', 'independent'], required: true },
  vulnerabilities: [{ type: String }],
  members: [FamilyMemberSchema],
  riskLevel: { type: String, enum: ['low', 'moderate', 'high'], required: true },
  checklist: [ChecklistItemSchema],
  safetyInstructions: [SafetyInstructionSchema],
  language: { type: String, default: 'English' },
}, { timestamps: true });

// Indexes for query speed & database performance
PreparednessPlanSchema.index({ location: 1 });
PreparednessPlanSchema.index({ createdAt: -1 });

const SafetyAlertSchema = new Schema<ISafetyAlert>({
  severity: { type: String, enum: ['info', 'warning', 'critical'], required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  location: { type: String, required: true },
  recommendations: [{ type: String }],
}, { timestamps: true });

SafetyAlertSchema.index({ location: 1 });
SafetyAlertSchema.index({ createdAt: -1 });

export const PreparednessPlan = mongoose.model<IPreparednessPlan>('PreparednessPlan', PreparednessPlanSchema);
export const SafetyAlert = mongoose.model<ISafetyAlert>('SafetyAlert', SafetyAlertSchema);
