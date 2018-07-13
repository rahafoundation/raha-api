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
export enum MintType {
  BASIC_INCOME = "BASIC_INCOME",
  REFERRAL_BONUS = "REFERRAL_BONUS"
}
export interface MintBasicIncomePayload {
  type: MintType.BASIC_INCOME;
  amount: string;
}
export interface MintReferralBonusPayload {
  type: MintType.REFERRAL_BONUS;
  amount: string;
  invited_member_id: MemberId;
}
export type MintPayload = MintBasicIncomePayload | MintReferralBonusPayload;
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

interface RequestInviteOperationMetadata {
  op_code: OperationType.REQUEST_INVITE;
  data: RequestInvitePayload;
}
export type RequestInviteOperation = SavedOperationBase &
  RequestInviteOperationMetadata;
export type RequestInviteOperationToBeCreated = ToSaveOperationBase &
  RequestInviteOperationMetadata;

export interface TrustOperationMetadata {
  op_code: OperationType.TRUST;
  data: TrustPayload;
}
export type TrustOperation = SavedOperationBase & TrustOperationMetadata;
export type TrustOperationToBeCreated = ToSaveOperationBase &
  TrustOperationMetadata;

export interface MintOperationMetadata {
  op_code: OperationType.MINT;
  data: MintPayload;
}
export type MintOperation = SavedOperationBase & MintOperationMetadata;
export type MintOperationToBeCreated = ToSaveOperationBase &
  MintOperationMetadata;

export interface GiveOperationMetadata {
  op_code: OperationType.GIVE;
  data: GivePayload;
}
export type GiveOperation = SavedOperationBase & GiveOperationMetadata;
export type GiveOperationToBeCreated = ToSaveOperationBase &
  GiveOperationMetadata;

export type Operation =
  | RequestInviteOperation
  | TrustOperation
  | MintOperation
  | GiveOperation;

export type OperationToBeCreated =
  | RequestInviteOperationToBeCreated
  | TrustOperationToBeCreated
  | MintOperationToBeCreated
  | GiveOperationToBeCreated;