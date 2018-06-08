import { Operation } from "../../models/Operation";
import { SendInviteApiResponse, MintApiResponse } from "../me";
import {
  TrustMemberApiResponse,
  RequestInviteApiResponse,
  GiveApiResponse
} from "../members";
import { ListOperationsApiResponse } from "../operations";

export type OperationApiResponseBody = Operation;
export type OperationsApiResponseBody = Operation[];
export interface MessageApiResponseBody {
  message: string;
}

export interface ApiResponseDefinition<Status extends number, Body> {
  status: Status;
  body: Body;
}

// as more response types appear, expand this type
export type ApiResponse =
  | TrustMemberApiResponse
  | ListOperationsApiResponse
  | RequestInviteApiResponse
  | SendInviteApiResponse
  | MintApiResponse
  | GiveApiResponse;
export default ApiResponse;
