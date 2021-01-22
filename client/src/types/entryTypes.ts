import { FeedEntry } from "./feedTypes";
import { BaseInterface } from "./modelTypes";

export interface EntryCache extends BaseInterface {
  sourceAndId: string;
  entries: FeedEntry[];
}

export interface EntryStatus extends BaseInterface {
  entryId: string;
  entry: FeedEntry;
  userId: string;
  feedName: string;
  url?: string;
  readAt?: string;
  spokenAt?: string;
  starredAt?: string;
  visitedAt?: string;
}

export type VisitedLinkData = {
  url: string;
  feedName: string;
  entryId: string;
};

export type StarredEntryData = {
  feedName: string;
  entry: FeedEntry;
  createdAt: number;
};
