# 📄 Job Queue Framework Documentation

This framework allows developers to define distributed, scalable background jobs using decorators and smart execution strategies. It supports tasks that can be executed concurrently, sequentially, or using mutex locks, and offers aggregation and deduplication features to efficiently process large-scale or task-based workloads.

---

## 🚀 Example: Campaign Job with Task Fan-Out

```ts
import { Job } from "@bootloader/core/decorators";

const TASKS = [{ task: 1 }, { task: 2 }, { task: 3 }, { task: 4 }];

@Job({
  name: "sendCampaign",
  workers: 4,
  executionStrategy: Job.EXECUTION_STRATEGY.CONCURRENT,
})
export default class SendCampaignJob {
  async onRun(job) {
    console.log(`running...`, job);
    this.execute(TASKS.pop());
    this.execute(TASKS.pop());

    return TASKS.length > 0; // return true to keep running, false to stop
  }

  async onExecute(task, options) {
    console.log(`executing:`, task, options);
    await new Promise((r) => setTimeout(r, 5000));
  }

  async onAggregate(tasks, options) {
    console.log(`aggregated:`, tasks, options);
    await new Promise((r) => setTimeout(r, 5000));
  }
}
```

---

## ⚙️ Decorator & Lifecycle Methods

### `@Job` Options

| Option                | Type     | Description                                         |
| --------------------- | -------- | --------------------------------------------------- |
| `name`                | `string` | Unique job name used for queue naming.              |
| `workers`             | `number` | Max parallel workers. Default is 1.                 |
| `executionStrategy`   | `enum`   | Task execution strategy. See below.                 |
| `aggregationStrategy` | `enum`   | Aggregation behavior. Defaults to `sequential`.     |
| `limiter`             | `object` | (Optional) BullMQ limiter object for rate limiting. |

### `onRun(job)`

* Called repeatedly by the job queue.
* Push tasks using `this.execute(data)`.
* Return `false` to stop, `true` to continue.

### `onExecute(task, options)`

* Called for each individual task.
* Optional `options` include:

| Option        | Type     | Description                                  |
| ------------- | -------- | -------------------------------------------- |
| `queue`       | `string` | Optional task group ID.                      |
| `dedupeKey`   | `string` | Prevent duplicate task.                      |
| `jobId`       | `string` | Custom job ID, overrides auto-generated one. |
| `dedupeSpan`  | `number` | Wait before pushing duplicate if set.        |

### `onAggregate(tasks, options)`

* Called when task aggregation is enabled.
* Gets list of tasks collected for aggregation.
* Ideal for summary processing or batched output.

---

## 📦 Execution Strategies

Choose how tasks are processed:

| Strategy     | Description                                                               |
| ------------ | ------------------------------------------------------------------------- |
| `CONCURRENT` | Default. Tasks run in parallel, no guarantees on order.                   |
| `SEQUENTIAL` | Tasks run in order. Useful when order matters (e.g., one user at a time). |
| `MUTEX`      | One task at a time per debounce key (like a lock).                        |

Usage:

```ts
executionStrategy: Job.EXECUTION_STRATEGY.MUTEX
```

---

## ✅ Real-World Use Cases

### 1. **Campaign Message Dispatcher**

Distribute and send millions of messages in batches. Job breaks the full campaign into smaller tasks and sends them concurrently.

* Use `onRun` to generate message batches.
* Use `onExecute` to send individual messages.
* Use `onAggregate` to create a summary report of messages sent.

### 2. **Excel File Processor**

Import large spreadsheets row by row and process each record independently.

* Use `onRun` to read and queue each row.
* Use `onExecute` to process the row (e.g., validate, save to DB).
* Use `onAggregate` to compile a report of success/failure counts.

### 3. **Inbound User Message Processor**

Queue messages per user and process them one by one using `SEQUENTIAL` strategy.

* Ensures message handling order per user.
* Prevents race conditions or double responses.

### 4. **ETL (Extract-Transform-Load) Pipeline**

Break large data ingestion jobs into stages:

* `onRun`: Fetch and chunk data.
* `onExecute`: Process and transform each item.
* `onAggregate`: Load result or send output summary.

### 5. **Webhook Dispatcher**

Queue and retry webhook deliveries per receiver.

* Use `MUTEX` to avoid flooding the same webhook URL.
* Add `debounceKey` per receiver.

---

## 🧠 Advanced Tips

* `this.execute(data)` handles queueing.
* Use `dedupeKey` to skip duplicate tasks.
* Use `debounceKey` with `MUTEX` to lock by entity.
* Return `false` from `onRun` to gracefully stop the job.
* Use `onAggregate` to clean up, report, or batch result.

---

This documentation helps developers decide if the framework fits their use case by showcasing powerful features and usage clarity. More examples or advanced integrations (like Redis priority queues or dependency chaining) can be added as needed.
