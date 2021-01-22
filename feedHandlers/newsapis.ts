import { rateLimit } from "../auth";
import NewsAPI from "newsapi";
import { FeedSource } from "../client/src/types/feedTypes";

const newsapi = process.env.NEWS_API_KEY
  ? new NewsAPI(process.env.NEWS_API_KEY)
  : undefined;

export const fetchNewsApi = async (sourcesString: string, feedName: string) => {
  if (!newsapi) throw Error("NEWS_API_KEY is undefined");
  // Limit is 500 requests per day.
  // We'll limit to about 20 requests per hour, so 1 every 3 minutes.
  await rateLimit(FeedSource.NEWS_API, 3 * 60 * 1000);

  const response = await newsapi.v2.topHeadlines({
    sources: sourcesString,
    pageSize: 30,
  });

  // https://newsapi.org/docs/endpoints/top-headlines
  return (response.articles as any[]).map((article) => {
    return {
      id: `newsapi|${article.url}|${feedName}`,
      text: article.title,
      link: article.url,
      image: article.urlToImage,
      author: article.source.name,
      time: new Date(article.publishedAt).getTime(),
    };
  });
};
