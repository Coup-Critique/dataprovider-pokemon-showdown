const { insertOrUpdate } = require("../../db/db");
const { knexSnakeCaseMappers } = require("objection");

describe("English description import", () => {
  let knex = null;

  beforeEach(async () => {
    knex = require("knex")({
      client: "sqlite3",
      connection: { filename: ":memory:" },
      useNullAsDefault: true,
      ...knexSnakeCaseMappers(),
    });
    await knex.schema.createTable("move", (table) => {
      table.increments("id");
      table.string("name");
      table.integer("gen");
      table.text("description");
      table.text("description_en");
    });
    await knex("move").insert([
      {
        name: "Empty",
        gen: 9,
        description: "Écrite à la main",
        descriptionEn: null,
      },
      {
        name: "Blank",
        gen: 9,
        description: "Écrite à la main",
        descriptionEn: "",
      },
      {
        name: "Handwritten",
        gen: 9,
        description: "Écrite à la main",
        descriptionEn: "Hand written",
      },
    ]);
  });

  afterEach(() => knex.destroy());

  const importMoves = (moves) =>
    Promise.all(
      insertOrUpdate(knex, "move", moves, {
        hasGen: true,
        noOverrideColumns: ["description"],
        fillEmptyColumns: ["descriptionEn"],
      })
    );

  const fromShowdown = (name) => ({
    name,
    gen: 9,
    description: "From Showdown",
    descriptionEn: "From Showdown",
  });

  test("fills empty English descriptions and keeps hand-written ones", async () => {
    await importMoves(
      ["Empty", "Blank", "Handwritten", "New"].map(fromShowdown)
    );

    const rows = Object.fromEntries(
      (await knex("move").select()).map((row) => [row.name, row])
    );

    expect(rows.Empty.descriptionEn).toBe("From Showdown");
    expect(rows.Blank.descriptionEn).toBe("From Showdown");
    expect(rows.Handwritten.descriptionEn).toBe("Hand written");
    expect(rows.New.descriptionEn).toBe("From Showdown");
    for (const name of ["Empty", "Blank", "Handwritten"])
      expect(rows[name].description).toBe("Écrite à la main");
  });

  test("a second import keeps the English description filled by the first one", async () => {
    await importMoves([fromShowdown("Empty")]);
    await importMoves([
      { ...fromShowdown("Empty"), descriptionEn: "Changed upstream" },
    ]);

    const row = await knex("move").where({ name: "Empty" }).first();
    expect(row.descriptionEn).toBe("From Showdown");
  });
});
