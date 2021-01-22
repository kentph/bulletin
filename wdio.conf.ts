import { Config } from "webdriverio";

const config: Config = {
  port: 4723,
  runner: "local",
  specs: ["./test/specs/all/**/*.ts"],

  // TODO launch a separate database per test suite so that we can have concurrency.

  maxInstances: 1,
  capabilities: [
    // Chrome wide screen
    // TODO figure out how to have same browser but different window sizes (to test wide and narrow views).
    {
      specs: ["./test/specs/all/**/*.ts", "./test/specs/desktop/**/*.ts"],
      maxInstances: 1,
      browserName: "chrome",
      acceptInsecureCerts: true,
      // https://webdriver.io/docs/api/chromium.html#setnetworkconnection
      "goog:chromeOptions": {
        // Network emulation requires device mode, which is only enabled when mobile emulation is on
        mobileEmulation: { deviceName: "iPad" },
      },
      networkConnectionEnabled: true,
    },
    // iOS portrait
    // From https://github.com/webdriverio/appium-boilerplate/blob/master/config/wdio.ios.browser.conf.js
    {
      specs: ["./test/specs/all/**/*.ts", "./test/specs/ios/**/*.ts"],
      browserName: "safari",
      platformName: "iOS",
      maxInstances: 1,
      deviceName: "iPhone 11",
      platformVersion: "13.4",
      orientation: "PORTRAIT",
      automationName: "XCUITest",
      newCommandTimeout: 300,
    },
    // iOS landscape
    {
      specs: ["./test/specs/all/**/*.ts", "./test/specs/ios/**/*.ts"],
      browserName: "safari",
      platformName: "iOS",
      maxInstances: 1,
      deviceName: "iPhone 11",
      platformVersion: "13.4",
      orientation: "LANDSCAPE",
      automationName: "XCUITest",
      newCommandTimeout: 300,
    },
  ],
  logLevel: "info",
  bail: 0,
  baseUrl: `${process.env.LOCAL_URL}:4000`,
  waitforTimeout: 10000,
  connectionRetryTimeout: 300000,
  connectionRetryCount: 3,
  services: ["chromedriver", "appium"],

  framework: "mocha",
  reporters: ["spec"],

  // TODO not part of the Config type??? seems to be working, just linting is broken
  // https://github.com/webdriverio/webdriverio/issues/5575
  mochaOpts: {
    // TODO is this TypeScript setup necessary?
    // require: ["ts-node/register"],
    ui: "bdd",
    timeout: 300000,
  },
};

export { config };
