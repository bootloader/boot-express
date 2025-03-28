const mongon = require("@bootloader/mongon");

const ClientAppStore = require("../store/ClientAppStore");

import ChainedPromise from "../../lib/ChainedPromise";

module.exports = function (
  $,
  { server, tnt, app_id, appCode, domain, contact_id, channel_id, session, userData, session_id, adapter, script }
) {
  class AppPromise extends ChainedPromise {
    constructor(executor = (resolve) => resolve(0)) {
      super(executor);
    }
    app(n) {
      return this.chain(async function (parentResp) {
        return await ClientAppStore.get({ domain, id: app_id, code: appCode });
      });
    }
    options(n) {
      return this.chain(async function (app) {
        if (!script.options) {
          script.options = {
            custom: app?.custom || {},
            config: app?.config || {},
            props: app?.props || {},
          };
        }
        return script.options;
      });
    }
    config(n) {
      return this.chain(async function (options) {
        return options.custom;
      });
    }
    props(n) {
      return this.chain(async function (options) {
        return options.custom;
      });
    }
    custom(n) {
      return this.chain(async function (options) {
        return options.custom;
      });
    }
  }

  function app() {
    return new AppPromise().app();
  }
  app.options = function () {
    return app().options();
  };
  app.options.config = function () {
    return app().options().config();
  };
  app.options.props = function () {
    return app().options().props();
  };
  app.options.custom = function () {
    return app().options().custom();
  };

  return app;
};
