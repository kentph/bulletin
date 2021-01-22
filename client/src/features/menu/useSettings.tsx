import { useState, useEffect } from "react";
import { SettingsData } from "../../types/settingsTypes";
import Axios from "axios";
import useFieldSelector from "../shared/useFieldSelector";
import { useDispatch, useSelector } from "react-redux";
import { settingsActions } from "../../app/settingsReducer";
import { RootState } from "../../app/rootReducer";

export const USER_SETTINGS = "USER_SETTINGS";
export const TOO_MANY_ANNOUNCED_FEEDS = "TOO_MANY_ANNOUNCED_FEEDS";

// TODO send settings to server when online if changed when offline (ie. useRequestBuffer for settings too).

export default function useSettings(initialSettings: SettingsData) {
  const dispatch = useDispatch();

  const isPageActive = useFieldSelector("app", "isVisible");
  const currentUser = useFieldSelector("auth", "currentUser");
  const client = useFieldSelector("auth", "client");
  const settings = useSelector((state: RootState) => state.settings);

  const [triedFromServer, setTriedFromServer] = useState(false);

  useEffect(
    function getInitialSettings() {
      if (!currentUser || !client) return;

      const localSettings = JSON.parse(
        window.localStorage.getItem(USER_SETTINGS) || "null"
      );

      if (localSettings) {
        dispatch(settingsActions.setSettings(localSettings));
      }

      (async function getAndFetchSettings() {
        const { data: serverSettings } = await Axios.get(
          `/api/v1/userSettings`
        );

        // Always overwrite local settings with server settings, if available.
        if (serverSettings) {
          window.localStorage.setItem(
            USER_SETTINGS,
            JSON.stringify(serverSettings)
          );
          dispatch(settingsActions.setSettings(serverSettings));
        }

        setTriedFromServer(true);
      })();
    },
    [client, currentUser, dispatch]
  );

  useEffect(
    function updateLocalStorageAndServer() {
      if (!currentUser || !client) return;

      // Also update every time page becomes active.
      if (!triedFromServer || !isPageActive) return;

      window.localStorage.setItem(USER_SETTINGS, JSON.stringify(settings));

      (async function sendSettingsChanges() {
        try {
          await Axios.post(`/api/v1/userSettings`, {
            userSettings: settings,
          });
        } catch (error) {
          console.error(error);
        }
      })();
    },
    [triedFromServer, settings, isPageActive, currentUser, client]
  );
}
