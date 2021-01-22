import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import moment from "moment";
import {
  TotalTimeStatistics,
  MostActiveFeedStatistics,
  TimeSpentByFeedStatistics,
} from "../features/statistics/useStatistics";

export type TimeSpentCounter = {
  num: number | undefined;
  str: string | undefined;
};

export const convertTimeToString = (time: number, shortForm?: boolean) => {
  const duration = moment.duration(time);
  if (!shortForm) return duration.humanize();
  const hours = duration.hours();
  const minutes = duration.minutes();
  if (!hours && !minutes) return "<1m";
  return `${hours ? hours + "h " : ""}${minutes + "m"}`;
};

interface State {
  totalTime: TotalTimeStatistics | undefined;
  mostActiveFeeds: MostActiveFeedStatistics | undefined;
  timeSpentByFeed: TimeSpentByFeedStatistics | undefined;
  timeSpentCountersByKey: {
    [key: string]: TimeSpentCounter;
  };
}

const initialState: State = {
  totalTime: undefined,
  mostActiveFeeds: undefined,
  timeSpentByFeed: undefined,
  timeSpentCountersByKey: {},
};

const { actions: statisticsActions, reducer: statisticsReducer } = createSlice({
  name: "statistics",
  initialState,
  reducers: {
    setTotalTime(state, action: PayloadAction<typeof initialState.totalTime>) {
      state.totalTime = action.payload;
    },
    setMostActiveFeeds(
      state,
      action: PayloadAction<typeof initialState.mostActiveFeeds>
    ) {
      state.mostActiveFeeds = action.payload;
    },
    setTimeSpentByFeed(
      state,
      action: PayloadAction<typeof initialState.timeSpentByFeed>
    ) {
      state.timeSpentByFeed = action.payload;
    },
    setTimeSpent(
      state,
      action: PayloadAction<{ key: string; value: TimeSpentCounter["num"] }>
    ) {
      state.timeSpentCountersByKey[action.payload.key] = {
        num: action.payload.value,
        str:
          action.payload.value !== undefined
            ? convertTimeToString(action.payload.value, true)
            : undefined,
      };
    },
  },
});

export type StatisticsState = ReturnType<typeof statisticsReducer>;

export { statisticsActions };
export default statisticsReducer;
