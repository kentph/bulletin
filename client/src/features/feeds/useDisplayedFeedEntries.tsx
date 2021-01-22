import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { feedsActions } from "../../app/feedsReducer";
import { RootState } from "../../app/rootReducer";
import useFieldSelector from "../shared/useFieldSelector";

export default function useDisplayedFeedEntries(name: string | undefined) {
  const dispatch = useDispatch();

  const isMobile = useFieldSelector("app", "isMobile");
  const settings = useSelector((state: RootState) => state.settings);
  const feedEntries = useSelector((state: RootState) =>
    name ? state.feeds.feedEntriesByFeedName[name] : undefined
  );
  const shouldCollapseRead = useSelector((state: RootState) =>
    name ? state.feeds.shouldCollapseReadByFeedName[name] : undefined
  );
  const readButTreatAsUnreadMap = useSelector((state: RootState) =>
    name ? state.feeds.readButTreatAsUnreadMapByFeedName[name] : undefined
  );
  const readMap = useFieldSelector("feeds", "readMap");
  const areFeedViewUpdatesAllowed = useFieldSelector(
    "feeds",
    "areFeedViewUpdatesAllowed"
  );

  useEffect(
    function updateFeedEntriesToDisplay() {
      // Only show entries when readMap is fetched.
      // `areFeedViewUpdatesAllowed` acts as a barrier for syncing
      // new view updates to this feed's entries. It's initialized to true.
      if (
        name &&
        feedEntries &&
        readMap &&
        readButTreatAsUnreadMap &&
        (!isMobile || areFeedViewUpdatesAllowed)
      ) {
        // Make sure to return an array copy.
        let feedEntriesCopy = feedEntries.slice();
        if (shouldCollapseRead) {
          feedEntriesCopy = feedEntriesCopy.filter(
            (entry) => !readMap[entry.id] || readButTreatAsUnreadMap[entry.id]
          );
        }
        // Only do this if read entries are shown.
        else if (settings.showUnreadFirst) {
          feedEntriesCopy = feedEntriesCopy.sort((a, b) => {
            const aOrder =
              readMap[a.id] && !readButTreatAsUnreadMap[a.id] ? 1 : 0;
            const bOrder =
              readMap[b.id] && !readButTreatAsUnreadMap[b.id] ? 1 : 0;
            return aOrder - bOrder;
          });
        }
        // If the array is unchanged, the following dispatch should
        // not trigger a render (we check using lodash isEqual).
        dispatch(
          feedsActions.setDisplayedFeedEntries({
            feedName: name,
            newEntriesToDisplay: feedEntriesCopy,
          })
        );
      }
    },
    [
      areFeedViewUpdatesAllowed,
      dispatch,
      feedEntries,
      isMobile,
      name,
      readButTreatAsUnreadMap,
      readMap,
      settings.showUnreadFirst,
      shouldCollapseRead,
    ]
  );
}
