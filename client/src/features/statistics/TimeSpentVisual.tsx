import styles from "./TimeSpentVisual.module.css";

import React from "react";
import useFieldSelector from "../shared/useFieldSelector";
import { convertTimeToString } from "../../app/statisticsReducer";
import { useSelector } from "react-redux";
import { RootState } from "../../app/rootReducer";
import { UPDATING_TIME_ACTIVE_IN_APP } from "../../app/useAppSetup";

export default function TimeSpentVisual() {
  const timeSpentPerIp = useFieldSelector("statistics", "totalTime");
  const updatingTimeActiveInAppString = useSelector(
    (state: RootState) =>
      state.statistics.timeSpentCountersByKey[UPDATING_TIME_ACTIVE_IN_APP]?.str
  );

  const timeSpent =
    timeSpentPerIp && timeSpentPerIp[Object.keys(timeSpentPerIp)[0]];

  if (!timeSpent) return <>Spend more time in app to see your stats here.</>;

  const estimatedTimeReading = convertTimeToString(
    timeSpent["LINK_READING_ESTIMATE"],
    true
  );

  return (
    <div data-test="visual-time-spent" className={styles.TimeSpentVisual}>
      {updatingTimeActiveInAppString !== undefined ? (
        <>
          <div data-test="visual-time-in-app" className={styles.Time}>
            {updatingTimeActiveInAppString}
          </div>
          <div className={styles.Title}>Time in app</div>
        </>
      ) : (
        "..."
      )}

      {estimatedTimeReading ? (
        <>
          <div data-test="visual-estimated-reading" className={styles.Time}>
            {estimatedTimeReading}
          </div>
          <div className={styles.Title}>Estimated time reading links</div>
        </>
      ) : undefined}
    </div>
  );
}
