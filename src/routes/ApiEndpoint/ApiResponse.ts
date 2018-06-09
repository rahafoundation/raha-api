import { Operation } from "../../models/Operation";
import { HttpStatusCode } from "../../helpers/http";
import ApiEndpoint from ".";

export type OperationApiResponseBody = Operation;
export type OperationsApiResponseBody = Operation[];
export interface MessageApiResponseBody {
  message: string;
}

export interface ApiResponseDefinition<Status extends HttpStatusCode, Body> {
  status: Status;
  body: Body;
}

type ApiResponse = ApiEndpoint["response"];
export default ApiResponse;
