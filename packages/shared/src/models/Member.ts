import { OperationId } from "./identifiers";
import { Omit } from "../helpers/Omit";

export interface PublicMemberFields {
  id: string;
  created_at: Date;
  full_name: string;
  identity_video_url: string;
  invite_confirmed: boolean;
  username: string;
  operationsFlaggingThisMember?: OperationId[];
}

export interface PrivateMemberFields {
  email_address: string;
  email_address_is_verified: boolean;
}

export type Member = PublicMemberFields & PrivateMemberFields;
export type MemberToBeCreated = Omit<Member, "created_at" | "id">;
