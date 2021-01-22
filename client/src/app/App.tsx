import styles from "./App.module.css";
import sharedStyles from "../features/shared/shared.module.css";
import variableStyles from "../features/shared/variables.module.css";
import { ReactComponent as NewIcon } from "../assets/ic_fluent_news_24_regular.svg";

import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import MenuBar from "../features/menu/MenuBar";
import classNames from "classnames";
import FeedGroup from "../features/feeds/FeedGroup";
import LastVisitedLink from "../features/menu/LastVisitedLink";
import FeedFocusedView from "../features/feeds/FeedFocusedView";
import FeedEditorView from "../features/feeds/FeedEditorView";
import Axios from "axios";
import OptionsMenu from "../features/menu/OptionsMenu";
import { USER_SETTINGS } from "../features/menu/useSettings";
import useFieldSelector from "../features/shared/useFieldSelector";
import useAppSetup from "./useAppSetup";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "./rootReducer";
import { feedsActions } from "./feedsReducer";
import { settingsThunks } from "./settingsReducer";

const isThemeClassValid = (className: string) => {
  return className === variableStyles.Cork || className === variableStyles.Dark;
};

const App = () => {
  useAppSetup();
  const dispatch = useDispatch();

  const isMobile = useFieldSelector("app", "isMobile");
  const isPageActive = useFieldSelector("app", "isVisible");
  const currentUser = useFieldSelector("auth", "currentUser");
  const settings = useSelector((state: RootState) => state.settings);
  const optionsMenuContext = useFieldSelector("app", "optionsMenuContext");
  const feedsByGroup = useFieldSelector("feeds", "feedGroups");
  const isMarkAsReadModeOn = useFieldSelector("feeds", "isMarkAsReadModeOn");
  const areFeedViewUpdatesAllowed = useFieldSelector(
    "feeds",
    "areFeedViewUpdatesAllowed"
  );
  const isWaitingForViewUpdateByFeedName = useFieldSelector(
    "feeds",
    "isWaitingForViewUpdateByFeedName"
  );
  const firstLoadCacheFetchedAt = useFieldSelector(
    "feeds",
    "firstLoadCacheFetchedAt"
  );
  const readsLastFetchedAt = useFieldSelector("feeds", "readsLastFetchedAt");

  const readsLastFetchedAtRef = useRef(readsLastFetchedAt);
  useEffect(
    function keepReadsLastFetchedAtRefUpdated() {
      readsLastFetchedAtRef.current = readsLastFetchedAt;
    },
    [readsLastFetchedAt]
  );

  // Default this to fetch immediately, but we add a listener for when settings are
  // fetched to update it to the correct value.
  const [shouldFetch, setShouldFetch] = useState(true);

  const oldestFirstLoadCacheFetchedAt = useRef<Date>();
  const feedGroupContainerRef = useRef<HTMLDivElement>(null);

  const numFeedsWaiting = useMemo(() => {
    return Object.keys(isWaitingForViewUpdateByFeedName).length;
  }, [isWaitingForViewUpdateByFeedName]);

  useEffect(
    function updateShouldFetchFromSettings() {
      setShouldFetch(!settings.dontLoadImmediately);
    },
    [settings.dontLoadImmediately]
  );

  useEffect(
    function fetchReadsAndSpoken() {
      if (!isPageActive || !currentUser) return;

      (async function fetchReadsAndSpokenAsync() {
        try {
          // Only do so on the second time onwards, except for when
          // the first load was from cache, in which case we do want
          // to fetch reads and spoken.
          if (
            firstLoadCacheFetchedAt &&
            firstLoadCacheFetchedAt !== oldestFirstLoadCacheFetchedAt.current
          ) {
            // To be correct, we update firstLoadCacheFetchedAt ever time
            // a feed loads a cache that's older than the current firstLoadCacheFetchedAt.
            // In the worst case, every feed would trigger a rerun of this effect, but
            // I think that's rare. If it becomes a problem, we can throttle this effect.

            dispatch(
              feedsActions.setReadsLastFetchedAt(
                firstLoadCacheFetchedAt.getTime()
              )
            );
            oldestFirstLoadCacheFetchedAt.current = firstLoadCacheFetchedAt;
          }
          // TODO does using ref here lead to errors from stale data?
          if (!readsLastFetchedAtRef.current) {
            dispatch(feedsActions.setReadsLastFetchedAt(new Date().getTime()));

            // Still add to readMap so that menu bar can collapse.
            dispatch(feedsActions.addToReadMap({}));
            return;
          }

          const [reads, spoken] = await Promise.all([
            Axios.get(`/api/v1/reads/${readsLastFetchedAtRef.current}`),
            Axios.get(`/api/v1/spoken/${readsLastFetchedAtRef.current}`),
          ]);

          dispatch(feedsActions.setReadsLastFetchedAt(new Date().getTime()));

          dispatch(
            feedsActions.addToReadMap(
              (reads.data as any[]).reduce((result, read) => {
                result[read._id] = true;
                return result;
              }, {})
            )
          );
          dispatch(
            feedsActions.addToSpokenMap(
              (spoken.data as any[]).reduce((result, spoken) => {
                result[spoken._id] = true;
                return result;
              }, {})
            )
          );
        } catch (error) {
          console.error(error);
        }
      })();
    },
    [currentUser, dispatch, firstLoadCacheFetchedAt, isPageActive]
  );

  useLayoutEffect(
    function updateThemeClassOnBody() {
      if (settings.themeClass) {
        if (isThemeClassValid(settings.themeClass))
          document.body.className = settings.themeClass;
        else {
          dispatch(
            settingsThunks.setSettingsAndSave((settings) => {
              return {
                ...settings,
                themeClass: variableStyles.Cork,
              };
            })
          );
        }
      } else {
        const settingsFromLocalStorage = JSON.parse(
          window.localStorage.getItem(USER_SETTINGS) || "null"
        );
        if (settingsFromLocalStorage && settingsFromLocalStorage.themeClass) {
          document.body.classList.add(settingsFromLocalStorage.themeClass);
        } else {
          document.body.className = variableStyles.Cork;
        }
      }
    },
    [dispatch, settings.themeClass]
  );

  const enableFetch = () => {
    setShouldFetch(true);
  };

  const refresh = () => {
    setShouldFetch(false);
    window.setTimeout(() => setShouldFetch(true), 1000);
  };

  const endMarkAsReadMode = () => {
    dispatch(feedsActions.setMarkAsReadMode(false));
  };

  const allowFeedViewUpdates = () => {
    dispatch(feedsActions.setAreFeedViewUpdatesAllowed(true));
  };

  const createFirstFeedGroup = async () => {
    dispatch(feedsActions.createFirstFeedGroup());
  };

  const scrollFeedGroupsBack = () => {
    feedGroupContainerRef.current?.scrollBy(-window.innerWidth, 0);
  };

  const scrollFeedGroupsForward = () => {
    feedGroupContainerRef.current?.scrollBy(window.innerWidth, 0);
  };

  const dataView =
    feedsByGroup && shouldFetch ? (
      !feedsByGroup.length ? (
        <div className={styles.PreloadModal}>
          <div>No feeds</div>
          <button
            data-test="create-feed-group-button"
            {...{
              className: sharedStyles.Button,
              onClick: createFirstFeedGroup,
            }}
          >
            Create Feed Group
          </button>
        </div>
      ) : (
        feedsByGroup.map(({ name, type, feeds }, i) => {
          return (
            <FeedGroup
              {...{
                key: `group${i}`,
                name,
                type,
                feeds,
                index: i,
                scrollFeedGroupsBack,
                scrollFeedGroupsForward,
              }}
            />
          );
        })
      )
    ) : (
      <div className={styles.PreloadModal}>
        {shouldFetch ? (
          <>⋯</>
        ) : (
          <button
            className={classNames(sharedStyles.Button)}
            onClick={enableFetch}
          >
            Load feeds
          </button>
        )}
      </div>
    );

  return (
    <div
      {...{
        className: classNames({
          [styles.AppMarkAsReadMode]: isMobile && isMarkAsReadModeOn,
        }),
      }}
    >
      {isMobile && isMarkAsReadModeOn ? (
        <div
          {...{
            className: sharedStyles.MarkAsReadModeBanner,
          }}
        >
          <span>
            <strong>Mark as read mode</strong>
          </span>
          <div {...{ className: sharedStyles.Spacer }} />
          <button
            {...{
              className: sharedStyles.Button,
              onClick: endMarkAsReadMode,
            }}
          >
            Done
          </button>
        </div>
      ) : null}

      {isMobile && !areFeedViewUpdatesAllowed ? (
        <div
          {...{
            className: sharedStyles.DropInBannerContainer,
          }}
        >
          <button
            {...{
              className: classNames(
                sharedStyles.Button,
                sharedStyles.DropInBanner
              ),
              onClick: allowFeedViewUpdates,
            }}
          >
            <NewIcon
              className={classNames(
                sharedStyles.FluentIcon,
                sharedStyles.Secondary
              )}
            />
            <span>
              {numFeedsWaiting === 1 ? "1 feed" : `${numFeedsWaiting} feeds`}{" "}
              updated — tap to load
            </span>
          </button>
        </div>
      ) : null}

      {settings.showReopenLastVisited ? <LastVisitedLink /> : undefined}

      <div
        className={classNames(styles.FeedGroupContainer, styles.NoMenuBar, {
          [styles.Sticky]: !settings.hideStickyHeaders,
        })}
        ref={feedGroupContainerRef}
      >
        {dataView}
      </div>

      <MenuBar
        {...{ refresh, scrollFeedGroupsBack, scrollFeedGroupsForward }}
      />

      <FeedFocusedView />

      <FeedEditorView />

      {optionsMenuContext ? <OptionsMenu /> : undefined}
    </div>
  );
};

export default App;
