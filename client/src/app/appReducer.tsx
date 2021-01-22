import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { FeedEntry } from "../types/feedTypes";

export enum MenuType {
  ENTRY_OPTIONS = "ENTRY_OPTIONS",
  FEED_OPTIONS = "FEED_OPTIONS",
}

type OptionsMenuContext = {
  menuType: MenuType;
  feedName: string;
  entry?: FeedEntry;
  isStarred?: boolean;
  markAllAsReadFunc?: () => void;
  shouldHideRead?: boolean;
  collapseFeedFunc?: () => void;
};

// TODO share source of truth with CSS. Right now that's
// not possible because we can't use var() when defining a
// media query. If we add a preprocessor that might allow this.
// https://github.com/kentph/bulletin/issues/215
const MOBILE_MAX_WIDTH = 600;

const isMobile = () => {
  const width =
    window.innerWidth ||
    document.documentElement.clientWidth ||
    document.body.clientWidth;
  return width < MOBILE_MAX_WIDTH;
};

interface State {
  isMobile: boolean;
  isVisible: boolean;
  isKeyboardNavEnabled: boolean;
  optionsMenuContext: OptionsMenuContext | undefined;
}

const initialState: State = {
  isMobile: isMobile(),
  isVisible: document.hasFocus(),
  isKeyboardNavEnabled: true,
  optionsMenuContext: undefined,
};

const { actions: appActions, reducer: appReducer } = createSlice({
  name: "app",
  initialState,
  reducers: {
    refreshIsMobile(state) {
      state.isMobile = isMobile();
    },
    setIsVisible(state, action: PayloadAction<State["isVisible"]>) {
      state.isVisible = action.payload;
    },
    setIsKeyboardNavEnabled(
      state,
      action: PayloadAction<State["isKeyboardNavEnabled"]>
    ) {
      state.isKeyboardNavEnabled = action.payload;
    },
    setOptionsMenuContext(
      state,
      action: PayloadAction<OptionsMenuContext | undefined>
    ) {
      state.optionsMenuContext = action.payload;
    },
  },
});

export type AppState = ReturnType<typeof appReducer>;

export { appActions };
export default appReducer;
