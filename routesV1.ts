import { Router, RequestHandler } from "express";
import LanguageDetect from "languagedetect";
import { fetchReddit } from "./feedHandlers/reddit";
import { fetchTwitter } from "./feedHandlers/twitter";
import {
  fetchRss,
  fetchYouTubeSubscriptionRss,
  fetchYouTubeSubscriptionsRssByList,
} from "./feedHandlers/rss";
import { fetchHackerNews } from "./feedHandlers/hn";
import { fetchNewsApi } from "./feedHandlers/newsapis";
import moment from "moment";
import model from "./model";
import { Interval } from "./client/src/types/intervalTypes";
import { sign } from "jsonwebtoken";
import { archive } from "./archive";
import _ from "lodash";
import { FeedEntry, FeedSource } from "./client/src/types/feedTypes";
import { CurrentUser } from "./client/src/types/userTypes";

declare global {
  namespace Express {
    // Override User interface from passport.
    interface User extends CurrentUser {}
    interface AuthInfo {
      clientId: string;
    }
  }
}

const STARRED_PAGE_SIZE = 20;
const REGEX_TIME_LIMIT = 10 * 1000;

const authedRouterV1 = Router();

authedRouterV1.get("/users/me", async (req, res, next) => {
  try {
    res.json({ currentUser: req.user });
  } catch (e) {
    return next(e);
  }
});

const isFeedTypeSupported = (feedType: string) => {
  switch (feedType) {
    case FeedSource.REDDIT:
      return Boolean(process.env.REDDIT_ID && process.env.REDDIT_SECRET);
    case FeedSource.TWITTER:
      return Boolean(process.env.TWITTER_ID && process.env.TWITTER_SECRET);
    case FeedSource.RSS:
      return true;
    case FeedSource.HACKER_NEWS:
      return true;
    case FeedSource.NEWS_API:
      return Boolean(process.env.NEWS_API_KEY);
    case FeedSource.YOUTUBE_RSS:
      return true;
    case FeedSource.YOUTUBE_SUBS_RSS:
      return true;
    default:
      return false;
  }
};

authedRouterV1.get("/feeds/isTypeSupported/:type", async (req, res, next) => {
  try {
    res.json({
      isSupported: isFeedTypeSupported(req.params.type),
    });
  } catch (error) {
    return next(error);
  }
});

authedRouterV1.get("/feeds", async (req, res, next) => {
  try {
    const userFeeds = await model.findFeedListByUserId(
      // TODO Since we don't support mobile right now,
      // will just have one global feed list.
      // Otherwise we should add clientId here as a param.
      req.user._id
    );
    res.json(userFeeds);
  } catch (error) {
    return next(error);
  }
});

const validateFeeds = (feedGroups: any[]) => {
  const names = new Set();
  for (const group of feedGroups) {
    for (const feed of group.feeds) {
      // Ensure we have configuration to support feed type (ie. API keys and secrets).
      if (!isFeedTypeSupported(feed.source)) return false;
      // Ensure feed names are unique.
      if (names.has(feed.label)) return false;
      names.add(feed.label);
    }
  }
  return true;
};

authedRouterV1.post("/feeds", async (req, res, next) => {
  try {
    // HACK only take the last array element since we only care about the
    // latest update.
    // Frontend should be sending only one-element arrays anyways.
    const feedGroups =
      req.body.feedGroupsUpdates[req.body.feedGroupsUpdates.length - 1];
    if (!validateFeeds(feedGroups))
      throw Error("feed name conflict or unsupported feed type");

    const userFeeds = await model.upsertFeedListByUserId(
      req.user._id,
      feedGroups
    );

    res.json(userFeeds);
  } catch (error) {
    return next(error);
  }
});

const languageDetector = new LanguageDetect();

const getFeedData = async (userId: string, feedName: string) => {
  const { feedGroups } = await model.findFeedListByUserId(userId);

  return feedGroups
    .map((group) => group.feeds)
    .reduce<any[]>((flattened, feeds) => [...flattened, ...feeds], [])
    .find((feed) => feed.label === feedName);
};

