import { URL } from "url";

import { firestore } from "firebase-admin";
import { CollectionReference } from "@google-cloud/firestore";

import BadRequestError from "../errors/BadRequestError";

const RAHA_UBI_WEEKLY_RATE = 10;
const MILLISECONDS_PER_WEEK = 1000 * 60 * 60 * 24 * 7;

export const sendInvite = (
  config,
  sgMail,
  members: CollectionReference
) => async ctx => {
  const loggedInUid = ctx.state.user.uid;
  const loggedInMember = await members.doc(loggedInUid).get();
  const { inviteEmail } = ctx.request.body;

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
  ctx.status = 201;
  ctx.body = {
    message: "Invite succesfully sent!"
  };
};

export const mint = (
  db,
  members: CollectionReference,
  operations: CollectionReference
) => async ctx => {
  const newOperationReference = await db.runTransaction(async transaction => {
    const loggedInUid = ctx.state.user.uid;
    const loggedInMember = await transaction.get(members.doc(loggedInUid));
    const { amount } = ctx.request.body;

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
      RAHA_UBI_WEEKLY_RATE * sinceLastMinted / MILLISECONDS_PER_WEEK;
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
  };
  ctx.status = 201;
};
