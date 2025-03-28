import { Controller, RequestMapping, ResponseBody, ResponseView } from "@bootloader/core/decorators";
import mongon from "@bootloader/mongon";
const log4js = require("@bootloader/log4js");
import { context } from "@bootloader/utils";

import crypto from "crypto";
import UserService from "../services/UserService";

const console = log4js.getLogger("ChatController");

@Controller("/user")
export default class UserController {
  constructor() {
    console.info("===UserController instantsiated:", this.constructor);
  }

  @ResponseView
  @RequestMapping({ path: "/list", method: "get" })
  async homePage() {
    return UserService.getUsersAll();
  }

  @RequestMapping({ path: "/create", method: "post" })
  @ResponseBody
  async postMessage({
    request: {
      body: { name, email, code },
      cookies,
    },
    response,
  }) {
    return UserService.createUsers({ name, email, code });
  }

  @ResponseView
  @RequestMapping({ path: "/*", method: "get" })
  async defaultPage() {
    return "home";
  }
}