const fetchDataOrGetFromCache = async (
  userId: string,
  feedName: string,
  fresh: boolean
) => {
  const {
    source,
    id,
    updateFrequencyMinutes,
    includeRegexString,
  } = await getFeedData(userId, feedName);

  if (!fresh) {
    // First check the cache.
    const cachedResult = await model.findEntryCacheBySourceAndId(source, id);

    if (cachedResult) {
      const timeSinceCacheLastUpdatedMs =
        new Date().getTime() -
        (new Date(cachedResult.updatedAt).getTime() || 0);
      // Subtract a minute from the update interval so that fresh data
      // is prioritized for scheduled fetches.
      // ie. usable cache is at most one minute less than one fetch
      // interval in age.
      const maxCacheAge = (updateFrequencyMinutes - 1) * 60000;
      if (timeSinceCacheLastUpdatedMs < maxCacheAge) {
        return { ...cachedResult, fromCache: true };
      }
    }
  }

  // Otherwise fetch new entries.
  let result: FeedEntry[];
  switch (source) {
    case FeedSource.REDDIT:
      result = await fetchReddit(id, feedName);
      break;
    case FeedSource.TWITTER:
      result = await fetchTwitter(id, feedName);
      break;
    case FeedSource.RSS:
      result = await fetchRss(id, feedName);
      break;
    case FeedSource.HACKER_NEWS:
      result = await fetchHackerNews(feedName);
      break;
    case FeedSource.NEWS_API:
      result = await fetchNewsApi(id, feedName);
      break;
    case FeedSource.YOUTUBE_RSS:
      result = await fetchYouTubeSubscriptionRss(id, feedName);
      break;
    case FeedSource.YOUTUBE_SUBS_RSS: {
      const userFeeds = await model.findFeedListByUserId(userId);
      result = await fetchYouTubeSubscriptionsRssByList(
        userFeeds,
        id,
        feedName
      );
      break;
    }
  }

  // Only include entries by feed's filter regex.
  if (includeRegexString) {
    // Adding a time limit for this to run to prevent DOS with a long running regex.
    await new Promise<void>((resolve, reject) => {
      const rejectTimeout = setTimeout(reject, REGEX_TIME_LIMIT);
      _.remove(result, (entry: any) => {
        return !`author: ${entry.author}#~# text: ${entry.text}#~#`.match(
          includeRegexString
        );
      });
      clearTimeout(rejectTimeout);
      resolve();
    });
  }

  // Cache the new entries and return the result.
  return {
    fromCache: false,
    ...(await model.upsertEntryCacheBySourceAndId(source, id, result)),
  };
};

authedRouterV1.get("/feeds/:feedName", async (req, res, next) => {
  try {
    const feedName = decodeURIComponent(req.params.feedName);
    // TODO test that check is never undefined here.
    const {
      entries,
      updatedAt: fetchedAt,
      fromCache,
    } = await fetchDataOrGetFromCache(
      req.user._id,
      feedName,
      Boolean(req.query.fresh)
    );

    // TODO consider not using the entry _id as read/spoken _id, to allow
    // flexibility in the future.

    const [readsSet, spokenSet, starredSet] = (
      await model.findEntryStatusesByUserIdAndFeedName(req.user._id, feedName)
    ).map((docs) => new Set(docs.map((doc) => doc.entryId)));

    const result = entries.map((entry) => {
      const predictions = languageDetector.detect(entry.text, 1);
      const lang = predictions && predictions[0] && predictions[0][0];
      return {
        ...entry,
        lang,
      };
    });

    // TODO see if it's noticably faster to create a map prior, then just index into the map,
    // versus searching through the arrays for each entry.

    const readMap = result.reduce<any>((result, entry) => {
      if (readsSet.has(entry.id)) result[entry.id] = true;
      return result;
    }, {});
    const spokenMap = result.reduce<any>((result, entry) => {
      if (spokenSet.has(entry.id)) result[entry.id] = true;
      return result;
    }, {});
    const starredMap = result.reduce<any>((result, entry) => {
      if (starredSet.has(entry.id)) result[entry.id] = true;
      return result;
    }, {});

    res.json({
      entries: result,
      readMap,
      spokenMap,
      starredMap,
      fetchedAt,
      fromCache,
    });
  } catch (error) {
    return next(error);
  }
});

