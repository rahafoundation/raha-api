/**
 * Learn more about the requests Google App Engine uses to trigger cron jobs at
 * https://cloud.google.com/appengine/docs/flexible/nodejs/scheduling-jobs-with-cron-yaml.
 */

import {
  ApiEndpointUri,
  ApiResponseDefinition,
  ApiEndpointDefinition,
  ApiEndpointName
} from "../ApiEndpoint";
import { HttpVerb } from "../../helpers/http";
import {
  ApiLocationDefinition,
  ApiCallDefinition
} from "../ApiEndpoint/ApiCall";
import { MessageApiResponseBody } from "../ApiEndpoint/ApiResponse";

export type CronNotifyOnUnmintedApiLocation = ApiLocationDefinition<
  ApiEndpointUri.CRON_NOTIFY_ON_UNMINTED,
  HttpVerb.GET,
  false
>;
export const cronNotifyOnUnmintedApiLocation: CronNotifyOnUnmintedApiLocation = {
  uri: ApiEndpointUri.CRON_NOTIFY_ON_UNMINTED,
  method: HttpVerb.GET,
  authenticated: false
};
export type CronNotifyOnUnmintedApiCall = ApiCallDefinition<
  CronNotifyOnUnmintedApiLocation["uri"],
  CronNotifyOnUnmintedApiLocation["method"],
  CronNotifyOnUnmintedApiLocation["authenticated"],
  void,
  void
>;
export type CronNotifyOnUnmintedApiResponse = ApiResponseDefinition<
  200,
  MessageApiResponseBody
>;

export type CronNotifyOnUnmintedApiEndpoint = ApiEndpointDefinition<
  ApiEndpointName.SSO_DISCOURSE,
  CronNotifyOnUnmintedApiCall,
  CronNotifyOnUnmintedApiResponse
>;
