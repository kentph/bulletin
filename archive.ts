import {
  UserModel,
  AuthModel,
  FeedsModel,
  EntryCacheModel,
  EntryStatusModel,
  IntervalsModel,
  SettingsModel,
  ArchivesModel,
  BaseModel,
  ModelWithUserRef,
} from "./objection/db";
import moment from "moment";
import { Transaction } from "objection";

const tables: typeof BaseModel[] = [
  UserModel,
  AuthModel,
  FeedsModel,
  EntryCacheModel,
  EntryStatusModel,
  IntervalsModel,
  SettingsModel,
  ArchivesModel,
];

const tablesToArchive: typeof ModelWithUserRef[] = [
  EntryStatusModel,
  IntervalsModel,
];

const queryForRowsToArchive = (
  model: typeof ModelWithUserRef,
  userId: string,
  threshold: string,
  trx?: Transaction
) => {
  return model.query(trx).where("createdAt", "<", threshold).where({ userId });
};

const oneDayAgo = moment().subtract(1, "day").toISOString();

export const archive = async () => {
  if (process.env.REACT_APP_DB_CLIENT !== "postgresHeroku") {
    throw Error(`db client not supported: ${process.env.REACT_APP_DB_CLIENT}`);
  }

  // Count total rows in db.
  const tableCounts = await Promise.all(
    tables.map((model) => model.query().resultSize())
  );

  const totalNumRows = tableCounts.reduce((sum, numRows) => {
    return sum + numRows;
  }, 0);

  // LOG
  console.log("rows: ", totalNumRows);

  // Archive by user.
  const users = await UserModel.query().select("id");

  // Always use 1 day as the archive threshold.
  const finalThreshold = oneDayAgo;
  const numRowsArchived = (
    await Promise.all(
      users.map((user) => {
        return Promise.all(
          tablesToArchive.map((model) =>
            queryForRowsToArchive(model, user._id, finalThreshold).resultSize()
          )
        );
      })
    )
  ).reduce(
    (sum, numRowsByUser) =>
      sum + numRowsByUser.reduce((userSum, numRows) => userSum + numRows, 0),
    0
  );

  if (numRowsArchived === 0) throw Error("no rows to archive");

  // Now do the archiving for real.

  // LOG
  console.log("total: ", totalNumRows, " | to archive: ", numRowsArchived);

  users.forEach(async (user) => {
    const jsonArchive = await Promise.all(
      tablesToArchive.map(async (model) => {
        return {
          [model.tableName]: (
            await queryForRowsToArchive(model, user._id, finalThreshold)
          )
            // If run into size issues could use a stream, but not supported by objection currently.
            // https://github.com/Vincit/objection.js/issues/54
            .map((instance) => instance.toJSON()),
        };
      })
    );

    // Make this a transaction.
    await ModelWithUserRef.transaction(async (trx) => {
      // Insert single row with entire archive.
      await ArchivesModel.query(trx).insert({
        userId: user._id,
        thresholdAt: finalThreshold,
        data: jsonArchive,
      });

      // Delete archived rows.
      const numDeleted = await Promise.all(
        tablesToArchive.map(async (model) => {
          return {
            [model.tableName]: await queryForRowsToArchive(
              model,
              user._id,
              finalThreshold,
              trx
            ).delete(),
          };
        })
      );

      // LOG
      console.log("deleted: ", JSON.stringify(numDeleted, null, 2));
    });
  });
};
