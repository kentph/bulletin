import { debounce } from "lodash";
import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import useFieldSelector from "../features/shared/useFieldSelector";
import useAnnouncer from "../features/readAloud/useAnnouncer";
import useApi from "../features/api/useApi";
import useBatchMarkFeedAsReadRequestBuffer from "../features/api/useBatchMarkFeedAsReadRequestBuffer";
import useFeeds from "../features/feeds/useFeeds";
import useSettings from "../features/menu/useSettings";
import useStarredRequestBuffer from "../features/api/useStarredRequestBuffer";
import useStatistics from "../features/statistics/useStatistics";
import useTimeSpent from "../features/statistics/useTimeSpent";
import useUnstarRequestBuffer from "../features/api/useUnstarRequestBuffer";
import useVisibility from "../features/statistics/useVisibility";
import { appActions } from "./appReducer";
import { RootState } from "./rootReducer";
import useFeedGridMaps from "../features/feeds/useFeedGridMaps";
import useGlobalHotkeys from "../features/hotkeys/useGlobalHotkeys";

export const UPDATING_TIME_ACTIVE_IN_APP = "UPDATING_TIME_ACTIVE_IN_APP";
export const UPDATING_TOTAL_TIME = "UPDATING_TOTAL_TIME";

export default function useAppSetup() {
  const dispatch = useDispatch();

  useEffect(
    function updateIsMobileOnResize() {
      const updateIsMobile = debounce(() => {
        dispatch(appActions.refreshIsMobile());
      }, 500);
      window.addEventListener("resize", updateIsMobile);
      return function cleanupUpdateIsMobileOnResize() {
        window.removeEventListener("resize", updateIsMobile);
      };
    },
    [dispatch]
  );

  useVisibility();
  useApi();
  useStatistics();
  useSettings({});
  useFeedGridMaps();

  const totalTime = useFieldSelector("statistics", "totalTime");

  useTimeSpent(
    UPDATING_TIME_ACTIVE_IN_APP,
    totalTime
      ? // Assume the first key is our IP, and have it autoupdate at each minute.
        totalTime[Object.keys(totalTime)[0]]["ACTIVE_IN_APP"]
      : undefined
  );

  const timeSpentAtThisIp = useMemo(() => {
    return totalTime && Object.keys(totalTime).length !== 0
      ? Object.values(totalTime[Object.keys(totalTime)[0]]).reduce(
          (result, value) => result + value,
          0
        )
      : undefined;
  }, [totalTime]);
  useTimeSpent(UPDATING_TOTAL_TIME, timeSpentAtThisIp);
  useGlobalHotkeys();
  useAnnouncer();

  const shouldDisableSend = useSelector(
    (state: RootState) => !state.auth.currentUser
  );
  useBatchMarkFeedAsReadRequestBuffer(shouldDisableSend);
  useStarredRequestBuffer(shouldDisableSend);
  useUnstarRequestBuffer(shouldDisableSend);

  useFeeds();
}
