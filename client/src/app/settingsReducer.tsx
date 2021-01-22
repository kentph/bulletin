import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { SetStateAction } from "react";
import { SettingsData } from "../types/settingsTypes";
import { AppThunk } from "./store";

export const MAX_NUMBER_OF_ANNOUNCED_FEEDS = 10;
const initialState: SettingsData = {};

const { actions: settingsActions, reducer: settingsReducer } = createSlice({
  name: "settings",
  initialState,
  reducers: {
    setSettings(_, action: PayloadAction<SettingsData>) {
      return action.payload;
    },
  },
});

const settingsThunks = {
  // Not using the async aspect of thunks here, but makes it easier to reference
  // redux dispatch and state.
  setSettingsAndSave: (setState: SetStateAction<SettingsData>): AppThunk => (
    dispatch,
    getState
  ) => {
    const { settings } = getState();
    const newSettings =
      typeof setState === "function"
        ? // TODO replace this entire thunk with individual actions to not have to do this object clone.
          setState(JSON.parse(JSON.stringify(settings)))
        : setState;

    // Don't send updates if the same.
    if (settings === newSettings) {
      dispatch(settingsActions.setSettings(newSettings));
      return;
    }

    // Ensure announced feeds don't exceed the limit.
    if (
      newSettings.feedsToAnnounce &&
      newSettings.feedsToAnnounce.length > MAX_NUMBER_OF_ANNOUNCED_FEEDS
    ) {
      newSettings.feedsToAnnounce = newSettings.feedsToAnnounce.splice(
        MAX_NUMBER_OF_ANNOUNCED_FEEDS
      );
    }

    dispatch(settingsActions.setSettings(newSettings));
  },
};

export type SettingsState = ReturnType<typeof settingsReducer>;

export { settingsActions, settingsThunks };
export default settingsReducer;
