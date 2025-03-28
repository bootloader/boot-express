const fs = require("fs");
const path = require("path");
const coreutils = require("../utils/coreutils");
var vm = require("vm");

const ROOT_DIR = null; //path.resolve(__dirname);
const STORE = {};

function ScriptBox({ name, name_fallback = [], code, load }) {
  let vmscript, VM, script;
  let $script = (async function () {
    if (!code) {
      script = STORE[name];

      if (!script) {
        name_fallback = typeof name_fallback === "string" ? [name_fallback] : name_fallback;
        for (let index = 0; index < name_fallback.length; index++) {
          const fname = name_fallback[index];
          script = STORE[fname];
          if (script) break;
        }

        if (!script) {
          script = await load({ name });
        }
      }
      code = script.code;
    }

    if (code) {
      vmscript = new vm.Script(code);
    } else {
      throw Error("Failed to load script", name);
    }
  })();

  this.getScript = function () {
    return script;
  };

  this.context = function (context) {
    VM = context;
    return this;
  };

  this.snippet = function (snippet) {
    return (method, ...args) => {
      return VM.$[snippet][method](...args);
    };
  };

  this.execute = function (method, ...args) {
    return VM[method](...args);
  };

  this.has = function (method) {
    return !!VM[method];
  };

  this.hasFunction = function (method) {
    return !!VM[method] && typeof VM[method] == "function";
  };

  this.setting = function (key) {
    return VM[key];
  };

  this.run = async function ({ contextName, timeout = 10000 }) {
    await $script;
    vmscript.runInNewContext(VM, {
      contextName: contextName,
      timeout: timeout, // default : 10000 milliseconds
    });
  };
}

const readFiles = function ({ scriptsDir }) {
  if (!scriptsDir) return;

  if (!fs.existsSync(scriptsDir)) {
    console.warn(`Warning: Directory "${scriptsDir}" does not exist.`);
    return;
  }

  coreutils.log("scripts from ", scriptsDir);
  const filenames = fs.readdirSync(scriptsDir);
  filenames.forEach((filename) => {
    if (filename !== "index.js") {
      let name = filename.split(".");
      STORE[name[0]] = STORE[name[0]] || {};
      const content = fs.readFileSync(`${scriptsDir}/${filename}`, "utf-8");
      if (name[1] == "js") {
        STORE[name[0]].code = content;
      } else if (name[1] == "json") {
        STORE[name[0]].options = JSON.parse(content);
      }
      console.log("Loaded script", filename);
    }
  });
};

/**
 *
 * @param {*} { root="Root directory", dir="relative path to scripts directory", scriptsDir="absolute path to scripts directory"}
 * @returns
 */
ScriptBox.load = function ({ root = ROOT_DIR, dir, scriptsDir }) {
  try {
    if (!root) {
      root = coreutils.getCallerDir();
    }
    if (!scriptsDir) scriptsDir = path.resolve(root, dir);
    readFiles({ scriptsDir });
  } catch (error) {
    console.error("Failed to read scripts", error);
  } finally {
    return ScriptBox;
  }
};

module.exports = ScriptBox;
