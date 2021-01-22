import { TouchAction } from "@wdio/sync";
import Page from "./page";
import model from "../../model";

class FeedsPage extends Page {
  private getElementByTestId = (name: string) => {
    return $(`[data-test='${name}']`);
  };

  private get usernameField() {
    return this.getElementByTestId("username");
  }

  private get passwordField() {
    return this.getElementByTestId("password");
  }

  private get submitLoginButton() {
    return this.getElementByTestId("submit-credentials");
  }

  private get signUpSwitch() {
    return this.getElementByTestId("sign-up-switch");
  }

  private get newClientNameField() {
    return this.getElementByTestId("new-client-name");
  }

  private get submitClientNameButton() {
    return this.getElementByTestId("submit-client-name");
  }

  private get logoutButton() {
    return this.getElementByTestId("logout");
  }

  private get miniTimeSpent() {
    return this.getElementByTestId("mini-time-spent");
  }

  private get menuButton() {
    return this.getElementByTestId("toggle-menu");
  }

  private get visualTimeSpent() {
    return this.getElementByTestId("visual-time-spent");
  }

  private get visualTimeInApp() {
    return this.getElementByTestId("visual-time-in-app");
  }

  private get visualEstimatedReading() {
    return this.getElementByTestId("visual-estimated-reading");
  }

  private get timeInApp() {
    return this.getElementByTestId("time-in-app");
  }

  private get readingEstimate() {
    return this.getElementByTestId("reading-estimate");
  }

  private get menuBar() {
    return this.getElementByTestId("menu-bar");
  }

  private get moreStatsButton() {
    return this.getElementByTestId("more-stats");
  }

  private get createFeedGroupButton() {
    return this.getElementByTestId("create-feed-group-button");
  }

  private get addFirstFeedButton() {
    return this.getElementByTestId("add-1st-feed-button");
  }

  private get feedEditorNameField() {
    return this.getElementByTestId("feed-editor-name-field");
  }

  private get feedEditorIdField() {
    return this.getElementByTestId("feed-editor-id-field");
  }

  private get feedEditorSaveButton() {
    return this.getElementByTestId("feed-editor-save-button");
  }

  private get simpleFeed() {
    return this.getElementByTestId("feed-simple");
  }

  private get entries() {
    return $$(`[data-test='entry']`);
  }

  private get simpleEntries() {
    return $$(`[data-test='simple-entry']`);
  }

  private get menuBackButton() {
    return this.getElementByTestId("menu-back-button");
  }

  private get focusedFeedCloseButton() {
    return this.getElementByTestId("focused-feed-close-button");
  }

  open() {
    return super.open();
  }

  login() {
    this.usernameField.waitForExist();
    this.usernameField.setValue("test");
    this.passwordField.setValue("asdfasdf");
    this.submitLoginButton.click();
    this.newClientNameField.waitForExist();
    this.newClientNameField.setValue("test");
    return this.submitClientNameButton.click();
  }

  logout() {
    if (!browser.getUrl().startsWith(browser.config.baseUrl)) return;
    // browser.clearLocalStorage() not defined, so using execute instead.
    browser.execute(function () {
      this.localStorage.clear();
    });
    return browser.refresh();
  }

  // TODO add this back if needed, and use the
  // change orientation trick to get acceptAlert working
  // (changing the orientation right before on iOS simulator seems to get
  // acceptAlert to work much faster and more consistently).

  // manualLogout() {
  //   this.menuButton.waitForExist();
  //   this.menuButton.click();
  //   this.logoutButton.waitForExist();
  //   this.logoutButton.click();
  //   return browser.waitUntil(function () {
  //     try {
  //       browser.acceptAlert();
  //       return true;
  //     } catch {
  //       // acceptAlert throws an error when there's no alert, so catch it.
  //       return false;
  //     }
  //   });
  //   return browser.acceptAlert();
  // }

  signup() {
    this.clickWhenExists(this.signUpSwitch);
    return this.login();
  }

