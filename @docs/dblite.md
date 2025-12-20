# 📦 `$.dblite` — Lightweight Bot Database API

`$.dblite` is a **managed, lightweight database API** available inside bot scripts.
It allows bots to **store and retrieve structured data** safely without direct database access.

This is **NOT** a raw database.
It supports **controlled operations only**.

---

## 🧠 Core Concepts

### Logical Structure

```
namespace  → logical table / collection
code       → unique identifier within a namespace
bucket     → optional indexed field (filtering aid)
section    → optional indexed field (filtering aid)
tags       → optional indexed array
stamp      → optional user-defined timestamp
record     → actual data payload
```

---

## 🔑 Uniqueness Rule

* `code` is **unique within a namespace**
* Bucket and section **do NOT affect uniqueness**

```text
(namespace, code) = one document
```

---

## 📄 Data Model

Each stored document looks like:

```js
{
  namespace: "geo",
  code: "IN",

  bucket: "countries",     // optional
  section: "south_asia",   // optional
  tags: ["asia"],          // optional

  stamp: Date,             // optional (used for sorting)

  record: {                // required
    label: "India",
    currency: "INR"
  }
}
```

---

## ✍️ Write / Update Data

### `$.dblite.put()`

Creates or updates a document using `namespace + code`.

```js
await $.dblite.put({
  namespace: "geo",
  code: "IN",
  bucket: "countries",
  section: "south_asia",
  tags: ["asia"],
  stamp: new Date("2024-01-01"),
  record: {
    label: "India",
    currency: "INR"
  }
});
```

### Rules

* `namespace`, `code`, and `record` are required
* If the document exists, it is **updated**
* Bucket and section can be changed freely

---

## 🔍 Read Data

### `$.dblite.get()`

Fetch a single document by `namespace + code`.

```js
const country = await $.dblite.get({
  namespace: "geo",
  code: "IN"
});
```

Returns:

* Document object
* `null` if not found

---

## 📃 List Data (Controlled Filtering)

### `$.dblite.list()`

Retrieve multiple documents using indexed fields.

```js
const countries = await $.dblite.list({
  namespace: "geo",
  bucket: "countries",
  section: "south_asia",
  tags: ["asia"],
  orderBy: "stamp",
  limit: 10
});
```

### Supported Filters

* `namespace` (required)
* `bucket` (optional)
* `section` (optional)
* `tags` (optional, AND logic)
* `orderBy` → `"stamp"` (default)
* `limit` → max 50

❌ No custom queries
❌ No operators (`$gt`, `$or`, etc.)

---

## ❌ Delete Data

### `$.dblite.delete()`

Delete a document using `namespace + code`.

```js
await $.dblite.delete({
  namespace: "geo",
  code: "IN"
});
```

---

## ✅ Check Existence

### `$.dblite.exists()`

```js
const exists = await $.dblite.exists({
  namespace: "geo",
  code: "IN"
});
```

Returns `true` or `false`.

---

## 🔢 Count Documents

### `$.dblite.count()`

```js
const count = await $.dblite.count({
  namespace: "geo",
  bucket: "countries"
});
```

Counts documents matching the filters.

---

## 🚫 What `$.dblite` Does NOT Support

* No raw database access
* No custom queries
* No joins
* No aggregation pipelines
* No schema changes
* No full-text search

This keeps bots **safe, fast, and predictable**.

---

## ⚠️ Limits (Enforced)

| Limit           | Value                  |
| --------------- | ---------------------- |
| Max record size | 8 KB                   |
| Max tags        | 10                     |
| Max list limit  | 50                     |
| Writes          | Controlled by platform |

---

## ✅ Best Practices

* Use **`namespace`** to separate logical tables
* Use **`bucket` / `section`** only for grouping & filtering
* Keep `record` **flat and small**
* Use `stamp` for ordering instead of custom date fields

---

## 📌 Summary

* `$.dblite` is a **safe, managed data API**
* Identity = `namespace + code`
* Bucket & section are **indexes**, not keys
* Designed for **bot logic**, not general DB usage

---

If you want, next I can:

* Add **examples per use-case** (config, lookup, KB)
* Create a **one-page quick reference**
* Add **error codes & handling guide**

Just tell me.
