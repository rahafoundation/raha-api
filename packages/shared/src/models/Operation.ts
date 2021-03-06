// TODO: change all to_uid to to_member_id
import { MemberId, MemberUsername, OperationId } from "./identifiers";

export enum OperationType {
  CREATE_MEMBER = "CREATE_MEMBER",
  EDIT_MEMBER = "EDIT_MEMBER",
  FLAG_MEMBER = "FLAG_MEMBER",
  RESOLVE_FLAG_MEMBER = "RESOLVE_FLAG_MEMBER",
  REQUEST_VERIFICATION = "REQUEST_VERIFICATION",
  VERIFY = "VERIFY",
  INVITE = "INVITE",
  TRUST = "TRUST",
  MINT = "MINT",
  GIVE = "GIVE"
}

export interface CreateMemberPayload {
  full_name: string;
  request_invite_from_member_id?: MemberId;
  username: MemberUsername;
}
export interface EditMemberPayload {
  full_name?: string;
  username?: string;
}
export interface FlagMemberPayload {
  to_uid: MemberId;
  reason: string;
}
export interface ResolveFlagMemberPayload {
  to_uid: MemberId;
  flag_operation_id: OperationId;
  reason: string;
}
export interface RequestVerificationPayload {
  to_uid: MemberId;
  invite_token?: string;
}
export interface VerifyPayload {
  to_uid: MemberId;
  video_url: string;
}
export interface InvitePayload {
  invite_token: string;
  is_joint_video: boolean;
  video_token: string;
}
export interface TrustPayload {
  to_uid: MemberId;
}
export enum MintType {
  BASIC_INCOME = "BASIC_INCOME",
  // Bonus for inviting someone else
  REFERRAL_BONUS = "REFERRAL_BONUS",
  // Bonus for joining the network through an invite
  INVITED_BONUS = "INVITED_BONUS",
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
export interface MintInvitedBonusPayload {
  type: MintType.INVITED_BONUS;
  amount: string;
}
export type MintPayload = MintBasicIncomePayload | MintReferralBonusPayload | MintInvitedBonusPayload;
export interface MintReferralBonusOperation extends MintOperation {
  data: MintReferralBonusPayload;
}

export interface MintBasicIncomeOperation extends MintOperation {
  data: MintBasicIncomePayload;
}

export interface MintInvitedBonus extends MintOperation {
  data: MintInvitedBonusPayload;
}


export enum GiveType {
  DIRECT_GIVE = "DIRECT_GIVE",
  TIP = "TIP"
}
export interface DirectGiveMetadata {
  type: GiveType.DIRECT_GIVE;
  memo?: string;
}
export interface TipMetadata {
  type: GiveType.TIP;
  memo?: string;
  targetOperationId: OperationId;
}

export interface DirectGivePayload extends GivePayload {
  metadata: DirectGiveMetadata;
}

export interface TipGivePayload extends GivePayload {
  metadata: TipMetadata;
}

export interface DirectGiveOperation extends GiveOperation {
  data: DirectGivePayload;
}

export interface TipGiveOperation extends GiveOperation {
  data: TipGivePayload;
}

export interface GivePayload {
  to_uid: MemberId;
  amount: string;
  donation_to: MemberId;
  donation_amount: string;
  metadata?: DirectGiveMetadata | TipMetadata;

  // Deprecated in favor of metadata
  memo?: string;
}

export interface ToSaveOperationBase {
  // TODO: rename to creatorId to remove uid
  creator_uid: MemberId;
}

export interface SavedOperationBase {
  id: OperationId;
  creator_uid: MemberId;
  created_at: Date;
}

interface CreateMemberOperationMetadata {
  op_code: OperationType.CREATE_MEMBER;
  data: CreateMemberPayload;
}
export type CreateMemberOperation = SavedOperationBase &
  CreateMemberOperationMetadata;
export type CreateMemberOperationToBeCreated = ToSaveOperationBase &
  CreateMemberOperationMetadata;

interface EditMemberOperationMetadata {
  op_code: OperationType.EDIT_MEMBER;
  data: EditMemberPayload;
}
export type EditMemberOperation = SavedOperationBase &
  EditMemberOperationMetadata;
export type EditMemberOperationToBeCreated = ToSaveOperationBase &
  EditMemberOperationMetadata;

interface FlagMemberOperationMetadata {
  op_code: OperationType.FLAG_MEMBER;
  data: FlagMemberPayload;
}
export type FlagMemberOperation = SavedOperationBase &
  FlagMemberOperationMetadata;
export type FlagMemberOperationToBeCreated = ToSaveOperationBase &
  FlagMemberOperationMetadata;

interface ResolveFlagMemberOperationMetadata {
  op_code: OperationType.RESOLVE_FLAG_MEMBER;
  data: ResolveFlagMemberPayload;
}
export type ResolveFlagMemberOperation = SavedOperationBase &
  ResolveFlagMemberOperationMetadata;
export type ResolveFlagMemberOperationToBeCreated = ToSaveOperationBase &
  ResolveFlagMemberOperationMetadata;

interface RequestVerificationMetadata {
  op_code: OperationType.REQUEST_VERIFICATION;
  data: RequestVerificationPayload;
}
export type RequestVerificationOperation = SavedOperationBase &
  RequestVerificationMetadata;
export type RequestVerificationOperationToBeCreated = ToSaveOperationBase &
  RequestVerificationMetadata;

interface VerifyOperationMetadata {
  op_code: OperationType.VERIFY;
  data: VerifyPayload;
}
export type VerifyOperation = SavedOperationBase & VerifyOperationMetadata;
export type VerifyOperationToBeCreated = ToSaveOperationBase &
  VerifyOperationMetadata;

interface InviteOperationMetadata {
  op_code: OperationType.INVITE;
  data: InvitePayload;
}
export type InviteOperation = SavedOperationBase & InviteOperationMetadata;
export type InviteOperationToBeCreated = ToSaveOperationBase &
  InviteOperationMetadata;

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
  | CreateMemberOperation
  | EditMemberOperation
  | FlagMemberOperation
  | ResolveFlagMemberOperation
  | RequestVerificationOperation
  | VerifyOperation
  | InviteOperation
  | TrustOperation
  | MintOperation
  | GiveOperation;

export type OperationToBeCreated =
  | CreateMemberOperationToBeCreated
  | EditMemberOperationToBeCreated
  | FlagMemberOperationToBeCreated
  | ResolveFlagMemberOperationToBeCreated
  | RequestVerificationOperationToBeCreated
  | VerifyOperationToBeCreated
  | InviteOperationToBeCreated
  | TrustOperationToBeCreated
  | MintOperationToBeCreated
  | GiveOperationToBeCreated;
