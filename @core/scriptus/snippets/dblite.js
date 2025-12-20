const DBLiteStore = require("../store/DBLiteStore");

module.exports = function (
  $,
  { server, tnt, app_id, domain, appCode, contact_id, channel_id, session_id, isDebug, session }
) {
  function DbLite(options) {
    return {
      __info__: {
        type: "snippet",
        snippet: "dblite",
      },
    };
  }
  DbLite.put = function (...theArgs) {
    new DBLiteStore({ tnt, domain }).put(...theArgs);
    return this;
  };
  DbLite.get = function (...theArgs) {
    new DBLiteStore({ tnt, domain }).get(...theArgs);
    return this;
  };
  DbLite.list = function (...theArgs) {
    new DBLiteStore({ tnt, domain }).list(...theArgs);
    return this;
  };
  DbLite.count = function (...theArgs) {
    new DBLiteStore({ tnt, domain }).count(...theArgs);
    return this;
  };

  return DbLite;
};
