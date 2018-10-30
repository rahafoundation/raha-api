import { Operation, LegacyOperation } from "../../models/Operation";
import { HttpStatusCode } from "../../helpers/http";
import { ApiEndpoint } from ".";
import { PublicMemberFields } from "../../models/Member";

export type OperationApiResponseBody = Operation;
export type OperationsApiResponseBody = Operation[];
export type MembersApiResponseBody = PublicMemberFields[];
export interface MessageApiResponseBody {
  message: string;
}

export interface ApiResponseDefinition<Status extends HttpStatusCode, Body> {
  status: Status;
  body: Body;
}

export type ApiResponse = ApiEndpoint["response"];

// START LEGACY TYPES------------
export type LegacyOperationApiResponseBody = LegacyOperation;
export type LegacyOperationsApiResponseBody = LegacyOperation[];
// END LEGACY TYPES------------
