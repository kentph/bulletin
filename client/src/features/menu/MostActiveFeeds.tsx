import sharedStyles from "../shared/shared.module.css";
import { ReactComponent as BarsIcon } from "../../assets/ic_fluent_data_histogram_24_regular.svg";

import React, { useState } from "react";
import classNames from "classnames";
import useFieldSelector from "../shared/useFieldSelector";

export default function MostActiveFeeds() {
  const mostActiveFeeds = useFieldSelector("statistics", "mostActiveFeeds");

  const [shouldShowAll, setShouldShowAll] = useState(false);

  const toggleShowAll = () => {
    setShouldShowAll(!shouldShowAll);
  };

  return mostActiveFeeds && mostActiveFeeds.length ? (
    <>
      <h3 className={sharedStyles.IconButton}>
        <BarsIcon className={sharedStyles.FluentIcon} />
        <span>Most Visited</span>
      </h3>
      <div className={sharedStyles.Spacing}>
        {(shouldShowAll ? mostActiveFeeds : mostActiveFeeds.slice(0, 5)).map(
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
                  {feedData.visits} links visited
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
