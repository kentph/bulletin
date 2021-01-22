import Axios, { CancelTokenSource } from "axios";
import { FeedNameMap } from "./feedsReducer";

type FeedNameMapWithGetter<T> = {
  /**
   * Avoid accessing this directly - use get instead.
   */
  _data: FeedNameMap<T>;
  get: (feedName: string) => T;
};

const axiosSourceGetter = function (
  this: FeedNameMapWithGetter<CancelTokenSource>,
  feedName: string
) {
  if (!this._data[feedName]) this._data[feedName] = Axios.CancelToken.source();
  // Using a ! here should be save because of above line.
  return this._data[feedName]!;
};

export const axiosSourceByFeedNameWithGetter: FeedNameMapWithGetter<CancelTokenSource> = {
  _data: {},
  get: axiosSourceGetter,
};
