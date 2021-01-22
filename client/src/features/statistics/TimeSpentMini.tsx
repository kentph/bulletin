import styles from "./TimeSpentMini.module.css";

import React from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../app/rootReducer";
import { UPDATING_TOTAL_TIME } from "../../app/useAppSetup";

export default function TimeSpentMini() {
  const updatingTotalTimeString = useSelector(
    (state: RootState) =>
      state.statistics.timeSpentCountersByKey[UPDATING_TOTAL_TIME]?.str
  );

  return (
    <div className={styles.TimeSpentMini}>
      {updatingTotalTimeString !== undefined ? (
        <>
          Active for{" "}
          <strong data-test="mini-time-spent">{updatingTotalTimeString}</strong>{" "}
          today
        </>
      ) : (
        "..."
      )}
    </div>
  );
}
