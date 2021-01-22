import styles from "./FeedFocusedView.module.css";
import sharedStyles from "../shared/shared.module.css";
import { ReactComponent as RefreshIcon } from "../../assets/ic_fluent_arrow_clockwise_24_regular.svg";
import { ReactComponent as CheckIcon } from "../../assets/ic_fluent_checkmark_24_regular.svg";
import { ReactComponent as EyeShowIcon } from "../../assets/ic_fluent_eye_show_24_filled.svg";
import { ReactComponent as EyeHideIcon } from "../../assets/ic_fluent_eye_hide_24_filled.svg";
import { ReactComponent as CollapseIcon } from "../../assets/ic_fluent_arrow_minimize_24_regular.svg";
import { ReactComponent as EditIcon } from "../../assets/ic_fluent_edit_24_regular.svg";

import React, { MouseEventHandler, useState, useEffect, useRef } from "react";
import Entry from "../feedEntries/Entry";
import classNames from "classnames";
import moment from "moment";
import useMarkFeedAsRead from "./useMarkFeedAsRead";
import ToggleButton from "../shared/ToggleButton";
import { settingsThunks } from "../../app/settingsReducer";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../app/rootReducer";
import useFieldSelector from "../shared/useFieldSelector";
import { feedsActions } from "../../app/feedsReducer";
import { axiosSourceByFeedNameWithGetter } from "../../app/axiosCancelSource";
import {
  focusFirstVisibleElement,
  HOTKEY_ENTRY_CLASS,
  HOTKEY_FOCUSED_FEED_CLASS,
} from "../hotkeys/useGlobalHotkeys";

const stopPropagation: MouseEventHandler = (event) => {
  event.stopPropagation();
};

