const mongon = require("@bootloader/mongon");
const { cachebox } = require("@bootloader/redison");
const BotConsoleSchema = require("../model/BotConsoleSchema");
const { string } = require("../../utils");

const debuggerbox = cachebox({
  name: "debugger",
  ttl: 60 * 5,
});

module.exports = {
  async setDebugContact(contactId) {
    let contactKey = string.toContactKey(contactId);
    await debuggerbox.set(contactKey, "DEBUG_ENABLED");
  },
  async isDebugContact(contactId) {
    let contactKey = string.toContactKey(contactId);
    if (contactKey) {
      return !!(await debuggerbox.get(contactKey));
    }
    return false;
  },

  async get({ app_id, contact_id, domain, tnt }) {
    //console.log("GET LOGS FOR", contact_id, app_id, domain);
    //await this.log({ app_id, contact_id, domain, tnt }, { level: "log", type: "info", logs: ["zzzz"] });

    let lastStamp = Date.now();
    let _domain = domain || tnt;
    await this.setDebugContact(contact_id);

    let BotConsoleLog = mongon.model(BotConsoleSchema, { domain: _domain });
    let docs = await BotConsoleLog.find({
      app_id: app_id,
      contact_id: contact_id,
      domain: domain,
      timestamp: { $lte: lastStamp },
    }).sort("timestamp");

    docs.map(function (doc) {
      lastStamp = Math.max(doc.timestamp, lastStamp);
      return doc;
    });

    BotConsoleLog.deleteMany(
      {
        app_id: app_id,
        contact_id: contact_id,
        domain: domain,
        timestamp: { $lte: lastStamp },
      },
      function (err) {}
    );

    return docs;

    //let logskey = "logs_" + contactKey;
    //console.log("contactKey",contactKey)
    //redis.set(logskey, `${Date.now()}`);
  },

  async log({ app_id, contact_id, domain }, { level, type, logs }) {
    try {
      //console.log("SET LOGS FOR", contact_id, app_id, domain);
      let BotConsoleLog = mongon.model(BotConsoleSchema, { domain });
      const botLog = new BotConsoleLog({
        domain: domain,
        app_id: app_id,
        contact_id: contact_id,
        timestamp: Date.now(),
        level: level,
        type: type,
        logs: (logs || []).map(function (_log) {
          if (_log instanceof Error || (_log && _log.stack && _log.message)) {
            return _log.stack.split("    at Object.execute")[0];
          } else if (typeof _log == "object") {
            return JSON.stringify(_log);
          }
          return _log;
        }),
      });
      //console.log("SETTED LOGS FOR", contact_id, app_id, domain, botLog);
      return await botLog.save();
    } catch (e) {
      console.log("CONSOLE SAVE EXCEPTION", e);
    }
  },
};
