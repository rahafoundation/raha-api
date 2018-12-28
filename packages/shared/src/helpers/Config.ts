import Big from "big.js";

export const MILLISECONDS_PER_WEEK = Big(1000 * 60 * 60 * 24 * 7);

/*
 * Returns the appropriate Raha network config value.
 * Currently the only condition ever used is time,
 * but this could be extended to include transaction
 * history or external data sources.
 */
export class Config {
  public static readonly UBI_WEEKLY_RATE = Big(10)
  public static readonly MAX_WEEKS_ACCRUE = Big(4)
  public static readonly REFERRAL_BONUS_PRE_SPLIT = Big(60);
  public static readonly REFERRAL_BONUS_POST_SPLIT = Big(30);
  public static readonly INVITED_BONUS_PRE_SPLIT = Big(0);
  public static readonly INVITED_BONUS_POST_SPLIT = Big(30);
  public static readonly DEFAULT_DONATION_RATE = Big(0.03);
  public static readonly REFERRAL_SPLIT_DATE = Date.UTC(2019, 1, 1);
  public static get REFERRAL_BONUS() {
    if (Date.now() < this.REFERRAL_SPLIT_DATE) {
        return this.REFERRAL_BONUS_PRE_SPLIT;
    }
    return this.REFERRAL_BONUS_POST_SPLIT;
  }
  public static getInvitedBonus(memberCreatedAtMillis: number) {
    if (memberCreatedAtMillis < this.REFERRAL_SPLIT_DATE) {
        return this.INVITED_BONUS_PRE_SPLIT;
    }
    return this.INVITED_BONUS_POST_SPLIT;
  }
}