  getMiniTimeSpentTime() {
    this.miniTimeSpent.waitForExist();
    return this.miniTimeSpent.getText();
  }

  openMenu() {
    if (
      this.menuBar.isExisting() &&
      this.menuBar.getAttribute("data-test-is-open") === "false"
    ) {
      this.clickWhenExists(this.menuButton);
      // Pause for animation.
      browser.pause(1000);
    }
  }

  closeMenu() {
    // Not clicking the back button to ensure that the submenu is unmounted
    // seems to cause strange errors, so making sure to do that.
    // Need to also ignore if the menu exists or not too?
    if (this.menuBackButton.isExisting()) this.menuBackButton.click();
    if (
      this.menuBar.isExisting() &&
      this.menuBar.getAttribute("data-test-is-open") === "true"
    ) {
      this.clickWhenExists(this.menuButton);
      // Pause for animation.
      browser.pause(1000);
    }
  }

  getVisualTimeInAppTime() {
    this.openMenu();
    this.visualTimeInApp.waitUntil(() => {
      return Boolean(this.visualTimeInApp.getText());
    });
    const text = this.visualTimeInApp.getText();
    this.closeMenu();
    return text;
  }

  getVisualEstimatedReadingTime() {
    this.openMenu();
    this.visualEstimatedReading.waitUntil(() => {
      return Boolean(this.visualEstimatedReading.getText());
    });
    const text = this.visualEstimatedReading.getText();
    this.closeMenu();
    return text;
  }

  getMobileTimeInAppTime() {
    this.openMenu();
    this.clickWhenExists(this.moreStatsButton);
    this.timeInApp.waitUntil(() => {
      return Boolean(this.timeInApp.getText());
    });
    const text = this.timeInApp.getText();
    this.closeMenu();
    return text;
  }

  getMobileReadingEstimateTime() {
    this.openMenu();
    this.clickWhenExists(this.moreStatsButton);
    this.readingEstimate.waitUntil(() => {
      return Boolean(this.readingEstimate.getText());
    });
    const text = this.readingEstimate.getText();
    this.closeMenu();
    return text;
  }

  getTimeInAppTime() {
    this.openMenu();
    this.timeInApp.waitUntil(() => {
      return Boolean(this.timeInApp.getText());
    });
    const text = this.timeInApp.getText();
    this.closeMenu();
    return text;
  }

  getReadingEstimateTime() {
    this.openMenu();
    this.readingEstimate.waitUntil(() => {
      return Boolean(this.readingEstimate.getText());
    });
    const text = this.readingEstimate.getText();
    this.closeMenu();
    return text;
  }

  addFirstFeed() {
    this.clickWhenExists(this.createFeedGroupButton);
    this.clickWhenExists(this.addFirstFeedButton);
    this.feedEditorNameField.waitForExist();
    this.feedEditorNameField.setValue("nasa");
    this.feedEditorIdField.setValue(
      "https://www.nasa.gov/rss/dyn/breaking_news.rss"
    );
    this.feedEditorSaveButton.click();
  }

  // HACK haven't been able to get the real header heights,
  // so hardcoding.
  private IOS_SAFARI_HEADER_PORTRAIT_HEIGHT = 114;
  private IOS_SAFARI_HEADER_LANDSCAPE_HEIGHT = 70;

