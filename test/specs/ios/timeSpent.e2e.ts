import FeedsPage from "../../pageobjects/feeds.page";
import { checkTimeSpentViews } from "../../helpers/helpers";

describe("Time Spent - iOS tests", function () {
  const createInactivityTest = function (becomeInactive: Function) {
    return function () {
      let testStart: number;

      before(
        "Reset database, signup, be active, then become inactive",
        function () {
          FeedsPage.resetDbAndSignUp();
          testStart = Date.now();
          browser.pause(105000);
          becomeInactive();
        }
      );

      after("Clear database and logout", function () {
        FeedsPage.clearDbAndLogout();
      });

      afterEach("Check time elapsed", function () {
        if (Date.now() - testStart > 179999)
          throw Error(
            "Test took longer than 2 minutes and 59.999 seconds, making results invalid"
          );
      });

      checkTimeSpentViews({
        timeSpentMini: "1m",
        timeSpentTimeInApp: "1m",
        timeSpentReadingEstimate: "<1m",
      });
    };
  };

  describe("Inactive time is not counted", function () {
    describe(
      "Inactive for 30 seconds via backgrounding app is not counted",
      createInactivityTest(function () {
        const handle = browser.getWindowHandle();
        // Should return the app back to foreground after 20 seconds.
        browser.background(20);
        browser.switchToWindow(handle);
      })
    );

    describe(
      "Inactive for 30 seconds via locking screen is not counted",
      createInactivityTest(function () {
        const handle = browser.getWindowHandle();
        // NOTE only iOS supports the seconds parameter.
        browser.lock(20);
        browser.switchToWindow(handle);
      })
    );

    describe("Activity for 15 seconds after being inactive is counted", function () {
      let testStart: number;

      before(
        "Reset database, signup, be active, then become inactive, then become active again",
        function () {
          FeedsPage.resetDbAndSignUp();
          testStart = Date.now();
          browser.pause(55000);
          // TODO not sure window handles actually do anything on iOS, consider removing.
          const handle = browser.getWindowHandle();
          browser.background(10);
          browser.switchToWindow(handle);
          browser.pause(15000);
        }
      );

      after("Clear database and logout", function () {
        FeedsPage.clearDbAndLogout();
      });

      afterEach("Check time elapsed", function () {
        if (Date.now() - testStart > 119999)
          throw Error(
            "Test took longer than 1 minute and 59.999 seconds, making results invalid"
          );
      });

      checkTimeSpentViews({
        timeSpentMini: "1m",
        timeSpentTimeInApp: "1m",
        timeSpentReadingEstimate: "<1m",
      });
    });
  });
});
