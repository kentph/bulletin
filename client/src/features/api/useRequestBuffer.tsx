import { useCallback, useEffect } from "react";
import Axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../app/rootReducer";
import { networkActions } from "../../app/networkReducer";

export default function useRequestBuffer<T>(
  url: string,
  localStorageKey: string,
  disableSend: boolean,
  mapBufferToRequestBody?: (buffer: T[]) => any,
  mapLocalStorageEntryToBufferEntry?: (entry: any) => T,
  // Keep this as a parameter since we also expect undefined.
  isPageActive?: boolean,
  onSent?: (sentBuffer: T[]) => void
) {
  const dispatch = useDispatch();

  const buffer = useSelector(
    (state: RootState) => state.network.requestBuffersByKey[localStorageKey]
  );

  useEffect(
    function initializeBuffer() {
      dispatch(networkActions.setBuffer({ key: localStorageKey, buffer: [] }));
    },
    [dispatch, localStorageKey]
  );

  const clearBufferAndSend = useCallback(
    async (buffer: T[]) => {
      try {
        if (disableSend || !buffer.length) return;

        const oldBuffer = buffer;

        await Axios.post(
          url,
          (mapBufferToRequestBody || ((buffer) => ({ buffer })))(buffer)
        );

        dispatch(
          networkActions.setBuffer({ key: localStorageKey, buffer: [] })
        );

        if (onSent) onSent(oldBuffer);
      } catch (error) {
        // TODO better, but not intrusive, error handling

        console.error(error);
      }
    },
    [
      disableSend,
      dispatch,
      localStorageKey,
      mapBufferToRequestBody,
      onSent,
      url,
    ]
  );

  useEffect(
    function getBufferFromLocalStorage() {
      // If isPageActive is passed in, then also run when isPageActive becomes true.
      if (isPageActive !== undefined && !isPageActive) return;
      const bufferString = window.localStorage.getItem(localStorageKey);
      if (bufferString) {
        const entries = mapLocalStorageEntryToBufferEntry
          ? (JSON.parse(bufferString) as any[]).map(
              mapLocalStorageEntryToBufferEntry
            )
          : (JSON.parse(bufferString) as T[]);
        // Should be ok to overwrite interval buffer here since this effect is run first thing.
        dispatch(
          networkActions.setBuffer({ key: localStorageKey, buffer: entries })
        );
      } else {
        dispatch(
          networkActions.setBuffer({ key: localStorageKey, buffer: [] })
        );
      }
    },
    [dispatch, isPageActive, localStorageKey, mapLocalStorageEntryToBufferEntry]
  );

  useEffect(
    function writeBufferToLocalStorageAndServer() {
      if (!buffer) return;

      if (!buffer.length) {
        window.localStorage.removeItem(localStorageKey);
        return;
      }
      // This shouldn't overwrite anything in local storage since we've already pulled from
      // local storage above in the previous effect.
      window.localStorage.setItem(localStorageKey, JSON.stringify(buffer));
      clearBufferAndSend(buffer);
    },
    [buffer, clearBufferAndSend, localStorageKey]
  );
}
