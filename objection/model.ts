import { FeedEntry } from "client/src/types/feedTypes";
import {
  initObjectionDb,
  AuthModel,
  UserModel,
  FeedsModel,
  EntryCacheModel,
  EntryStatusModel,
  IntervalsModel,
  IntervalType,
  SettingsModel,
  ClientModel,
} from "./db";
import { nameof } from "../util";
import {
  StarredEntryData,
  VisitedLinkData,
} from "../client/src/types/entryTypes";
import { FeedGroupData } from "../client/src/types/feedGroupTypes";
import { Interval } from "../client/src/types/intervalTypes";
import { SettingsData } from "../client/src/types/settingsTypes";

export const initObjectionModel = () => {
  const knex = initObjectionDb();

  const migrateToLatest = async () => {
    // LOG
    console.log("Running any new migrations");

    const config =
      process.env.NODE_ENV === "production"
        ? {
            directory: "./dist/migrations",
          }
        : undefined;

    return knex.migrate.latest(config);
  };

  const clearDatabase = async () => {
    if (process.env.NODE_ENV !== "test")
      throw Error("Not test environment; won't clear database");

    return knex.migrate.rollback(undefined, true);
  };

  const dbHelpers = {
    migrateToLatest,
  };

  // NOTE see $parseDatabaseJson and $formatDatabaseJson overrides
  // (ie. they allow us to pass _id into queries but store them as ids,
  // among other translations to keep compatibility with nedb easier).

  const testHelpers = {
    async resetDatabase() {
      if (process.env.NODE_ENV !== "test")
        throw Error("Not test environment; won't reset database");

      await clearDatabase();
      return migrateToLatest();
    },
    clearDatabase,
  };

  const authHelpers = {
    async insertAuth(username: string, userId: string, hashed: string) {
      return AuthModel.query().insertAndFetch({
        username,
        userId,
        hashed,
      });
    },
    async findAuthByUserId(userId: string) {
      return AuthModel.query().findOne({ userId });
    },
  };

  const userHelpers = {
    async insertUser(username: string) {
      return UserModel.query().insertAndFetch({ username });
    },
    async findUserById(id: string) {
      return UserModel.query().findOne({ id });
    },
    async findUserByUsername(username: string) {
      return UserModel.query().findOne({ username });
    },
  };

  const clientHelpers = {
    async getClientById(idString: string) {
      const id = Number(idString);
      return ClientModel.query().findOne({ id });
    },
    async getClientsForUserId(userId: string) {
      return ClientModel.query().where({ userId });
    },
    async createClientIfNotExists(name: string, userId: string) {
      const existingClient = await ClientModel.query().findOne({
        name,
        userId,
      });
      if (existingClient) return existingClient;
      return ClientModel.query().insertAndFetch({ name, userId });
    },
  };

  const feedHelpers = {
    async findFeedListByUserId(userId: string) {
      return FeedsModel.query().findOne({ userId });
    },
    async upsertFeedListByUserId(userId: string, newFeedGroups: FeedGroupData) {
      return FeedsModel.upsertOneAndFetch<FeedsModel>(
        {
          userId,
        },
        {
          // Need to stringify any possible arrays.
          // http://knexjs.org/#Schema-json
          feedGroups: JSON.stringify(newFeedGroups),
          userId,
        }
      );
    },
  };

  const entryCacheHelpers = {
    async findEntryCacheBySourceAndId(source: string, id: string) {
      return EntryCacheModel.query().findOne({
        // Share cache between users; don't search by user id.
        // Cache id is stored in sourceAndId instead for Objection.
        sourceAndId: `${source}|${id}`,
      });
    },
    async upsertEntryCacheBySourceAndId(
      source: string,
      id: string,
      result: FeedEntry[]
    ) {
      return EntryCacheModel.upsertOneAndFetch<EntryCacheModel>(
        { sourceAndId: `${source}|${id}` },
        {
          sourceAndId: `${source}|${id}`,
          // Need to stringify any arrays.
          // http://knexjs.org/#Schema-json
          entries: JSON.stringify(result),
          // createdAt will be added automatically.
          // updatedAt will be updated automatically.
        }
      );
    },
  };

  const entryStatusHelpers = {
    async findMarkedAsReadByUserIdAndFeedName(
      userId: string,
      feedName: string
    ) {
      return EntryStatusModel.query()
        .whereNotNull(nameof<EntryStatusModel>("readAt"))
        .where({ userId, feedName });
    },
    async findMarkedAsReadByUserIdSince(userId: string, since: Date) {
      return EntryStatusModel.query()
        .whereNotNull(nameof<EntryStatusModel>("readAt"))
        .where({ userId })
        .where(
          nameof<EntryStatusModel>("createdAt"),
          ">=",
          since.toISOString()
        );
    },
    async findMarkedAsSpokenByUserIdSince(userId: string, since: Date) {
      return EntryStatusModel.query()
        .whereNotNull(nameof<EntryStatusModel>("spokenAt"))
        .where({ userId })
        .where(
          nameof<EntryStatusModel>("createdAt"),
          ">=",
          since.toISOString()
        );
    },
    async findMarkedAsSpokenByUserIdAndFeedName(
      userId: string,
      feedName: string
    ) {
      return EntryStatusModel.query()
        .whereNotNull(nameof<EntryStatusModel>("spokenAt"))
        .where({
          userId,
          feedName,
        });
    },
    async findStarredByUserIdAndFeedName(userId: string, feedName: string) {
      return EntryStatusModel.query()
        .whereNotNull(nameof<EntryStatusModel>("starredAt"))
        .where({
          userId,
          feedName,
        });
    },
    async findEntryStatusesByUserIdAndFeedName(
      userId: string,
      feedName: string
    ) {
      // TODO if this affects performance then combine into one query then separate out results.

      return Promise.all([
        entryStatusHelpers.findMarkedAsReadByUserIdAndFeedName(
          userId,
          feedName
        ),
        entryStatusHelpers.findMarkedAsSpokenByUserIdAndFeedName(
          userId,
          feedName
        ),
        entryStatusHelpers.findStarredByUserIdAndFeedName(userId, feedName),
      ]);
    },
    async findVisitedLinksByUserId(userId: string, since: Date) {
      return EntryStatusModel.query()
        .whereNotNull(nameof<EntryStatusModel>("visitedAt"))
        .where({ userId })
        .where(
          nameof<EntryStatusModel>("createdAt"),
          ">=",
          since.toISOString()
        );
    },
    async findStarredByUserId(
      userId: string,
      limit: number,
      skip: number,
      sortBy: keyof EntryStatusModel
    ) {
      return EntryStatusModel.query()
        .whereNotNull(nameof<EntryStatusModel>("starredAt"))
        .where({ userId })
        .limit(limit)
        .offset(skip * limit)
        .orderBy(nameof<EntryStatusModel>(sortBy), "desc");
    },
    async removeExtraReadsOrSpokenByUserIdAndFeedName() {
      // Do nothing for Objection dbs since we'll be archiving these instead.
      return 0;
    },
    async markAsReadOrSpokenByUserIdAndFeedName(
      userId: string,
      feedName: string,
      entryIds: string[],
      asRead: boolean
    ) {
      const readOrSpokenAt = asRead
        ? nameof<EntryStatusModel>("readAt")
        : nameof<EntryStatusModel>("spokenAt");

      // We need to first remove duplicates from the documents to insert.
      const foundReads = await EntryStatusModel.query()
        .whereNotNull(readOrSpokenAt)
        .whereIn("entryId", entryIds)
        .where({ userId })
        .select("entryId");

      const foundReadIds = foundReads.map((read) => read.entryId);
      const filteredIds = entryIds.reduce((result, entryId) => {
        if (foundReadIds.includes(entryId)) return result;
        result.push(entryId);
        return result;
      }, []);

      // TODO implement an upsertManyAndFetch that only does 1 find query, instead of
      // doing 1 find query per id to insert.

      return Promise.all(
        filteredIds.map((entryId) => {
          return EntryStatusModel.upsertOneAndFetch<EntryStatusModel>(
            {
              entryId,
              userId,
              feedName,
            },
            {
              entryId,
              feedName,
              userId,
              [readOrSpokenAt]: new Date().toISOString(),
            }
          );
        })
      );
    },
    async insertVisitedLinkByUserId(
      userId: string,
      visitDate: Date,
      linkData: VisitedLinkData
    ) {
      return EntryStatusModel.upsertOneAndFetch<EntryStatusModel>(
        {
          entryId: linkData.entryId,
          userId,
        },
        {
          ...linkData,
          visitedAt: visitDate.toISOString(),
          userId,
        }
      );
    },
    async insertStarredByUserId(userId: string, buffer: StarredEntryData[]) {
      // TODO implement an upsertManyAndFetch that only does 1 find query, instead of
      // doing 1 find query per id to insert.

      return Promise.all(
        buffer.map((starred) => {
          const filteredEntry: any = {
            flair: starred.entry.flair,
            domain: starred.entry.domain,
            entryId: starred.entry.id,
            text: starred.entry.text,
            time: starred.entry.time,
            link: starred.entry.link,
            image: starred.entry.image,
            author: starred.entry.author,
            lang: starred.entry.lang,
          };
          Object.keys(filteredEntry).forEach(
            (key) =>
              filteredEntry[key] === undefined && delete filteredEntry[key]
          );
          return EntryStatusModel.upsertOneAndFetch<EntryStatusModel>(
            {
              entryId: starred.entry.id,
              userId,
            },
            {
              ...starred,

              // TODO check which fields are missing.

              entryId: filteredEntry.entryId,
              entry: filteredEntry,
              starredAt: new Date(starred.createdAt).toISOString(),
              createdAt: new Date(starred.createdAt).toISOString(),
              userId,
            }
          );
        })
      );
    },
    async removeStarredByUserIdAndEntryIds(userId: string, entryIds: string[]) {
      // TODO implement an upsertManyAndFetch that only does 1 find query, instead of
      // doing 1 find query per id to insert.

      return (
        await Promise.all(
          entryIds.map((entryId) =>
            EntryStatusModel.removeStatusOrDelete({ userId, entryId }, [
              "starredAt",
            ])
          )
        )
      ).reduce((sum, numDel) => sum + numDel, 0);
    },
  };

  const intervalHelpers = {
    async findIntervalsByUserIdAndClientId(
      userId: string,
      clientId: string,
      intervalStartDate: Date,
      intervalEndDate: Date
    ) {
      return IntervalsModel.query()
        .where({
          userId,

          // TODO remove this if we want to show all devices.

          clientId,
        })
        .where((q) => {
          return q
            .whereBetween(nameof<IntervalsModel>("startedAt"), [
              intervalStartDate.toISOString(),
              intervalEndDate.toISOString(),
            ])
            .orWhereBetween(nameof<IntervalsModel>("endedAt"), [
              intervalStartDate.toISOString(),
              intervalEndDate.toISOString(),
            ]);
        });
    },
    async findReadingIntervalsByUserId(userId: string, since: Date) {
      return IntervalsModel.query()
        .where({
          userId,

          // TODO check this.

          type: IntervalType.LINK_READING_ESTIMATE,
        })
        .where(nameof<IntervalsModel>("startedAt"), ">=", since.toISOString());
    },
    async upsertIntervalByUserIdAndClientId(
      userId: string,
      clientId: string,
      interval: Interval
    ) {
      return IntervalsModel.upsertOneAndFetch<IntervalsModel>(
        {
          userId,
          // Upsert any existing interval with the same client id and
          // startedAt date.
          clientId,
          startedAt: new Date(interval.startedAt).toISOString(),
        },
        {
          ...interval,
          // Make sure dates are saved as dates, and not as JSON strings.
          startedAt: new Date(interval.startedAt).toISOString(),
          endedAt: new Date(interval.endedAt).toISOString(),
          // Using IP as the client id since everything is done on local network anyways.
          clientId,
          userId,
        }
      );
    },
  };

  const settingsHelpers = {
    async findSettingsForUserIdAndClientId(userId: string, clientId: string) {
      return SettingsModel.query().findOne({
        userId,
        clientId,
      });
    },
    async upsertSettingsByUserIdAndClientId(
      userId: string,
      clientId: string,
      settings: SettingsData
    ) {
      return SettingsModel.upsertOneAndFetch<SettingsModel>(
        {
          userId,
          clientId,
        },
        {
          data: settings,
          userId,
          clientId,
        }
      );
    },
  };

  return {
    ...testHelpers,
    ...dbHelpers,
    ...authHelpers,
    ...userHelpers,
    ...clientHelpers,
    ...feedHelpers,
    ...entryCacheHelpers,
    ...entryStatusHelpers,
    ...intervalHelpers,
    ...settingsHelpers,
  };
};
