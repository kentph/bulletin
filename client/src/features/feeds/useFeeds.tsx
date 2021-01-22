import Axios from "axios";
import { useEffect, useState, useCallback } from "react";
import useRequestBuffer from "../api/useRequestBuffer";
import { FeedGroupData } from "../../types/feedGroupTypes";
import useFieldSelector from "../shared/useFieldSelector";
import { networkActions } from "../../app/networkReducer";
import { useDispatch } from "react-redux";
import { feedsActions } from "../../app/feedsReducer";

const FEED_LIST_BUFFER = "FEED_LIST_BUFFER";

export default function useFeeds() {
  const dispatch = useDispatch();

  const isPageActive = useFieldSelector("app", "isVisible");
  const feedGroups = useFieldSelector("feeds", "feedGroups");
  const currentUser = useFieldSelector("auth", "currentUser");

  const [triedFromServer, setTriedFromServer] = useState(false);

  // Fetch initial feed list.
  useEffect(
    function fetchFeedList() {
      if (!currentUser) return;

      (async function fetchFeedListAsync() {
        try {
          const response = await Axios.get(`/api/v1/feeds`);
          const feedGroups: FeedGroupData[] = (((response.data &&
            response.data.feedGroups) ||
            []) as FeedGroupData[]).map((feedGroup) => {
            // Make sure that numbers are numbers.
            feedGroup.feeds = feedGroup.feeds.map((feed) => {
              if (feed.height !== undefined) feed.height = Number(feed.height);
              if (feed.width !== undefined) feed.width = Number(feed.width);
              feed.updateFrequencyMinutes = Number(feed.updateFrequencyMinutes);
              if (feed.fixedPosition !== undefined)
                feed.fixedPosition = [
                  Number(feed.fixedPosition[0]),
                  Number(feed.fixedPosition[1]),
                ];
              return feed;
            });
            return feedGroup;
          });
          dispatch(feedsActions.setFeedGroups(feedGroups));
          setTriedFromServer(true);
        } catch (error) {
          console.error(error);
        }
      })();
    },
    [currentUser, dispatch]
  );

  const mapBufferToRequestBody = useCallback(
    (buffer: FeedGroupData[][]) => ({
      feedGroupsUpdates: buffer,
    }),
    []
  );

  const onSent = useCallback(() => {
    // This action allows feed updates to continue.
    // We do this because adding a new feed was triggering
    // a request for new entries in that feed before the feed
    // list update was saved to db, which caused an error.
    // This action is called when the ack from the feed list
    // update is received, which means it's safe for us to
    // request new feed entries now.
    dispatch(feedsActions.setFeedListIsSaved());
  }, [dispatch]);

  useRequestBuffer<FeedGroupData[]>(
    `/api/v1/feeds`,
    FEED_LIST_BUFFER,
    !currentUser,
    mapBufferToRequestBody,
    undefined,
    isPageActive,
    onSent
  );

  useEffect(
    function updateServer() {
      if (!triedFromServer || !feedGroups) return;
      dispatch(
        networkActions.setBuffer({
          key: FEED_LIST_BUFFER,
          buffer: [feedGroups],
        })
      );
    },
    [dispatch, feedGroups, triedFromServer]
  );

  // TODO move readmap stuff here too?
}
