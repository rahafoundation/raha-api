import { OperationId } from "./identifiers";
import { VideoReference } from "./MediaReference";

export interface PublicMemberFields {
  id: string;
  created_at: Date;
  full_name: string;
  identityVideoReference: VideoReference;
  invite_confirmed: boolean;
  username: string;
  operationsFlaggingThisMember: OperationId[];
}

export interface PrivateMemberFields {
  email_address: string;
  email_address_is_verified: string;
}

export type Member = PublicMemberFields & PrivateMemberFields;
