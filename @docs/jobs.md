# 📄 Job Queue Framework Documentation

This framework allows developers to define distributed, scalable background jobs using decorators and smart execution strategies. It supports tasks that can be executed concurrently, sequentially, or using mutex locks, and offers aggregation and deduplication features to efficiently process large-scale or task-based workloads.

---

## Queue
In this framework, the concept of a queue is central to how jobs and tasks are managed, distributed, and executed. Here's a clear breakdown:

A queue represents a logical grouping of tasks or messages that should be executed in isolation or sequence, often associated with a specific context—like a campaign, user, or job type.

* Each queue acts like a dedicated processing line, ensuring:
* Ordering (if needed) of tasks.
* Mutual exclusion, so only one worker processes tasks from a specific queue at a time (if using serial strategy).
* Batching support for aggregation.
* Workload isolation, to prevent tasks from one group affecting another.


### How Queues Work in This Framework
- During onRun()
  - `onRun` itself does not depdend on queue, 
  -  but while running Tasks are dispatched using this.execute(task, { queue }).
  - The queue is usually a string identifier like campaignId, userId, etc.
- During onExecute()
  - Each task is processed independently, but within the constraints of the queue it was assigned to.
  - Concurrency rules may apply per queue.
- During onAggregate()
  - Tasks executed under the same queue are grouped and passed to this method for summarization or reporting.

### Exmaples

| Use Case	| How Queues Help |
------------|-----------------|
| Campaign Messaging	| One queue per campaign ensures parallel but isolated sends
| Per-User Message Handling	| Queue by user ID to avoid race conditions
| Batch Processing with Tallying	| Same queue groups all related tasks for aggregation
| Excel Row Processing	| Each sheet/job can be a queue, allowing task slicing

### Job Execution Flow with Queues
![Job Execution Flow](./images/job-execution-flow.png)

### Highlights
Each queue (e.g., campaign-123) ensures its tasks are executed in a controlled way.
- Tasks are dispatched into queues via this.execute(task, { queue }).
- Multiple workers can process different queues concurrently.
- All tasks executed under the same queue are grouped and aggregated later.
- Strategy (e.g., CONCURRENT, SEQUENTIAL) controls queue execution behavior.

---

## 🚀 Example: Campaign Job with Task Fan-Out

#### To create and trigger JOB

```ts
// Create a new job queue instance (you can reuse this singleton) or call static method
await SendCampaignJob.run({
  campaignId: "cmp-001", // Custom data passed to `onRun(job)`
});
```

#### Handle JOB and create summary

```ts
@Job({
  name: "sendCampaign",
  workers: 4,
  executionStrategy: Job.EXECUTION_STRATEGY.CONCURRENT,
})
export default class SendCampaignJob {
  async onRun(job) {
    console.log(`running...`, job);
    const messages = fetchAllMessagesForCampaign({ id: job.campaignId, limit: 10 });
    for (let massage of messages) {
      this.execute(massage, { queue: job.campaignId });
    }
    return TASKS.length == 10; // return true to keep running, false to stop
  }

  async onExecute(massage, options) {
    console.log(`executing:`, massage, options);
    this.aggregate({ campaignId: massage.campaignId, compelted: 1 }, { queue: massage.campaignId });
  }

  async onAggregate(tasks, options) {
    console.log(`aggregated:`, tasks, options);
    let completed = 0;
    for (let task of tasks) {
      completed = completed + task.completed;
    }
    let summary = fetchSummary({ campaignId: tasks.campaignId });
    summary.completed = summary.completed + completed;
    updateSummaryToDb({ summary });
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

- Called repeatedly by the job queue.
- Push tasks using `this.execute(data)`.
- Return `false` to stop, `true` to continue.

### `onExecute(task, options)`

- Called for each individual task.
- Optional `options` include:

| Option       | Type     | Description                                  |
| ------------ | -------- | -------------------------------------------- |
| `queue`      | `string` | Optional task group ID.                      |
| `dedupeKey`  | `string` | Prevent duplicate task.                      |
| `jobId`      | `string` | Custom job ID, overrides auto-generated one. |
| `dedupeSpan` | `number` | Wait before pushing duplicate if set.        |

### `onAggregate(tasks, options)`

- Called when task aggregation is enabled.
- Gets list of tasks collected for aggregation.
- Ideal for summary processing or batched output.

---

## 📦 Execution Strategies

Choose how tasks are processed:

| Strategy     | Description                                                               |
| ------------ | ------------------------------------------------------------------------- |
| `CONCURRENT` | Default. Tasks run in parallel, no guarantees on order.                   |
| `SEQUENTIAL` | Tasks run in order. Useful when order matters (e.g., one user at a time). use `dedupeKey` to avoid duplicates in queue |
| `MUTEX`      | One task at a time per debounce key (like a lock).                        |

Usage:

```ts
executionStrategy: Job.EXECUTION_STRATEGY.MUTEX;
```

---

## ✅ Real-World Use Cases

### 1. **Campaign Message Dispatcher**

Distribute and send millions of messages in batches. Job breaks the full campaign into smaller tasks and sends them concurrently.

- Use `onRun` to generate message batches.
- Use `onExecute` to send individual messages.
- Use `onAggregate` to create a summary report of messages sent.

### 2. **Excel File Processor**

Import large spreadsheets row by row and process each record independently.

- Use `onRun` to read and queue each row.
- Use `onExecute` to process the row (e.g., validate, save to DB).
- Use `onAggregate` to compile a report of success/failure counts.

### 3. **Inbound User Message Processor**

Queue messages per user and process them one by one using `SEQUENTIAL` strategy.

- Ensures message handling order per user.
- Prevents race conditions or double responses.

### 4. **ETL (Extract-Transform-Load) Pipeline**

Break large data ingestion jobs into stages:

- `onRun`: Fetch and chunk data.
- `onExecute`: Process and transform each item.
- `onAggregate`: Load result or send output summary.

### 5. **Webhook Dispatcher**

Queue and retry webhook deliveries per receiver.

- Use `MUTEX` to avoid flooding the same webhook URL.

---

## 🧠 Advanced Tips

- `this.execute(data)` handles queueing.
- Use `dedupeKey` with `SEQUENTIAL` to skip duplicate tasks.
- Use `MUTEX` to ensure single execution per queue.
- Return `false` from `onRun` to gracefully stop the job.
- Use `onAggregate` to clean up, report, or batch result.

---

This documentation helps developers decide if the framework fits their use case by showcasing powerful features and usage clarity. More examples or advanced integrations (like Redis priority queues or dependency chaining) can be added as needed.
