import * as httpStatus from "http-status";

export enum HttpVerb {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  DELETE = "DELETE",
  PATCH = "PATCH"
}

export type HttpStatusCode = Extract<
  typeof httpStatus[keyof typeof httpStatus],
  number
>;

export function getHttpStatusText(statusCode: HttpStatusCode): string {
  return httpStatus[statusCode];
}
