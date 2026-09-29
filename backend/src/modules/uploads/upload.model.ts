import { type HydratedDocument, type InferSchemaType, Schema, model } from "mongoose";

export const UPLOAD_KINDS = ["image", "document"] as const;
export type UploadKind = (typeof UPLOAD_KINDS)[number];

/** Metadata for a stored file. The bytes live in the `Storage` backend under `key`. */
const uploadSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    /** Storage key `<yyyy>/<mm>/<32 hex>.<ext>` — never derived from client input. */
    key: { type: String, required: true, maxlength: 64 },
    url: { type: String, required: true, maxlength: 500 },
    kind: { type: String, enum: UPLOAD_KINDS, required: true },
    /** MIME detected from the file's magic bytes (not the client's claim). */
    mime: { type: String, required: true, maxlength: 60 },
    size: { type: Number, required: true, min: 1 },
    originalName: { type: String, trim: true, maxlength: 150, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

uploadSchema.index({ key: 1 }, { unique: true });
uploadSchema.index({ owner: 1, createdAt: -1 });

export type UploadAttrs = InferSchemaType<typeof uploadSchema>;
export type UploadDoc = HydratedDocument<UploadAttrs>;
export const Upload = model("Upload", uploadSchema);

export interface UploadDTO {
  id: string;
  url: string;
  kind: UploadKind;
  mime: string;
  size: number;
  originalName: string;
  createdAt: string;
}

export function toUploadDTO(u: UploadDoc): UploadDTO {
  return {
    id: u.id,
    url: u.url,
    kind: u.kind,
    mime: u.mime,
    size: u.size,
    originalName: u.originalName ?? "",
    createdAt: u.createdAt.toISOString(),
  };
}
