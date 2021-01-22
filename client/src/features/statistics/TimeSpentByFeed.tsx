import React, { useState } from "react";
import sharedStyles from "../shared/shared.module.css";
import { ReactComponent as BookClockIcon } from "../../assets/ic_fluent_book_clock_24_regular.svg";

import moment from "moment";
import classNames from "classnames";
import useFieldSelector from "../shared/useFieldSelector";

export default function TimeSpentByFeed() {
  const timeSpentByFeed = useFieldSelector("statistics", "timeSpentByFeed");

  const [shouldShowAll, setShouldShowAll] = useState(false);

  const toggleShowAll = () => {
    setShouldShowAll(!shouldShowAll);
  };

  return timeSpentByFeed && timeSpentByFeed.length ? (
    <>
      <h3 className={sharedStyles.IconButton}>
        <BookClockIcon className={sharedStyles.FluentIcon} />
        <span>Reading Time By Feed</span>
      </h3>
      <div className={sharedStyles.Spacing}>
        {(shouldShowAll ? timeSpentByFeed : timeSpentByFeed.slice(0, 5)).map(
          (feedData) => {
            return (
              <div
                className={sharedStyles.HighlightedRow}
                key={feedData.feedName}
              >
                <div className={sharedStyles.HighlightedRowLabel}>
                  {feedData.feedName}
                </div>
                <div className={sharedStyles.HighlightedRowValue}>
                  {moment.duration(feedData.timeSpentReadingMs).humanize()}
                </div>
              </div>
            );
          }
        )}
      </div>
      <div className={sharedStyles.Spacing}>
        <button
          className={classNames(sharedStyles.Button, sharedStyles.Large)}
          onClick={toggleShowAll}
        >
          {shouldShowAll ? "Hide" : "Show all"}
        </button>
      </div>
    </>
  ) : null;
}
