import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { isEqual } from "lodash";
import { FeedDragItem } from "../features/feeds/FeedSimpleEditingView";
import { StarredEntryData } from "../types/entryTypes";
import { FeedGroupData } from "../types/feedGroupTypes";
import { FeedData, FeedEntry } from "../types/feedTypes";
import {
  BATCH_MARK_FEED_AS_SPOKEN_BUFFER,
  UTTERANCE_RATE,
} from "../features/readAloud/useAnnouncer";
import { networkActions } from "./networkReducer";
import { AppThunk } from "./store";
import {
  FeedGridMap,
  FeedPositionMap,
} from "../features/feeds/useFeedGridMaps";

export type FeedCoordinates = { group: number; x: number; y: number };
export type EntryMap = {
  [entryId: string]: true | undefined;
};
export type FeedNameMap<T> = { [feedName: string]: T | undefined };
export type StarredMap = { [entryId: string]: StarredEntryData };

interface State {
  feedGridMaps: FeedGridMap[] | undefined;
  feedPositionMaps: FeedPositionMap[] | undefined;
  focusedFeedCoordinates: FeedCoordinates | undefined;
  areFeedViewUpdatesAllowed: boolean;
  readMap: EntryMap;
  spokenMap: EntryMap;
  readButTreatAsUnreadMapByFeedName: FeedNameMap<EntryMap>;
  shouldCollapseReadByFeedName: FeedNameMap<boolean>;
  // TODO remove this duplicate storage of feed entries.
  // Should probably use createEntityAdapter to store feed entries.
  feedEntriesByFeedName: FeedNameMap<FeedEntry[]>;
  displayedFeedEntriesByFeedName: FeedNameMap<FeedEntry[]>;
  isWaitingForViewUpdateByFeedName: FeedNameMap<boolean>;
  allowNextViewUpdateRefByFeedName: FeedNameMap<boolean>;
  focusedFeedName: string | undefined;
  lastManualUpdateTriggeredAtByFeedName: FeedNameMap<number>;
  isUpdatingByFeedName: FeedNameMap<boolean>;
  feedGroups: FeedGroupData[] | undefined;
  isFeedEditingModeOn: boolean;
  isFeedListSaved: boolean;
  isMarkAsReadModeOn: boolean;
  feedGroupIndexOfNewOrEditingFeed: number | undefined;
  feedIndexOfEditingFeed: number | undefined;
  feedBeingDragged: FeedDragItem | undefined;
  firstLoadCacheFetchedAt: Date | undefined;
  starredMap: StarredMap | undefined;
  lastUpdatedAtByFeedName: FeedNameMap<number>;
  wasLastUpdateFromCacheByFeedName: FeedNameMap<boolean>;
  readsLastFetchedAt: number | undefined;
  shouldShowFeedTitlesOnly: boolean;
}

const initialState: State = {
  feedGridMaps: undefined,
  feedPositionMaps: undefined,
  focusedFeedCoordinates: undefined,
  areFeedViewUpdatesAllowed: true,
  readMap: {},
  spokenMap: {},
  readButTreatAsUnreadMapByFeedName: {},
  shouldCollapseReadByFeedName: {},
  feedEntriesByFeedName: {},
  // TODO if we want each view to show different entries
  // (eg. we might want to hide read in the simple view but show it in the
  // focused view), then we this should be moved into the view component.
  displayedFeedEntriesByFeedName: {},
  isWaitingForViewUpdateByFeedName: {},
  allowNextViewUpdateRefByFeedName: {},
  focusedFeedName: undefined,
  lastManualUpdateTriggeredAtByFeedName: {},
  isUpdatingByFeedName: {},
  feedGroups: undefined,
  isFeedEditingModeOn: false,
  isFeedListSaved: false,
  isMarkAsReadModeOn: false,
  feedGroupIndexOfNewOrEditingFeed: undefined,
  feedIndexOfEditingFeed: undefined,
  feedBeingDragged: undefined,
  firstLoadCacheFetchedAt: undefined,
  starredMap: undefined,
  lastUpdatedAtByFeedName: {},
  wasLastUpdateFromCacheByFeedName: {},
  readsLastFetchedAt: undefined,
  shouldShowFeedTitlesOnly: false,
};

