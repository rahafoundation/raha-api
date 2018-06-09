import * as httpStatus from "http-status";

export type HttpStatusCode = Extract<
  typeof httpStatus[keyof typeof httpStatus],
  number
>;

export function getHttpStatusText(statusCode: HttpStatusCode): string {
  return httpStatus[statusCode];
}
