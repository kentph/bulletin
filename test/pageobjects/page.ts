import { Element } from "@wdio/sync";

/**
 * main page object containing all methods, selectors and functionality
 * that is shared across all page objects
 */
export default class Page {
  WIDTH_THRESHOLD = 600;
  get isNarrow() {
    const viewport = browser.execute(() => {
      return {
        width: Math.max(
          document.documentElement.clientWidth,
          window.innerWidth || 0
        ),
        height: Math.max(
          document.documentElement.clientHeight,
          window.innerHeight || 0
        ),
      };
    });
    return viewport.width < this.WIDTH_THRESHOLD;
  }
  /**
   * Opens a sub page of the page.
   * LOCAL_URL will be prepended (see config).
   * @param path path of the sub page (e.g. /path/to/page.html)
   */
  open(path: string = "") {
    return browser.url(`/${path}`);
  }

  /**
   * Wait for element to exist, then click.
   * @param element
   */
  clickWhenExists(element: Element) {
    // waitForExist seems to work best.
    element.waitForExist();
    // element.waitForDisplayed();
    // element.waitForClickable();
    element.click();
  }
}
