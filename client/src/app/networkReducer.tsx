import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { VisitedLinkData } from "../types/entryTypes";
import {
  LAST_READING_INTERVAL_START,
  LAST_READING_INTERVAL_ENTRY_ID,
  LAST_READING_INTERVAL_FEED_NAME,
} from "../features/statistics/useStatistics";
import { VISITED_LINK_BUFFER } from "../features/feedEntries/useVisitedLinks";
import { AppThunk } from "./store";

// TODO type the payload properly (maybe using literal types, so the key's type
// can be used to infer the buffer/entry type).
type Entry = any;

interface State {
  // Not using map because of:
  // https://redux.js.org/style-guide/style-guide#do-not-put-non-serializable-values-in-state-or-actions
  requestBuffersByKey: { [key: string]: Entry[] | undefined };
}

const initialState: State = { requestBuffersByKey: {} };

const { actions: networkActions, reducer: networkReducer } = createSlice({
  name: "network",
  initialState,
  reducers: {
    setBuffer(state, action: PayloadAction<{ key: string; buffer: Entry[] }>) {
      state.requestBuffersByKey[action.payload.key] = action.payload.buffer;
    },
    // Expose a function that adds to the request buffer.
    pushToBuffer(state, action: PayloadAction<{ key: string; entry: Entry }>) {
      const buffer = state.requestBuffersByKey[action.payload.key];
      state.requestBuffersByKey[action.payload.key] = [
        ...(buffer || []),
        action.payload.entry,
      ];
    },
  },
});

const networkThunks = {
  // We could do this above when handling link visits, but doing so would require
  // us to access related info through the DOM which feels hacky.
  // This way the relevant component can call this function and pass along as
  // much info as necessary.
  logVisitedLink: (linkData: VisitedLinkData): AppThunk => (dispatch) => {
    const visitDate = new Date();

    window.localStorage.setItem(
      LAST_READING_INTERVAL_START,
      visitDate.toISOString()
    );
    window.localStorage.setItem(
      LAST_READING_INTERVAL_ENTRY_ID,
      linkData.entryId
    );
    window.localStorage.setItem(
      LAST_READING_INTERVAL_FEED_NAME,
      linkData.feedName
    );

    dispatch(
      networkActions.pushToBuffer({
        key: VISITED_LINK_BUFFER,
        entry: { linkData, visitDate: visitDate.getTime() },
      })
    );
  },
};

export type AppState = ReturnType<typeof networkReducer>;

export { networkActions, networkThunks };
export default networkReducer;
