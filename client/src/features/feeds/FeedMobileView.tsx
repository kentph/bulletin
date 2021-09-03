import styles from "./FeedMobileView.module.css";
import sharedStyles from "../shared/shared.module.css";
import { ReactComponent as ExpandIcon } from "../../assets/ic_fluent_arrow_maximize_24_regular.svg";
import { ReactComponent as MoreIcon } from "../../assets/ic_fluent_more_vertical_24_regular.svg";
import { ReactComponent as CheckIcon } from "../../assets/ic_fluent_checkmark_24_regular.svg";
import { ReactComponent as RefreshIcon } from "../../assets/ic_fluent_arrow_clockwise_24_regular.svg";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useLayoutEffect,
} from "react";
import moment from "moment";
import Entry from "../feedEntries/Entry";
import classNames from "classnames";
import useMarkFeedAsRead from "./useMarkFeedAsRead";
import BezierEasing from "bezier-easing";
import useDisplayedFeedEntries from "./useDisplayedFeedEntries";
import useCollapseFeed from "./useCollapseFeed";
import { FeedData } from "../../types/feedTypes";
import useFieldSelector from "../shared/useFieldSelector";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../app/rootReducer";
import { feedsActions } from "../../app/feedsReducer";
import { appActions, MenuType } from "../../app/appReducer";
import { axiosSourceByFeedNameWithGetter } from "../../app/axiosCancelSource";
import useLongPress from "../shared/useLongPress";

const SCROLL_DURATION = 500;

type Props = {
  feed: FeedData;
  groupType?: string;
};

