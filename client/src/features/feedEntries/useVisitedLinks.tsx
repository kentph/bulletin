import { useCallback } from "react";
import { VisitedLinkData } from "../../types/entryTypes";
import useRequestBuffer from "../api/useRequestBuffer";

type VisitedLinkBufferEntry = { linkData: VisitedLinkData; visitDate: number };

export const VISITED_LINK_BUFFER = "VISITED_LINK_BUFFER";

export default function useVisitedLinks(disableSend: boolean) {
  const mapBufferToRequestBody = useCallback(
    (buffer: VisitedLinkBufferEntry[]) => ({
      newVisitedLinks: buffer,
    }),
    []
  );
  const mapLocalStorageEntryToBufferEntry = useCallback(
    (entry: VisitedLinkBufferEntry) => ({
      ...entry,
      visitDate: new Date(entry.visitDate).getTime(),
    }),
    []
  );

  useRequestBuffer<VisitedLinkBufferEntry>(
    `/api/v1/statistics/visitedLinks`,
    VISITED_LINK_BUFFER,
    disableSend,
    mapBufferToRequestBody,
    mapLocalStorageEntryToBufferEntry
  );
}
