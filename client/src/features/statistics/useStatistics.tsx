import { useCallback, useEffect } from "react";
import Axios from "axios";
import useTimeIntervals, {
  intervalTypes,
  NewInterval,
} from "./useTimeIntervals";
import useVisitedLinks from "../feedEntries/useVisitedLinks";
import useFieldSelector from "../shared/useFieldSelector";
import { useDispatch } from "react-redux";
import { statisticsActions } from "../../app/statisticsReducer";

export const LAST_READING_INTERVAL_START = "LAST_READING_INTERVAL_START";
export const LAST_READING_INTERVAL_ENTRY_ID = "LAST_READING_INTERVAL_ENTRY_ID";
export const LAST_READING_INTERVAL_FEED_NAME =
  "LAST_READING_INTERVAL_FEED_NAME";

export type TotalTimeStatistics = {
  [clientId: string]: {
    [intervalType: string]: number;
  };
};

export type MostActiveFeedStatistics = {
  feedName: string;
  visits: number;
}[];

export type TimeSpentByFeedStatistics = {
  feedName: string;
  timeSpentReadingMs: number;
}[];

export default function useStatistics() {
  const dispatch = useDispatch();

  const isPageActive = useFieldSelector("app", "isVisible");
  const currentUser = useFieldSelector("auth", "currentUser");
  const client = useFieldSelector("auth", "client");

  const fetchTimeSpentToday = useCallback(async () => {
    try {
      // TODO look into createAsyncThunk.
      const response = await Axios.get(`/api/v1/statistics/usageToday`);
      dispatch(statisticsActions.setTotalTime(response.data));
    } catch (error) {
      console.error(error);
    }
  }, [dispatch]);

  const fetchTimeSpentAfterReadingEstimateUpdates = useCallback(
    async (sentBuffer: NewInterval[]) => {
      // Only refetch time spent if a reading interval was sent in the last buffer flush.
      if (
        sentBuffer.find(
          (interval) => interval.type === intervalTypes.LINK_READING_ESTIMATE
        )
      )
        fetchTimeSpentToday();
    },
    [fetchTimeSpentToday]
  );

  useTimeIntervals(
    !currentUser || !client || !isPageActive,
    fetchTimeSpentAfterReadingEstimateUpdates
  );

  useVisitedLinks(!currentUser);

  useEffect(
    function updateTimeSpentOnActive() {
      if (!isPageActive || !currentUser || !client) return;
      fetchTimeSpentToday();
    },
    [client, currentUser, fetchTimeSpentToday, isPageActive]
  );

  useEffect(
    function fetchMostActiveFeedsInPastMonth() {
      if (!isPageActive || !currentUser || !client) return;

      // TODO allow another way to trigger refresh of most active feeds, maybe
      // by exposing a function like logVisitedLink.

      // Refresh this every time page becomes active.
      (async function fetchMostActiveAsync() {
        try {
          const response = await Axios.get(
            `/api/v1/statistics/mostActiveFeeds`
          );
          dispatch(statisticsActions.setMostActiveFeeds(response.data));
        } catch (error) {
          console.error(error);
        }
      })();
    },
    [client, currentUser, dispatch, isPageActive]
  );

  useEffect(
    function fetchTimeSpentByFeedInPastMonth() {
      if (!isPageActive || !currentUser || !client) return;

      (async function fetchTimeSpentByFeedAsync() {
        try {
          const response = await Axios.get(
            `/api/v1/statistics/timeSpentByFeed`
          );
          dispatch(statisticsActions.setTimeSpentByFeed(response.data));
        } catch (error) {
          console.error(error);
        }
      })();
    },
    [client, currentUser, dispatch, isPageActive]
  );
}
