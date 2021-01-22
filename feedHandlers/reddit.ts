import axios from "axios";
import { authSource, rateLimit } from "../auth";
import { singletons } from "../index";
import { FeedEntry, FeedSource } from "../client/src/types/feedTypes";
const authReddit = async () => {
  if (!process.env.REDDIT_ID || !process.env.REDDIT_SECRET)
    throw Error("REDDIT_ID or REDDIT_SECRET are undefined");
  return await authSource(
    FeedSource.REDDIT,
    process.env.REDDIT_ID,
    process.env.REDDIT_SECRET,
    "https://www.reddit.com/api/v1/access_token"
  );
};
/**
 * Rules: https://github.com/reddit-archive/reddit/wiki/API
 * OAuth: https://github.com/reddit-archive/reddit/wiki/OAuth2#application-only-oauth
 */
export const fetchReddit = async (
  subreddit: string,
  feedName: string,
  isRetry?: boolean
): Promise<FeedEntry[]> => {
  let accessToken = singletons[FeedSource.REDDIT];
  if (!accessToken) accessToken = await authReddit();

  await rateLimit(FeedSource.REDDIT, 1000 /* ms */);

  let entries: any[] = [];
  try {
    const response = await axios.get(
      `https://oauth.reddit.com/r/${subreddit}/hot?limit=15`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    entries = response.data.data.children;
  } catch (error) {
    if (!isRetry && error.response.status === 401) {
      // Only retry once.
      // Token probably expired; fetch a new one and retry.
      delete singletons[FeedSource.REDDIT];
      return await fetchReddit(subreddit, feedName, true);
    } else throw error;
  }

  return entries.map(({ data: entry }) => {
    return {
      // https://www.reddit.com/r/redditdev/comments/6bbe50/submission_comment_id_uniqueness_at_what_level/
      id: `reddit|${entry.name}|${feedName}`,
      text: entry.title,
      link: "https://reddit.com" + entry.permalink,
      image: entry.thumbnail.startsWith("http")
        ? entry.thumbnail
        : entry.media?.oembed?.thumbnail_url || undefined,
      time: entry.created_utc * 1000,
      author: entry.author,
      score: entry.ups,
      upvotes: entry.ups,
      numComments: entry.num_comments,
      flair: entry.link_flair_text,
      domain: entry.domain,
    } as FeedEntry;
  });
};
