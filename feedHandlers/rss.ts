import feedparser from "feedparser-promised";
import { rateLimit } from "../auth";
import { FeedSource } from "../client/src/types/feedTypes";

export const fetchRss = async (url: string, feedName: string) => {
  // Won't rate limit these requests.
  // Make sure that the url is decoded.
  const decodedUrl = decodeURIComponent(url);
  const items: any[] = await feedparser.parse(decodedUrl);
  return items
    .map((item) => {
      let numComments: number | undefined;
      if (item["slash:comments"] && item["slash:comments"]["#"] !== undefined)
        numComments = item["slash:comments"]["#"];

      return {
        id: `rss|${item.guid}|${feedName}`,
        text: item.title,
        link: item.link,
        image: item.image.url,
        time: new Date(item.pubDate).getTime(),
        numComments,
      };
    })
    .splice(0, 30);
};

export const fetchYouTubeSubscriptionRss = async (
  youtubeRssUrl: string,
  feedName: string
) => {
  await rateLimit(FeedSource.YOUTUBE_RSS, 500);

  const decodedUrl = decodeURIComponent(youtubeRssUrl);

  try {
    const items: any[] = await feedparser.parse(decodedUrl);

    // LOG
    console.log(`Fetched ${youtubeRssUrl}`);

    return items.map((item) => {
      return {
        id: `youtuberss|${item.guid}|${feedName}`,
        text: item.title,
        link: item.link,
        image: item.image.url,
        score:
          item["media:group"]["media:community"]["media:statistics"]["@"].views,
        views:
          item["media:group"]["media:community"]["media:statistics"]["@"].views,
        rating:
          item["media:group"]["media:community"]["media:starrating"]["@"]
            .average,
        author: item.author,
        time: new Date(item.pubDate).getTime(),
      };
    });
  } catch (error) {
    console.error(`Failed at ${youtubeRssUrl}, skipped.`);
    return [];
  }
};

const fetchYouTubeSubscriptionsRssByIds = async (
  idsOrUrls: string[],
  feedName: string,
  isRssUrl?: boolean,
  limitPerChannel?: number,
  sortByTime?: boolean
) => {
  const currentTime = new Date().getTime();
  const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
  return (
    (
      await Promise.all(
        idsOrUrls.map(async (idOrUrl) => {
          const channelRssUrl = isRssUrl
            ? idOrUrl
            : `https://www.youtube.com/feeds/videos.xml?channel_id=${idOrUrl}`;
          const result = (
            await fetchYouTubeSubscriptionRss(channelRssUrl, feedName)
          )
            // Remove videos older than 2 days, and then sort by view count/
            // recency. Then return only the top video.
            .filter((item) => currentTime - item.time < TWO_DAYS_MS)
            .sort((a, b) =>
              sortByTime
                ? Number(b.time) - Number(a.time)
                : Number(b.score) - Number(a.score)
            );
          return limitPerChannel ? result.splice(0, limitPerChannel) : result;
        })
      )
    )
      // TODO switch to .flat() if upgrade node past v11.
      .reduce((result, arr) => result.concat(arr), [])
      .filter((item) => Boolean(item))
      // Sort the final array too.
      .sort((a: any, b: any) =>
        sortByTime
          ? Number(b.time) - Number(a.time)
          : Number(b.score) - Number(a.score)
      )
  );
};

export const fetchYouTubeSubscriptionsRssByList = async (
  feeds: any,
  listName: string,
  feedName: string
) => {
  let channelIdList: string[];
  for (const feedGroup of feeds.feedGroups as any[]) {
    const youTubeRssFeed = (feedGroup.feeds as any[]).find(
      (feed) =>
        feed.source === FeedSource.YOUTUBE_SUBS_RSS && feed.id === listName
    );
    if (youTubeRssFeed) {
      channelIdList = youTubeRssFeed.youtubeSubChannelIds;
      break;
    }
  }
  if (!channelIdList) return [];

  return await fetchYouTubeSubscriptionsRssByIds(
    channelIdList,
    feedName,
    false,
    undefined,
    true
  );
};
