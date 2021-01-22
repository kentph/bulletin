import axios from "axios";
import { rateLimit } from "../auth";
import { FeedSource } from "../client/src/types/feedTypes";
export const fetchHackerNews = async (feedName: string) => {
  // Limit should be 10k request per hour per IP.
  await rateLimit(FeedSource.HACKER_NEWS, 1000 /* ms */);

  const {
    data: { hits },
  } = await axios.get(
    "http://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=30"
  );

  return (hits as any[]).map((item) => {
    return {
      // TODO could also consider guid as id.
      id: `hackernews|${item.objectID}|${feedName}`,
      text: item.title,
      link: "https://news.ycombinator.com/item?id=" + item.objectID,
      score: item.points,
      upvotes: item.points,
      numComments: item.num_comments,
      author: item.author,
      time: new Date(item.created_at).getTime(),
    };
  });
};
