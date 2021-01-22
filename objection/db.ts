import { Model, knexSnakeCaseMappers, Pojo, QueryBuilder } from "objection";
import Knex from "knex";
import knexfile from "../knexfile";
import { Interval } from "../client/src/types/intervalTypes";
import { EntryCache, EntryStatus } from "../client/src/types/entryTypes";
import { nameof } from "../util";
import { Auth, Client, User } from "../client/src/types/userTypes";
import { FeedGroupData, Feeds } from "../client/src/types/feedGroupTypes";
import { Settings, SettingsData } from "../client/src/types/settingsTypes";
import { FeedEntry } from "../client/src/types/feedTypes";

export const initObjectionDb = () => {
  const knex = Knex({
    ...knexfile[process.env.NODE_ENV as keyof typeof knexfile],
    // Allows us to only use camelCase outside of db.
    ...knexSnakeCaseMappers(),
  });

  Model.knex(knex);

  return knex;
};

export class BaseModel extends Model {
  // TODO better typing?
  // TODO define as a custom QueryBuilder.
  // Use a transaction to make reads consistent.
  static async upsertOneAndFetch<TModel extends BaseModel>(
    queryObj: object,
    upsertObj: object
  ) {
    try {
      return this.transaction(async (trx) => {
        const result = await this.query(trx).findOne(queryObj);
        return result
          ? (result.$query(trx).patchAndFetch(upsertObj) as QueryBuilder<
              TModel,
              TModel
            >)
          : (this.query(trx).insertAndFetch(upsertObj) as QueryBuilder<
              TModel,
              TModel
            >);
      });
    } catch (e) {
      console.error("rollback", e);
    }
  }

  _id: string;
  createdAt: string;
  updatedAt: string;

  $beforeInsert() {
    this.createdAt = new Date().toISOString();
  }
  $beforeUpdate() {
    this.updatedAt = new Date().toISOString();
  }
  $formatDatabaseJson(json: Pojo) {
    json = super.$formatDatabaseJson(json);
    if (json._id !== undefined) {
      json.id = json._id;
      delete json._id;
    }
    return json;
  }
  /**
   * Overriding $parseDatabaseJson so that Objection queries return something
   * that the model interface expects.
   * https://vincit.github.io/objection.js/api/model/overview.html#model-data-lifecycle
   */
  $parseDatabaseJson(json: Pojo) {
    json = super.$parseDatabaseJson(json);
    if (json.id !== undefined) {
      json._id = json.id;
      delete json.id;
    }
    return json;
  }
}

export class ModelWithUserRef extends BaseModel {
  userId: string;
  /**
   * Overriding $formatDatabaseJson so that we can store a number userId, but pass in
   * a string.
   * https://vincit.github.io/objection.js/api/model/overview.html#model-data-lifecycle
   */
  $formatDatabaseJson(json: Pojo) {
    json = super.$formatDatabaseJson(json);
    if (json.userId !== undefined) json.userId = Number(json.userId);
    return json;
  }
  /**
   * Overriding to convert the number id to string.
   */
  $parseDatabaseJson(json: Pojo) {
    json = super.$parseDatabaseJson(json);
    if (json.userId !== undefined)
      json.userId = (json.userId as number).toString();
    return json;
  }
}

export class UserModel extends BaseModel implements User {
  static tableName = "users";

  // Including all fields here for typing, even though
  // migrations are supposed to be the source of truth.
  username: string;
}

export class ClientModel extends ModelWithUserRef implements Client {
  static tableName = "clients";
  name: string;
}

export class AuthModel extends ModelWithUserRef implements Auth {
  static tableName = "auth";
  static relationMappings = {
    user: {
      relation: Model.BelongsToOneRelation,
      modelClass: UserModel,
      join: {
        from: "auth.userId",
        to: "users.id",
      },
    },
  };

  username: string;
  hashed: string;
}

export class FeedsModel extends ModelWithUserRef implements Feeds {
  static tableName = "feeds";
  static relationMappings = {
    user: {
      relation: Model.BelongsToOneRelation,
      modelClass: UserModel,
      join: {
        from: "feeds.userId",
        to: "users.id",
      },
    },
  };
  static jsonAttributes = ["feedGroups"];

  feedGroups: FeedGroupData[];
}

