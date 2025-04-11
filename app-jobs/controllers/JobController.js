import { Controller, RequestMapping, ResponseBody, ResponseView, AuthRequired } from "@bootloader/core/decorators";

import SendCampaignJob from "../workers/SendCampaignJob";
import SendMessageJob from "../workers/sendMessageJob";

const console = require("@bootloader/log4js").getLogger("ChatController");

let jobCounter = 0;
let taskCounter = 0;

@Controller({ path: "/" })
export default class JobController {
  constructor() {
    console.log("===JobController instantiated:", this.constructor);
  }

  @ResponseBody
  @RequestMapping({ path: "/add_job", method: "get", query: { jobId: "xyz123" } })
  async pushJob({
    request: {
      query: { jobId },
    },
  }) {
    let data = { id: ++jobCounter, name: "John Doe", time: Date.now() };
    SendCampaignJob.run(data, { jobId });
    return [data];
  }

  @ResponseBody
  @RequestMapping({ path: "/execute_task", method: "post", form: { queue: 1, name: "John Doe", time: Date.now() } })
  async execute_task() {
    console.log("===execute_task");
    let data = { id: ++taskCounter, name: "John Doe", time: Date.now() };
    SendCampaignJob.execute(data, {
      queue: "my_unique_queue",
    });
    return [data];
  }

  @ResponseBody
  @RequestMapping({ path: "/send_message", method: "get", query: { channelId: "" } })
  async triggerSendMessage({ request: { query } }) {
    const { channelId } = query;

    if (!channelId) {
      return { status: "error", message: "channelId is required" };
    }

    const jobData = {
      channelId,
      timestamp: Date.now(),
    };

    SendMessageJob.execute(jobData, { debounceKey: channelId });

    return {
      status: "queued",
      message: `Message job queued for channelId ${channelId}`,
      jobData,
    };
  }
}
