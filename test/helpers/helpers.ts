import FeedsPage from "../pageobjects/feeds.page";

export function checkTimeSpentViews({
  timeSpentMini,
  timeSpentTimeInApp,
  timeSpentReadingEstimate,
  timeSpentVisualTimeInApp,
  timeSpentVisualReadingEstimate,
}: {
  timeSpentMini: string;
  timeSpentTimeInApp: string;
  timeSpentReadingEstimate: string;
  timeSpentVisualTimeInApp?: string;
  timeSpentVisualReadingEstimate?: string;
}) {
  if (!timeSpentVisualTimeInApp) timeSpentVisualTimeInApp = timeSpentTimeInApp;
  if (!timeSpentVisualReadingEstimate)
    timeSpentVisualReadingEstimate = timeSpentReadingEstimate;

  it(`TimeSpentMini should show ${timeSpentMini}`, function () {
    return expect(FeedsPage.getMiniTimeSpentTime()).toBe(timeSpentMini);
  });

  describe("Narrow screen tests", function () {
    before(function () {
      if (!FeedsPage.isNarrow) return this.skip();
    });

    it(`TimeSpentVisual time in app should show ${timeSpentVisualTimeInApp}`, function () {
      return expect(FeedsPage.getVisualTimeInAppTime()).toBe(
        timeSpentVisualTimeInApp
      );
    });

    it(`TimeSpentVisual estimated reading time should show ${timeSpentVisualReadingEstimate}`, function () {
      return expect(FeedsPage.getVisualEstimatedReadingTime()).toBe(
        timeSpentVisualReadingEstimate
      );
    });
  });

  it(`TimeSpent time in app should show ${timeSpentTimeInApp}`, function () {
    return expect(
      FeedsPage.isNarrow
        ? FeedsPage.getMobileTimeInAppTime()
        : FeedsPage.getTimeInAppTime()
    ).toBe(timeSpentVisualTimeInApp);
  });

  it(`TimeSpent reading estimate should show ${timeSpentReadingEstimate}`, function () {
    return expect(
      FeedsPage.isNarrow
        ? FeedsPage.getMobileReadingEstimateTime()
        : FeedsPage.getReadingEstimateTime()
    ).toBe(timeSpentReadingEstimate);
  });
}
