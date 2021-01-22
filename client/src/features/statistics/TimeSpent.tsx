import styles from "./TimeSpent.module.css";
import sharedStyles from "../shared/shared.module.css";
import { ReactComponent as ClockIcon } from "../../assets/ic_fluent_clock_24_regular.svg";

import React from "react";
import useFieldSelector from "../shared/useFieldSelector";
import { convertTimeToString } from "../../app/statisticsReducer";
import { useSelector } from "react-redux";
import { RootState } from "../../app/rootReducer";
import { UPDATING_TIME_ACTIVE_IN_APP } from "../../app/useAppSetup";

export default function TimeSpent() {
  const client = useFieldSelector("auth", "client");
  const timeSpentPerIp = useFieldSelector("statistics", "totalTime");
  const updatingTimeActiveInAppString = useSelector(
    (state: RootState) =>
      state.statistics.timeSpentCountersByKey[UPDATING_TIME_ACTIVE_IN_APP]?.str
  );

  return (
    <div className={styles.TimeSpent}>
      <h3 className={sharedStyles.IconButton}>
        <ClockIcon className={sharedStyles.FluentIcon} />
        <span>Time Spent</span>
      </h3>
      {timeSpentPerIp ? (
        Object.keys(timeSpentPerIp).map((key, index) => {
          return (
            <div key={key}>
              {String(key) === String(client?._id) ? (
                <p>For client: {client?.name}</p>
              ) : undefined}
              <div className={sharedStyles.Spacing}>
                <div className={sharedStyles.HighlightedRow}>
                  <div className={sharedStyles.HighlightedRowLabel}>
                    Time in app
                  </div>
                  <div
                    data-test="time-in-app"
                    className={sharedStyles.HighlightedRowValue}
                  >
                    {index === 0
                      ? updatingTimeActiveInAppString
                      : convertTimeToString(
                          timeSpentPerIp[key]["ACTIVE_IN_APP"],
                          true
                        )}
                  </div>
                </div>
              </div>
              <p>
                This is the amount of time you've spent on this page today on
                this client. We count the time you've had this browser window
                and tab in front.
              </p>
              <div className={sharedStyles.Spacing}>
                <div className={sharedStyles.HighlightedRow}>
                  <div className={sharedStyles.HighlightedRowLabel}>
                    Estimated time reading links
                  </div>
                  <div
                    data-test="reading-estimate"
                    className={sharedStyles.HighlightedRowValue}
                  >
                    {convertTimeToString(
                      timeSpentPerIp[key]["LINK_READING_ESTIMATE"],
                      true
                    )}
                  </div>
                </div>
              </div>
              <p>
                This is our estimate of the amount of time you've spent reading
                articles opened from this page today.
              </p>
              <p>
                We do this by counting the time you've spent away from this page
                from opening a link, up to 20 minutes per interval. We don't
                count time you spent away from this page from not opening a link
                (like from manually switch tabs or windows).
              </p>
              <p>
                To improve this estimate, (1) return to the app after you've
                finished reading a link to complete a potential reading
                interval, and (2) when opening links in new tabs, try to open
                the last link normally to begin tracking a new reading interval.
              </p>
            </div>
          );
        })
      ) : (
        <>Spend more time in app to see your stats for today.</>
      )}
    </div>
  );
}
