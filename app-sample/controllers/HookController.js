import { Controller, RequestMapping, ResponseBody, ResponseView } from "@bootloader/core/decorators";
const log4js = require("@bootloader/log4js");

const logger = log4js.getLogger("HookController");

@Controller("/webhook")
export default class HookController {
  constructor() {
    logger.info("===HookController instantsiated:", this.constructor);
  }

  @RequestMapping({ path: "/print", method: "get", form: { name: "NAME", email: "name@name.com", code: "COD" } })
  @ResponseBody
  async printBodyGet({ request: { query  }, response }) {
    logger.info(`------------------------------------`);
    let chlg = query['hub.challenge'].replace(/[\"\']/g, "")-0
    console.log(chlg);
    return chlg;
  }

  @RequestMapping({ path: "/print", method: "post", form: { name: "NAME", email: "name@name.com", code: "COD" } })
  @ResponseBody
  async printBody({ request: { body }, response }) {
    logger.info(`------------------------------------`);
    console.log(JSON.stringify(body));
    return body;
  }
}
