const mongon = require("@bootloader/mongon");

const schema = mongon.Schema(
  {
    id: { type: String, index: true },
    tnt: { type: String, index: true },
    app_id: { type: String, index: true },
    api_key: String,
    updatedStamp: Number,
    updatedDate: Date,
    env: Object,
    files: [{ name: String, content: String }],
    setup: { type: [Object] },
    config: Object,
  },
  { minimize: false, collection: "AS_BOT_ARCHIVE" }
);

module.exports = schema;
