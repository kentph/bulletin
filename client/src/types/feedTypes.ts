export type RedditFeedEntry = Partial<{
  upvotes: number;
  numComments: number;
  flair: string;
  domain: string;
}>;

export type TwitterFeedEntry = Partial<{
  retweets: number;
  favorites: number;
}>;

export type YouTubeFeedEntry = Partial<{
  views: number;
  rating: string;
}>;

export type FeedEntry = {
  id: string;
  text: string;
  time?: number;
  link?: string;
  image?: string;
  score?: number;
  html?: string;
  author?: string;
  lang?: string;
} & RedditFeedEntry &
  TwitterFeedEntry &
  YouTubeFeedEntry;

export enum FeedSource {
  RSS = "rss",
  TWITTER = "twitter",
  YOUTUBE_RSS = "youtuberss",
  YOUTUBE_SUBS_RSS = "youtubesubsrss",
  REDDIT = "reddit",
  NEWS_API = "newsapi",
  HACKER_NEWS = "hackernews",
}

export type FeedData = {
  label: string;
  source: FeedSource;
  id: string;
  updateFrequencyMinutes: number;
  width?: number;
  height?: number;
  youtubeSubChannelIds?: string[];
  fixedPosition?: [number, number];
  includeRegexString?: string;
};