const doUpdatesChangeMap = (update: EntryMap, map: EntryMap) => {
  return !(
    update === map ||
    Object.keys(update).reduce((result, key) => {
      return result && update[key] === (map && map[key]);
    }, Boolean(true))
  );
};

const { actions: feedsActions, reducer: feedsReducer } = createSlice({
  name: "feeds",
  initialState,
  reducers: {
    setFeedMaps(
      state,
      action: PayloadAction<{
        gridMaps: typeof initialState.feedGridMaps;
        positionMaps: typeof initialState.feedPositionMaps;
      }>
    ) {
      state.feedGridMaps = action.payload.gridMaps;
      state.feedPositionMaps = action.payload.positionMaps;
    },
    setFocusedFeedCoordinates(
      state,
      action: PayloadAction<Partial<FeedCoordinates> | undefined>
    ) {
      state.focusedFeedCoordinates = {
        group: 0,
        x: 0,
        y: 0,
        ...state.focusedFeedCoordinates,
        ...action.payload,
      };
    },
    setAreFeedViewUpdatesAllowed(state, action: PayloadAction<boolean>) {
      state.areFeedViewUpdatesAllowed = action.payload;
    },
    setShouldCollapseRead(
      state,
      action: PayloadAction<{
        feedName: string;
        shouldCollapseRead: boolean;
      }>
    ) {
      state.shouldCollapseReadByFeedName[action.payload.feedName] =
        action.payload.shouldCollapseRead;
      state.readButTreatAsUnreadMapByFeedName[action.payload.feedName] = {};
      // Don't block view updates for showing and hiding read for this feed.
      // Use a ref for this so we don't trigger effects/renders.
      // state.allowNextViewUpdateRefByFeedName[action.payload.feedName] = true;
      state.areFeedViewUpdatesAllowed = true;
    },
    addToReadMap(state, action: PayloadAction<EntryMap>) {
      // Only update map if the new map adds new values or new keys.
      // Immer doesn't do deep object comparisons so we'll do it ourselves.
      if (doUpdatesChangeMap(action.payload, state.readMap))
        state.readMap = {
          ...state.readMap,
          ...action.payload,
        };
    },
    markAsRead(
      state,
      action: PayloadAction<{ feedName: string; entryId: string }>
    ) {
      state.readMap[action.payload.entryId] = true;
      state.readButTreatAsUnreadMapByFeedName[action.payload.feedName] = {
        ...state.readButTreatAsUnreadMapByFeedName[action.payload.feedName],
        [action.payload.entryId]: true,
      };
    },
    batchMarkAsRead(
      state,
      action: PayloadAction<{ feedName: string; entryIds: string[] }>
    ) {
      state.readMap = {
        ...state.readMap,
        ...action.payload.entryIds.reduce<EntryMap>((result, id) => {
          result[id] = true;
          return result;
        }, {}),
      };
      state.readButTreatAsUnreadMapByFeedName[action.payload.feedName] = {};
      // Don't block view updates for marking read for this feed.
      // Use a ref for this so we don't trigger effects/renders.
      // state.allowNextViewUpdateRefByFeedName[action.payload.feedName] = true;
      state.areFeedViewUpdatesAllowed = true;
    },
    addToSpokenMap(state, action: PayloadAction<EntryMap>) {
      // See addToReadMap.
      if (doUpdatesChangeMap(action.payload, state.spokenMap))
        state.spokenMap = {
          ...state.spokenMap,
          ...action.payload,
        };
    },
    setFeedEntries(
      state,
      action: PayloadAction<{ feedName: string; newEntries: FeedEntry[] }>
    ) {
      // If this is the first time entries were fetched for this feed, allow them to be shown
      // immediately. If not, then begin blocking updates until user manually shows them.
      state.areFeedViewUpdatesAllowed =
        !Boolean(state.feedEntriesByFeedName[action.payload.feedName]) ||
        // This is set to true when we trigger a manual update.
        state.allowNextViewUpdateRefByFeedName[action.payload.feedName] ||
        false;
      if (!state.areFeedViewUpdatesAllowed)
        state.isWaitingForViewUpdateByFeedName[action.payload.feedName] = true;
      state.feedEntriesByFeedName[action.payload.feedName] =
        action.payload.newEntries;
      state.readButTreatAsUnreadMapByFeedName[action.payload.feedName] = {};
    },
    setDisplayedFeedEntries(
      state,
      action: PayloadAction<{
        feedName: string;
        newEntriesToDisplay: FeedEntry[];
      }>
    ) {
      const currentlyDisplayedFeedEntries =
        state.displayedFeedEntriesByFeedName[action.payload.feedName];
      // Only replace when array is changed.
      if (
        !isEqual(
          currentlyDisplayedFeedEntries,
          action.payload.newEntriesToDisplay
        )
      )
        state.displayedFeedEntriesByFeedName[action.payload.feedName] =
          action.payload.newEntriesToDisplay;
      // TODO just set to false for better performance?
      delete state.isWaitingForViewUpdateByFeedName[action.payload.feedName];
      delete state.allowNextViewUpdateRefByFeedName[action.payload.feedName];
    },
    setFocusedFeedName(state, action: PayloadAction<string | undefined>) {
      state.focusedFeedName = action.payload;
    },
    triggerManualFeedUpdate(
      state,
      action: PayloadAction<{
        feedName: string;
        triggeredAt: number;
      }>
    ) {
      state.lastManualUpdateTriggeredAtByFeedName[action.payload.feedName] =
        action.payload.triggeredAt;
      // Don't block view updates for manual refreshes for this feed.
      // Use a ref for this so we don't trigger effects/renders.
      state.allowNextViewUpdateRefByFeedName[action.payload.feedName] = true;
    },
    setFeedIsUpdating(
      state,
      action: PayloadAction<{
        feedName: string;
        isUpdating: boolean;
      }>
    ) {
      state.isUpdatingByFeedName[action.payload.feedName] =
        action.payload.isUpdating;
    },
    setFeedGroups(state, action: PayloadAction<FeedGroupData[]>) {
      state.feedGroups = action.payload;
      // Make sure to exit editing mode if there are no more feed groups.
      if (!state.feedGroups?.length) state.isFeedEditingModeOn = false;
      state.isFeedListSaved = true;
    },
    setFeedEditingMode(state, action: PayloadAction<boolean>) {
      // Don't do anything if there are no feed groups yet.
      if (state.feedGroups?.length) state.isFeedEditingModeOn = action.payload;
    },
    setFeedListIsSaved(state) {
      state.isFeedListSaved = true;
    },
    setMarkAsReadMode(state, action: PayloadAction<boolean>) {
      state.isMarkAsReadModeOn = action.payload;
    },
    addToWaitingForViewUpdateMap(state, action: PayloadAction<string>) {
      state.isWaitingForViewUpdateByFeedName[action.payload] = true;
    },
    createFirstFeedGroup(state) {
      if (state.feedGroups && state.feedGroups.length) return;
      state.feedGroups = [
        {
          name: "",
          type: "grid",
          feeds: [],
        },
      ];
    },
    addNewFeedToFeedGroup(
      state,
      action: PayloadAction<{
        feedGroupIndex: number;
        newFeed: FeedData;
      }>
    ) {
      const newFeed = { ...action.payload.newFeed };
      if (!newFeed.id) newFeed.id = "_";
      if (state.feedGroups) {
        const length =
          state.feedGroups[action.payload.feedGroupIndex].feeds.length;
        state.feedGroups[action.payload.feedGroupIndex].feeds.splice(
          length,
          0,
          newFeed
        );
      }
      state.feedGroupIndexOfNewOrEditingFeed = undefined;
      state.feedIndexOfEditingFeed = undefined;
      state.isFeedListSaved = false;
    },
    deleteFeed(
      state,
      action: PayloadAction<{ feedGroupIndex: number; feedIndex: number }>
    ) {
      if (state.feedGroups)
        state.feedGroups[action.payload.feedGroupIndex].feeds.splice(
          action.payload.feedIndex,
          1
        );
    },
    beginAddingNewFeed(state, action: PayloadAction<number>) {
      state.feedGroupIndexOfNewOrEditingFeed = action.payload;
    },
    beginEditingFeed(
      state,
      action: PayloadAction<{
        feedGroupIndex: number;
        feedIndex: number;
      }>
    ) {
      state.feedGroupIndexOfNewOrEditingFeed = action.payload.feedGroupIndex;
      state.feedIndexOfEditingFeed = action.payload.feedIndex;
    },
    closeFeedEditor(state) {
      state.feedGroupIndexOfNewOrEditingFeed = undefined;
      state.feedIndexOfEditingFeed = undefined;
    },
    finishEditingFeed(
      state,
      action: PayloadAction<{
        feedGroupIndex: number;
        feedIndex: number;
        editedFeed: FeedData;
      }>
    ) {
      const editedFeed = { ...action.payload.editedFeed };
      if (!editedFeed.id) editedFeed.id = "_";
      if (state.feedGroups) {
        state.feedGroups[action.payload.feedGroupIndex].feeds[
          action.payload.feedIndex
        ] = editedFeed;
      }
      state.feedGroupIndexOfNewOrEditingFeed = undefined;
      state.feedIndexOfEditingFeed = undefined;
    },
    addFeedGroupAfter(state, action: PayloadAction<number>) {
      if (state.feedGroups)
        state.feedGroups.splice(action.payload + 1, 0, {
          name: "",
          type: "grid",
          feeds: [],
        });
    },
    deleteFeedGroup(state, action: PayloadAction<number>) {
      if (state.feedGroups) state.feedGroups.splice(action.payload, 1);
      // Make sure to exit editing mode if there are no more feed groups.
      if (!state.feedGroups?.length) state.isFeedEditingModeOn = false;
    },
    moveFeedUp(
      state,
      action: PayloadAction<{
        feedGroupIndex: number;
        feedIndex: number;
      }>
    ) {
      if (state.feedGroups) {
        if (action.payload.feedIndex === 0) return;
        const [feed] = state.feedGroups[
          action.payload.feedGroupIndex
        ].feeds.splice(action.payload.feedIndex, 1);
        state.feedGroups[action.payload.feedGroupIndex].feeds.splice(
          action.payload.feedIndex - 1,
          0,
          feed
        );
      }
    },
    moveFeedDown(
      state,
      action: PayloadAction<{
        feedGroupIndex: number;
        feedIndex: number;
      }>
    ) {
      if (state.feedGroups) {
        if (
          action.payload.feedIndex ===
          state.feedGroups[action.payload.feedGroupIndex].feeds.length - 1
        )
          return;
        const [feed] = state.feedGroups[
          action.payload.feedGroupIndex
        ].feeds.splice(action.payload.feedIndex, 1);
        state.feedGroups[action.payload.feedGroupIndex].feeds.splice(
          action.payload.feedIndex + 1,
          0,
          feed
        );
      }
    },
    toggleFixedPositioning(
      state,
      action: PayloadAction<{
        feedGroupIndex: number;
        feedIndex: number;
        potentialCoord: [number, number];
      }>
    ) {
      if (state.feedGroups) {
        if (
          state.feedGroups[action.payload.feedGroupIndex].feeds[
            action.payload.feedIndex
          ].fixedPosition
        ) {
          state.feedGroups[action.payload.feedGroupIndex].feeds[
            action.payload.feedIndex
          ].fixedPosition = undefined;
        } else {
          state.feedGroups[action.payload.feedGroupIndex].feeds[
            action.payload.feedIndex
          ].fixedPosition = action.payload.potentialCoord;
        }
      }
    },
    setFeedBeingDragged(
      state,
      action: PayloadAction<FeedDragItem | undefined>
    ) {
      state.feedBeingDragged = action.payload;
    },
    moveFeedToCoord(
      state,
      action: PayloadAction<{
        feedGroupIndex: number;
        feedIndex: number;
        coord: [number, number];
      }>
    ) {
      if (state.feedGroups) {
        state.feedGroups[action.payload.feedGroupIndex].feeds[
          action.payload.feedIndex
        ].fixedPosition = action.payload.coord;
      }
    },
    cacheUsedFetchReadsAndSpoken(state, action: PayloadAction<Date>) {
      // To be correct, we need to choose the oldest cache's fetch date.
      if (
        !state.firstLoadCacheFetchedAt ||
        state.firstLoadCacheFetchedAt.getTime() > action.payload.getTime()
      )
        state.firstLoadCacheFetchedAt = action.payload;
    },
    addToStarredMap(state, action: PayloadAction<StarredMap>) {
      if (!state.starredMap) state.starredMap = {};

      // Only update starredMap if the new starredMap adds new values or new keys.
      // Immer doesn't do deep object comparisons so we'll do it ourselves.
      const updateChangesStarredMap = !(
        action.payload === state.starredMap ||
        Object.keys(action.payload).reduce((result, key) => {
          return (
            result &&
            action.payload[key] === (state.starredMap && state.starredMap[key])
          );
        }, Boolean(true))
      );

      if (updateChangesStarredMap)
        state.starredMap = {
          ...state.starredMap,
          ...action.payload,
        };
    },
    unstar(state, action: PayloadAction<string>) {
      if (!state.starredMap) return;
      delete state.starredMap[action.payload];
    },
    setLastUpdatedAt(state, action: PayloadAction<FeedNameMap<number>>) {
      state.lastUpdatedAtByFeedName = {
        ...state.lastUpdatedAtByFeedName,
        ...action.payload,
      };
    },
    setWasLastUpdateFromCache(
      state,
      action: PayloadAction<FeedNameMap<boolean>>
    ) {
      state.wasLastUpdateFromCacheByFeedName = {
        ...state.wasLastUpdateFromCacheByFeedName,
        ...action.payload,
      };
    },
    setReadsLastFetchedAt(state, action: PayloadAction<number | undefined>) {
      state.readsLastFetchedAt = action.payload;
    },
    showFeedTitlesOnly(state) {
      state.shouldShowFeedTitlesOnly = true;
    },
    restoreFullFeedsView(state) {
      state.shouldShowFeedTitlesOnly = false;
    },
  },
});

