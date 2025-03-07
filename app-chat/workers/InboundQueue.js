import { Job } from "@bootloader/core/decorators";
import { ScriptBox, Snippets } from "./../../@core/scriptus";

ScriptBox.load({
  dir: "../scripts/",
});

Snippets.load({
  dir: "../snippets/",
});

@Job({ name: "inboundQueue", workers: 4 })
export default class InboundQueue {
  async read({ job }) {
    console.log(`reading`, job);
  }

  async execute({ task, queue }) {
    const contact_id = queue;
    const tnt = "demo";
    const app_id = "xx_chat_xx";

    const sb = new ScriptBox({
      name: "my_bot",
    });

    //Create Snippets Context
    const $ = new Snippets().context({
      contact_id,
      inbound: task,
      has: sb.has,
      hasFunction: sb.hasFunction,
      setting: sb.setting,
    });

    //Create ScriptBox Context and Run it
    sb.context({
      $: $,
      setTimeout: setTimeout,
      console: console,
    }).run({
      contextName: `${tnt} ${app_id}`,
      timeout: 10000,
    });

    //Execute Function
    var returnValue = null;
    try {
      if (sb.has("onMessageReceive")) returnValue = await sb.execute("onMessageReceive");
    } catch (e) {
      console.error("onMessageReceiveException", e);
    }
    //console.log(`executing:`, task);
  }
}
