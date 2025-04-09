import { Controller, RequestMapping, ResponseBody, ResponseView, AuthRequired } from "@bootloader/core/decorators";

import SendCampaignJob from "../workers/SendCampaignJob";
import SendMessageJob from "../workers/sendMessageJob";

let count = 0;

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
    let data = { id: ++count, name: "John Doe", time: Date.now() };
    SendCampaignJob.run(data, { jobId });
    return [data];
  }

  @ResponseBody
  @RequestMapping({ path: "/queue_task", method: "get" })
  async queueJob() {
    let data = { id: 1, name: "John Doe", time: Date.now() };
    SendCampaignJob.execute(data);
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
