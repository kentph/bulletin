import FeedsPage from "../../pageobjects/feeds.page";
import { checkTimeSpentViews } from "../../helpers/helpers";

describe("Time Spent - desktop tests", function () {
  const createInactivityTest = function (becomeInactive: Function) {
    return function () {
      let testStart: number;

      before(
        "Reset database, signup, be active, then become inactive",
        function () {
          FeedsPage.resetDbAndSignUp();
          testStart = Date.now();
          browser.pause(95000);
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
      "Inactive for 30 seconds via new window is not counted",
      createInactivityTest(function () {
        const handle = browser.getWindowHandle();
        browser.newWindow("http://localhost", {
          windowFeatures:
            "width=420,height=230,resizable,scrollbars=yes,status=1",
        });
        browser.pause(30000);
        browser.closeWindow();
        browser.switchToWindow(handle);
      })
    );

    describe(
      "Inactive for 30 seconds via new tab is not counted",
      createInactivityTest(function () {
        const handle = browser.getWindowHandle();
        browser.newWindow("http://localhost");
        browser.pause(30000);
        browser.closeWindow();
        browser.switchToWindow(handle);
      })
    );

    describe(
      "Inactive for 30 seconds via minimize is not counted",
      createInactivityTest(function () {
        const handle = browser.getWindowHandle();
        browser.minimizeWindow();
        browser.pause(30000);
        browser.maximizeWindow();
        browser.switchToWindow(handle);
      })
    );

    // TODO test when computer asleep/screensaver on?

    describe("Activity for 15 seconds after being inactive is counted", function () {
      let testStart: number;

      before(
        "Reset database, signup, be active, then become inactive, then become active again",
        function () {
          FeedsPage.resetDbAndSignUp();
          testStart = Date.now();
          browser.pause(55000);
          const handle = browser.getWindowHandle();
          browser.minimizeWindow();
          browser.pause(10000);
          browser.maximizeWindow();
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

  describe("Offline requests are sent when back online", function () {
    let testStart: number;

    before(
      "Reset database, sign up, add a feed, go offline, visit various links, then come back online",
      function () {
        FeedsPage.resetDbSignUpAndAddFeed();
        FeedsPage.waitUntilFeedFetched();
        testStart = Date.now();
        // Go offline.
        browser.setNetworkConnection({ type: 0 });
        FeedsPage.visitLinkAndReturn(30000);
        browser.pause(35000);
        FeedsPage.visitLinkAndReturn(35000, 1);
        browser.pause(45000);
        // Go back online.
        // http://appium.io/docs/en/writing-running-appium/other/network-connection/
        browser.setNetworkConnection({ type: 6 });
        // Wait 10 seconds to give time for sending intervals and getting the response.
        browser.pause(10000);
      }
    );

    after("Logout and clear database", function () {
      FeedsPage.clearDbAndLogout();
    });

    afterEach("Check time elapsed", function () {
      if (Date.now() - testStart > 179999)
        throw Error(
          "Test took longer than 2 minutes and 59.999 seconds, making results invalid"
        );
    });

    checkTimeSpentViews({
      timeSpentMini: "2m",
      timeSpentTimeInApp: "1m",
      timeSpentReadingEstimate: "1m",
    });
  });
});
