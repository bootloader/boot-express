const { context } = require("@bootloader/utils");
const mongon = require("@bootloader/mongon");
const BotCodeSchema = require("../model/BotCodeSchema");
const BotCodeArchiveSchema = require("../model/BotCodeArchiveSchema");

module.exports = {
  /**
   *
   * @param {*} param0
   * @returns
   */
  async getBotCode({ appId }) {
    let BotCode = mongon.model(BotCodeSchema);
    //console.log("getbotcode is being run");
    let id = `${appId}${context.getTenant()}`;
    let docs = await BotCode.find({ id: id }).exec();
    if (docs.length != 0) {
      let botCode = docs[0];
      let code = "";
      let files = botCode.files;

      files.forEach((element) => {
        code = code + element.content;
      });
      //onCodeReceived(code);
      return {
        code,
        files,
        setup: botCode.setup || [], // Return setup or an empty array if undefined
        config: botCode.config || {}, // Return config or an empty object if undefined
        botFlow: botCode.botFlow,
        botFlowRenderer: botCode.botFlowRenderer,
      };
    }
    return {};
  },
  /**
   *
   * @param {*} param0
   * @returns
   */
  async get({ request, status }) {
    let req = request;
    var appId = req.query.appId;
    var id = req.query.id;
    var domain = req.query.domain;

    try {
      let { code, files, setup, config, botFlow, botFlowRenderer } = await this.getBotCode({ appId });

      if (!appId || !domain) {
        status(400);
        return {
          status: "MISSING_PARAMETERS",
          message: "appId or domain missing",
        };
      }

      if (code || botFlow || botFlowRenderer) {
        return {
          status: "Success",
          "build number": "2",
          data: {
            content: code,
            files: files,
            botFlow,
            botFlowRenderer,
            setup: setup || [],
            config: config || {},
          },
        };
      } else {
        status(400);
        return {
          status: "NO_CODE_FOUND",
          message: "Bot Code not found",
        };
      }
    } catch (err) {
      console.error("Error fetching bot code:", err);
      status(500);
      return {
        status: "ERROR",
        message: "Error fetching bot code",
      };
    }
  },
  /**
   *
   * @param {*} param0
   * @returns
   */
  async save({ request }) {
    let req = request;
    let app_id = req.body.appId;
    let tnt = req.body.domain || context.getTenant();
    let key = req.body.key;
    let env = req.body.env;
    let files = req.body.files;
    let config = req.body.config;
    let setup = req.body.setup;
    let botFlow = req.body.botFlow || {};
    let botFlowRenderer = req.body.botFlowRenderer || {};

    let id = `${appId}${tnt}`;

    let BotCode = mongon.model(BotCodeSchema);
    let BotCodeArchive = mongon.model(BotCodeArchiveSchema);

    new BotCodeArchive({
      id: id,
      tnt: tnt,
      app_id: app_id,
      api_key: key,
      env: env,
      updatedStamp: Date.now(),
      updatedDate: Date.now(),
      files: files,
      config: config,
      setup: setup,
    }).save();

    let doc = await BotCode.find({ id: id });
    if (doc.length == 0) {
      const botCode = new BotCode({
        _id: id,
        id: id,
        tnt: tnt,
        app_id: app_id,
        api_key: key,
        env: env,
        files: files,
        config: config,
        setup: setup,
        botFlow,
        botFlowRenderer,
      });
      let result = await botCode.save();
      return {
        results: [id],
        status: "SUCCESS",
        message: "Bot Code added successfully",
      };
    } else {
      let docs = await BotCode.updateOne(
        { id: id },
        {
          $set: {
            files: files,
            config: config,
            setup: setup,
            botFlow,
            botFlowRenderer,
          },
        }
      );
      return {
        status: "SUCCESS",
        results: [id],
        message: "Bot Code updated successfully",
      };
    }
  },

  /**
   *
   * @param {*} param0
   * @returns
   */
  async getBotStory({ appId }) {
    if (localBotflow) return localBotStory;
    let tnt = context.getTenant();
    let result = null;
    let BotCode = mongon.model(BotCodeSchema);
    let docs = await BotCode.find({ id: appId + tnt }).exec();
    if (docs.length != 0) {
      let botCode = docs[0];
      result = botCode.botFlow;
    }
    return result;
  },
};