  clickEntry(index = 0) {
    if (!this.isNarrow) {
      this.clickWhenExists(this.simpleFeed);
      // Also need to wait for animation on iOS since we're doing a native tap.
      if (browser.isIOS) browser.pause(3000);
    }
    browser.waitUntil(() => {
      return Boolean(this.entries && this.entries.length);
    });
    const entry = this.entries[index];
    const url = entry.getAttribute("href");
    if (browser.isIOS) {
      const { x, y } = entry.getLocation();
      // We don't want to just use .click() here since that
      // triggers the "This site is trying to open a popup" alert.
      // Instead we'll do a native tap.
      const context = browser.getContext();
      browser.switchContext("NATIVE_APP");

      // TODO try to figure out how to get Safari header heights programmatically.
      // Can probably use Appium client for this.
      // // const { height } = $(
      // //   browser.findElement("xpath", '//*[@label="topBrowserBar"]')
      // // ).getSize();
      // const selector = `type == 'XCUIElementTypeOther' && name CONTAINS 'topBrowserBar'`;
      // const { height } = browser.getElementSize(
      //   `-ios predicate string:${selector}`
      // );
      // // const { height } = browser.getElementSize(
      // //   "-ios predicate string:type == 'XCUIElementTypeOther' && name CONTAINS 'topBrowserBar'"
      // // );

      if (browser.getOrientation() === "PORTRAIT") {
        browser.touchAction({
          action: "tap",
          x: x + 10,
          y: y + this.IOS_SAFARI_HEADER_PORTRAIT_HEIGHT + 10,
        });
      } else {
        browser.touchAction({
          action: "tap",
          // Need to offset x by a potential notch on the left while in landscape.
          x: x + this.IOS_SAFARI_HEADER_PORTRAIT_HEIGHT + 10,
          y: y + this.IOS_SAFARI_HEADER_LANDSCAPE_HEIGHT + 10,
        });
      }

      browser.switchContext(context);
      browser.pause(3000);
    } else {
      entry.click();
    }
    return url;
  }

  closeFocusedFeed() {
    if (this.focusedFeedCloseButton.isExisting())
      this.clickWhenExists(this.focusedFeedCloseButton);
  }

  waitUntilFeedFetched() {
    browser.waitUntil(() => {
      if (browser.isIOS) return Boolean(this.entries && this.entries.length);
      else return Boolean(this.simpleEntries && this.simpleEntries.length);
    });
  }

  resetDbAndSignUp() {
    // (using sync mode, so need to wrap 3rd party calls with
    // browser.call)
    browser.call(() => model.resetDatabase());
    this.logout();
    this.open();
    this.signup();
  }

  clearDbAndLogout() {
    this.logout();
    browser.call(() => model.clearDatabase());
  }

  resetDbSignUpAndAddFeed() {
    let wasOrientationSwitched = false;
    this.resetDbAndSignUp();
    // Since we don't have an add feed ui on narrow screens, switch to landscape first.
    if (
      this.isNarrow &&
      browser.getOrientation &&
      browser.getOrientation() === "PORTRAIT"
    ) {
      wasOrientationSwitched = true;
      browser.setOrientation("LANDSCAPE");
    }
    this.addFirstFeed();
    if (wasOrientationSwitched) browser.setOrientation("PORTRAIT");
  }

  visitLinkAndReturn(waitMs: number, entryIndex?: number) {
    const isLandscape = browser.getOrientation
      ? browser.getOrientation() === "LANDSCAPE"
      : false;
    const title = browser.getTitle();

    const mainHandle = browser.getWindowHandle();
    const context = browser.isIOS ? browser.getContext() : undefined;

    this.clickEntry(entryIndex);

    browser.pause(waitMs);

    if (browser.isIOS) {
      // HACK need to work around lack of support for closeWindow in Appium.
      // https://developers.perfectomobile.com/display/TT/Switch+Window+Handle+Not+Supported+on+Mobile+Devices
      browser.switchContext("NATIVE_APP");
      $(browser.findElement("xpath", '//*[@label="Tabs"]')).click();
      $(browser.findElement("xpath", `//*[@label="${title}"]`)).click();
      browser.switchContext(context);
    } else {
      // https://github.com/appium/appium/issues/13879
      // Since we're not closing the link tab on iOS, will be consistent
      // and not do that here either.
      browser.switchToWindow(mainHandle);
      // browser.closeWindow();
    }
    if (isLandscape) browser.setOrientation("LANDSCAPE");
    this.closeFocusedFeed();
  }
}

export default new FeedsPage();
