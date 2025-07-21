import { readdirSync, existsSync } from "fs";
import { join } from "path";
import utils from "@bootloader/utils";
import { decorators } from "@bootloader/core";
import { redis, waitForReady } from "@bootloader/redison";
import SafeQueue from "./lib/SafeQueue";
import { Queue, Worker } from "bullmq";
import crypto from "crypto";
const coreutils = require("./utils/coreutils");

const console = require("@bootloader/log4js").getLogger("jobs");

const BATCH_SIZE = 10;
const MAX_WORKERS = 5;
const RETRY_DELAY = 5000;
const jobHolders = {};

async function initJobs({ name, path }) {
  coreutils.log(`initJobs`);

  // Load controllers from the "controllers" directory
  const jobsPathRel = `${path}/workers`;
  const jobsPath = join(process.cwd(), jobsPathRel);
  let controllerFiles = [];
  if (existsSync(jobsPath)) {
    controllerFiles = readdirSync(jobsPath).filter((file) => file.endsWith(".js"));
  }
  let client = await waitForReady();
  if (!client) {
    console.log("Redis Client", client || "NONE");
    return false;
  }

  for (const file of controllerFiles) {
    const { default: JobClass } = require(join(jobsPath, file));

    if (!JobClass) {
      coreutils.log("@Job NOT A JOB", jobsPathRel, file);
      continue;
    }

    // Get the last registered controller from the decorators system
    let job = decorators.mappings.jobs.find(JobClass);
    if (!job) continue;

    const jobName = job.meta.name;
    const jobQueueName = `jobs-${jobName}`;
    const taskQueueName = `jobs-${jobName}-tasks`;
    const taskQueuePiplineName = `jobs-${jobName}-tasks-pipeline`;
    const aggrQueueName = `jobs-${jobName}-aggr`;
    const aggrQueuePiplineName = `jobs-${jobName}-aggr-pipeline`;
    const jobQueue = new Queue(jobQueueName, { connection: client, limiter: job.meta.limiter });
    const taskQueue = new Queue(taskQueueName, { connection: client, limiter: job.meta.limiter });
    const aggrQueue = new Queue(aggrQueueName, { connection: client, limiter: job.meta.limiter });

    const executionStrategy = job.meta.executionStrategy || job.meta.execution_strategy || "concurrent";
    const aggregationStrategy = job.meta.aggregationStrategy || job.meta.aggregation_strategy || "sequential"; // POSSIBLE VALUE : concurrent, sequential, mutex;

    // POSSIBLE VALUE : concurrent, sequential, mutex;

    coreutils.log("@Job", jobsPathRel, file);

    if (!job._routed) {
      //job._routed = true;
      let jobInstance = new JobClass();

      jobHolders[jobName] = {
        name: jobName,
        job: jobInstance,
      };
      //console.log("jobjobjobjobv", job, JobClass);
      JobClass.run = async function (data, options = {}) {
        let jobId = options.jobId || crypto.randomUUID();
        //console.log(`addJob(jobId:${jobId})`)
        await jobQueue.add(
          "read",
          { data, context: utils.context.toMap() },
          {
            jobId: jobId,
            removeOnComplete: true,
            removeOnFail: {
              age: 24 * 3600, // keep up to 1 hour
              count: 500, // keep up to 1000 jobs
            },
            ...options,
          }
        );
      };

      JobClass.execute = async function (data, taskOptions = {}, options = {}) {
        if (executionStrategy == "sequential") {
          taskOptions.jobId = taskOptions.jobId || `queue-${taskOptions.queue}`;
          //console.log(`execute(jobId:${taskOptions.jobId})`);
          if (data) {
            const taskQueuePipelineId = `${taskQueuePiplineName}${taskOptions.jobId}`;
            let wasAdded = true;
            if (taskOptions.dedupeKey) {
              wasAdded = await redis.sadd(`${taskQueuePipelineId}-set`, taskOptions.dedupeKey);
              redis.expire(taskQueuePipelineId, 60 * 60); // expire after 1 hour
              if (wasAdded && taskOptions.dedupeSpan) {
                await utils.timely.wait(taskOptions.dedupeSpan);
              }
              //await redis.srem(this.setKey, item.uniqueKey);
            }
            if (wasAdded) {
              await redis.rpush(
                taskQueuePipelineId,
                JSON.stringify({ data, context: utils.context.toMap(), dedupeKey: taskOptions.dedupeKey })
              );
            } else {
              // console.log(
              //   `❌ Task with dedupeKey ${taskOptions.dedupeKey} already exists in queue(${taskOptions.queue})`
              // );
              return;
            }
          } else {
            //console.log(`No data to queue(${taskOptions.queue}) !!`);
          }
          let task = await taskQueue.add("sequential", taskOptions, {
            jobId: taskOptions.jobId, //use queue as id to create uniquness
            removeOnComplete: true,
            removeOnFail: true,
            ...options,
          });
          if (task) {
            //console.log(`✅ Task added successfully: Id:${task.id}`);
          } else {
            //console.log("❌ Failed to add task");
          }
        } else {
          if (executionStrategy == "mutex") {
            /// IT IS DEBOUNCED
            taskOptions.jobId = taskOptions.jobId || `mutex-${taskOptions.queue}`;
          } else {
            taskOptions.jobId = taskOptions.debounceKey || crypto.randomUUID();
          }
          await taskQueue.add(
            executionStrategy,
            { data, context: utils.context.toMap() },
            {
              ...taskOptions,
              jobId: taskOptions.jobId,
              removeOnComplete: true,
              removeOnFail: {
                age: 3600, // keep up to 1 hour
                count: 1000, // keep up to 1000 jobs
              },
              ...options,
            }
          );
        }
      };

      JobClass.aggregate = async function (data, taskOptions = {}, options = {}) {
        taskOptions.jobId = taskOptions.jobId || `aggr-${taskOptions.queue}`;
        //console.log(`execute(jobId:${taskOptions.jobId})`);
        if (data) {
          const aggrQueuePipelineId = `${aggrQueuePiplineName}${taskOptions.jobId}`;
          const aggrQueuePipeline = new SafeQueue(aggrQueuePipelineId);
          await aggrQueuePipeline.push(
            JSON.stringify({ data, context: utils.context.toMap(), dedupeKey: taskOptions.dedupeKey })
          );
        } else {
          //console.log(`No data to queue(${taskOptions.queue}) !!`);
        }
        let task = await aggrQueue.add("sequential", taskOptions, {
          jobId: taskOptions.jobId, //use queue as id to create uniquness
          removeOnComplete: true,
          removeOnFail: true,
          ...options,
        });
      };

      let workers = job.workers || MAX_WORKERS;
      let delay = job.delay || RETRY_DELAY;

      // Setup Worker to Fetch Tasks

      jobInstance.onRun = jobInstance.onRun || jobInstance.run;
      if (typeof jobInstance.onRun == "function") {
        new Worker(
          jobQueueName,
          async (job) => {
            try {
              const pendingTaskCount = await taskQueue.count();
              if (pendingTaskCount < workers * 2) {
                let pushedTask = [];
                let { data, context } = job.data;
                utils.context.fromMap(context);
                let retTasks = await jobInstance.onRun(data, {
                  context,
                  execute(...tasks) {
                    pushedTask = [...pushedTask, ...tasks];
                  },
                });

                let pendingTasksCount = 0;
                if (Array.isArray(retTasks)) {
                  pushedTask = [...pushedTask, ...retTasks].filter(function (task) {
                    return !!task;
                  });
                  pendingTasksCount = pushedTask.length;
                }
                if (pendingTasksCount) {
                  console.log("Total Tasks", pushedTask.length);
                  for (let task of pushedTask) {
                    if (task) await JobClass.execute(task);
                  }
                }

                if (pendingTasksCount || retTasks === true) {
                  removeJob(job, async () => {
                    await JobClass.run(job.data.data, { delay: 1000, jobId: job.id });
                  });
                } else {
                  console.log(`No Task!! Job Finished.!!`);
                  removeJob(job, async () => {
                    console.log(`Job Finished.!!`);
                  });
                }
              } else {
                removeJob(job, async () => {
                  console.log(`Queue full, delaying ${job.id}`);
                  await JobClass.run(job.data.data, { delay: delay, jobId: job.id });
                });
              }
            } catch (e) {
              console.error(e);
            }
          },
          { concurrency: workers, connection: client, removeOnComplete: true, removeOnFail: true }
        );
      }

      jobInstance.onExecute = jobInstance.onExecute || jobInstance.execute;
      if (typeof jobInstance.onExecute == "function") {
        // Setup Worker to Execute Tasks
        new Worker(
          taskQueueName,
          async (task) => {
            try {
              let taskOptions = { jobId: task.id };
              if (executionStrategy == "sequential") {
                //console.log(`Polling from :${task.id}`);
                const taskQueuePipelineId = `${taskQueuePiplineName}${task.id}`;
                const message = await redis.lpop(taskQueuePipelineId);
                if (message) {
                  let { data, context, dedupeKey } = JSON.parse(message);
                  utils.context.fromMap(context);
                  await jobInstance.onExecute(data, task.data);
                  if (dedupeKey) {
                    await redis.srem(`${taskQueuePipelineId}-set`, dedupeKey);
                  }
                  removeJob(task, async () => {
                    await JobClass.execute(null, task.data);
                  });
                } else {
                  //console.log(`No Task in queue(${task.data.queue}) !!`);
                }
              } else {
                let { data, context } = task.data;
                await utils.context.init(() => {});
                utils.context.fromMap(context);
                await jobInstance.onExecute(data, taskOptions);
              }
              //await task.moveToCompleted(); //
              //await task.remove(); // Now safe to remove
            } catch (e) {
              console.error(e);
            }
          },
          { concurrency: workers, connection: client, removeOnComplete: true, removeOnFail: true }
        );
      }

      jobInstance.onAggregate = jobInstance.onAggregate || jobInstance.aggregate;
      if (typeof jobInstance.onAggregate == "function") {
        // Setup Worker to Execute Tasks
        new Worker(
          aggrQueueName,
          async (task) => {
            try {
              let taskOptions = { jobId: task.id };
              //console.log(`Polling from :${task.id}`);
              const aggrQueuePipelineId = `${aggrQueuePiplineName}${task.id}`;
              const aggrQueuePipeline = new SafeQueue(aggrQueuePipelineId);
              const messages = await aggrQueuePipeline.poll(10);

              if (messages && messages.length) {
                let _context = null;
                let _messages = [];
                for (const message of messages) {
                  if (message.raw) {
                    let { data, context, dedupeKey } = message.data;
                    _context = context;
                    _messages.push(data);
                  }
                }

                if (_context) {
                  try {
                    utils.context.fromMap(_context);
                    await jobInstance.onAggregate(_messages, task.data);
                    await aggrQueuePipeline.ack(messages);
                  } catch (e) {
                    console.error("Error in onAggregate:", e);
                    await aggrQueuePipeline.nack(messages);
                  }
                  removeJob(task, async () => {
                    await JobClass.aggregate(null, task.data);
                  });
                }
              }
              //await task.moveToCompleted(); //
              //await task.remove(); // Now safe to remove
            } catch (e) {
              console.error(e);
            }
          },
          { concurrency: workers, connection: client, removeOnComplete: true, removeOnFail: true }
        );
      }

      async function recoverJobs() {
        coreutils.log("Recovering delayed jobs...");
        const delayedJobs = await jobQueue.getDelayed();
        for (const job of delayedJobs) {
          let delayLeft = 0;
          if (job.timestamp && job?.opts?.delay) {
            const now = Date.now();
            delayLeft = Math.max(delayLeft, job.timestamp + job.opts.delay - now);
          }
          coreutils.log(`Re-adding job ${job.id} (was delayed :${delayLeft})`);
          await jobQueue.add("read", job.data, { delay: delayLeft }); // Re-add immediately
        }
        // Recovering delayed tasks
        coreutils.log("Recovering delayed tasks...");
        const delayedTasks = await taskQueue.getDelayed();
        for (const task of delayedTasks) {
          let delayLeft = 0;
          if (task.timestamp && task?.opts?.delay) {
            const now = Date.now();
            delayLeft = Math.max(delayLeft, task.timestamp + task.opts.delay - now);
          }
          coreutils.log(`Re-adding task ${task.id} (was delayed :${delayLeft} )`);
          await taskQueue.add("execute", task.data, { delay: delayLeft }); // Re-add immediately
        }
      }

      jobInstance.execute = async function (data, options = {}) {
        await JobClass.execute(data, options);
      };

      jobInstance.run = async function (data, options = {}) {
        await JobClass.run(data, options);
      };

      jobInstance.send = async function (data, options = {}) {
        let queueName = `eq:app:*:topic:${job.meta.name}`;
        await redis.lpush(queueName, JSON.stringify({ data, context: utils.context.toMap() })); // Non-Blocking call
      };

      recoverJobs();
    }
  }
  initQueues(name);
  return true;
}

