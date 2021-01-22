import {
  Action,
  createSlice,
  PayloadAction,
  ThunkAction,
} from "@reduxjs/toolkit";
import Axios, { CancelTokenSource } from "axios";
import { Client, CurrentUser } from "../types/userTypes";
import { RootState } from "./rootReducer";

interface State {
  currentUser: CurrentUser | null | undefined;
  client: Client | null | undefined;
  wasLoginSuccessful: boolean;
}

export const EMPTY_NAME_ERROR_MESSAGE = "Name is required";
export const TOKEN_KEY = "TOKEN";
export const CLIENT_ID_KEY = "CLIENT";
const LOGIN_DELAY = 400;

const initialState: State = {
  currentUser: undefined,
  client: undefined,
  wasLoginSuccessful: true,
};

const { actions: authActions, reducer: authReducer } = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCurrentUser(
      state,
      action: PayloadAction<typeof initialState.currentUser>
    ) {
      state.currentUser = action.payload;
    },
    setClient(state, action: PayloadAction<typeof initialState.client>) {
      state.client = action.payload;
    },
    setLoginSuccess(
      state,
      action: PayloadAction<typeof initialState.wasLoginSuccessful>
    ) {
      state.wasLoginSuccessful = action.payload;
    },
  },
});

export const updateToken = (token: string | null) => {
  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token);
    Axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    window.localStorage.removeItem(TOKEN_KEY);
    delete Axios.defaults.headers.common["Authorization"];
  }
};

export const logout = () => {
  window.localStorage.clear();
  // Reload to cleanly clear memory.
  window.location.reload();
};

const authThunks = {
  login: (
    username: string,
    password: string
  ): ThunkAction<Promise<void>, RootState, unknown, Action<string>> => async (
    dispatch
  ) => {
    const {
      data: { user, token },
    } = await Axios.post(`/api/v1/auth/login`, { username, password });
    dispatch(authActions.setLoginSuccess(true));
    if (LOGIN_DELAY)
      await new Promise((resolve) => window.setTimeout(resolve, LOGIN_DELAY));
    updateToken(token);
    dispatch(authActions.setCurrentUser(user));
  },
  signup: (
    username: string,
    password: string
  ): ThunkAction<Promise<void>, RootState, unknown, Action<string>> => async (
    dispatch
  ) => {
    // Don't care about the response; we'll get the user in login.
    await Axios.post(`/api/v1/auth/signup`, { username, password });
    await dispatch(authThunks.login(username, password));
  },
  fetchCurrentUser: (
    tokenSource: CancelTokenSource
  ): ThunkAction<Promise<void>, RootState, unknown, Action<string>> => async (
    dispatch
  ) => {
    const {
      data: { currentUser },
    } = await Axios.get("/api/v1/users/me", {
      cancelToken: tokenSource.token,
    });
    dispatch(authActions.setLoginSuccess(true));
    // if (LOGIN_DELAY)
    //   await new Promise(resolve => window.setTimeout(resolve, LOGIN_DELAY));
    dispatch(authActions.setCurrentUser(currentUser));
  },
  setClientByName: (
    name: string
  ): ThunkAction<Promise<void>, RootState, unknown, Action<string>> => async (
    dispatch
  ) => {
    if (!name) throw Error(EMPTY_NAME_ERROR_MESSAGE);
    const {
      data: { client, updatedToken },
    } = await Axios.post("/api/v1/clients", {
      newClientName: name,
    });
    if (!client || !updatedToken) throw Error("no client");
    // Store new JWT that includes client.
    updateToken(updatedToken);
    dispatch(authActions.setClient(client));
    window.localStorage.setItem(CLIENT_ID_KEY, client._id);
  },
};

export type AuthState = ReturnType<typeof authReducer>;

export { authActions, authThunks };
export default authReducer;
