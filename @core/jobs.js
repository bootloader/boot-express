import express from "express";
import { readdirSync } from "fs";
import { join } from "path";
import { decorators } from "@bootloader/core";
import { redison, waitForReady } from "@bootloader/redison";
import { Queue, Worker } from "bullmq";

const BATCH_SIZE = 10;
const MAX_WORKERS = 5;
const RETRY_DELAY = 5000;

async function addJob(name, data) {
  const jobQueueName = `jobs-${name}`;
  const jobQueue = new Queue(jobQueueName, { connection: client });
  await jobQueue.add("read", data);
}

async function initJobs({ name }) {
  const router = express.Router();

  // Load controllers from the "controllers" directory
  const controllersPath = join(process.cwd(), `${name}/jobs`);
  const controllerFiles = readdirSync(controllersPath).filter((file) => file.endsWith(".js"));

  let client = await waitForReady();

  for (const file of controllerFiles) {
    const { default: JobClass } = require(join(controllersPath, file));

    if (!JobClass) continue;

    // Get the last registered controller from the decorators system
    let job = decorators.mappings.jobs[decorators.mappings.jobs.length - 1];

    const jobQueueName = `jobs-${job.name}`;
    const taskQueueName = `jobs-${job.name}-tasks`;
    const jobQueue = new Queue(jobQueueName, { connection: client });
    const taskQueue = new Queue(taskQueueName, { connection: client });

    console.log("initJobs", `${name}/jobs`, file, job._routed);

    if (!job._routed) {
      //job._routed = true;
      let jobInstance = new JobClass();

      //console.log("jobjobjobjobv", job, JobClass);
      JobClass.addJob = async function (data) {
        await jobQueue.add("read", data);
      };
      let workers = job.workers || MAX_WORKERS;
      let delay = job.delay || RETRY_DELAY;

      // Setup Worker to Fetch Tasks
      new Worker(
        jobQueueName,
        async (job) => {
          try {
            const pendingTaskCount = await taskQueue.count();
            if (pendingTaskCount < workers * 2) {
              let pushedTask = [];
              let retTasks = await jobInstance.read({
                job: job.data,
                push(...tasks) {
                  pushedTask = [...pushedTask, ...tasks];
                },
              });

              if (Array.isArray(retTasks)) {
                pushedTask = [...pushedTask, ...retTasks].filter(function (task) {
                  return !!task;
                });
              }
              if (pushedTask && pushedTask.length) {
                console.log("Total Tasks", pushedTask.length);
                for (let task of pushedTask) {
                  if (task) await taskQueue.add("execute", { task });
                }
                await jobQueue.add("read", job.data, { delay: 1000 });
              } else {
                console.log(`No Task!! Job Finished.!!`);
              }
            } else {
              console.log(`Queue full, delaying ${job.data.jobId}`);
              await jobQueue.add("read", job.data, { delay: delay });
            }
          } catch (e) {
            console.error(e);
          }
        },
        { connection: client }
      );

      // Setup Worker to Execute Tasks
      new Worker(
        taskQueueName,
        async (task) => {
          try {
            await jobInstance.execute(task.data);
          } catch (e) {
            console.error(e);
          }
        },
        { concurrency: workers, connection: client }
      );

      async function recoverJobs() {
        console.log("Recovering delayed jobs...");
        const delayedJobs = await jobQueue.getDelayed();
        for (const job of delayedJobs) {
          console.log(`Re-adding job ${job.id} (was delayed)`);
          await jobQueue.add("read", job.data); // Re-add immediately
        }
      }

      recoverJobs();
    }
  }
}

export { initJobs, addJob };
