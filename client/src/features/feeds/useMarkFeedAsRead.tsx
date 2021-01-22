import { useCallback, useState } from "react";
import { FeedEntry } from "../../types/feedTypes";
import { BATCH_MARK_FEED_AS_READ_BUFFER } from "../api/useBatchMarkFeedAsReadRequestBuffer";
import { useDispatch } from "react-redux";
import { networkActions } from "../../app/networkReducer";
import { feedsActions } from "../../app/feedsReducer";

export default function useMarkFeedAsRead(
  feedEntries: FeedEntry[] | undefined,
  feedName: string | undefined
): [boolean, () => Promise<void>] {
  const dispatch = useDispatch();

  const [shouldPopPlaceholderText, setShouldPopPlaceholderText] = useState(
    false
  );

  const markFeedAsRead = useCallback(async () => {
    if (!feedEntries || !feedName) return;
    const newReadIds = feedEntries.map((entry) => entry.id);

    dispatch(
      feedsActions.batchMarkAsRead({
        feedName,
        entryIds: newReadIds,
      })
    );

    setShouldPopPlaceholderText(true);
    window.setTimeout(() => {
      setShouldPopPlaceholderText(false);
    }, 2000);

    dispatch(
      networkActions.pushToBuffer({
        key: BATCH_MARK_FEED_AS_READ_BUFFER,
        entry: { feedName, ids: newReadIds },
      })
    );
  }, [dispatch, feedEntries, feedName]);

  return [shouldPopPlaceholderText, markFeedAsRead];
}