const fetchReadOrSpoken = (asRead: boolean): RequestHandler => async (
  req,
  res,
  next
) => {
  try {
    const since = new Date(Number(req.params.since));

    const reads = await (asRead
      ? model.findMarkedAsReadByUserIdSince
      : model.findMarkedAsSpokenByUserIdSince)(req.user._id, since);
    res.json(reads);
  } catch (error) {
    return next(error);
  }
};

authedRouterV1.get("/reads/:since", fetchReadOrSpoken(true));
authedRouterV1.get("/spoken/:since", fetchReadOrSpoken(false));

const batchMarkAsReadOrSpoken = (asRead: boolean): RequestHandler => async (
  req,
  res,
  next
) => {
  try {
    const buffer: {
      ids: string[];
      feedName: string;
    }[] = req.body.buffer;

    const results = await Promise.all(
      buffer.map(async ({ ids, feedName }) => {
        await model.removeExtraReadsOrSpokenByUserIdAndFeedName();
        return await model.markAsReadOrSpokenByUserIdAndFeedName(
          req.user._id,
          feedName,
          ids,
          asRead
        );
      })
    );
    res.json(results.length);
  } catch (error) {
    return next(error);
  }
};

authedRouterV1.post("/reads/batchFeed", batchMarkAsReadOrSpoken(true));
authedRouterV1.post("/spoken/batchFeed", batchMarkAsReadOrSpoken(false));

authedRouterV1.post("/statistics/intervals", async (req, res, next) => {
  try {
    const { newIntervals } = req.body;

    // Upsert each interval in order, since whether or not one is inserted or upserted
    // depends on previous intervals.
    // See if these can be combined.

    const docs: Interval[] = [];
    for (const interval of newIntervals as any[]) {
      docs.push(
        await model.upsertIntervalByUserIdAndClientId(
          req.user._id,
          req.authInfo.clientId,
          interval
        )
      );
    }

    res.json(docs);
  } catch (error) {
    return next(error);
  }
});

// TODO check performance.
authedRouterV1.get("/statistics/usageToday", async (req, res, next) => {
  try {
    // https://github.com/louischatriot/nedb/issues/139
    const beginningOfDay = moment().startOf("day");
    const beginningOfDayDate = beginningOfDay.toDate();
    const endOfDay = moment().endOf("day");
    const endOfDayDate = endOfDay.toDate();
    const docs = await model.findIntervalsByUserIdAndClientId(
      req.user._id,
      req.authInfo.clientId,
      beginningOfDayDate,
      endOfDayDate
    );

    const results = docs.reduce<{
      [clientId: string]: {
        [intervalType: string]: number;
      };
    } | null>((result, doc) => {
      const start = moment(doc.startedAt);
      const end = moment(doc.endedAt);
      const timeToCount =
        (end.isSameOrAfter(endOfDay) ? endOfDay : end).valueOf() -
        (start.isBefore(beginningOfDay) ? beginningOfDay : start).valueOf();

      return {
        ...result,
        [doc.clientId]: {
          ...(result ? result[doc.clientId] : null),
          [doc.type]:
            ((result ? result[doc.clientId] || {} : {})[doc.type] || 0) +
            timeToCount,
        },
      };
    }, null);

    res.json(
      results || {
        [req.authInfo.clientId]: {
          ACTIVE_IN_APP: 0,
          LINK_READING_ESTIMATE: 0,
        },
      }
    );
  } catch (error) {
    return next(error);
  }
});

authedRouterV1.post("/statistics/visitedLinks", async (req, res, next) => {
  try {
    const { newVisitedLinks } = req.body;

    const docs = await Promise.all(
      (newVisitedLinks as any[]).map((link) => {
        return model.insertVisitedLinkByUserId(
          req.user._id,
          new Date(link.visitDate),
          link.linkData
        );
      })
    );

    res.json(docs);
  } catch (error) {
    return next(error);
  }
});

authedRouterV1.get("/starred", async (req, res, next) => {
  try {
    const docs = await model.findStarredByUserId(
      req.user._id,
      STARRED_PAGE_SIZE,
      Number(req.query.p) || 0,
      "createdAt"
    );

    res.json({
      docs,
      isEnd: docs.length < STARRED_PAGE_SIZE,
    });
  } catch (error) {
    return next(error);
  }
});