export default function FeedFocusedView() {
  const dispatch = useDispatch();

  const settings = useSelector((state: RootState) => state.settings);
  const focusedFeedName = useFieldSelector("feeds", "focusedFeedName");
  const feedEntries = useSelector((state: RootState) =>
    focusedFeedName
      ? state.feeds.feedEntriesByFeedName[focusedFeedName]
      : undefined
  );
  const isEditingModeOn = useFieldSelector("feeds", "isFeedEditingModeOn");
  const isMarkAsReadModeOn = useFieldSelector("feeds", "isMarkAsReadModeOn");
  const feedGroups = useFieldSelector("feeds", "feedGroups");
  const feedGroupIndexOfNewOrEditingFeed = useFieldSelector(
    "feeds",
    "feedGroupIndexOfNewOrEditingFeed"
  );

  const [shouldAnnounceNewEntries, setShouldAnnounceNewEntries] = useState(
    false
  );
  const [shouldShowLargeEntries, setShouldShowLargeEntries] = useState(true);

  const feedElementRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const [shouldPopPlaceholderText, markAllAsRead] = useMarkFeedAsRead(
    feedEntries,
    focusedFeedName
  );

  useEffect(
    function keepAnnounceNewEntriesUpdated() {
      if (focusedFeedName)
        setShouldAnnounceNewEntries(
          settings.feedsToAnnounce?.includes(focusedFeedName) || false
        );
    },
    [focusedFeedName, settings.feedsToAnnounce]
  );

  useEffect(
    function addHotkeyListener() {
      if (!focusedFeedName) return;
      const hotkeyListener = () => {
        markAllAsRead();
      };
      const ref = feedElementRef.current;
      ref?.addEventListener("onhotkeymarkallasread", hotkeyListener);
      return function removeHotkeyListener() {
        ref?.removeEventListener("onhotkeymarkallasread", hotkeyListener);
      };
    },
    [focusedFeedName, markAllAsRead]
  );

  useEffect(
    function trapFocusWhenVisible() {
      if (!focusedFeedName || feedGroupIndexOfNewOrEditingFeed !== undefined)
        return;
      const trapFocus = (event: WindowEventMap["focusin"]) => {
        const target = event.target;
        if (
          !(target instanceof Element) ||
          target.closest(`.${styles.FocusedFeedContainer}`)
        )
          return;
        if (!focusFirstVisibleElement(HOTKEY_ENTRY_CLASS))
          closeButtonRef.current?.focus();
      };
      window.addEventListener("focusin", trapFocus);
      return function cleanupTrapFocusWhenVisible() {
        window.removeEventListener("focusin", trapFocus);
      };
    },
    [feedGroupIndexOfNewOrEditingFeed, focusedFeedName]
  );

  useEffect(
    function keepShouldShowLargeEntriesUpdated() {
      setShouldShowLargeEntries(!settings.shouldShowSmallEntries);
    },
    [settings.shouldShowSmallEntries]
  );

  const feedEntriesToDisplay = useSelector((state: RootState) =>
    focusedFeedName
      ? state.feeds.displayedFeedEntriesByFeedName[focusedFeedName]
      : undefined
  );
  const isUpdating = useSelector((state: RootState) =>
    focusedFeedName
      ? state.feeds.isUpdatingByFeedName[focusedFeedName]
      : undefined
  );
  const shouldCollapseRead = useSelector((state: RootState) =>
    focusedFeedName
      ? state.feeds.shouldCollapseReadByFeedName[focusedFeedName]
      : undefined
  );
  const lastUpdatedAt = useSelector((state: RootState) =>
    focusedFeedName
      ? state.feeds.lastUpdatedAtByFeedName[focusedFeedName]
      : undefined
  );
  const wasLastUpdateFromCache = useSelector((state: RootState) =>
    focusedFeedName
      ? state.feeds.wasLastUpdateFromCacheByFeedName[focusedFeedName]
      : undefined
  );

  // All hooks must go before this conditional branch.

  if (!focusedFeedName || isEditingModeOn) return null;

  const collapseFeed = () => {
    dispatch(
      settingsThunks.setSettingsAndSave((settings) => {
        // Always collapse.
        return {
          ...settings,
          collapsedFeeds: [...(settings.collapsedFeeds || []), focusedFeedName],
        };
      })
    );
    hideFocusedFeed();
  };

  // TODO this is a workaround for not having the focused feed's indexes in it's feed/feed group array.
  // Should make what we store/how we access an active/focused feed consistent.
  // See https://github.com/kentph/bulletin/issues/207
  const getFeedIndexes = (feedName: string) => {
    if (!feedGroups) return;
    for (let groupIndex = 0; groupIndex < feedGroups.length; groupIndex++) {
      const group = feedGroups[groupIndex];
      for (let index = 0; index < group.feeds.length; index++) {
        const feed = group.feeds[index];
        if (feed.label === feedName) return [groupIndex, index];
      }
    }
  };

  const editFeed = () => {
    const indexes = getFeedIndexes(focusedFeedName);
    if (!indexes) return;
    const [feedGroupIndex, feedIndex] = indexes;
    dispatch(
      feedsActions.beginEditingFeed({
        feedGroupIndex,
        feedIndex,
      })
    );
  };

  const hideFocusedFeed = () => {
    dispatch(feedsActions.setFocusedFeedName(undefined));
  };

  const axiosSource = axiosSourceByFeedNameWithGetter.get(focusedFeedName);

  const cancelFetch = () => {
    axiosSource.cancel("Canceled by button.");
    dispatch(
      feedsActions.setFeedIsUpdating({
        feedName: focusedFeedName,
        isUpdating: false,
      })
    );
  };

  const collapseRead = () => {
    dispatch(
      feedsActions.setShouldCollapseRead({
        feedName: focusedFeedName,
        shouldCollapseRead: !shouldCollapseRead,
      })
    );
  };

  const updateAnnounceNewEntries = () => {
    const newShouldAnnounceNewEntries = !shouldAnnounceNewEntries;
    setShouldAnnounceNewEntries(newShouldAnnounceNewEntries);

    if (newShouldAnnounceNewEntries) {
      dispatch(
        settingsThunks.setSettingsAndSave((settings) => {
          const feedsToAnnounce = settings.feedsToAnnounce || [];

          if (feedsToAnnounce.includes(focusedFeedName)) return settings;

          feedsToAnnounce.push(focusedFeedName);
          return {
            ...settings,
            feedsToAnnounce,
          };
        })
      );
    } else {
      dispatch(
        settingsThunks.setSettingsAndSave((settings) => {
          const feedsToAnnounce = settings.feedsToAnnounce || [];

          if (!feedsToAnnounce.includes(focusedFeedName)) return settings;

          return {
            ...settings,
            feedsToAnnounce: feedsToAnnounce.filter(
              (feed) => feed !== focusedFeedName
            ),
          };
        })
      );
    }
  };

  const refreshFeed = () => {
    dispatch(
      feedsActions.triggerManualFeedUpdate({
        feedName: focusedFeedName,
        triggeredAt: new Date().getTime(),
      })
    );
  };

  const toggleEntrySize = () => {
    setShouldShowLargeEntries(!shouldShowLargeEntries);
  };

  const endMarkAsReadMode = () => {
    dispatch(feedsActions.setMarkAsReadMode(false));
  };

  const turnOnMarkAsReadMode = () => {
    dispatch(feedsActions.setMarkAsReadMode(true));
  };

  let feedEntriesView: JSX.Element | null;
  if (!feedEntriesToDisplay) {
    feedEntriesView = null;
  } else if (!feedEntriesToDisplay.length) {
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
        {feedEntriesToDisplay.map((entry, i) => {
          return (
            <Entry
              {...{
                key: i,
                customClassNames: [styles.Entry],
                shouldShowLarge: shouldShowLargeEntries,
                feedName: focusedFeedName,
                shouldHideRead: shouldCollapseRead,
                collapseFeedFunc: collapseFeed,
                markAllAsReadFunc: markAllAsRead,
                entry,
                // TODO add this as a feed option, so that authors can be shown on collapsed feeds.
                shouldShowAuthor: false,
              }}
            />
          );
        })}
      </>
    );
  }

  return (
    <div
      {...{
        className: styles.FocusedFeedContainer,
        onClick: hideFocusedFeed,
      }}
    >
      <div
        {...{
          className: classNames(HOTKEY_FOCUSED_FEED_CLASS, styles.FocusedFeed),
          onClick: stopPropagation,
          ref: feedElementRef,
        }}
      >
        <div
          {...{
            className: styles.FeedTitleRow,
          }}
        >
          <h3 className={styles.FeedTitle}>{focusedFeedName}</h3>

          <div className={styles.Spacer} />

          <button
            data-test="focused-feed-close-button"
            {...{
              className: classNames(
                sharedStyles.Button,
                sharedStyles.Larger,
                styles.CloseButton
              ),
              onClick: hideFocusedFeed,
              ref: closeButtonRef,
            }}
          >
            ✕
          </button>
        </div>

        {isMarkAsReadModeOn ? (
          <div
            className={classNames(
              styles.ButtonBar,
              sharedStyles.MarkAsReadModeBanner,
              sharedStyles.Unfixed
            )}
          >
            <span>
              <strong>Mark as Read mode</strong> — click an entry to mark as
              read
            </span>
            <div {...{ className: styles.Spacer }} />
            <button
              {...{
                className: classNames(sharedStyles.Button),
                onClick: markAllAsRead,
              }}
            >
              Mark All as Read
            </button>
            <button
              {...{
                className: classNames(sharedStyles.Button, styles.DoneButton),
                onClick: endMarkAsReadMode,
              }}
            >
              Done
            </button>
          </div>
        ) : (
          <div className={styles.ButtonBar}>
            {isUpdating ? (
              <>
                <button
                  className={classNames(
                    sharedStyles.Button,
                    styles.CancelFetchButton
                  )}
                  onClick={cancelFetch}
                >
                  Cancel
                </button>
                <div className={styles.FetchingText}>Fetching...</div>
              </>
            ) : (
              <>
                <button
                  {...{
                    className: classNames(
                      sharedStyles.Button,
                      sharedStyles.IconButton,
                      styles.RefreshButton
                    ),
                    onClick: refreshFeed,
                  }}
                >
                  <RefreshIcon className={sharedStyles.FluentIcon} />
                  <span>Refresh</span>
                </button>

                <button
                  {...{
                    className: classNames(
                      sharedStyles.Button,
                      sharedStyles.IconButton,
                      styles.CollapseReadButton
                    ),
                    onClick: turnOnMarkAsReadMode,
                  }}
                >
                  <CheckIcon className={sharedStyles.FluentIcon} />
                  <span>Mark as Read</span>
                </button>

                <div className={styles.LastUpdated}>
                  From {moment(lastUpdatedAt).fromNow()}
                  {wasLastUpdateFromCache ? " (cache)" : ""}
                </div>
              </>
            )}

            <div className={styles.Spacer} />

            <label {...{ className: styles.AnnounceCheckbox }}>
              <input
                type="checkbox"
                name="announceNewEntries"
                checked={shouldAnnounceNewEntries}
                onChange={updateAnnounceNewEntries}
              />
              <span>Read Aloud</span>
            </label>

            <ToggleButton
              {...{
                classNames: [styles.ToggleEntrySizeButton],
                onClick: toggleEntrySize,
                value: shouldShowLargeEntries,
                trueLabel: "A",
                falseLabel: "a",
              }}
            />

            <button
              {...{
                className: classNames(
                  sharedStyles.Button,
                  sharedStyles.IconButton,
                  styles.CollapseReadButton
                ),
                onClick: collapseRead,
              }}
            >
              {shouldCollapseRead ? (
                <EyeShowIcon className={sharedStyles.FluentIcon} />
              ) : (
                <EyeHideIcon className={sharedStyles.FluentIcon} />
              )}
              <span>{shouldCollapseRead ? "Show Read" : "Hide Read"}</span>
            </button>

            <button
              {...{
                className: classNames(
                  sharedStyles.Button,
                  sharedStyles.IconButton,
                  styles.CollapseReadButton
                ),
                onClick: collapseFeed,
              }}
            >
              <CollapseIcon className={sharedStyles.FluentIcon} />
              <span>Collapse</span>
            </button>

            <button
              {...{
                className: classNames(
                  sharedStyles.Button,
                  sharedStyles.IconButton,
                  styles.CollapseReadButton
                ),
                onClick: editFeed,
              }}
            >
              <EditIcon className={sharedStyles.FluentIcon} />
              <span>Edit</span>
            </button>
          </div>
        )}

        <div className={styles.FeedEntriesContainer}>{feedEntriesView}</div>
      </div>
    </div>
  );
}
