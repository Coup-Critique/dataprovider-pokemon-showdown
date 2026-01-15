// TODO retirer la fin des pokemons missingno + CAP + pokemon studio
"use strict";

const path = require("path");
const { loadResource, LIBS, PROVIDER } = require("./libs/fileLoader");
const { writeFile } = loadResource(LIBS, "util");
const abilities = loadResource(PROVIDER, "abilities");
const items = loadResource(PROVIDER, "items");
const learns = loadResource(PROVIDER, "learns");
const moves = loadResource(PROVIDER, "moves");
const natures = loadResource(PROVIDER, "natures");
const pokemons = loadResource(PROVIDER, "pokemon");
const pokemonTier = loadResource(PROVIDER, "pokemonTier");
const types = loadResource(PROVIDER, "types");
const officialUsages = loadResource(PROVIDER, "officialUsages");

writeFile("abilities", abilities);

writeFile("pokemons", pokemons);

writeFile("items", items);

writeFile("types", types);

writeFile("moves", moves);

writeFile("learns", learns);

writeFile("natures", natures);

writeFile("pokemonTier", pokemonTier);

writeFile("officialUsages", officialUsages);
