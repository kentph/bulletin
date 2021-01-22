import axios from "axios";
import { authSource, rateLimit } from "../auth";
import { singletons } from "../index";
import { FeedEntry, FeedSource } from "../client/src/types/feedTypes";
const authTwitter = async () => {
  if (!process.env.TWITTER_ID || !process.env.TWITTER_SECRET)
    throw Error("TWITTER_ID or TWITTER_SECRET are undefined");
  return await authSource(
    FeedSource.TWITTER,
    process.env.TWITTER_ID,
    process.env.TWITTER_SECRET,
    "https://api.twitter.com/oauth2/token"
  );
};
export const fetchTwitter = async (
  username: string,
  feedName: string,
  isRetry?: boolean
): Promise<FeedEntry[]> => {
  let accessToken = singletons[FeedSource.TWITTER];
  if (!accessToken) accessToken = await authTwitter();

  await rateLimit(FeedSource.TWITTER, 1000 /* ms */);

  let data: any[] = [];
  try {
    const response = await axios.get(
      `https://api.twitter.com/1.1/statuses/user_timeline.json?screen_name=${
        username
        // Need tweet_mode=extended to show new longer tweets with full media.
        // https://developer.twitter.com/en/docs/tweets/tweet-updates
      }&count=20&trim_user=true&exclude_replies=true&include_rts=true&tweet_mode=extended`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    data = response.data;
  } catch (error) {
    if (isRetry)
      // Only retry once.
      throw Error("auth issue");
    else if (error.response.status === 401) {
      // Token probably expired; fetch a new one and retry.
      delete singletons[FeedSource.TWITTER];
      return await fetchTwitter(username, feedName, true);
    } else throw error;
  }

  return data.map((tweet) => {
    const fullText: string = tweet.full_text;
    const indexOfLink = fullText.lastIndexOf("https://t.co/") - 1;
    const text =
      indexOfLink <= 0 ? fullText : fullText.substring(0, indexOfLink);
    return {
      id: `twitter|${tweet.id_str}|${feedName}`,
      text,
      // This only works because twitter seems to ignore the username?
      link: `https://twitter.com/_/status/${tweet.id_str}`,
      image:
        (tweet.entities?.media && tweet.entities.media[0]?.media_url_https) ||
        (tweet.retweeted_status?.entities?.media &&
          tweet.retweeted_status.entities.media[0]?.media_url_https),
      score: tweet.favorite_count,
      time: new Date(tweet.created_at).getTime(),
      retweets: tweet.retweet_count,
      favorites: tweet.favorite_count,
    } as FeedEntry;
  });
};
