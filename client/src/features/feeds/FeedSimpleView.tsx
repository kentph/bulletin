import styles from "./FeedSimpleView.module.css";
import sharedStyles from "../shared/shared.module.css";

import classNames from "classnames";
import moment from "moment";
import React, { MouseEventHandler, useRef, useEffect } from "react";
import EntrySimpleView from "../feedEntries/EntrySimpleView";
import useMarkFeedAsRead from "./useMarkFeedAsRead";
import useDisplayedFeedEntries from "./useDisplayedFeedEntries";
import useCollapseFeed from "./useCollapseFeed";
import { FeedData } from "../../types/feedTypes";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../app/rootReducer";
import useFieldSelector from "../shared/useFieldSelector";
import { feedsActions } from "../../app/feedsReducer";
import { axiosSourceByFeedNameWithGetter } from "../../app/axiosCancelSource";
import { HOTKEY_SIMPLE_FEED_CLASS } from "../hotkeys/useGlobalHotkeys";

type Props = {
  feed: FeedData;
};

const stopPropagation: MouseEventHandler = (event) => {
  event.stopPropagation();
};

export default function FeedSimpleView({ feed: { label: name } }: Props) {
  const dispatch = useDispatch();

  const settings = useSelector((state: RootState) => state.settings);
  const feedGridMaps = useFieldSelector("feeds", "feedGridMaps");
  const focusedFeedCoordinates = useFieldSelector(
    "feeds",
    "focusedFeedCoordinates"
  );
  const feedEntries = useSelector(
    (state: RootState) => state.feeds.feedEntriesByFeedName[name]
  );
  const sortedFeedEntries = useSelector(
    (state: RootState) => state.feeds.displayedFeedEntriesByFeedName[name]
  );
  const shouldCollapseRead = useSelector(
    (state: RootState) => state.feeds.shouldCollapseReadByFeedName[name]
  );
  const isUpdating = useSelector(
    (state: RootState) => state.feeds.isUpdatingByFeedName[name]
  );
  const lastUpdatedAt = useSelector(
    (state: RootState) => state.feeds.lastUpdatedAtByFeedName[name]
  );
  const wasLastUpdateFromCache = useSelector(
    (state: RootState) => state.feeds.wasLastUpdateFromCacheByFeedName[name]
  );

  const { shouldCollapse, toggleShowFeed } = useCollapseFeed(name);

  useDisplayedFeedEntries(name);

  const [shouldPopPlaceholderText, markAllAsRead] = useMarkFeedAsRead(
    feedEntries,
    name
  );

  const elementRef = useRef<HTMLDivElement>(null);

  const axiosSource = axiosSourceByFeedNameWithGetter.get(name);

  useEffect(
    function updateFocusedFeed() {
      if (!focusedFeedCoordinates || !feedGridMaps) return;
      const { group, x, y } = focusedFeedCoordinates;
      const feedNameToPlaceCursor = feedGridMaps[group][`${x},${y}`]?.feedName;
      if (!feedNameToPlaceCursor || feedNameToPlaceCursor !== name) return;
      elementRef.current?.focus();
    },
    [feedGridMaps, focusedFeedCoordinates, name]
  );

  useEffect(
    function addHotkeyListener() {
      if (!name) return;
      const hotkeyListener = () => {
        markAllAsRead();
      };
      const ref = elementRef.current;
      ref?.addEventListener("onhotkeymarkallasread", hotkeyListener);
      return function removeHotkeyListener() {
        ref?.removeEventListener("onhotkeymarkallasread", hotkeyListener);
      };
    },
    [markAllAsRead, name]
  );

  const cancelFetch = () => {
    axiosSource.cancel("Canceled by button.");
    dispatch(
      feedsActions.setFeedIsUpdating({
        feedName: name,
        isUpdating: false,
      })
    );
  };

  let feedEntriesView: JSX.Element | null;
  if (!sortedFeedEntries) {
    feedEntriesView = null;
  } else if (shouldCollapse) {
    feedEntriesView = (
      <div className={classNames(styles.FeedEntriesHiddenMessage)}>
        {sortedFeedEntries && sortedFeedEntries.length ? (
          <span>
            {sortedFeedEntries.length > 10 ? "10+" : sortedFeedEntries.length}{" "}
            unread entries
          </span>
        ) : undefined}{" "}
        — click to show
      </div>
    );
  } else if (!sortedFeedEntries.length) {
    feedEntriesView = (
      <div
        className={classNames(styles.FeedEntriesPlaceholderText, {
          [styles.Pop]: shouldPopPlaceholderText,
        })}
      >
        No {settings.alwaysCollapseRead || shouldCollapseRead ? "unread " : ""}
        entries
      </div>
    );
  } else {
    feedEntriesView = (
      <>
        {sortedFeedEntries.map((entry, j) => {
          return (
            <EntrySimpleView
              {...{
                key: j,
                entry,
              }}
            />
          );
        })}
      </>
    );
  }

  return (
    <div
      data-test="feed-simple"
      {...{
        className: classNames(styles.Feed, HOTKEY_SIMPLE_FEED_CLASS),
        ref: elementRef,
        tabIndex: 0,
        onClick: () => {
          if (shouldCollapse) {
            if (window.confirm("Show this feed again?")) toggleShowFeed();
          } else dispatch(feedsActions.setFocusedFeedName(name));
        },
      }}
    >
      <div
        {...{
          className: styles.FeedTitleRow,
          onClick: stopPropagation,
        }}
      >
        <h3 className={styles.FeedTitle}>{name}</h3>

        <div className={styles.TitleRowSpacer} />

        {isUpdating ? (
          <div className={styles.Fetching}>
            <div className={styles.FetchingText}>Fetching...</div>
            <button
              className={classNames(
                sharedStyles.Button,
                styles.CancelFetchButton
              )}
              onClick={cancelFetch}
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <div className={styles.LastUpdated}>
              From {moment(lastUpdatedAt).fromNow()}
              {wasLastUpdateFromCache ? " (cache)" : ""}
            </div>
          </>
        )}
      </div>

      <div className={styles.FeedEntries}>{feedEntriesView}</div>
    </div>
  );
}
