const mongon = require("@bootloader/mongon");

const Schema = mongon.Schema(
  {
    code: { type: String },
    idNumber: Number,
    parentId: { type: String },
    type: { type: String },
    title: { type: String },
    category: { type: String },
    startnote: { type: String },
    endnote: { type: String },
    lang: { type: String },
  },
  {
    minimize: false,
    collection: "DICT_KNOW_BASE",
  }
);

module.exports = Schema;