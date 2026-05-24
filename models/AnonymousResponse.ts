import { Model, Schema, Types, model, models } from "mongoose";

import { SURVEY_PERSONAS, type SurveyPersonaKey } from "@/lib/constants";

export interface IAnonymousAnswer {
  questionId: Types.ObjectId;
  questionType: string;
  value: unknown;
}

export interface IAnonymousResponse {
  surveyId: Types.ObjectId;
  group?: string;
  persona?: SurveyPersonaKey | "all";
  answers: string | IAnonymousAnswer[];
}

const anonymousResponseSchema = new Schema<IAnonymousResponse>(
  {
    surveyId: { type: Schema.Types.ObjectId, ref: "Survey", required: true },
    group: { type: String, trim: true },
    persona: {
      type: String,
      enum: [...SURVEY_PERSONAS.map((persona) => persona.key), "all"],
    },
    answers: {
      type: Schema.Types.Mixed,
      required: true,
      validate: {
        validator: (value: unknown) => typeof value === "string" || Array.isArray(value),
        message: "answers must be an encrypted string or answer array",
      },
    },
  },
  { timestamps: false }
);

anonymousResponseSchema.index({ surveyId: 1, group: 1, persona: 1 });

if (process.env.NODE_ENV === "development" && models.AnonymousResponse) {
  delete (models as Record<string, unknown>).AnonymousResponse;
}

const AnonymousResponse: Model<IAnonymousResponse> =
  models.AnonymousResponse || model<IAnonymousResponse>("AnonymousResponse", anonymousResponseSchema);

export default AnonymousResponse;
