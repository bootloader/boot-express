const mongon = require("@bootloader/mongon");

const schema = mongon.Schema(
  {
    namespace: {
      type: String,
      required: true,
      index: true,
    },

    code: {
      type: String,
      required: true,
    },

    bucket: {
      type: String,
      index: true,
    },

    section: {
      type: String,
      index: true,
    },

    tags: {
      type: [String],
      default: [],
      index: true,
    },

    stamp: {
      type: Date,
      index: true,
    },

    record: {
      type: mongon.Schema.Types.Mixed,
      required: true,
    },
  },
  {
    minimize: false,
    collection: "DB_LITE",
    timestamps: {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  }
);

/**
 * Compound indexes
 */

// uniqueness guarantee
schema.index({ namespace: 1, code: 1 }, { unique: true });

schema.index({ namespace: 1, bucket: 1 });
schema.index({ namespace: 1, section: 1 });
schema.index({ tags: 1 });
schema.index({ namespace: 1, stamp: -1 });

module.exports = schema;
