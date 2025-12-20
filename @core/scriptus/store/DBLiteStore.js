const mongon = require("@bootloader/mongon");
const { QueryBuilder } = require("@bootloader/mongon");
const DBLiteSchema = require("../model/DBLiteSchema");

const MAX_RECORD_SIZE = 8 * 1024; // 8 KB
const MAX_TAGS = 10;
const MAX_LIMIT = 50;

class DBLite {
  constructor({tnt,domain}) {
    this.col = mongon.model(DBLiteSchema,{tnt,domain});
  }
  // --------------------------------------------------
  // PUT (UPSERT BY namespace + bucket + code)
  // --------------------------------------------------
  async put(input) {
    this.#require(input.namespace, "namespace");
    this.#require(input.code, "code");
    this.#require(input.record, "record");

    if (input.tags && input.tags.length > MAX_TAGS) {
      throw new Error("TOO_MANY_TAGS");
    }

    const size = Buffer.byteLength(JSON.stringify(input.record));
    if (size > MAX_RECORD_SIZE) {
      throw new Error("RECORD_TOO_LARGE");
    }

    const now = new Date();

    await this.col.updateOne(
      {
        namespace: input.namespace,
        code: input.code,
      },
      {
        $set: {
          bucket: input.bucket ?? null,
          section: input.section ?? null,
          tags: input.tags ?? [],
          stamp: input.stamp ?? null,
          record: input.record,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true }
    );

    return { ok: true };
  }

  // --------------------------------------------------
  // GET (FAST PATH – PRIMARY LOOKUP)
  // --------------------------------------------------
  async get({ namespace, code }) {
    this.#require(namespace, "namespace");
    this.#require(code, "code");

    return this.col.findOne({ namespace, code }, { _id: 0 }).lean().exec();
  }

  // --------------------------------------------------
  // LIST (CONTROLLED SEARCH)
  // --------------------------------------------------
  async list(input) {
    const { namespace, bucket, section, tags, orderBy = "stamp", order = "desc", limit = 20 } = input;

    this.#require(namespace, "namespace");

    if (limit > MAX_LIMIT) {
      throw new Error("LIMIT_EXCEEDED");
    }

    const query = { namespace };

    if (bucket) query.bucket = bucket;
    if (section) query.section = section;
    if (tags?.length) query.tags = { $all: tags };

    const sort = { [orderBy]: order === "asc" ? 1 : -1 };

    return this.col
      .find(query, null, { projection: { _id: 0 } })
      .sort(sort)
      .limit(limit)
      .lean()
      .exec();
  }

  // --------------------------------------------------
  // DELETE (BY PRIMARY KEY)
  // --------------------------------------------------
  async delete({ namespace, bucket, code }) {
    this.#require(namespace, "namespace");
    this.#require(code, "code");

    const res = await this.col.deleteOne({
      namespace,
      code,
    });

    return { deleted: res.deletedCount === 1 };
  }

  // --------------------------------------------------
  // EXISTS (LIGHTWEIGHT CHECK)
  // --------------------------------------------------
  async exists({ namespace, code }) {
    this.#require(namespace, "namespace");
    this.#require(code, "code");

    const doc = await this.col.findOne({ namespace, code }, { projection: { _id: 1 } });

    return !!doc;
  }

  // --------------------------------------------------
  // COUNT (SAFE AGGREGATION)
  // --------------------------------------------------
  async count({ namespace, section }) {
    this.#require(namespace, "namespace");

    const query = { namespace };
    if (section) query.section = section;

    return this.col.countDocuments(query);
  }

  // --------------------------------------------------
  // INTERNAL VALIDATION
  // --------------------------------------------------
  #validatePut(input) {
    this.#require(input.namespace, "namespace");
    this.#require(input.bucket, "bucket");
    this.#require(input.code, "code");
    this.#require(input.record, "record");

    if (input.tags && input.tags.length > MAX_TAGS) {
      throw new Error("TOO_MANY_TAGS");
    }

    const size = Buffer.byteLength(JSON.stringify(input.record));
    if (size > MAX_RECORD_SIZE) {
      throw new Error("RECORD_TOO_LARGE");
    }
  }

  #require(value, name) {
    if (!value) {
      throw new Error(`${name.toUpperCase()}_REQUIRED`);
    }
  }
}

module.exports = DBLite;
