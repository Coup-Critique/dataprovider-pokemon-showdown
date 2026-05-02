const { loadResource, LIBS, JSON } = require("../libs/fileLoader");
const { knex } = require("./db");
const { withoutSpaces, LAST_GEN } = loadResource(LIBS, "util");
const bluebird = require("bluebird");
const learns = loadResource(JSON, "learns.json").filter(
  (l) => l.gen == LAST_GEN
);
const cliProgress = require("cli-progress");
const progressBar = new cliProgress.SingleBar(
  {
    clearOnComplete: true,
    stopOnComplete: true,
  },
  cliProgress.Presets.shades_classic
);
progressBar.start(learns.length, 0);

(async () => {
  try {
    let results = await bluebird.map(
      learns,
      async (object) => {
        progressBar.increment();
        let pokemonRow = await knex("pokemon")
          .where({
            name: object.pokemon,
            gen: object.gen,
          })
          .first(["id"]);
        if (!pokemonRow) {
          pokemonRow = await knex("pokemon")
            .where({
              usageName: withoutSpaces(object.pokemon),
              gen: object.gen,
            })
            .first(["id"]);
          if (!pokemonRow) {
            console.log(
              `Pokémon ${object.pokemon} en génération ${object.gen} introuvable`
            );
            return {
              INSERTED: 0,
            };
          }
        }
        let INSERTED = 0;
        let moveIds = [];

        const findMoveRow = async (move, gen) => {
          let moveRow = await knex("move")
            .where({ name: move, gen })
            .first(["id"]);
          if (!moveRow) {
            moveRow = await knex("move")
              .where({ usageName: withoutSpaces(move), gen })
              .first(["id"]);
          }
          return moveRow;
        };

        const upsertPokemonMove = async (
          pokemonId,
          moveId,
          gen,
          championsAdd = false,
          championsLoss = false
        ) => {
          try {
            await knex("pokemonMove").insert({
              pokemonId,
              moveId,
              gen,
              championsAdd,
              championsLoss,
            });
            return true;
          } catch (e) {
            if (e.code === "ER_DUP_ENTRY") {
              return false;
            }
            throw new Error(e);
          }
        };

        const processMoves = async (moves, championsAdd = false) => {
          for (const move of moves) {
            const moveRow = await findMoveRow(move, object.gen);
            if (!moveRow) continue;
            if (!moveIds.includes(moveRow.id)) moveIds.push(moveRow.id);

            const championsLoss = championsAdd
              ? false
              : object.championsLoss?.includes(move) ?? false;

            if (
              await upsertPokemonMove(
                pokemonRow.id,
                moveRow.id,
                object.gen,
                championsAdd,
                championsLoss
              )
            )
              INSERTED++;
          }
        };

        await processMoves(object.moves);
        if (object.championsAdd) {
          await processMoves(object.championsAdd, true);
        }

        // Delete invalid moves
        await knex("pokemonMove")
          .whereNotIn("moveId", moveIds)
          .andWhere({
            pokemonId: pokemonRow.id,
            gen: object.gen,
          })
          .delete();
        return {
          INSERTED,
        };
      },
      {
        concurrency: 150,
      }
    );

    console.log({
      table: "pokemonMove",
      INSERTED: results.reduce((sum, { INSERTED }) => sum + INSERTED, 0),
    });
  } catch (err) {
    console.log(err);
  } finally {
    knex.destroy();
  }
})();
