import { BaseInterface } from "./modelTypes";

export type SettingsData = Partial<{
  alwaysCollapseRead: boolean;
  showUnreadFirst: boolean;
  dontLoadImmediately: boolean;
  shouldShowSmallEntries: boolean;
  showReopenLastVisited: boolean;
  openLinksInSameWindow: boolean;
  collapsedFeedGroups: string[];
  collapsedFeeds: string[];
  themeClass: string;
  feedsToAnnounce: string[];
  muteFeedAnnouncements: boolean;
  voice: string;
  hideStickyHeaders: boolean;
  showBottomBars: boolean;
}>;

export interface Settings extends BaseInterface {
  userId: string;
  clientId: string;
  data: SettingsData;
}
