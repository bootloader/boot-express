import { Controller, RequestMapping, ResponseBody, ResponseView } from "@bootloader/core/decorators";
import ajax from "../../@core/ajax";

@Controller("/test")
export default class TestController {
  constructor() {
    console.log("===TestController instantsiated:", this.constructor);
  }

  @ResponseView
  @RequestMapping({ path: "/home", method: "get" })
  async homePage() {
    return "home";
  }

  @ResponseBody
  @RequestMapping({ path: "/api/messages", method: "get" })
  async getMessage({ headers }) {
    let resp = await ajax("https://app.truelinq.com/pub/amx/device");
    console.log("resp:", resp);
    return [{ id: 1, name: "John Doe" }];
  }

  @RequestMapping({ path: "/api/messages", method: "post" })
  @ResponseBody
  async postMessage() {
    return [{ id: 1, name: "John Doe" }];
  }

  @ResponseView
  @RequestMapping({ path: "/*", method: "get" })
  async defaultPage() {
    return "home";
  }
}
