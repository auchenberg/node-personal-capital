require("dotenv").config();

const PersonalCapital = require("personal-capital-sdk").PersonalCapital;

let pc = new PersonalCapital({
  cookiePath: "./pc-cookie.json",
});

(async () => {
  try {
    await pc.login(process.env.USERNAME, process.env.PASSWORD);
    // Get accounts
    // let accounts = await pc.getAccounts();

    pc.updateInvestmentCashBalance("51066090", 57532.3);

    console.log("accounts", accounts);
  } catch (err) {
    console.log("err", err);
    if (err.message == "2FA_required") {
      console.log("2FA_required");

      await pc.challangeTwoFactor("sms");
      await pc.enterTwoFactorCode("sms", "<CODE>");
      await pc.login(process.env.USERNAME, process.env.PASSWORD);

      // Get accounts
      let accounts = await pc.getAccounts();
      console.log("accounts", accounts);
    }
  }
})();
