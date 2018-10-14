import * as httpStatus from "http-status";

import { RahaApiError } from ".";
import { OperationType } from "../../models/Operation";

export const ERROR_CODE = "memberDoesNotHaveRequiredAbility";
export interface MemberDoesNotHaveRequiredAbilityErrorBody {
  errorCode: typeof ERROR_CODE;
  operationType: OperationType;
}

/**
 * Member does not have ability required for desired action.
 */
export class MemberDoesNotHaveRequiredAbilityError extends RahaApiError<
  typeof ERROR_CODE,
  MemberDoesNotHaveRequiredAbilityErrorBody
> {
  get errorCode(): typeof ERROR_CODE {
    return ERROR_CODE;
  }

  constructor(operationType: OperationType) {
    super(
      httpStatus.FORBIDDEN,
      `Member does not have the ability to perform operation: ${operationType}`,
      {
        errorCode: ERROR_CODE,
        operationType
      }
    );

    // this is necessary, typescript or not, for proper subclassing of builtins:
    // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
    // It is also necessary for any subclasses of this class, unfortunately.
    // TODO: once react-scripts 2.0 is out, we can use Babel Macros to do this automatically.
    // https://github.com/facebook/create-react-app/projects/3
    // https://github.com/loganfsmyth/babel-plugin-transform-builtin-extend
    Object.setPrototypeOf(
      this,
      MemberDoesNotHaveRequiredAbilityError.prototype
    );
  }
}
