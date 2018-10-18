/**
 * This provides functions to determine whether a given member can perform a given operation type.
 */
import {
  DocumentSnapshot,
  CollectionReference,
  Transaction
} from "@google-cloud/firestore";

import { OperationType } from "@raha/api-shared/dist/models/Operation";
import { MemberDoesNotHaveRequiredAbilityError } from "@raha/api-shared/dist/errors/RahaApiError/MemberDoesNotHaveRequiredAbility";

export const VERIFICATIONS_REQUIRED_TO_FLAG = 5;

/**
 * Returns whether a member has been verified.
 */
export async function isVerified(
  operations: CollectionReference,
  member: DocumentSnapshot,
  transaction?: Transaction
) {
  const query = operations
    .where("op_code", "==", OperationType.VERIFY)
    .where("data.to_uid", "==", member.id);
  const result = await (transaction ? transaction.get(query) : query.get());
  return !result.empty;
}

export function isFlagged(member: DocumentSnapshot) {
  const operationsFlaggingThisMember = member.get("operationsFlaggingThisMember");
  return !!operationsFlaggingThisMember && operationsFlaggingThisMember.size > 0;
}

/**
 * A member in good standing has been verified and is not flagged.
 *
 * This function only takes a MemberId and not a Member object to ensure that
 * it always retrieves the latest state from the Redux store. Passing a
 * Member object directly could result in stale data being used to determing
 * a member's status.
 */
export async function isInGoodStanding(
  operations: CollectionReference,
  member: DocumentSnapshot,
  transaction?: Transaction
) {
  return (
    (await isVerified(operations, member, transaction)) && !isFlagged(member)
  );
}

/**
 * Return whether or not the member can perform flag operations.
 *
 * This function only takes a MemberId and not a Member object to ensure that
 * it always retrieves the latest state from the Redux store. Passing a
 * Member object directly could result in stale data being used to determing
 * a member's status.
 */
export async function canFlag(
  operations: CollectionReference,
  member: DocumentSnapshot,
  transaction?: Transaction
) {
  return (
    (await isInGoodStanding(operations, member, transaction)) &&
    member.get("verifiedBy").size >= VERIFICATIONS_REQUIRED_TO_FLAG
  );
}

export async function canCreateOperation(
  operationType: OperationType,
  operations: CollectionReference,
  transaction?: Transaction,
  member?: DocumentSnapshot
) {
  if (member) {
    switch (operationType) {
      case OperationType.EDIT_MEMBER:
      case OperationType.REQUEST_VERIFICATION:
        return true;
      case OperationType.FLAG_MEMBER:
      case OperationType.RESOLVE_FLAG_MEMBER:
        return canFlag(operations, member, transaction);
      case OperationType.GIVE:
      case OperationType.INVITE:
      case OperationType.MINT:
      case OperationType.TRUST:
      case OperationType.VERIFY:
        return isInGoodStanding(operations, member, transaction);
      case OperationType.CREATE_MEMBER:
        // An existing member cannot perform a CREATE_MEMBER operation.
        return false;
      default:
        // tslint:disable-next-line:no-console
        console.warn(
          `Unexpected operation type when determining member abilities: ${operationType}`
        );
        return false;
    }
  } else {
    if (operationType === OperationType.CREATE_MEMBER) {
      return true;
    }
    return false;
  }
}

/**
 * Throws an error if the member is unable to create the specified operation.
 */
export async function validateAbilityToCreateOperation(
  operationType: OperationType,
  operations: CollectionReference,
  transaction?: Transaction,
  member?: DocumentSnapshot
) {
  if (!canCreateOperation(operationType, operations, transaction, member)) {
    throw new MemberDoesNotHaveRequiredAbilityError(operationType);
  }
}
