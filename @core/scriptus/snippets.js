const fs = require("fs");
const path = require("path");
const coreutils = require("./../coreutils");

const ROOT_DIR = null; //path.resolve(__dirname);
const STORE = {};

function Snippets() {
  this.context = function (context) {
    let $ = {};
    let _context = {
      ...context
    };
    Object.keys(STORE).map(function (name) {
      let snippet = STORE[name];
      $[name] = snippet($, _context);
    });
    return $;
  };
}

const readSnippets = function ({ scriptsDir }) {
  if (!scriptsDir) return;
  coreutils.log("snippets from ", scriptsDir);
  const filenames = fs.readdirSync(scriptsDir);
  filenames.forEach((filename) => {
    if (filename !== "index.js") {
      let snippet = require(path.join(scriptsDir, filename));
      STORE[filename.split(".")[0]] = snippet;
      //console.log("Loaded snippet", snippet);
    }
  });
};

/**
 *
 * @param {*} { root="Root directory", dir="relative path to scripts directory", scriptsDir="absolute path to scripts directory"}
 * @returns
 */
Snippets.load = function ({ root = ROOT_DIR, dir, scriptsDir }) {
  try {
    if (!root) {
      root = coreutils.getCallerDir();
    }
    if (!scriptsDir) scriptsDir = path.resolve(root, dir);
    readSnippets({ scriptsDir });
  } catch (error) {
    console.error("Failed to read scripts", error);
  } finally {
    return Snippets;
  }
};

module.exports = Snippets;
