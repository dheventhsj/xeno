import { Schema, model, Types } from "mongoose";

export interface Persona {
  _id: Types.ObjectId;
  name: string;
  behaviorSummary: string;
  averageSpend: number;
  preferredChannels: ("whatsapp" | "sms" | "email" | "rcs")[];
  engagementTraits: string[];
  createdAt: Date;
  updatedAt: Date;
}

const personaSchema = new Schema<Persona>(
  {
    name: { type: String, required: true, unique: true, index: true },
    behaviorSummary: { type: String, required: true },
    averageSpend: { type: Number, required: true },
    preferredChannels: [{ type: String, enum: ["whatsapp", "sms", "email", "rcs"] }],
    engagementTraits: [String]
  },
  { timestamps: true }
);

export const PersonaModel = model<Persona>("personas", personaSchema);
