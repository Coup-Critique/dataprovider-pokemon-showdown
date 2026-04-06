/* Months loader */

"use strict";

const Path = require("path");
const FileSystem = require("fs");
const Http = require("https");
const Parser = require(Path.resolve(__dirname, "parse-file.js"));
const Loader = require(Path.resolve(__dirname, "load-format.js"));

const tiers = require(Path.resolve(__dirname, "..", "json", "tiers.json"));
const LAST_GEN = Number(process.env.LAST_GEN);

function getValidFormatIds() {
  const ids = new Set();
  for (const { usageName, gen } of tiers) {
    if (!usageName) continue;
    const gens = Array.isArray(gen)
      ? gen
      : Array.from({ length: LAST_GEN }, (_, i) => i + 1);
    for (const g of gens) {
      ids.add(`gen${g}${usageName}`);
    }
  }
  return ids;
}

function filterFormats(formats) {
  const validIds = getValidFormatIds();
  return Object.fromEntries(
    Object.entries(formats).filter(([id]) => validIds.has(id))
  );
}

const Smogon_Stats_URL = "https://www.smogon.com/stats/";

function wget(url, callback) {
  Http.get(url, (res) => {
    let data = "";
    res.on("data", (chunk) => {
      data += chunk;
    });
    res.on("end", () => {
      let statusCode = res.statusCode;
      if (statusCode !== 200) {
        console.log(
          "Request Failed (" + url + ") / Status Code: " + statusCode
        );
        return callback(
          null,
          new Error("Request Failed.\nStatus Code: " + statusCode)
        );
      }
      console.log("GET: " + url);
      callback(data);
    });
  }).on("error", (e) => {
    console.error(e);
    callback(null, e);
  });
}

exports.loadMonth = function (month, callback) {
  if (!callback) callback = function () {};
  console.log("Parsing month: " + month);
  wget(Smogon_Stats_URL + month + "/", (data, err) => {
    if (err) {
      return callback(err);
    }
    data = Parser.parseFormatsList(data);
    const path = [__dirname, "..", "usages"];
    mkdir(Path.resolve(...path, "months"));
    mkdir(Path.resolve(...path, "months", month));
    mkdir(Path.resolve(...path, "months", month, "formats"));
    FileSystem.writeFileSync(
      Path.resolve(...path, "months", month, "formats.json"),
      JSON.stringify(data)
    );
    let loader = new Loader(month, filterFormats(data), callback);
    loader.start();
  });
};

exports.checkMonth = function (month, callback) {
  if (!callback) callback = function () {};
  console.log("Parsing month: " + month);
  let data;
  try {
    const path = [__dirname, "..", "usages"];
    data = require(Path.resolve(...path, "months", month, "formats.json"));
  } catch (err) {
    return callback(err);
  }
  let loader = new Loader(month, filterFormats(data), callback);
  loader.start();
};

exports.start = function (month) {
  if (!month) {
    console.log("Invalid month.");
    return;
  }
  const path = [__dirname, "..", "usages"];
  let months = require(Path.resolve(...path, "months-available.json")).months;
  let exits = false;
  for (let m of months) {
    if (m.id === month) {
      exits = true;
      break;
    }
  }
  if (!exits) {
    console.log("Month not found: " + month);
    return;
  }

  exports.loadMonth(month, (err) => {
    if (err) {
      console.log("Error parsing month: " + month);
    } else {
      console.log("DONE: Parsed month data for " + month);
    }
  });
};
