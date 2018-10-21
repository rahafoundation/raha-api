// TODO: change all to_uid to to_member_id
import { MemberId, MemberUsername, OperationId } from "./identifiers";
import { VideoReference, ImageReference } from "./MediaReference";

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
  videoReference: VideoReference;
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
  videoReference: VideoReference;
}
export interface InvitePayload {
  invite_token: string;
  is_joint_video: boolean;
  videoReference: VideoReference;
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

export enum GiveContentType {
  VIDEO = "video",
  IMAGE = "image"
}
/**
 * Expected shape of content field in a Give call's body
 */
export interface GiveContentDefinition<Type extends GiveContentType, Content> {
  type: Type;
  content: Content;
}
/**
 * Possible content fields in any Give call's body
 */
export type GiveContent = Array<
  | GiveContentDefinition<GiveContentType.VIDEO, VideoReference>
  | GiveContentDefinition<GiveContentType.IMAGE, ImageReference>
>;
export interface GivePayload {
  to_uid: MemberId;
  amount: string;
  memo: string | undefined;
  content: GiveContent | undefined;
  donation_to: MemberId;
  donation_amount: string;
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
