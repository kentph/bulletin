import { FeedData } from "./feedTypes";
import { BaseInterface } from "./modelTypes";

export type FeedGroupData = { name: string; type: string; feeds: FeedData[] };

export interface Feeds extends BaseInterface {
  userId: string;
  feedGroups: FeedGroupData[];
}
