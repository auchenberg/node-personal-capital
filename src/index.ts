import FormData from "form-data";
import { AuthLevel, TwoFactorMode } from "./enums";
import { FileCookieStore } from "tough-cookie-file-store";
import { CookieJar } from "tough-cookie";
import got from "got";
const debug = require("debug")("personalcapital");

export class PersonalCapital {
  authLevel: AuthLevel = AuthLevel.NONE;

  private csrf: string;
  private client: any;
  private cookieJar: any;

  constructor(options = { cookiePath: "./pc-cookie.json" }) {
    this.csrf = "";
    this.cookieJar = new CookieJar(new FileCookieStore(options.cookiePath));
    this.client = got.extend({
      prefixUrl: "https://home.personalcapital.com/",
      headers: {
        Accept: "*/*",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36",
      },
      cookieJar: this.cookieJar,
    });
  }

  // Authentication
  async login(username: string, password: string) {
    debug("login");

    if (this.authLevel == AuthLevel.SESSION_AUTHENTICATED) {
      return;
    }

    if (this.authLevel == AuthLevel.TWO_FACTOR_CODE_ENTERED) {
      return await this.authenticatePassword(password);
    }

    await this.getCSRFFromWebsite();
    await this.identifyUser(username);

    // Notes: If user is aucessfully authenticated the authLevel goes to USER_REMEMBERED, which means we can continue with password.
    // If authLevel is USER_IDENTIFIED, then it means that the user is valid, but 2FA is required.

    if (this.authLevel == AuthLevel.USER_IDENTIFIED) {
      throw new Error("2FA_required");
    } else {
      await this.authenticatePassword(password);
    }
  }
  async challangeTwoFactor(mode: TwoFactorMode) {
    debug("challangeTwoFactor");
    let data = {
      challengeReason: "DEVICE_AUTH",
      challengeMethod: "OP",
      challengeType: "SMS",
      apiClient: "WEB",
      bindDevice: "false",
      csrf: this.csrf,
    };

    let url;

    if (mode == TwoFactorMode.SMS) {
      url = "api/credential/challengeSms";
    } else if (mode == TwoFactorMode.EMAIL) {
      url = "api/credential/challengeEmail";
    }

    let res = await this.client.post(url, {
      body: this.dataToFormData(data),
    });

    let resHeader = JSON.parse(res.body).spHeader;
    this.authLevel = AuthLevel.TWO_FACTOR_CHALLANGED;
  }

  async enterTwoFactorCode(mode: TwoFactorMode, code: string) {
    debug("enterTwoFactorCode");

    if (this.authLevel != AuthLevel.TWO_FACTOR_CHALLANGED) {
      throw new Error("You need to call method challangeTwoFactor first");
    }

    let data = {
      challengeReason: "DEVICE_AUTH",
      challengeMethod: "OP",
      apiClient: "WEB",
      bindDevice: "false",
      code: code,
      csrf: this.csrf,
    };

    let url;

    if (mode == TwoFactorMode.SMS) {
      url = "api/credential/authenticateSms";
    } else if (mode == TwoFactorMode.EMAIL) {
      url = "api/credential/authenticateEmailByCode";
    }

    let res = await this.client.post(url, {
      body: this.dataToFormData(data),
    });

    let resHeader = JSON.parse(res.body).spHeader;
    this.authLevel = AuthLevel.TWO_FACTOR_CODE_ENTERED;

    debug("enterTwoFactorCode.done");
  }

  // API methods

  async getAccounts() {
    let res = await this.makeRequest("api/newaccount/getAccounts");
    return res.accounts;
  }

  async getHoldings() {
    let res = await this.makeRequest("api/invest/getHoldings");
    return res.holdings;
  }

  async getHistories(
    userAccountIds: string[],
    startDate: string,
    endDate: string,
    types: string[],
    intervalType: string
  ) {
    let res = await this.makeRequest("api/invest/getHistories", {
      userAccountIds,
      startDate,
      endDate,
      types,
      intervalType,
    });
    return res;
  }

  async getUserTransactions(
    userAccountIds: string[],
    startDate: string,
    endDate: string
  ) {
    let res = await this.makeRequest("api/invest/getUserTransactions", {
      userAccountIds,
      startDate,
      endDate,
    });
    return res;
  }

  async updateInvestmentCashBalance(userAccountId: string, newBalance: number) {
    let res = await this.makeRequest("api/account/updateHolding", {
      userAccountId: userAccountId,
      description: "Cash",
      quantity: newBalance,
      price: 1,
      priceSource: "USER",
      sourceAssetId: "USER_DESCR_Cash",
    });
    return res;
  }

  private dataToFormData(inputData: object): FormData {
    let form = new FormData();

    for (const property in inputData) {
      if (inputData[property]) {
        form.append(property, inputData[property]);
      }
    }

    return form;
  }

  private async authenticatePassword(password: string) {
    debug("authenticatePassword");

    try {
      let data = {
        bindDevice: "true",
        deviceName: "",
        redirectTo: "",
        skipFirstUse: "",
        skipLinkAccount: "false",
        referrerId: "",
        passwd: password,
        apiClient: "WEB",
        csrf: this.csrf,
      };

      let res = await this.client.post("api/credential/authenticatePassword", {
        body: this.dataToFormData(data),
      });

      let resHeader = JSON.parse(res.body).spHeader;

      if (resHeader.success == false) {
        console.log(resHeader.errors);
        throw new Error("loginFailed");
      } else {
        if ("authLevel" in resHeader) {
          this.authLevel = AuthLevel[resHeader.authLevel];
        }
      }
    } catch (error) {
      console.log(error.response.body);
    }

    debug("authenticatePassword.done");
  }

  private async identifyUser(username: string) {
    debug("identifyUser");

    // identify user and get a reusable CSRF code and stores it
    let data = {
      username: username,
      csrf: this.csrf,
      apiClient: "WEB",
      bindDevice: "false",
      skipLinkAccount: "false",
      redirectTo: "",
      skipFirstUse: "",
      referrerId: "",
    };

    let res = await this.client.post("api/login/identifyUser", {
      body: this.dataToFormData(data),
    });

    let resHeader = JSON.parse(res.body).spHeader;
    if (resHeader.success == false) {
      console.log(resHeader.errors);
      throw new Error("identifyUserFailed");
    } else {
      if ("csrf" in resHeader) {
        this.csrf = resHeader.csrf;
      }

      if ("authLevel" in resHeader) {
        this.authLevel = AuthLevel[resHeader.authLevel];
      }

      debug("identifyUser.done");
    }
  }

  private async getCSRFFromWebsite() {
    debug("getTempCsrf");
    let res = await this.client.get("");
    let match = res.body.match(/globals.csrf='([a-f0-9-]+)'/);

    if (match !== null) {
      this.csrf = match[1];
    }
    return;
  }

  private async makeRequest(url: string, data: object = {}) {
    debug("makeRequest");
    let requestData = {
      lastServerChangeId: "-1",
      csrf: this.csrf,
      apiClient: "WEB",
      ...data,
    };

    let res = await this.client.post(url, {
      body: this.dataToFormData(requestData),
    });

    return JSON.parse(res.body).spData;
  }
}
