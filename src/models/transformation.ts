import "server-only";

import type { Collection, WithId } from "mongodb";

import { getDb } from "@/lib/db/mongodb";
import type { TransformationDocument } from "@/types/transformation";

export const TRANSFORMATIONS_COLLECTION = "transformations";

export type TransformationRecord = WithId<TransformationDocument>;

export async function getTransformationsCollection(): Promise<
  Collection<TransformationDocument>
> {
  const db = await getDb();
  return db.collection<TransformationDocument>(TRANSFORMATIONS_COLLECTION);
}
