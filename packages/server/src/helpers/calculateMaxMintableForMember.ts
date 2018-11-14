import { DocumentSnapshot } from "@google-cloud/firestore";
import Big from "big.js";

// TODO put this and other important constants into shared package.
const RAHA_UBI_WEEKLY_RATE = new Big(10);
const MAX_WEEKS_ACCRUE = new Big(4);
const MILLISECONDS_PER_WEEK = 1000 * 60 * 60 * 24 * 7;
export const MINT_CAP = RAHA_UBI_WEEKLY_RATE.times(MAX_WEEKS_ACCRUE);

// Set to midnight on Nov 16th, 2018 UTC
const MINT_CAP_TRANSITION_DATE_UTC = Date.UTC(2018, 10, 16);

/**
 * Return whether or not we're past the transition to capped mintable amounts.
 * TODO: This code can be removed after the mint cap transition date has passed.
 */
export function isPastMintCapTransitionDate() {
  return Date.now() >= MINT_CAP_TRANSITION_DATE_UTC;
}

/**
 * Return the maximum amount the member is allowed to mint.
 */
export const calculateMaxMintableForMember = (
  member: DocumentSnapshot
): Big => {
  const lastMinted: number =
    member.get("last_minted") || member.get("created_at") || Date.now();
  const now = Date.now();
  const sinceLastMinted = now - lastMinted;
  const maxMintable = RAHA_UBI_WEEKLY_RATE.times(sinceLastMinted)
    .div(MILLISECONDS_PER_WEEK)
    .round(2, 0);
  if (isPastMintCapTransitionDate()) {
    return maxMintable.gt(MINT_CAP) ? MINT_CAP : maxMintable;
  } else {
    return maxMintable;
  }
};
