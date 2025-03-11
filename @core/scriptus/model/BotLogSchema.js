const mongon = require("@bootloader/mongon");

const schema = mongon.Schema(
  {
    _id: String,
    id: { type: String, index: true },
    tnt: { type: String, index: true },
    app_id: { type: String, index: true },
    api_key: String,
    env: Object,
    files: [{ name: String, content: String }],
    setup: { type: [Object] },
    config: Object,
    botFlow: Object,
    botFlowRenderer: Object,
  },
  { minimize: false, collection: "AS_BOT_CODE" }
);

module.exports = schema;
