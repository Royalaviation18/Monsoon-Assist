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

export interface IPreparednessPlan extends Document {
  location: string;
  householdSize: number;
  buildingType: 'ground_floor' | 'high_rise' | 'independent';
  vulnerabilities: string[];
  riskLevel: 'low' | 'moderate' | 'high';
  checklist: IChecklistItem[];
  safetyInstructions: ISafetyInstruction[];
  language: string;
  createdAt: Date;
}

export interface ISafetyAlert extends Document {
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  location: string;
  recommendations: string[];
  createdAt: Date;
}

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
  location: { type: String, required: true },
  householdSize: { type: Number, required: true },
  buildingType: { type: String, enum: ['ground_floor', 'high_rise', 'independent'], required: true },
  vulnerabilities: [{ type: String }],
  riskLevel: { type: String, enum: ['low', 'moderate', 'high'], required: true },
  checklist: [ChecklistItemSchema],
  safetyInstructions: [SafetyInstructionSchema],
  language: { type: String, default: 'English' },
  createdAt: { type: Date, default: Date.now }
});

// Indexes for query speed & database performance
PreparednessPlanSchema.index({ location: 1 });
PreparednessPlanSchema.index({ createdAt: -1 });

const SafetyAlertSchema = new Schema<ISafetyAlert>({
  severity: { type: String, enum: ['info', 'warning', 'critical'], required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  location: { type: String, required: true },
  recommendations: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

SafetyAlertSchema.index({ location: 1 });
SafetyAlertSchema.index({ createdAt: -1 });

export const PreparednessPlan = mongoose.model<IPreparednessPlan>('PreparednessPlan', PreparednessPlanSchema);
export const SafetyAlert = mongoose.model<ISafetyAlert>('SafetyAlert', SafetyAlertSchema);
