import { useRef, useCallback, useEffect } from "react";
import moment from "moment";
import {
  LAST_READING_INTERVAL_START,
  LAST_READING_INTERVAL_ENTRY_ID,
  LAST_READING_INTERVAL_FEED_NAME,
} from "./useStatistics";
import useRequestBuffer from "../api/useRequestBuffer";
import { networkActions } from "../../app/networkReducer";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../app/rootReducer";

export const intervalTypes = {
  LINK_READING_ESTIMATE: "LINK_READING_ESTIMATE",
  ACTIVE_IN_APP: "ACTIVE_IN_APP",
} as const;

export type NewInterval = {
  type: keyof typeof intervalTypes;
  startedAt: number;
  endedAt: number;
};

type NewReadingInterval = NewInterval & {
  type: typeof intervalTypes.LINK_READING_ESTIMATE;
  entryId: string;
  feedName: string;
};

const LINK_READING_THRESHOLD_MINUTES =
  process.env.REACT_APP_LINK_READING_THRESHOLD_MINUTES || 20;
const ACTIVE_INTERVAL_UPDATE_INTERVAL_MS = 10000;
export const INTERVAL_BUFFER = "INTERVAL_BUFFER";

export default function useTimeIntervals(
  notReady: boolean,
  fetchTimeSpentToday: (sentBuffer: NewInterval[]) => any
) {
  const dispatch = useDispatch();

  const intervals = useSelector(
    (state: RootState) =>
      // TODO remove type casting when requestBuffersByKey is typed.
      state.network.requestBuffersByKey[INTERVAL_BUFFER] as
        | NewInterval[]
        | undefined
  );

  // TODO make sure this doesn't overwrite any existing buffer.
  useEffect(
    function initializeIntervalBuffer() {
      dispatch(networkActions.setBuffer({ key: INTERVAL_BUFFER, buffer: [] }));
    },
    [dispatch]
  );

  const activeIntervalStart = useRef<Date>();
  const activeIntervalEnd = useRef<Date>();

  const mapBufferToRequestBody = useCallback(
    (buffer: NewInterval[]) => ({
      newIntervals: buffer,
    }),
    []
  );
  const mapLocalStorageEntryToBufferEntry = useCallback(
    (interval: NewInterval) => ({
      ...interval,
      startedAt: new Date(interval.startedAt).getTime(),
      endedAt: new Date(interval.endedAt).getTime(),
    }),
    []
  );

  useRequestBuffer<NewInterval>(
    `/api/v1/statistics/intervals`,
    INTERVAL_BUFFER,
    notReady,
    mapBufferToRequestBody,
    mapLocalStorageEntryToBufferEntry,
    undefined,
    // When finished sending intervals, make sure to refetch the time spent stats
    // again so that they're up to date on the frontend.
    // Only do this if reading intervals were sent, so that we don't end
    // up fetching updates every time an active interval is updated (ie. every
    // 10 seconds).
    fetchTimeSpentToday
  );

  const upsertActiveIntervalInBuffer = useCallback(() => {
    if (!activeIntervalStart.current) {
      console.error("no start date");

      activeIntervalStart.current = new Date();
      return;
    }

    const startDate = activeIntervalStart.current;

    const newEndDate = new Date(activeIntervalEnd.current || startDate);
    // Add the elapsed interval time to the last end date, then send to server.
    // Will wrap around.
    newEndDate.setMilliseconds(
      newEndDate.getMilliseconds() + ACTIVE_INTERVAL_UPDATE_INTERVAL_MS
    );
    activeIntervalEnd.current = newEndDate;

    // Try to keep number of intervals to a minimum by combining by start date.
    // This should really only happen offline.
    const index = !intervals
      ? -1
      : intervals.findIndex(
          (interval) =>
            interval.type === intervalTypes.ACTIVE_IN_APP &&
            interval.startedAt === startDate.getTime()
        );
    if (index !== -1) {
      const result = [...(intervals || [])];
      result[index] = {
        type: intervalTypes.ACTIVE_IN_APP,
        startedAt: startDate.getTime(),
        endedAt: newEndDate.getTime(),
      };
      dispatch(
        networkActions.setBuffer({ key: INTERVAL_BUFFER, buffer: result })
      );
      return;
    }

    dispatch(
      networkActions.setBuffer({
        key: INTERVAL_BUFFER,
        buffer: [
          ...(intervals || []),
          {
            type: intervalTypes.ACTIVE_IN_APP,
            startedAt: startDate.getTime(),
            endedAt: newEndDate.getTime(),
          },
        ],
      })
    );
  }, [dispatch, intervals]);

  const addReadingIntervalToBuffer = useCallback(
    (newReadingInterval: NewReadingInterval) => {
      dispatch(
        networkActions.setBuffer({
          key: INTERVAL_BUFFER,
          buffer: [...(intervals || []), newReadingInterval],
        })
      );
    },
    [dispatch, intervals]
  );

  // While app is active, constantly update the current active interval.
  useEffect(
    function setupActiveIntervalUpdates() {
      if (notReady) return;

      if (!activeIntervalStart.current)
        activeIntervalStart.current = new Date();

      const finishCurrentActiveInterval = () => {
        window.clearInterval(intervalId);
        activeIntervalStart.current = undefined;
        activeIntervalEnd.current = undefined;
      };

      const intervalId = window.setInterval(function sendActiveInterval() {
        // Make sure that page really is in focus. This usually happens on
        // mobile, which may not run this effect in time when page loses focus
        // and isPageActive becomes false.
        if (!document.hasFocus()) {
          // If not, then end this interval immediately.
          finishCurrentActiveInterval();
          return;
        }

        // const intervalEndDate = new Date();

        upsertActiveIntervalInBuffer();
      }, ACTIVE_INTERVAL_UPDATE_INTERVAL_MS);

      return finishCurrentActiveInterval;
    },
    [notReady, upsertActiveIntervalInBuffer]
  );

  // When returning to app, check local storage for any reading interval
  // start time, and send a new reading interval if there was one.
  useEffect(
    function endReadingIntervalOnActive() {
      if (notReady) return;

      // Get and remove any reading interval start time from local storage.
      const lastReadingIntervalStart = window.localStorage.getItem(
        LAST_READING_INTERVAL_START
      );
      window.localStorage.removeItem(LAST_READING_INTERVAL_START);
      const lastReadingIntervalEntryId = window.localStorage.getItem(
        LAST_READING_INTERVAL_ENTRY_ID
      );
      window.localStorage.removeItem(LAST_READING_INTERVAL_ENTRY_ID);
      const lastReadingIntervalFeedName = window.localStorage.getItem(
        LAST_READING_INTERVAL_FEED_NAME
      );
      window.localStorage.removeItem(LAST_READING_INTERVAL_FEED_NAME);

      if (
        !lastReadingIntervalStart ||
        !lastReadingIntervalEntryId ||
        !lastReadingIntervalFeedName
      )
        return;

      // We use a threshold of 20 minutes to determine whether
      // this interval should be counted as a reading interval or not.
      // This means that if the user visited a link more than 20 minutes
      // ago before foregrounding the app again, then we assume the user
      // spent 20 minutes reading and the rest of the time on something else.
      const intervalEnd =
        moment().diff(moment(lastReadingIntervalStart), "minutes", true) >
        LINK_READING_THRESHOLD_MINUTES
          ? moment(lastReadingIntervalStart)
              .add(LINK_READING_THRESHOLD_MINUTES, "minutes")
              .toDate()
          : // If less than 20 minutes, then we just take the difference and
            // assume the user spent the entire time away from the app reading
            // the link.
            new Date();

      addReadingIntervalToBuffer({
        type: intervalTypes.LINK_READING_ESTIMATE,
        startedAt: new Date(lastReadingIntervalStart).getTime(),
        endedAt: intervalEnd.getTime(),
        entryId: lastReadingIntervalEntryId,
        feedName: lastReadingIntervalFeedName,
      });
    },
    [addReadingIntervalToBuffer, notReady]
  );
}
