import styles from "./StarredListView.module.css";
import sharedStyles from "../shared/shared.module.css";
import { ReactComponent as StarIcon } from "../../assets/ic_fluent_star_24_regular.svg";

import React, { useState, useEffect, Fragment, useRef } from "react";
import Axios from "axios";
import Entry from "../feedEntries/Entry";
import moment from "moment";
import classNames from "classnames";
import { StarredEntryData } from "../../types/entryTypes";

export default function StarredListView() {
  const [starredEntries, setStarredEntries] = useState<StarredEntryData[]>();
  const [page, setPage] = useState(0);
  const [shouldHideNext, setShouldHideNext] = useState(false);

  const isMounted = useRef(true);

  useEffect(
    function fetchStarredEntriesOnLoadAndPageChange() {
      (async () => {
        try {
          const response = await Axios.get(`/api/v1/starred?p=${page}`);
          if (!isMounted.current) return;
          const data: StarredEntryData[] | undefined =
            response.data && response.data.docs;
          if (page !== 0 && (!data || !data.length)) {
            setPage(page - 1);
            setShouldHideNext(true);
          } else {
            setStarredEntries(data);
            setShouldHideNext(Boolean(response.data.isEnd));
          }
        } catch (e) {
          console.error(e);
        }
      })();
    },
    [page]
  );

  useEffect(function updateIsMounted() {
    return function unmount() {
      isMounted.current = false;
    };
  }, []);

  const goToPreviousPage = () => {
    if (page === 0) return;
    setPage(page - 1);
  };

  const goToNextPage = () => {
    setPage(page + 1);
  };

  return (
    <div>
      <h3 className={classNames(sharedStyles.IconButton, styles.Title)}>
        <StarIcon className={sharedStyles.FluentIcon} />
        <span>Starred Entries</span>
      </h3>
      {!starredEntries ? undefined : starredEntries.length ? (
        <>
          <div>
            {starredEntries.map((starred, i, array) => {
              return (
                <Fragment key={i}>
                  {i === 0 ||
                  moment(array[i - 1].createdAt).valueOf() >
                    moment(starred.createdAt).endOf("day").valueOf() ? (
                    <div className={styles.Header}>
                      Starred on{" "}
                      {moment(starred.createdAt).format("MMMM Do YYYY")}
                    </div>
                  ) : undefined}
                  <Entry
                    {...{
                      feedName: starred.feedName,
                      entry: starred.entry,
                      shouldShowLarge: true,
                      showAsStarredEntry: true,
                    }}
                  />
                </Fragment>
              );
            })}
          </div>
          <div className={styles.ButtonBar}>
            {page !== 0 ? (
              <button
                {...{
                  className: classNames(
                    sharedStyles.Button,
                    sharedStyles.Large
                  ),
                  onClick: goToPreviousPage,
                }}
              >
                Previous
              </button>
            ) : undefined}
            {shouldHideNext ? undefined : (
              <button
                {...{
                  className: classNames(
                    sharedStyles.Button,
                    sharedStyles.Large,
                    styles.NextButton
                  ),
                  onClick: goToNextPage,
                }}
              >
                Next
              </button>
            )}
          </div>
        </>
      ) : (
        <div className={styles.ZeroState}>No starred entries</div>
      )}
    </div>
  );
}
