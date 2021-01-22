import { combineReducers } from "@reduxjs/toolkit";
import appReducer from "./appReducer";
import authReducer from "./authReducer";
import feedsReducer from "./feedsReducer";
import networkReducer from "./networkReducer";
import settingsReducer from "./settingsReducer";
import statisticsReducer from "./statisticsReducer";

const rootReducer = combineReducers({
  app: appReducer,
  auth: authReducer,
  settings: settingsReducer,
  statistics: statisticsReducer,
  network: networkReducer,
  feeds: feedsReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

export default rootReducer;
