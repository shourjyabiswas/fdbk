import { Model, Schema, Types, model, models } from "mongoose";

export const questionTypes = ["text", "radio", "checkbox", "dropdown", "rating"] as const;

export interface ISurveyQuestion {
  _id?: Types.ObjectId;
  type: (typeof questionTypes)[number];
  prompt: string;
  placeholder?: string;
  isRequired: boolean;
  characterLimit?: number;
  shuffleOptions: boolean;
  options: string[];
}

export interface ISurvey {
  title: string;
  introduction?: string;
  description?: string;
  disclaimer?: string;
  createdAt: Date;
  expiresAt?: Date;
  estimatedMinutes?: number;
  instructions?: string;
  status: "draft" | "published";
  questions: ISurveyQuestion[];
}

const questionSchema = new Schema<ISurveyQuestion>(
  {
    type: { type: String, enum: questionTypes, required: true },
    prompt: { type: String, required: true },
    placeholder: { type: String },
    isRequired: { type: Boolean, default: true },
    characterLimit: { type: Number },
    shuffleOptions: { type: Boolean, default: false },
    options: [{ type: String }],
  },
  { _id: true }
);

const surveySchema = new Schema<ISurvey>(
  {
    title: { type: String, required: true },
    introduction: { type: String },
    description: { type: String },
    disclaimer: { type: String },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date },
    estimatedMinutes: { type: Number },
    instructions: { type: String },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
    questions: { type: [questionSchema], default: [] },
  },
  { timestamps: false }
);

const Survey: Model<ISurvey> = models.Survey || model<ISurvey>("Survey", surveySchema);

export default Survey;
