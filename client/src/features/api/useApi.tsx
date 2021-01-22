import { useEffect } from "react";
import Axios, { CancelTokenSource } from "axios";
import { useDispatch } from "react-redux";
import {
  authActions,
  authThunks,
  CLIENT_ID_KEY,
  TOKEN_KEY,
  updateToken,
} from "../../app/authReducer";

export default function useApi() {
  const dispatch = useDispatch();

  useEffect(
    function getTokenAndCurrentUser() {
      const existingToken = window.localStorage.getItem(TOKEN_KEY);
      updateToken(existingToken);
      let tokenSource: CancelTokenSource | undefined;

      if (existingToken) {
        (async () => {
          try {
            tokenSource = Axios.CancelToken.source();
            await dispatch(authThunks.fetchCurrentUser(tokenSource));
          } catch (e) {
            console.error(e);
          }
        })();
      } else {
        dispatch(authActions.setLoginSuccess(false));
        // If there's no user token, make sure we don't have any state in
        // local storage that might dirty our app state.
        window.localStorage.clear();
        dispatch(authActions.setCurrentUser(null));
      }

      return function cleanupReq() {
        tokenSource?.cancel("cancelled by unmount");
      };
    },
    [dispatch]
  );

  useEffect(
    function fetchClient() {
      const existingClientId = window.localStorage.getItem(CLIENT_ID_KEY);
      let tokenSource: CancelTokenSource | undefined;

      if (existingClientId) {
        tokenSource = Axios.CancelToken.source();
        (async () => {
          try {
            const { data: client } = await Axios.get(
              `/api/v1/clients/${existingClientId}`,
              {
                cancelToken: tokenSource.token,
              }
            );
            dispatch(authActions.setClient(client));
          } catch (e) {
            console.error(e);
          }
        })();
      } else dispatch(authActions.setClient(null));

      return function cleanupReq() {
        tokenSource?.cancel("cancelled by unmount");
      };
    },
    [dispatch]
  );
}
