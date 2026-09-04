import "server-only";

import type { Collection, WithId } from "mongodb";

import { getDb } from "@/lib/db/mongodb";
import type { TransformationDocument } from "@/types/transformation";

export const TRANSFORMATIONS_COLLECTION = "transformations";

export type TransformationRecord = WithId<TransformationDocument>;

let indexesPromise: Promise<void> | undefined;

/**
 * Ensures uniqueness for Uploadcare UUID and Magic Hour project ID.
 * Safe to call repeatedly; cached after the first successful ensure.
 */
export async function ensureTransformationIndexes(
  collection: Collection<TransformationDocument>,
): Promise<void> {
  if (!indexesPromise) {
    indexesPromise = (async () => {
      await Promise.all([
        collection.createIndex(
          { "sourceUploadcare.uuid": 1 },
          { unique: true, name: "uniq_sourceUploadcare_uuid" },
        ),
        collection.createIndex(
          { "magicHour.projectId": 1 },
          {
            unique: true,
            sparse: true,
            name: "uniq_magicHour_projectId_sparse",
          },
        ),
        collection.createIndex(
          { createdAt: -1 },
          { name: "createdAt_desc" },
        ),
      ]);
    })().catch((error) => {
      // Allow retry on the next request if index creation failed.
      indexesPromise = undefined;
      throw error;
    });
  }

  await indexesPromise;
}

export async function getTransformationsCollection(): Promise<
  Collection<TransformationDocument>
> {
  const db = await getDb();
  const collection = db.collection<TransformationDocument>(
    TRANSFORMATIONS_COLLECTION,
  );
  await ensureTransformationIndexes(collection);
  return collection;
}
