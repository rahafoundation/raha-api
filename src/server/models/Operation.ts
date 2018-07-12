// TODO: change all to_uid to to_member_id
import { firestore } from "firebase-admin";

import { MemberId, MemberUsername, OperationId } from "./identifiers";

export enum OperationType {
  REQUEST_INVITE = "REQUEST_INVITE",
  TRUST = "TRUST",
  MINT = "MINT",
  GIVE = "GIVE"
}
export interface RequestInvitePayload {
  full_name: string;
  to_uid: MemberId;
  username: MemberUsername;
}
export interface TrustPayload {
  to_uid: MemberId;
}
export interface MintPayload {
  amount: string;
}
export interface GivePayload {
  to_uid: MemberId;
  amount: string;
  memo: string;
  donation_to: MemberId;
  donation_amount: string;
}

export interface ToSaveOperationBase {
  // TODO: rename to creatorId to remove uid
  creator_uid: MemberId;
  created_at: firestore.FieldValue;
}

export interface SavedOperationBase {
  id: OperationId;
  creator_uid: MemberId;
  created_at: Date;
}

type OperationPayload =
  | {
      op_code: OperationType.REQUEST_INVITE;
      data: RequestInvitePayload;
    }
  | {
      op_code: OperationType.TRUST;
      data: TrustPayload;
    }
  | {
      op_code: OperationType.MINT;
      data: MintPayload;
    }
  | {
      op_code: OperationType.GIVE;
      data: GivePayload;
    };

export type Operation = SavedOperationBase & OperationPayload;
export type OperationToBeCreated = ToSaveOperationBase & OperationPayload;