async function initQueues(app) {
  await waitForReady();
  for (const { name, job } of Object.values(jobHolders)) {
    try {
      job.onSend = job.onPush || job.poll || job.push || job.onSend || job.send || job.onReceive || job.receive;
      if (typeof job.onSend == "function") {
        await executeOnSend(app, name, job);
        await executeOnSend("*", name, job);
      }
    } catch (error) {
      coreutils.error("Queue processing error:", error);
    }
  }
  setTimeout(() => initQueues(app), 1000);
}

async function executeOnSend(app, topic, job) {
  let queueName = `eq:app:${app}:topic:${topic}`;
  const message = await redis.rpop(queueName); // Non-Blocking call
  if (message) {
    let event = JSON.parse(message);
    coreutils.log(`Processed in Node.js ${queueName}: (${event})`);
    job.onSend(event.data, {});
  }
}

function removeJob(task, callback) {
  setTimeout(async () => {
    const state = await task.getState();
    if (state === "completed" || state === "failed" || state === "delayed") {
      // If the job is not locked, safely remove it
      await task.remove();
      //console.log(`✅ Task ${task.id} removed successfully`);
    } else {
      //console.log(`❌ Task ${task.id} is in progress, cannot remove while locked`);
    }
    await callback();
  }, 500);
}

export { initJobs };