authedRouterV1.post("/starred/batch", async (req, res, next) => {
  try {
    const { buffer } = req.body;
    const docs = await model.insertStarredByUserId(req.user._id, buffer);

    res.json(docs);
  } catch (error) {
    return next(error);
  }
});

authedRouterV1.post("/starred/unstar/batch", async (req, res, next) => {
  try {
    const { buffer } = req.body;

    const numRemoved = await model.removeStarredByUserIdAndEntryIds(
      req.user._id,
      (buffer as any[]).map((toUnstar) => toUnstar.entryId)
    );

    res.json(numRemoved);
  } catch (error) {
    return next(error);
  }
});

// TODO check performance.
authedRouterV1.get("/statistics/mostActiveFeeds", async (req, res, next) => {
  try {
    const docs = await model.findVisitedLinksByUserId(
      req.user._id,
      moment().startOf("day").subtract(1, "month").toDate()
    );

    const results = (docs as any[]).reduce((result, doc) => {
      const existingCount = result[doc.feedName] || 0;
      return {
        ...result,
        [doc.feedName]: existingCount + 1,
      };
    }, {});

    const sortedTopResults = Object.keys(results)
      .map((key) => {
        return {
          feedName: key,
          visits: results[key],
        };
      })
      .sort((a, b) => b.visits - a.visits)
      // Take top 50.
      .slice(0, 50);

    res.json(sortedTopResults);
  } catch (error) {
    return next(error);
  }
});

// TODO check performance.
authedRouterV1.get("/statistics/timeSpentByFeed", async (req, res, next) => {
  try {
    const docs = await model.findReadingIntervalsByUserId(
      req.user._id,
      moment().startOf("day").subtract(1, "month").toDate()
    );

    const results = docs.reduce((result, doc) => {
      const existingCount = result[doc.feedName] || 0;
      const diff =
        new Date(doc.endedAt).getTime() - new Date(doc.startedAt).getTime();
      return {
        ...result,
        [doc.feedName]: existingCount + diff,
      };
    }, {} as { [feedName: string]: number });

    const sortedTopResults = Object.keys(results)
      .map((key) => {
        return {
          feedName: key,
          timeSpentReadingMs: results[key],
        };
      })
      .sort((a, b) => b.timeSpentReadingMs - a.timeSpentReadingMs)
      .slice(0, 50);

    res.json(sortedTopResults);
  } catch (error) {
    return next(error);
  }
});

authedRouterV1.get("/userSettings", async (req, res, next) => {
  try {
    const settings = await model.findSettingsForUserIdAndClientId(
      req.user._id,
      req.authInfo.clientId
    );

    res.json(settings && settings.data);
  } catch (error) {
    return next(error);
  }
});

authedRouterV1.post("/userSettings", async (req, res, next) => {
  try {
    const settings = await model.upsertSettingsByUserIdAndClientId(
      req.user._id,
      req.authInfo.clientId,
      req.body.userSettings
    );

    res.json(settings);
  } catch (error) {
    return next(error);
  }
});

authedRouterV1.get("/clients/mine", async (req, res, next) => {
  try {
    const clients = await model.getClientsForUserId(req.user._id);

    res.json(clients);
  } catch (error) {
    return next(error);
  }
});

authedRouterV1.get("/clients/:clientId", async (req, res, next) => {
  try {
    const client = await model.getClientById(req.params.clientId);

    res.json(client);
  } catch (error) {
    return next(error);
  }
});

authedRouterV1.post("/clients", async (req, res, next) => {
  try {
    const client = await model.createClientIfNotExists(
      req.body.newClientName,
      req.user._id
    );

    res.json({
      client,
      updatedToken: sign(
        { id: req.user._id, clientId: client._id },
        process.env.JWT_SECRET
      ),
    });
  } catch (error) {
    return next(error);
  }
});

authedRouterV1.post("/archives", async (req, res, next) => {
  try {
    if (process.env.REACT_APP_DB_CLIENT !== "postgresHeroku") {
      throw Error(
        `db client not supported: ${process.env.REACT_APP_DB_CLIENT}`
      );
    }

    await archive();

    res.json({
      // TODO consider getting archive time from actual archive row.
      archivedAt: new Date(),
    });
  } catch (error) {
    return next(error);
  }
});

export default authedRouterV1;
