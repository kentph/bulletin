import { StarredEntryData } from "../../types/entryTypes";
import useRequestBuffer from "./useRequestBuffer";

export const STARRED_BUFFER = "STARRED_BUFFER";

export default function useStarredRequestBuffer(disableSend: boolean) {
  useRequestBuffer<StarredEntryData>(
    `/api/v1/starred/batch`,
    STARRED_BUFFER,
    disableSend
  );
}
