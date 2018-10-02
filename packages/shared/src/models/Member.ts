import { OperationId } from "./identifiers";

export interface PublicMemberFields {
  id: string;
  created_at: Date;
  full_name: string;
  identity_video_url: string;
  invite_confirmed: boolean;
  username: string;
  operationsFlaggingThisMember: OperationId[];
}

export interface PrivateMemberFields {
  email_address: string;
  email_address_is_verified: string;
}

export type Member = PublicMemberFields & PrivateMemberFields;
