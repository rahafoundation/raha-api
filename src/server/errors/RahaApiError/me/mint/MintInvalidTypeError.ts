import * as httpStatus from "http-status";

import { RahaApiError } from "../..";
import { MintType } from "../../../../../shared/models/Operation";
import { EnumValues } from "../../../../../../node_modules/enum-values";

export const ERROR_CODE = "mint.invalidType";
export interface MintInvalidTypeErrorBody {
  errorCode: typeof ERROR_CODE;
  inputtedType: string;
  validTypes: MintType[];
}

/**
 * Mint type is invalid
 */
export class MintInvalidTypeError extends RahaApiError<
  typeof ERROR_CODE,
  MintInvalidTypeErrorBody
> {
  get errorCode(): typeof ERROR_CODE {
    return ERROR_CODE;
  }

  constructor(inputtedType: string) {
    super(httpStatus.BAD_REQUEST, "Mint type was invalid.", {
      errorCode: "mint.invalidType",
      inputtedType,
      validTypes: EnumValues.getValues(MintType)
    });

    // this is necessary, typescript or not, for proper subclassing of builtins:
    // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
    // It is also necessary for any subclasses of this class, unfortunately.
    // TODO: once react-scripts 2.0 is out, we can use Babel Macros to do this automatically.
    // https://github.com/facebook/create-react-app/projects/3
    // https://github.com/loganfsmyth/babel-plugin-transform-builtin-extend
    Object.setPrototypeOf(this, MintInvalidTypeError.prototype);
  }
}
