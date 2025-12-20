import { Controller, OpenAPI, RequestMapping, ResponseBody, ResponseView } from "@bootloader/core/decorators";
import mongon from "@bootloader/mongon";
const log4js = require("@bootloader/log4js");
import { ensure } from "@bootloader/utils";

import crypto from "crypto";
import UserService from "../services/UserService";
import DBLiteStore from "../../@core/scriptus/store/DBLiteStore";

const console = log4js.getLogger("DBLiteController");

@Controller("/dblite")
export default class DBLiteController {
  constructor() {
    console.info("===DBLiteController instantsiated:", this.constructor);
  }

  @OpenAPI({query: { namespace:"<namespace>",bucket:"<bucket>"}})
  @RequestMapping({ path: "/list", method: "get" })
  @ResponseBody
  async homePage({request: { query: {namespace,bucket} }}) {
    return new DBLiteStore().list({namespace,bucket});
  }

  @OpenAPI({json: { namespace:"<namespace>", bucket:"<bucket>", code : "<code>", record : {}}})
  @RequestMapping({ path: "/create", method: "post" })
  @ResponseBody
  async postMessage({
    request: {
      body: { namespace, bucket, code, record },
      cookies,
    },
    response,
  }) {
    ensure.params({ namespace, code, record }).required();
    return new DBLiteStore().put({namespace,bucket,code,record});
  }

  @ResponseView
  @RequestMapping({ path: "/*", method: "get" })
  async defaultPage() {
    return "home";
  }
}
