import useRequestBuffer from "./useRequestBuffer";

export type UnstarBufferEntry = {
  entryId: string;
};

export const UNSTAR_BUFFER = "UNSTAR_BUFFER";

export default function useUnstarRequestBuffer(disableSend: boolean) {
  useRequestBuffer<UnstarBufferEntry>(
    `/api/v1/starred/unstar/batch`,
    UNSTAR_BUFFER,
    disableSend
  );
}
