import { URL } from "url";
import Big from "big.js";
import { firestore } from "firebase-admin";
import { CollectionReference, Firestore } from "@google-cloud/firestore";
import * as sgMailLib from "@sendgrid/mail";

import BadRequestError from "../errors/BadRequestError";
import {
  ApiEndpointDefinition,
  ApiCallDefinition,
  ApiEndpoint
} from "./ApiEndpoint";
import { OperationApiResponse, MessageApiResponse } from "./ApiResponse";
import { Config } from "../config/prod.config";

const RAHA_UBI_WEEKLY_RATE = 10;
const MILLISECONDS_PER_WEEK = 1000 * 60 * 60 * 24 * 7;

export type SendInviteApiCall = ApiCallDefinition<
  ApiEndpoint.SEND_INVITE,
  void,
  { inviteEmail: string }
>;
export type SendInviteApiEndpoint = ApiEndpointDefinition<
  SendInviteApiCall,
  MessageApiResponse
>;

export const sendInvite = (
  config: Config,
  sgMail: typeof sgMailLib,
  members: CollectionReference
) => async ctx => {
  const loggedInUid = ctx.state.user.uid;
  const loggedInMember = await members.doc(loggedInUid).get();

  const { inviteEmail } = ctx.request.body as SendInviteApiCall["body"];

  if (!loggedInMember.exists) {
    throw new BadRequestError(
      "You must yourself have been invited to Raha to send invites."
    );
  }

  if (!inviteEmail) {
    throw new BadRequestError("No invite email included in request.");
  }

  const loggedInFullName = loggedInMember.get("full_name");
  const loggedInUsername = loggedInMember.get("username");
  const inviteLink = new URL(
    `/m/${loggedInUsername}/invite`,
    config.appBase
  ).toString();

  const msg = {
    to: inviteEmail,
    from: "invites@raha.io",
    subject: `${loggedInFullName} invited you to join Raha!`,
    text:
      "Raha is the foundation for a global universal basic income. " +
      "To ensure that only real humans can join, people must be invited " +
      `by an existing member of the Raha network. ${loggedInFullName} ` +
      "has invited you to join!\n\n" +
      `Visit ${inviteLink} to join Raha!`,
    html:
      "<span><strong>Raha is the foundation for a global universal basic income.</strong><br /><br />" +
      "To ensure that only real humans can join, people must be invited " +
      `by an existing member of the Raha network. ${loggedInFullName} ` +
      "has invited you to join!</span><br /><br />" +
      `<span><strong>Visit <a href="${inviteLink}">${inviteLink}</a> to join Raha!</strong></span>`
  };
  sgMail.send(msg);

  ctx.body = {
    message: "Invite succesfully sent!"
  } as SendInviteApiEndpoint["response"];
  ctx.status = 201;
};

export type MintApiCall = ApiCallDefinition<
  ApiEndpoint.MINT,
  void,
  { amount: string }
>;
export type MintApiEndpoint = ApiEndpointDefinition<
  MintApiCall,
  OperationApiResponse
>;

export const mint = (
  db: Firestore,
  members: CollectionReference,
  operations: CollectionReference
) => async ctx => {
  const newOperationReference = await db.runTransaction(async transaction => {
    const loggedInUid = ctx.state.user.uid;
    const loggedInMember = await transaction.get(members.doc(loggedInUid));

    const { amount } = ctx.request.body as MintApiCall["body"];

    const creatorBalance = new Big(loggedInMember.get("raha_balance") || 0);
    const lastMinted: number =
      loggedInMember.get("last_minted") ||
      loggedInMember.get("created_at") ||
      Date.now();
    const now = Date.now();
    const sinceLastMinted = now - lastMinted;
    // Round to 2 decimal places and using rounding mode 0 = round down.
    const bigAmount = new Big(amount).round(2, 0);
    const maxMintable =
      (RAHA_UBI_WEEKLY_RATE * sinceLastMinted) / MILLISECONDS_PER_WEEK;
    if (bigAmount.gt(maxMintable)) {
      throw new BadRequestError("Mint amount exceeds the allowed amount.");
    }

    const newCreatorBalance = creatorBalance.plus(bigAmount);
    const newOperation = {
      creator_uid: loggedInUid,
      op_code: "MINT",
      data: {
        amount: bigAmount.toString()
      },
      created_at: firestore.FieldValue.serverTimestamp()
    };
    const newOperationRef = operations.doc();
    transaction
      .update(loggedInMember.ref, {
        raha_balance: newCreatorBalance.toString(),
        last_minted: firestore.FieldValue.serverTimestamp()
      })
      .set(newOperationRef, newOperation);
    return newOperationRef;
  });

  ctx.body = {
    ...(await newOperationReference.get()).data(),
    id: newOperationReference.id
  } as MintApiEndpoint["response"];
  ctx.status = 201;
};
