import { useCallback } from "react";
import useRequestBuffer from "./useRequestBuffer";

export type BatchMarkFeedAsReadBufferEntry = {
  feedName: string;
  ids: string[];
};

export const BATCH_MARK_FEED_AS_READ_BUFFER = "BATCH_MARK_FEED_AS_READ_BUFFER";

export default function useBatchMarkFeedAsReadRequestBuffer(
  disableSend: boolean
) {
  const mapBufferToRequestBody = useCallback(
    (buffer: BatchMarkFeedAsReadBufferEntry[]) => ({
      buffer,
    }),
    []
  );

  useRequestBuffer<BatchMarkFeedAsReadBufferEntry>(
    `/api/v1/reads/batchFeed`,
    BATCH_MARK_FEED_AS_READ_BUFFER,
    disableSend,
    mapBufferToRequestBody
  );
}
