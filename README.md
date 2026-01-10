## Pokemon Showdown Data Provider

This repository has the purpose to provide JSON resources from Pokemon Showdown.
These are periodically **kept updated** through an external CRON.

So it is not necessary to clone it.

All JSON files are downloaded and committed in the `json` directory.

You can import them through multiple ways :

- From `githubusercontent.com` with the following commands :
```sh
wget https://raw.githubusercontent.com/ii02735/dataprovider-pokemon-showdown/main/json/types.json
wget https://raw.githubusercontent.com/ii02735/dataprovider-pokemon-showdown/main/json/abilities.json
wget https://raw.githubusercontent.com/ii02735/dataprovider-pokemon-showdown/main/json/learns.json
wget https://raw.githubusercontent.com/ii02735/dataprovider-pokemon-showdown/main/json/natures.json
wget https://raw.githubusercontent.com/ii02735/dataprovider-pokemon-showdown/main/json/pokemonTier.json
wget https://raw.githubusercontent.com/ii02735/dataprovider-pokemon-showdown/main/json/items.json
wget https://raw.githubusercontent.com/ii02735/dataprovider-pokemon-showdown/main/json/moves.json
wget https://raw.githubusercontent.com/ii02735/dataprovider-pokemon-showdown/main/json/pokemons.json
```

- By downloading them manually (point and click)

## Install

```sh
cp .env.dist .env
npm install
node dataToJson.js
node usage-stats.js update
```