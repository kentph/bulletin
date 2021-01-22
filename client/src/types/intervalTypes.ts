import { BaseInterface } from "./modelTypes";

export enum IntervalType {
  ACTIVE_IN_APP = "ACTIVE_IN_APP",
  LINK_READING_ESTIMATE = "LINK_READING_ESTIMATE",
}

export interface Interval extends BaseInterface {
  userId: string;
  clientId: string;
  type: IntervalType;
  entryId?: string;
  feedName?: string;
  startedAt: string;
  endedAt: string;
}
