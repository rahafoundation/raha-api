import { CollectionReference } from "@google-cloud/firestore";
import { Operation } from "../models/Operation";
import {
  ApiEndpointName,
  ApiCallDefinition,
  ApiResponseDefinition,
  ApiEndpointDefinition,
  createApiRoute,
  ApiEndpointUri
} from "./ApiEndpoint";
import { OperationsApiResponseBody } from "./ApiEndpoint/ApiResponse";
import { HttpVerb } from "../helpers/http";

export const listOperationsApiLocation: {
  uri: ApiEndpointUri.GET_OPERATIONS;
  method: HttpVerb.GET;
  authenticated: false;
} = {
  uri: ApiEndpointUri.GET_OPERATIONS,
  method: HttpVerb.GET,
  authenticated: false
};
export type ListOperationsApiCall = ApiCallDefinition<
  typeof listOperationsApiLocation,
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

/**
 * Lists all Operations.
 *
 * TODO: allow filtering of operations.
 */
export const listOperations = (operations: CollectionReference) =>
  createApiRoute<ListOperationsApiEndpoint>(async () => {
    // TODO: Do we need to paginate?
    const ops = await operations.orderBy("created_at").get();
    const parsedOps: Operation[] = [];
    ops.forEach(op =>
      parsedOps.push({
        id: op.id,
        creator_uid: op.get("creator_uid"),
        op_code: op.get("op_code"),
        // TODO: Figure out how to get Firestore to return Timestamp's instead of Dates.
        created_at: op.get("created_at"),
        data: op.get("data")
      })
    );

    return {
      body: parsedOps,
      status: 200
    };
  });
