import { Controller, RequestMapping, ResponseBody, ResponseView } from "@bootloader/core/decorators";
import { redis, RQueue } from "@bootloader/redison";
import mongon from "@bootloader/mongon";
const log4js = require("@bootloader/log4js");
import { context } from "@bootloader/utils";
import BotContextSchema from "../../@core/scriptus/model/BotContextSchema";

import InboundQueue from "../workers/InboundQueue";
import crypto from "crypto";
import DemoService from "../services/DemoService";

const console = log4js.getLogger("ChatController");

@Controller("/")
export default class ChatController {
  constructor() {
    console.info("===ChatController instantsiated:", this.constructor);
  }

  @ResponseView
  @RequestMapping({ path: "/home", method: "get" })
  async homePage() {
    return "home";
  }

  @RequestMapping({ path: "/api/messages", method: "post" })
  @ResponseBody
  async postMessage({ request: { body, cookies }, response }) {
    console.info(">>>>TENANT:", context.getTenant());
    mongon.model(BotContextSchema);
    let contact_id = cookies.contact_id;
    if (!contact_id) {
      contact_id = crypto.randomUUID();
      response.cookie("contact_id", contact_id, { maxge: 900000, httpOnly: true });
    }
    DemoService.testFunction();
    InboundQueue.execute(body, {
      queue: contact_id,
      dedupeKey: "<uniqueu_message_id>",
      dedupeSpan: 1 * 1000, // 1 minute
    });
    return { results: [body] };
  }

  @ResponseView
  @RequestMapping({ path: "/*", method: "get" })
  async defaultPage() {
    return "home";
  }

  @ResponseBody
  @RequestMapping({ path: "/api/messages", method: "get" })
  async getMessage({ request: { body, cookies }, response }) {
    let contact_id = cookies.contact_id;
    if (!contact_id) {
      contact_id = crypto.randomUUID();
      response.cookie("contact_id", contact_id, { maxge: 900000, httpOnly: true });
    }
    let msg = await RQueue({ key: contact_id }).pop();
    return { results: msg ? [msg] : [] };
  }
}
