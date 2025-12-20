const mongon = require("@bootloader/mongon");

const schema = mongon.Schema(
  {
    // table / collection
    namespace: {
      type: String,
      required: true,
      index: true,
    },
    // primary indexed key
    bucket: {
      type: String,
      required: true,
      index: true,
    },
    // secondary indexed key
    section: {
      type: String,
      index: true,
    },
    // unique row identifier
    code: {
      type: String,
      required: true,
    },
    // indexed array
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    // user-defined timestamp
    stamp: {
      type: Date,
      index: true,
    },
    // row payload
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
schema.index(
  { namespace: 1, bucket: 1, code: 1 },
  { unique: true }
);

// namespace + bucket listing
schema.index(
  { namespace: 1, bucket: 1 }
);

// namespace + section listing
schema.index(
  { namespace: 1, section: 1 }
);

// tag lookup
schema.index(
  { tags: 1 }
);

// time-based ordering
schema.index(
  { namespace: 1, stamp: -1 }
);

module.exports = schema;