export class EntryCacheModel extends BaseModel implements EntryCache {
  static tableName = "entryCache";
  static jsonAttributes = ["entries"];

  sourceAndId: string;
  entries: FeedEntry[];
}

export class EntryStatusModel extends ModelWithUserRef implements EntryStatus {
  /**
   * Figure out whether to update the status row or delete it when removing
   * a status timestamp.
   * @param queryObj Query to find
   * @param columnsToRemove Column names of the timestamp rows to remove.
   */
  static async removeStatusOrDelete(
    queryObj: object,
    columnsToRemove: (keyof // Doing this for type safety.
    Pick<EntryStatusModel, "readAt" | "spokenAt" | "starredAt" | "visitedAt">)[]
  ) {
    try {
      return this.transaction(async (trx) => {
        const statusColumnNames = [
          // Doing this for type safety.
          nameof<EntryStatusModel>("readAt"),
          nameof<EntryStatusModel>("spokenAt"),
          nameof<EntryStatusModel>("starredAt"),
          nameof<EntryStatusModel>("visitedAt"),
        ];
        // See what fields are left after removing.
        const entryStatus = await this.query(trx).findOne(queryObj);
        // Do nothing when row not found.
        if (!entryStatus) return;
        const entryStatusId = entryStatus._id;
        // NOTE seems like $pick mutates entryStatus? Assume so and don't reference
        // it in below code. (Also the reason why I assign entryStatusId above)
        const currentEntryStatusColumns = entryStatus.$pick(statusColumnNames);
        const updatedEntryStatusColumns = columnsToRemove.reduce(
          (result, columnToNullify) => {
            result[columnToNullify] = null;
            return result;
          },
          currentEntryStatusColumns
        );

        // If at least one entry status column has a non-null value, then we update.
        // Otherwise we can delete the row.
        // TODO check that a NULL db value is translated into a null js value.
        return Object.values(updatedEntryStatusColumns).find(
          (columnValue) => columnValue !== null
        )
          ? // Only use the queryObj for finding the row to remove; here we use the id of the row
            // so that we only update/delete one row always.
            this.query(trx)
              .patch(updatedEntryStatusColumns)
              // TODO see why id is necessary here and not _id. Is it because this is a static
              // method of EntryStatusModel? (Instead of an instance method, which would
              // probably call $formatDatabaseJson)
              .where({ id: entryStatusId })
          : this.query(trx).delete().where({ id: entryStatusId });
      });
    } catch (e) {
      console.error("rollback", e);
    }
  }
  static tableName = "entryStatus";
  static relationMappings = {
    user: {
      relation: Model.BelongsToOneRelation,
      modelClass: UserModel,
      join: {
        from: "entryStatus.userId",
        to: "users.id",
      },
    },
  };
  static jsonAttributes = ["entry"];

  entryId: string;
  entry: FeedEntry;
  feedName: string;
  url?: string;
  readAt?: string;
  spokenAt?: string;
  starredAt?: string;
  visitedAt?: string;
}

export enum IntervalType {
  ACTIVE_IN_APP = "ACTIVE_IN_APP",
  LINK_READING_ESTIMATE = "LINK_READING_ESTIMATE",
}

export class IntervalsModel extends ModelWithUserRef implements Interval {
  static tableName = "intervals";
  static relationMappings = {
    user: {
      relation: Model.BelongsToOneRelation,
      modelClass: UserModel,
      join: {
        from: "intervals.userId",
        to: "users.id",
      },
    },
  };

  clientId: string;
  type: IntervalType;
  entryId?: string;
  feedName?: string;
  startedAt: string;
  endedAt: string;
}

export class SettingsModel extends ModelWithUserRef implements Settings {
  static tableName = "settings";
  static relationMappings = {
    user: {
      relation: Model.BelongsToOneRelation,
      modelClass: UserModel,
      join: {
        from: "settings.userId",
        to: "users.id",
      },
    },
  };
  static jsonAttributes = ["data"];

  clientId: string;
  data: SettingsData;
}

export class ArchivesModel extends ModelWithUserRef {
  static tableName = "archives";
  static relationMappings = {
    user: {
      relation: Model.BelongsToOneRelation,
      modelClass: UserModel,
      join: {
        from: "archives.userId",
        to: "users.id",
      },
    },
  };
  static jsonAttributes = ["data"];

  thresholdAt: string;
  // TODO type this?
  data: any;
}
