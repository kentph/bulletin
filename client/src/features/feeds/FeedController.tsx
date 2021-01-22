import { useState, useCallback, useEffect, useRef } from "react";
import Axios from "axios";
import he from "he";
import { FeedEntry } from "../../types/feedTypes";
import useFieldSelector from "../shared/useFieldSelector";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../app/rootReducer";
import {
  EntryMap,
  feedsActions,
  feedsThunks,
  StarredMap,
} from "../../app/feedsReducer";
import { axiosSourceByFeedNameWithGetter } from "../../app/axiosCancelSource";

type Props = {
  name: string;
  source: string;
  id: string;
  updateFrequencyMinutes: number;
  width?: number;
  height?: number;
  groupType?: string;
};

export default function FeedController({
  name,
  updateFrequencyMinutes,
}: Props) {
  const dispatch = useDispatch();

  const isPageVisible = useFieldSelector("app", "isVisible");
  const currentUser = useFieldSelector("auth", "currentUser");
  const settings = useSelector((state: RootState) => state.settings);
  const feedEntries = useSelector(
    (state: RootState) => state.feeds.feedEntriesByFeedName[name]
  );
  const lastManualUpdateTriggeredAt = useSelector(
    (state: RootState) =>
      state.feeds.lastManualUpdateTriggeredAtByFeedName[name]
  );
  const readMap = useFieldSelector("feeds", "readMap");
  const isFeedListSaved = useFieldSelector("feeds", "isFeedListSaved");
  const lastUpdatedAt = useSelector(
    (state: RootState) => state.feeds.lastUpdatedAtByFeedName[name]
  );

  // Use a local ref for lastUpdatedAt, so that we can refer to it in a useEffect below
  // without trigger the effect when it changes.
  const lastUpdatedAtRef = useRef(lastUpdatedAt);
  useEffect(
    function keepLastUpdatedAtRefUpdated() {
      lastUpdatedAtRef.current = lastUpdatedAt;
    },
    [lastUpdatedAt]
  );

  // Keep auto update flag in controller since I don't think it's needed anywhere else.
  const [lastAutoUpdateTriggeredAt, setLastAutoUpdateTriggeredAt] = useState(
    new Date()
  );
  const [shouldAnnounceNewEntries, setShouldAnnounceNewEntries] = useState(
    false
  );

  useEffect(
    function keepAnnounceNewEntriesUpdated() {
      setShouldAnnounceNewEntries(
        settings.feedsToAnnounce?.includes(name) || false
      );
    },
    [name, settings.feedsToAnnounce]
  );

  const axiosSource = axiosSourceByFeedNameWithGetter.get(name);
  const scheduleNextUpdate = useCallback(
    function scheduleNextUpdateCallback(customNextUpdateDelayMs?: number) {
      if (customNextUpdateDelayMs && customNextUpdateDelayMs < 0)
        throw Error("customNextUpdateDelayMs less than zero");

      return window.setTimeout(
        function triggerUpdate() {
          setLastAutoUpdateTriggeredAt(new Date());
        },
        customNextUpdateDelayMs !== undefined
          ? customNextUpdateDelayMs
          : updateFrequencyMinutes * 60 * 1000
      );
    },
    [updateFrequencyMinutes]
  );

  const updateEntries = useCallback(
    (
      entries: FeedEntry[],
      readMapUpdate?: EntryMap,
      spokenMapUpdate?: EntryMap,
      starredMapUpdate?: StarredMap
    ) => {
      dispatch(
        feedsActions.setFeedEntries({
          feedName: name,
          newEntries: entries.map((entry) => {
            entry.text = he.decode(entry.text);
            return entry;
          }),
        })
      );
      if (readMapUpdate) dispatch(feedsActions.addToReadMap(readMapUpdate));
      if (spokenMapUpdate)
        dispatch(feedsActions.addToSpokenMap(spokenMapUpdate));
      if (starredMapUpdate)
        dispatch(feedsActions.addToStarredMap(starredMapUpdate));
    },
    [dispatch, name]
  );

  const fetchNewFeedEntries = useCallback(
    (fresh?: boolean) => {
      let timeoutId: number | undefined;

      // Do update asynchronously.
      // Won't be waiting on this promise since we also want to return
      // a cleanup function for useEffect.
      (async function updateFeed() {
        try {
          dispatch(
            feedsActions.setFeedIsUpdating({
              feedName: name,
              isUpdating: true,
            })
          );

          const response = await Axios.get(
            `/api/v1/feeds/${encodeURIComponent(name)}${
              fresh ? "?fresh=true" : ""
            }`,
            { cancelToken: axiosSource.token }
          );
          const {
            entries,
            readMap,
            spokenMap,
            starredMap,
            fetchedAt: fetchedAtString,
            fromCache,
          } = response.data;
          const fetchedAt = new Date(fetchedAtString);

          updateEntries(entries, readMap, spokenMap, starredMap);

          dispatch(
            feedsActions.setLastUpdatedAt({ [name]: fetchedAt.getTime() })
          );
          dispatch(
            feedsActions.setWasLastUpdateFromCache({ [name]: fromCache })
          );

          // Schedule next update.
          // Right now this is done without waiting for the response above.
          timeoutId = scheduleNextUpdate(
            updateFrequencyMinutes * 60 * 1000 -
              (Date.now() - fetchedAt.getTime())
          );
        } catch (error) {
          console.error(error);
        } finally {
          dispatch(
            feedsActions.setFeedIsUpdating({
              feedName: name,
              isUpdating: false,
            })
          );
        }
      })();

      return function cleanupFetchFeed() {
        // Cancel timeout on cleanup.
        // (mostly only relevant on unmount, since otherwise this cleanup
        // would have been triggered by said timeout running its callback
        // and updating lastUpdateTriggeredAt)
        if (timeoutId) window.clearTimeout(timeoutId);
      };
    },
    [
      axiosSource.token,
      dispatch,
      name,
      scheduleNextUpdate,
      updateEntries,
      updateFrequencyMinutes,
    ]
  );

  useEffect(
    function autoUpdateFeed() {
      if (lastAutoUpdateTriggeredAt) {
        // HACK to have lastAutoUpdateTriggeredAt be included in dependency array automatically.
      }
      // Remember that we can assume all past timeouts set from this component
      // have already been cancelled and cleared, since the last cleanup function
      // is always run before this effect function.

      // Skip updates when in background, and don't schedule any future updates.
      // Don't skip if we want to announce new entries for this feed.
      // Also skip if no user has logged in yet.
      if (
        !currentUser ||
        (!isPageVisible && !shouldAnnounceNewEntries) ||
        // Also don't fetch new feeds if feed list update hasn't been saved yet.
        !isFeedListSaved
      ) {
        // We don't need to do any cleanup since we didn't set any timeouts.
        return;
      }

      const timeSinceLastUpdatedMs =
        new Date().getTime() - (lastUpdatedAtRef.current || 0);
      const intervalMs = updateFrequencyMinutes * 60 * 1000;

      // When an update was recently triggered, we don't want to trigger an autoupdate so soon.
      // If we're less than 1 interval from the last update then don't update now, but
      // schedule the next one at the time the current interval ends.
      if (timeSinceLastUpdatedMs < intervalMs) {
        const timeoutId = scheduleNextUpdate(
          intervalMs - timeSinceLastUpdatedMs
        );
        return function cancelTimeout() {
          // Cancel timeout on cleanup.
          // (mostly only relevant on unmount, since otherwise this cleanup
          // would have been triggered by said timeout running its callback
          // and updating lastUpdateTriggeredAt)
          if (timeoutId) window.clearTimeout(timeoutId);
        };
      }

      return fetchNewFeedEntries();
    },
    [
      currentUser,
      fetchNewFeedEntries,
      isFeedListSaved,
      isPageVisible,
      lastAutoUpdateTriggeredAt,
      scheduleNextUpdate,
      shouldAnnounceNewEntries,
      updateFrequencyMinutes,
    ]
  );

  useEffect(
    function manualForceUpdateFeed() {
      if (lastManualUpdateTriggeredAt !== undefined) {
        return fetchNewFeedEntries(true);
      }
    },
    [lastManualUpdateTriggeredAt, fetchNewFeedEntries]
  );

  useEffect(
    function updateShouldCollapseRead() {
      dispatch(
        feedsActions.setShouldCollapseRead({
          feedName: name,
          shouldCollapseRead: Boolean(settings.alwaysCollapseRead),
        })
      );
    },
    [dispatch, name, settings.alwaysCollapseRead]
  );

  useEffect(
    function announceNewFeedEntries() {
      // Only read entries when readMap is fetched.
      // Always remove unread entries.
      if (readMap && feedEntries && shouldAnnounceNewEntries) {
        const unreadFeedEntries = feedEntries.filter(
          (entry) => !readMap[entry.id]
        );

        dispatch(feedsThunks.speakNewEntriesInFeed(unreadFeedEntries, name));
      }
    },
    [dispatch, feedEntries, name, readMap, shouldAnnounceNewEntries]
  );

  return null;
}
