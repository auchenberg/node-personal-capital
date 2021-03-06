export enum AuthLevel {
  NONE = "NONE",
  USER_IDENTIFIED = "USER_IDENTIFIED",
  USER_REMEMBERED = "USER_REMEMBERED",
  TWO_FACTOR_CHALLANGED = "TWO_FACTOR_CHALLANGED",
  TWO_FACTOR_CODE_ENTERED = "2FA_CODE_ENTERED",
  DEVICE_AUTHORIZED = "DEVICE_AUTHORIZED",
  SESSION_AUTHENTICATED = "SESSION_AUTHENTICATED",
}

export enum TwoFactorMode {
  "SMS",
  "EMAIL",
}
