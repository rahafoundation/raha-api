import {
  ApiEndpointUri,
  ApiResponseDefinition,
  ApiEndpointDefinition,
  ApiEndpointName
} from "../../types/ApiEndpoint";
import { HttpVerb } from "../../types/helpers/http";
import {
  ApiLocationDefinition,
  ApiCallDefinition
} from "../../types/ApiEndpoint/ApiCall";
import { OperationsApiResponseBody } from "../../types/ApiEndpoint/ApiResponse";

/*
 * TODO: find a better way to narrow the types precisely than this repetitive type declaration
 */
export type ListOperationsApiLocation = ApiLocationDefinition<
  ApiEndpointUri.GET_OPERATIONS,
  HttpVerb.GET,
  false
>;
export const listOperationsApiLocation: ListOperationsApiLocation = {
  uri: ApiEndpointUri.GET_OPERATIONS,
  method: HttpVerb.GET,
  authenticated: false
};
export type ListOperationsApiCall = ApiCallDefinition<
  ListOperationsApiLocation["uri"],
  ListOperationsApiLocation["method"],
  ListOperationsApiLocation["authenticated"],
  void,
  void
>;
export type ListOperationsApiResponse = ApiResponseDefinition<
  200,
  OperationsApiResponseBody
>;

export type ListOperationsApiEndpoint = ApiEndpointDefinition<
  ApiEndpointName.GET_OPERATIONS,
  ListOperationsApiCall,
  ListOperationsApiResponse
>;
