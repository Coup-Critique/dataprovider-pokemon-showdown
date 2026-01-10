const { knexSnakeCaseMappers } = require("objection");
require("dotenv").config();
/**
 *
 * @param {string} knex Knex instance
 * @param {string} tableName table that must be updated
 * @param {{}} objectArray the array of objects that must be passed to the table
 * @param {{ identifier: ?string, hasGen: boolean,
 *           replaceColumns: ?object, relations: ?object,
 *           ignoreColumns: string[],
 *           noOverrideColumns: string[]  }} options
 * Options parameters :
 * - identifier : column name that will have the identifier role (check row's existance)
 * - hasGen : does data have gen ? (special processing)
 * - replaceColumns : columns name that must be replaced by other precised
 * - relations : column mapping across tables
 * - noOverideColumns : columns that mustn't be updated
 * @returns
 */
module.exports.insertOrUpdate = (
  knex,
  tableName,
  objectArray,
  {
    identifier = null,
    hasGen = false,
    replaceColumns = null,
    relations = null,
    ignoreColumns = [],
    noOverrideColumns = [],
  } = {}
) => {
  return objectArray.map(async (entry) => {
    if (ignoreColumns.length > 0)
      for (const ignoreColumn of ignoreColumns) {
        if (!entry.hasOwnProperty(ignoreColumn)) continue;
        delete entry[ignoreColumn];
      }

    if (replaceColumns)
      for (const [oldColumn, newColumn] of Object.entries(replaceColumns)) {
        if (!entry.hasOwnProperty(oldColumn)) continue;
        entry[newColumn] = entry[oldColumn];
        delete entry[oldColumn];
      }

    if (relations) {
      for (const [column, { table, refColumn }] of Object.entries(relations)) {
        if (!entry.hasOwnProperty(column)) continue;
        let row = null;
        if (hasGen)
          row = await knex(table)
            .where({ [refColumn]: entry[column], gen: entry.gen })
            .first(["id"]);
        else
          row = await knex(table)
            .where({ [refColumn]: entry[column] })
            .first(["id"]);
        entry[column] = row ? row.id : null;
      }
      //console.log(entry)
    }

    try {
      const identifierRow = identifier
        ? { [identifier]: entry[identifier] }
        : { name: entry.name };

      const row = await knex(tableName)
        .where(hasGen ? { ...identifierRow, gen: entry.gen } : identifierRow)
        .first(["id"]);
      if (row && row.id) {
        if (noOverrideColumns.length > 0) {
          for (const column of noOverrideColumns) {
            if (entry[column]) delete entry[column];
          }
        }
        await knex(tableName).update(entry).where("id", row.id);
        return { tableName, INSERTED: 0, UPDATED: 1 };
      } else {
        await knex(tableName).insert(entry);

        return { tableName, INSERTED: 1, UPDATED: 0 };
      }
    } catch (e) {
      throw new Error(e);
    }
  });
};

module.exports.resultRecords = (table, results) =>
  results.reduce(
    (acc, { INSERTED = 0, UPDATED = 0 }) => {
      acc["INSERTED"] += INSERTED;
      acc["UPDATED"] += UPDATED;
      return acc;
    },
    { table, INSERTED: 0, UPDATED: 0 }
  );

module.exports.knex = require("knex")({
  client: "mysql",
  connection: process.env.CONNECTION_STRING,
  log: {
    warn() {
      // do nothing...it will hide warning messages
    },
  },
  ...knexSnakeCaseMappers(),
});