const feedsThunks = {
  speakNewEntriesInFeed:
    (newEntries: FeedEntry[], feedName: string): AppThunk =>
    (dispatch, getState) => {
      const {
        app: { isMobile, isVisible: isPageActive },
        settings: { muteFeedAnnouncements, voice: voiceURI },
        feeds: { spokenMap },
      } = getState();

      const unspokenEntries = newEntries.filter(
        (entry) => !spokenMap[entry.id]
      );

      if (!unspokenEntries.length) return;

      const newUnspokenIds = unspokenEntries.map((entry) => entry.id);
      // Mark as spoken immediately, before they're actually spoken.
      // This prevents us from queuing up duplicate utterances.
      dispatch(
        feedsActions.addToSpokenMap(
          newUnspokenIds.reduce<EntryMap>((result, id) => {
            result[id] = true;
            return result;
          }, {})
        )
      );
      // For now, don't actually speak on mobile, but continue to add to spoken map.
      if (isMobile || isPageActive || muteFeedAnnouncements) {
        dispatch(
          networkActions.pushToBuffer({
            key: BATCH_MARK_FEED_AS_SPOKEN_BUFFER,
            entry: { feedName, ids: newUnspokenIds },
          })
        );
        return;
      }

      const createUtteranceWithVoice = (text: string) => {
        const utterance = new SpeechSynthesisUtterance(text);
        const voice = window.speechSynthesis
          .getVoices()
          .find((voice) => voice.voiceURI === voiceURI);
        if (voice) utterance.voice = voice;
        utterance.rate = UTTERANCE_RATE;
        return utterance;
      };

      window.speechSynthesis.speak(
        createUtteranceWithVoice(`New in. ${feedName}`)
      );

      unspokenEntries.forEach((entry, index) => {
        window.speechSynthesis.speak(createUtteranceWithVoice(`${index + 1}`));
        if (entry.author)
          window.speechSynthesis.speak(
            createUtteranceWithVoice(`from ${entry.author}`)
          );
        const utterance = createUtteranceWithVoice(entry.text);

        // TODO allow custom utterance languages (eg. en-UK for en).
        if (entry.lang) {
          utterance.lang = entry.lang;
        }

        window.speechSynthesis.speak(utterance);
      });

      dispatch(
        networkActions.pushToBuffer({
          key: BATCH_MARK_FEED_AS_SPOKEN_BUFFER,
          entry: { feedName, ids: newUnspokenIds },
        })
      );
    },
};

export type FeedsState = ReturnType<typeof feedsReducer>;

export { feedsActions, feedsThunks };
export default feedsReducer;
