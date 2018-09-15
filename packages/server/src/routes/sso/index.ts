import * as httpStatus from "http-status";
import * as discourseSSO from "discourse-sso";
import { CollectionReference, DocumentSnapshot } from "@google-cloud/firestore";
import { URL } from "url";

import { createApiRoute } from "..";
import { SSODiscourseApiEndpoint } from "@raha/api-shared/dist/routes/sso/definitions";
import { discourseSSOSecret } from "../../config/DO_NOT_COMMIT.secrets.config";
import { MissingParamsError } from "@raha/api-shared/dist/errors/RahaApiError/MissingParamsError";
import { HttpApiError } from "@raha/api-shared/dist/errors/HttpApiError";
import { Config } from "../../config/prod.config";

/**
 * Throws an error if member has zero or multiple associated
 * email addresses.
 */
function getEmailForUser(
  authIdentities: { [key: string]: any },
  memberObject: DocumentSnapshot
): string | undefined {
  const email = memberObject.get("email_address");
  if (email) {
    return email;
  }
  return authIdentities.email;
}

/**
 * Returns the signed SSO redirect URL for Raha Discourse.
 * See: https://meta.discourse.org/t/official-single-sign-on-for-discourse-sso/13045
 */
export const ssoDiscourse = (
  config: Config,
  membersCollection: CollectionReference
) =>
  createApiRoute<SSODiscourseApiEndpoint>(async (call, loggedInMemberToken) => {
    const { ssoRequestPayload, ssoRequestSignature } = call.body;

    const sso = new discourseSSO(discourseSSOSecret);

    if (!ssoRequestPayload || !ssoRequestSignature) {
      throw new MissingParamsError(["ssoRequestPayload", "ssoRequestPayload"]);
    }

    if (!sso.validate(ssoRequestPayload, ssoRequestSignature)) {
      throw new HttpApiError(
        httpStatus.BAD_REQUEST,
        "Payload did not validate.",
        {
          ssoRequestPayload,
          ssoRequestSignature
        }
      );
    }

    const loggedInFirebaseUid = loggedInMemberToken.uid;
    const loggedInMember = await membersCollection
      .doc(loggedInFirebaseUid)
      .get();

    const memberEmail = getEmailForUser(
      loggedInMemberToken.firebase.identities,
      loggedInMember
    );

    if (!memberEmail) {
      throw new HttpApiError(
        httpStatus.BAD_REQUEST,
        "Member has no associated email address.",
        {}
      );
    }

    const redirectQuerystring = sso.buildLoginString({
      nonce: sso.getNonce(ssoRequestPayload),
      external_id: loggedInMember.id,
      email: memberEmail,
      username: loggedInMember.get("username"),
      name: loggedInMember.get("full_name")
    });

    const returnUrl = `${new URL(
      "/session/sso_login",
      config.discourseBase
    ).toString()}?${redirectQuerystring}`;

    return { status: httpStatus.OK, body: { message: returnUrl } };
  });
