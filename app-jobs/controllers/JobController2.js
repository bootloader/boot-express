import { decorate, Controller, RequestMapping, ResponseBody } from "@bootloader/core/decorators";

import SendCampaignJob from "../workers/SendCampaignJob";
import SendMessageJob from "../workers/sendMessageJob";

let count = 0;

class JobController2 {
  constructor() {
    console.log("===JobController2 instantiated:", this.constructor);
  }

  async pushJob({
    request: {
      query: { jobId },
    },
  }) {
    let data = { id: ++count, name: "John Doe", time: Date.now() };
    SendCampaignJob.run(data, { jobId });
    return [data];
  }

  async execute_task() {
    let data = { id: 1, name: "John Doe", time: Date.now() };
    SendCampaignJob.execute(data, {
      queue: "queue_task",
      debounceKey: "queue_task",
    });
    return [data];
  }
}

decorate(Controller("/v2"))
  .to(JobController2)
  .method(
    ResponseBody(),
    RequestMapping({ path: "/add_job", method: "get", query: { jobId: "xyz123" } }),
    JobController2.prototype.pushJob
  )
  .method(
    ResponseBody(),
    RequestMapping({ path: "/execute_task", method: "post", form: { queue: 1, name: "John Doe", time: Date.now() } }),
    JobController2.prototype.execute_task
  );

export default JobController2;
