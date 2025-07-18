import { Controller, OpenAPI, RequestMapping, ResponseBody, ResponseView } from "@bootloader/core/decorators";
import mongon from "@bootloader/mongon";
const log4js = require("@bootloader/log4js");
import { ensure } from "@bootloader/utils";

import XQueue from "../../@core/lib/XQueue";

const console = log4js.getLogger("RedisonController");

@Controller("/redison")
export default class RedisonController {
  constructor() {
    console.info("===RedisonController instantsiated:", this.constructor);
    this.xqueue = new XQueue("test-queue", {
      lockTTL: 10000, // 10 seconds
      heartbeatInterval: 5000, // 5 seconds
    });
  }

  @RequestMapping({ path: "/test/xqueue", method: "get", query: {} })
  async proecessMessage() {
    let msgs = await this.xqueue.poll(5);
    try {
      for (const msg of msgs) {
        console.log("Processing message:", msg);
        // Simulate processing
        await new Promise((resolve) => setTimeout(resolve, 1000));
        console.log("Acknowledged message:", msg);
      }
      // If success
      await this.xqueue.ack(msgs);
    } catch (err) {
      console.error("Processing failed, re-queuing...");
      await this.xqueue.nack(msgs);
    } finally {
      await this.xqueue.release();
    }

    return {};
  }

  @OpenAPI({ json: { name: "ds" } })
  @RequestMapping({ path: "/test/xqueue", method: "post" })
  @ResponseBody
  async pushMessage({
    request: {
      body: { name },
      cookies,
    },
    response,
  }) {
    this.xqueue.push({ name, time : new Date().getTime() });
    return {};
  }
}
