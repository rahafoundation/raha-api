import { DocumentSnapshot } from "@google-cloud/firestore";
import Big from "big.js";

const RAHA_UBI_WEEKLY_RATE = 10;
const MILLISECONDS_PER_WEEK = 1000 * 60 * 60 * 24 * 7;
// TODO enable this on the 11/15/2018.
export const MINT_CAP = 40;

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
  const maxMintable = new Big(RAHA_UBI_WEEKLY_RATE)
    .times(sinceLastMinted)
    .div(MILLISECONDS_PER_WEEK);
  return maxMintable;
};
