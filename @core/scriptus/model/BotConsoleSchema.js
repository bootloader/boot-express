const mongon = require("@bootloader/mongon");

const schema = mongon.Schema(
  {
    _id: { type: mongon.Schema.Types.ObjectId, auto: true }, // Ensure `_id` is added
    domain: { type: String, index: true },
    app_id: { type: String, index: true },
    contact_id: { type: String, index: true },
    level: { type: String, index: true },
    timestamp: { type: Number, index: true },
    type: { type: String, index: true },
    logs: { type: [Object] },
  },
  { minimize: false, collection: "AS_CONSOLE_LOG", _id: true }
);

module.exports = schema;
