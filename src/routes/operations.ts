import { CollectionReference } from "@google-cloud/firestore";
import { Operation } from "../models/Operation";
import {
  ApiEndpoint,
  ApiCallDefinition,
  ApiEndpointDefinition
} from "./ApiEndpoint";
import { OperationsApiResponse } from "./ApiResponse";

/**
 * Defines how to call the ListOperations endpoint
 */
export type ListOperationsApiCall = ApiCallDefinition<
  ApiEndpoint.GET_OPERATIONS,
  void,
  void
>;

/**
 * Fully defines the ListOperations endpoint
 */
export type ListOperationsApiEndpoint = ApiEndpointDefinition<
  ListOperationsApiCall,
  OperationsApiResponse
>;

export interface ListOperationsRequestParams {}
export interface ListOperationsRequestBody {}
export type ListOperationsResponseBody = Operation[];
/**
 * Lists all Operations.
 *
 * TODO: allow filtering of operations.
 */
export const listOperations = (
  operations: CollectionReference
) => async ctx => {
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
  ctx.body = JSON.stringify(parsedOps);
  ctx.status = 200;
};
