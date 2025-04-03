const mongon = require("@bootloader/mongon");

const schema = mongon.Schema(
  {
    _id: { type: mongon.Schema.Types.ObjectId, auto: true }, // Ensure `_id` is added
    timestamp: { type: Number },
    sessionId: { type: String },
    type: { type: String, index: true },
    messageId: { type: String },
    messageIdExt: { type: String },
    messageIdRef: { type: String },
    contactId: { type: String },
    messageIdRef: { type: String },
    httpReq: { type: Object },
    httpResp: { type: Object },
    httpStatusCode: { type: Number },
    appType: { type: String },
    appVenv: { type: String },
    queue: { type: String, index: true },
    logs: { type: [Object] },
  },
  { minimize: false, collection: "MESSAGE_LOGS", _id: true }
);

module.exports = schema;
