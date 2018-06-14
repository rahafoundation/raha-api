import * as crypto from "crypto";
import * as httpStatus from "http-status";
import { URL } from "url";

import { CollectionReference, Firestore } from "@google-cloud/firestore";
import * as Storage from "@google-cloud/storage";
import * as asyncBusboy from "async-busboy";
import Big from "big.js";
import * as coconut from "coconutjs";
import { firestore, storage as adminStorage } from "firebase-admin";

import { ApiError } from "../../errors/ApiError";
import {
  Operation,
  OperationToBeCreated,
  OperationType
} from "../../models/Operation";
import { MemberId } from "../../models/identifiers";
import {
  ApiCallDefinition,
  ApiResponseDefinition,
  ApiEndpointName,
  ApiEndpointDefinition,
  ApiEndpointUri
} from "./../ApiEndpoint";
import { createApiRoute } from "../";
import { OperationApiResponseBody } from "../ApiEndpoint/ApiResponse";
import { Config } from "../../config/prod.config";
import { Readable as ReadableStream } from "stream";
import { getMemberById } from "../../models/Member";
import { Context } from "koa";
import { HttpVerb } from "../../helpers/http";
import { ApiLocationDefinition } from "../ApiEndpoint/ApiCall";

/*
 * TODO: find a better way to narrow the types precisely than this repetitive type declaration
 */
export type RequestInviteApiLocation = ApiLocationDefinition<
  ApiEndpointUri.REQUEST_INVITE,
  HttpVerb.POST,
  true
>;
export const requestInviteApiLocation: RequestInviteApiLocation = {
  uri: ApiEndpointUri.REQUEST_INVITE,
  method: HttpVerb.POST,
  authenticated: true
};
export type RequestInviteApiCall = ApiCallDefinition<
  RequestInviteApiLocation["uri"],
  RequestInviteApiLocation["method"],
  RequestInviteApiLocation["authenticated"],
  { memberId: MemberId },
  { fullName: string; videoUrl: string; username: string }
>;
export type RequestInviteApiResponse = ApiResponseDefinition<
  201,
  OperationApiResponseBody
>;

export type RequestInviteApiEndpoint = ApiEndpointDefinition<
  ApiEndpointName.REQUEST_INVITE,
  RequestInviteApiCall,
  RequestInviteApiResponse
>;

/*
 * TODO: find a better way to narrow the types precisely than this repetitive type declaration
 */
export type TrustMemberApiLocation = ApiLocationDefinition<
  ApiEndpointUri.TRUST_MEMBER,
  HttpVerb.POST,
  true
>;
export const trustMemberApiLocation: TrustMemberApiLocation = {
  uri: ApiEndpointUri.TRUST_MEMBER,
  method: HttpVerb.POST,
  authenticated: true
};
export type TrustMemberApiCall = ApiCallDefinition<
  TrustMemberApiLocation["uri"],
  TrustMemberApiLocation["method"],
  TrustMemberApiLocation["authenticated"],
  { memberId: MemberId },
  void
>;
export type TrustMemberApiResponse = ApiResponseDefinition<
  201,
  OperationApiResponseBody
>;
export type TrustMemberApiEndpoint = ApiEndpointDefinition<
  ApiEndpointName.TRUST_MEMBER,
  TrustMemberApiCall,
  TrustMemberApiResponse
>;

/*
 * TODO: find a better way to narrow the types precisely than this repetitive type declaration
 */
export type GiveApiLocation = ApiLocationDefinition<
  ApiEndpointUri.GIVE,
  HttpVerb.POST,
  true
>;
export const giveApiLocation: GiveApiLocation = {
  uri: ApiEndpointUri.GIVE,
  method: HttpVerb.POST,
  authenticated: true
};
export type GiveApiCall = ApiCallDefinition<
  GiveApiLocation["uri"],
  GiveApiLocation["method"],
  GiveApiLocation["authenticated"],
  { memberId: MemberId },
  { amount: string; memo?: string }
>;
export type GiveApiResponse = ApiResponseDefinition<
  201,
  OperationApiResponseBody
>;
export type GiveApiEndpoint = ApiEndpointDefinition<
  ApiEndpointName.GIVE,
  GiveApiCall,
  GiveApiResponse
>;
