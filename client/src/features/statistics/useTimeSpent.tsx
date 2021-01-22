import { useEffect, useRef, useCallback } from "react";
import moment from "moment";
import useFieldSelector from "../shared/useFieldSelector";
import { RootState } from "../../app/rootReducer";
import { useDispatch, useSelector } from "react-redux";
import { statisticsActions } from "../../app/statisticsReducer";

export default function useTimeSpent(
  key: string,
  initialTimeSpent: number | undefined
) {
  const dispatch = useDispatch();

  const isPageActive = useFieldSelector("app", "isVisible");
  const currentUser = useFieldSelector("auth", "currentUser");
  const timeSpent = useSelector(
    (state: RootState) => state.statistics.timeSpentCountersByKey[key]?.num
  );

  useEffect(
    function initializeTimeSpent() {
      dispatch(
        statisticsActions.setTimeSpent({ key, value: initialTimeSpent })
      );
    },
    [dispatch, initialTimeSpent, key]
  );

  const lastUpdatedAt = useRef(new Date());

  const updateTimeSpent = useCallback(
    (newTime: number, resetTime?: boolean) => {
      const currentDate = new Date();
      // When passing midnight, reset the count.
      if (lastUpdatedAt.current.getDate() !== currentDate.getDate()) {
        const timeSinceMidnight =
          currentDate.getTime() - moment(currentDate).startOf("day").valueOf();
        // Take the minimum of the time to add or the time since midnight, since
        // we only want to count time past midnight.
        dispatch(
          statisticsActions.setTimeSpent({
            key,
            value: Math.min(newTime, timeSinceMidnight),
          })
        );
      } else
        dispatch(
          statisticsActions.setTimeSpent({
            key,
            value: (resetTime ? 0 : timeSpent || 0) + newTime,
          })
        );

      lastUpdatedAt.current = currentDate;
    },
    [dispatch, key, timeSpent]
  );

  useEffect(
    function scheduleTimeSpentUpdates() {
      if (!isPageActive || !currentUser || initialTimeSpent === undefined)
        return;

      updateTimeSpent(initialTimeSpent, true);

      const duration = moment.duration(initialTimeSpent);
      const initialIntervalMs =
        60000 - duration.seconds() * 1000 - duration.milliseconds();

      let intervalId: number;
      // Update the time spent at the next minute mark.
      const timeoutId = window.setTimeout(() => {
        updateTimeSpent(initialIntervalMs);

        // Continue to update time spent at every following minute mark while page is active.
        intervalId = window.setInterval(() => {
          updateTimeSpent(60000);
        }, 60000);
      }, initialIntervalMs);

      return function cancelTimeouts() {
        window.clearTimeout(timeoutId);
        if (intervalId) window.clearInterval(intervalId);
      };
    },
    [currentUser, initialTimeSpent, isPageActive, updateTimeSpent]
  );
}
