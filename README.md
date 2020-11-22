## Node.js SDK for the [Personal Capital](https://www.personalcapital.com/) private API.

Node.js SDK that implements the private API for Personal Capital.

Authentication to the Personal Capital API is a bit tricky, as it's cookie-based, so the SDK is using a persisted cookie storage mechanism, where cookies are stored in a JSON file. This enables 2FA authentication to work, as the cookie session is restored upon load.

### Installation

```bash
$ npm install personal-capital-sdk
```

### Example

```
const PersonalCapital = require("personal-capital-sdk").PersonalCapital;

let pc = new PersonalCapital({
  cookiePath: "./pc-state.json",
});

(async () => {
  try {
    await pc.login("username", "password");

    console.log("authenticated!");
    let accounts = await pc.getAccounts();
    console.log("accounts", accounts);
  } catch (err) {
    console.log("err", err);
    if (err.message == "2FA_required") {
      console.log("2FA_required");

      await pc.challangeTwoFactor("sms");
      //await pc.enterTwoFactorCode("sms", "<code>");
      //await pc.login("username", "password");
      //let accounts = await pc.getAccounts();
    }
  }
})();
```

### API

Authentication:

- `login`
- `challangeTwoFactor`
- `enterTwoFactorCode`

API:

- `getHoldings`
- `getAccounts`
- `getHistories`
- `getUserTransactions`
- `updateInvestmentCashBalance`

## License

MIT

## Credits

- John Collins ([@jamaicanmoose](https://github.com/jamaicanmoose)) for https://github.com/JamaicanMoose/personalcapital-js
- Haochi Chen ([@haochi](https://github.com/haochi)) for https://github.com/haochi/personalcapital
