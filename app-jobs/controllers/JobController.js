import { Controller, RequestMapping, ResponseBody, ResponseView, AuthRequired } from "@bootloader/core/decorators";

import SendCampaignJob from "../workers/SendCampaignJob";

@Controller({ path: "/" })
export default class JobController {
  constructor() {
    console.log("===JobController instantiated:", this.constructor);
  }

  @ResponseBody
  @RequestMapping({ path: "/add_job", method: "get" })
  async pushJob() {
    let data = { id: 1, name: "John Doe", time: Date.now() };
    SendCampaignJob.run(data);
    return [data];
  }

  @ResponseBody
  @RequestMapping({ path: "/queue_task", method: "get" })
  async queueJob() {
    let data = { id: 1, name: "John Doe", time: Date.now() };
    SendCampaignJob.execute(data);
    return [data];
  }
}
