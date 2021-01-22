import FeedsPage from "../../pageobjects/feeds.page";
import model from "../../../model";
import { checkTimeSpentViews } from "../../helpers/helpers";

describe("Time Spent - shared tests", function () {
  describe("Before login", function () {
    let testStart: number;

    beforeEach("Reset database and open site", function () {
      browser.call(() => model.resetDatabase());
      FeedsPage.logout();
      FeedsPage.open();
      testStart = Date.now();
    });

    afterEach("Clear database", function () {
      browser.call(() => model.clearDatabase());
      FeedsPage.logout();
      if (Date.now() - testStart > 120000)
        throw Error("Test took longer than 2 minutes, making results invalid");
    });

    it("active for 1m before signup not counted", function () {
      browser.pause(61000);
      FeedsPage.signup();
      // TODO a custom error message would be nice.
      return expect(FeedsPage.getMiniTimeSpentTime()).toBe("<1m");
    });

    // TODO tests that deal with alerts have been very flaky, sometimes
    // the request times out, the logout button isn't found, or the outcome
    // of the test changes.
    // When we figure out how to handle this, we can reimplement this test that
    // requires a manual logout.

    // it("active for 1m before re-login not counted", function () {
    //   FeedsPage.signup();
    //   FeedsPage.logout();
    //   browser.pause(61000);
    //   FeedsPage.login();
    //   return expect(FeedsPage.getMiniTimeSpentTime()).toBe("<1m");
    // });

    it("active for 1m after login counted", function () {
      FeedsPage.signup();
      browser.pause(61000);
      return expect(FeedsPage.getMiniTimeSpentTime()).toBe("1m");
    });
  });

  describe("Logged in", function () {
    describe("On first launch", function () {
      let testStart: number;

      before(
        "Reset database, sign up, and record test start time",
        function () {
          FeedsPage.resetDbAndSignUp();
          testStart = Date.now();
        }
      );

      after("Logout and clear database", function () {
        FeedsPage.clearDbAndLogout();
      });

      afterEach("Check time elapsed", function () {
        if (Date.now() - testStart > 60000)
          throw Error(
            "Testing time exceeded 1 minute, making test results invalid"
          );
      });

      checkTimeSpentViews({
        timeSpentMini: "<1m",
        timeSpentTimeInApp: "<1m",
        timeSpentReadingEstimate: "<1m",
      });
    });

    describe("On active for 65 seconds", function () {
      let testStart: number;

      before(
        "Reset database, sign up, record test start time, and wait for 1 minute before refreshing",
        function () {
          FeedsPage.resetDbAndSignUp();
          testStart = Date.now();
          browser.pause(65000);
          browser.refresh();
          browser.pause(5000);
        }
      );

      after("Logout and clear database", function () {
        FeedsPage.clearDbAndLogout();
      });

      afterEach("Check time elapsed", function () {
        if (Date.now() - testStart > 119999)
          throw Error(
            "Testing time exceeded 1 minute and 59.999 seconds, making test results invalid"
          );
      });

      checkTimeSpentViews({
        timeSpentMini: "1m",
        timeSpentTimeInApp: "1m",
        timeSpentReadingEstimate: "<1m",
      });
    });

    describe("Time visiting link is not counted as active time, but as reading estimate", function () {
      let testStart: number;
      before(
        "Reset database, sign up, add a feed, and click first entry, then return",
        function () {
          FeedsPage.resetDbSignUpAndAddFeed();
          testStart = Date.now();
          browser.pause(25000);
          FeedsPage.visitLinkAndReturn(95000);
          // Wait 5 seconds for data to be updated.
          browser.pause(5000);
        }
      );

      after("Logout and clear database", function () {
        FeedsPage.clearDbAndLogout();
      });

      afterEach("Check time elapsed", function () {
        if (Date.now() - testStart > 179999)
          throw Error(
            "Testing time exceeded 2 minutes and 59.999 seconds, making test results invalid"
          );
      });

      checkTimeSpentViews({
        timeSpentMini: "2m",
        timeSpentTimeInApp: "<1m",
        timeSpentReadingEstimate: "1m",
      });
    });

    describe("Reading estimate is capped at the threshold (2 minutes for test environment)", function () {
      before(
        "Reset database, sign up, add a feed, and click first entry, wait 3 minutes, then return",
        function () {
          // Some issues with tapping in this test when there are tabs (from last test),
          // so making sure that the session/browser is fresh with a reset.
          if (browser.reset) browser.reset();
          FeedsPage.resetDbSignUpAndAddFeed();
          FeedsPage.visitLinkAndReturn(180000);
          // Wait 5 seconds for data to be updated.
          browser.pause(5000);
        }
      );

      after("Logout and clear database", function () {
        FeedsPage.clearDbAndLogout();
      });

      checkTimeSpentViews({
        timeSpentMini: "2m",
        timeSpentTimeInApp: "<1m",
        timeSpentReadingEstimate: "2m",
      });
    });
  });
});
