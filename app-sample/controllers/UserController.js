import { Controller, RequestMapping, ResponseBody, ResponseView } from "@bootloader/core/decorators";
import mongon from "@bootloader/mongon";
const log4js = require("@bootloader/log4js");
import { ensure } from "@bootloader/utils";

import crypto from "crypto";
import UserService from "../services/UserService";

const console = log4js.getLogger("UserController");

@Controller("/user")
export default class UserController {
  constructor() {
    console.info("===UserController instantsiated:", this.constructor);
  }

  @ResponseView
  @RequestMapping({ path: "/list", method: "get", query: {} })
  async homePage() {
    return UserService.getUsersAll();
  }

  @RequestMapping({ path: "/create", method: "post", form: { name: "NAME", email: "name@name.com", code: "COD" } })
  @ResponseBody
  async postMessage({
    request: {
      body: { name, email, code },
      cookies,
    },
    response,
  }) {
    ensure.params({ name, email, code }).required();
    console.log("createUsers", { name, email, code });
    return UserService.createUsers({ name, email, code });
  }

  @ResponseView
  @RequestMapping({ path: "/*", method: "get" })
  async defaultPage() {
    return "home";
  }
}
