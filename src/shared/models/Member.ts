/**
 * Methods relating to getting and updating member documents.
 *
 * TODO: create a proper Member type, preferably from the one in mobile.
 */
import { CollectionReference, DocumentSnapshot } from "@google-cloud/firestore";
import { MemberId } from "./identifiers";

/**
 * Get a member from the db by ID if it is available.
 *
 * TODO: rather than just returning a Firebase document directly, return a typed
 * Member object.
 */
export async function getMemberById(
  membersCollection: CollectionReference,
  id: MemberId
): Promise<DocumentSnapshot | undefined> {
  const memberDoc = await membersCollection.doc(id).get();
  if (!memberDoc.exists) {
    return undefined;
  }
  return memberDoc;
}
