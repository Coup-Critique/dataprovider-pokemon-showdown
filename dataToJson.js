// TODO retirer la fin des pokemons missingno + CAP + pokemon studio
"use strict";

const path = require("path");
const { loadResource, LIBS, PROVIDER } = require("./libs/fileLoader");
const { writeFile } = loadResource(LIBS, "util");

const providers = {
  abilities: () => loadResource(PROVIDER, "abilities"),
  pokemons: () => loadResource(PROVIDER, "pokemon"),
  items: () => loadResource(PROVIDER, "items"),
  types: () => loadResource(PROVIDER, "types"),
  moves: () => loadResource(PROVIDER, "moves"),
  learns: () => loadResource(PROVIDER, "learns"),
  natures: () => loadResource(PROVIDER, "natures"),
  pokemonTier: () => loadResource(PROVIDER, "pokemonTier"),
  officialUsages: () => loadResource(PROVIDER, "officialUsages"),
};

const args = process.argv.slice(2);
const targets = args.length > 0 ? args : Object.keys(providers);

for (const name of targets) {
  if (!providers[name]) {
    console.error(
      `Unknown provider: "${name}". Available: ${Object.keys(providers).join(
        ", "
      )}`
    );
    process.exit(1);
  }
  writeFile(name, providers[name]());
}