export default function FeedMobileView({
  feed: { label: name },
  groupType,
}: Props) {
  const dispatch = useDispatch();

  const isMobile = useFieldSelector("app", "isMobile");
  const settings = useSelector((state: RootState) => state.settings);
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
  const isWaitingForFeedUpdate = useSelector(
    (state: RootState) => state.feeds.isWaitingForViewUpdateByFeedName[name]
  );
  const isMarkAsReadModeOn = useFieldSelector("feeds", "isMarkAsReadModeOn");
  const lastUpdatedAt = useSelector(
    (state: RootState) => state.feeds.lastUpdatedAtByFeedName[name]
  );
  const wasLastUpdateFromCache = useSelector(
    (state: RootState) => state.feeds.wasLastUpdateFromCacheByFeedName[name]
  );
  const showingFeedTitlesOnly = useFieldSelector(
    "feeds",
    "shouldShowFeedTitlesOnly"
  );

  useDisplayedFeedEntries(name);

  const [shouldStyleAsActive, setShouldStyleAsActive] = useState(false);

  const feedElementRef = useRef<HTMLDivElement>(null);

  const axiosSource = axiosSourceByFeedNameWithGetter.get(name);

  const [shouldPopPlaceholderText, markFeedAsRead] = useMarkFeedAsRead(
    feedEntries,
    name
  );

  const scrollToTopOfFeed = useCallback(
    async (animate: boolean = true) => {
      if (!isMobile || !feedElementRef.current) return;

      // Wait for render.
      await Promise.resolve();

      const currentLeft = 0;
      const currentTop =
        window.pageYOffset || document.documentElement.scrollTop;
      const end =
        feedElementRef.current.getBoundingClientRect().top + currentTop;
      let difference = end - currentTop + 1;
      let start: number;

      if (!animate) {
        window.scrollTo(currentLeft, currentTop);
        return;
      }
      // TODO currently using the same parameters as --ease-out, try to combine.
      // https://github.com/kentph/bulletin/issues/215

      const easing = BezierEasing(0, 1.04, 0.31, 1);
      const animateScroll: FrameRequestCallback = (timestamp) => {
        if (!start) start = timestamp;
        const progress = (timestamp - start) / SCROLL_DURATION;

        // Do animation.
        window.scrollTo(
          currentLeft,
          currentTop + easing(progress) * difference
        );

        // TODO also end animation if the user scrolls.

        if (progress < 1) window.requestAnimationFrame(animateScroll);
      };

      window.requestAnimationFrame(animateScroll);
    },
    [isMobile]
  );

  const { shouldCollapse: shouldCollapseFromSettings, toggleShowFeed } =
    useCollapseFeed(name, scrollToTopOfFeed);

  const shouldCollapse = shouldCollapseFromSettings || showingFeedTitlesOnly;

  const markAllAsRead = useCallback(() => {
    markFeedAsRead();
    scrollToTopOfFeed();
  }, [markFeedAsRead, scrollToTopOfFeed]);

  useEffect(
    function addHotkeyListener() {
      const hotkeyListener = () => {
        markAllAsRead();
      };
      const ref = feedElementRef.current;
      ref?.addEventListener("onhotkeymarkallasread", hotkeyListener);
      return function removeHotkeyListener() {
        ref?.removeEventListener("onhotkeymarkallasread", hotkeyListener);
      };
    },
    [markAllAsRead]
  );

  useLayoutEffect(
    function addIntersectionObserver() {
      if (!feedElementRef.current) return;
      const ref = feedElementRef.current;
      const observer = new IntersectionObserver(
        (entries) => {
          setShouldStyleAsActive(entries[0].isIntersecting);
        },
        {
          rootMargin: `${window.innerHeight - 48}px 0px -${
            window.innerHeight
          }px 0px`,
        }
      );
      observer.observe(ref);
      return function cleanupObserver() {
        observer.unobserve(ref);
      };
    },
    [name]
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

  const allowFeedViewUpdates = () => {
    dispatch(feedsActions.setAreFeedViewUpdatesAllowed(true));
    // Also scroll feed into view.
    scrollToTopOfFeed();
  };

  const collapseAllFeeds = () => {
    dispatch(feedsActions.showFeedTitlesOnly());
  };

  const restoreTempCollapsedFeeds = () => {
    dispatch(feedsActions.restoreFullFeedsView());
  };

  let feedEntriesView: JSX.Element | null = null;
  if (sortedFeedEntries)
    feedEntriesView = (
      <>
        {sortedFeedEntries.map((entry, j) => {
          return (
            <Entry
              {...{
                key: j,
                feedName: name,
                entry,
                shouldShowAuthor: groupType === "list",
                shouldShowLarge: true,
                markAllAsReadFunc: markAllAsRead,
                shouldHideRead: shouldCollapseRead,
                collapseFeedFunc: toggleShowFeed,
                customClassNames: [styles.Entry],
              }}
            />
          );
        })}
      </>
    );

  return (
    <div
      {...{
        className: styles.Feed,
        ref: feedElementRef,
      }}
    >
      {useLongPress(
        <div
          className={classNames(styles.FeedTitleRow, {
            [styles.MarkAsReadMode]: isMarkAsReadModeOn,
            [styles.StyleAsActive]: shouldStyleAsActive && !shouldCollapse,
            [styles.NotSticky]: settings.hideStickyHeaders,
          })}
          onClick={async () => {
            restoreTempCollapsedFeeds();
            scrollToTopOfFeed(false);
          }}
        >
          <div className={styles.TopRow}>
            <h3
              className={classNames(styles.FeedTitle, {
                [styles.Show]: isUpdating,
              })}
            >
              {name}
            </h3>

            <div
              className={classNames(sharedStyles.Spacer, styles.SpacerLine)}
            />

            {shouldCollapse ? (
              <>
                {sortedFeedEntries && sortedFeedEntries.length ? (
                  <span className={styles.UnreadLabel}>
                    {sortedFeedEntries.length > 10
                      ? "10+"
                      : sortedFeedEntries.length}{" "}
                    unread entries
                  </span>
                ) : undefined}
                {!showingFeedTitlesOnly && (
                  <button
                    className={classNames(
                      sharedStyles.Button,
                      sharedStyles.IconButton,
                      styles.CollapseButton
                    )}
                    onClick={toggleShowFeed}
                  >
                    <ExpandIcon className={sharedStyles.FluentIcon} />
                    <span>Expand</span>
                  </button>
                )}
              </>
            ) : undefined}

            {!shouldCollapse && lastUpdatedAt ? (
              isUpdating ? (
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
                <div className={styles.LastUpdated}>
                  {`From ${moment(lastUpdatedAt).fromNow()}
                ${wasLastUpdateFromCache ? " (cache)" : ""}`}
                </div>
              )
            ) : null}
          </div>
        </div>,
        collapseAllFeeds
      )}

      {shouldCollapse ? undefined : sortedFeedEntries ? (
        <div className={styles.FeedEntries}>
          <div
            {...{
              className: classNames(styles.EntryOverlay, {
                [styles.Visible]: isWaitingForFeedUpdate,
              }),
              onClick: allowFeedViewUpdates,
            }}
          >
            <div className={styles.EntryOverlayText}>Tap to load</div>
          </div>
          {sortedFeedEntries.length ? (
            feedEntriesView
          ) : (
            <div
              {...{
                className: classNames(styles.FeedEntriesPlaceholderText, {
                  [styles.Pop]: shouldPopPlaceholderText,
                }),
              }}
            >
              {`No${
                settings.alwaysCollapseRead || shouldCollapseRead
                  ? " unread "
                  : " "
              }entries`}
            </div>
          )}
          {settings.showBottomBars ? (
            <div className={styles.BottomBar}>
              <button
                className={classNames(
                  sharedStyles.Button,
                  sharedStyles.IconButton
                )}
                onClick={markAllAsRead}
              >
                <CheckIcon className={sharedStyles.FluentIcon} />
                <span>Mark as Read</span>
              </button>
              <button
                className={classNames(
                  sharedStyles.Button,
                  sharedStyles.IconButton,
                  styles.CollapseButton
                )}
                onClick={() => {
                  dispatch(
                    feedsActions.triggerManualFeedUpdate({
                      feedName: name,
                      triggeredAt: new Date().getTime(),
                    })
                  );
                }}
              >
                <RefreshIcon className={sharedStyles.FluentIcon} />
                <span>Refresh</span>
              </button>
              <div className={sharedStyles.Spacer} />
              <button
                className={classNames(
                  sharedStyles.Button,
                  sharedStyles.IconButton,
                  styles.CollapseButton
                )}
                onClick={() => {
                  dispatch(
                    appActions.setOptionsMenuContext({
                      menuType: MenuType.FEED_OPTIONS,
                      feedName: name,
                      markAllAsReadFunc: markAllAsRead,
                      shouldHideRead: shouldCollapseRead,
                      collapseFeedFunc: toggleShowFeed,
                    })
                  );
                }}
              >
                <MoreIcon className={sharedStyles.FluentIcon} />
              </button>
            </div>
          ) : undefined}
        </div>
      ) : (
        <div
          {...{
            className: classNames(styles.FeedEntriesPlaceholderText),
          }}
        >
          ...
        </div>
      )}
    </div>
  );
}
