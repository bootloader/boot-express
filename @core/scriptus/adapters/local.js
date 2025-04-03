const config = require("@bootloader/config");
import { redis, RQueue, waitForReady } from "@bootloader/redison";

var scriptusDomain = config.getIfPresent("mry.scriptus.domain");
var scriptusQueue = config.getIfPresent("mry.scriptus.queue") || "my_bot";
const SESSIONS = {};

function LocalAdapter({ message, contact_id, sessionId, appCode = scriptusQueue, domain = scriptusDomain }) {
  //{ author: "Bot", type: "text", data: { text: `Response(${$.inbound.data.text})` }

  appCode = SESSIONS[sessionId] || appCode;

  this.toContext = function () {
    var context = {
      meta: {},
      //Meta
      isDebug: true,
      server: null,
      tnt: domain,
      domain: domain,
      app_id: appCode,
      appCode: appCode,
      appType: "bot",
      //Contact
      contact_id: contact_id,
      channel_id: "demo_web_chat",

      //Ibound
      inbound: {
        //Original
        contact: { id: contact_id },
        //Derived
        getText() {
          return message?.data?.text;
        },
        getCode() {
          return message?.data?.text;
        },
      },
    };

    if (message?.data?.text) {
      context = {
        ...context,
        text: message?.data?.text,
        inputCode: message?.data?.text,
        session_id: sessionId || "SESSIONID",
        routing_id: sessionId || "SESSIONID",
        inbound: {
          ...context.inbound,
          //Original
          message: message,
        },
      };
    } else if (message?.event?.text) {
      var event = message.event;
      var eventCode = event.eventCode;
      if (eventCode == "SESSION_ROUTED") {
        let params = event.sessionRouted?.params || {};
        context = {
          ...context,
          session_id: event.sessionId,
          routing_id: event.session.routingId,
          text: "",
          inputCode: "",
          params: params,
          inbound: {
            ...context.inbound,
            //Original
            event: event,
            //Derived
            getEvent() {
              return event.type || eventCode;
            },
            params: JSON.parse(JSON.stringify(params)),
          },
        };
      }
    }
    return context;
  };

  this.sendMessage = function (options) {
    RQueue({ key: contact_id }).push({ author: "Bot", type: "text", data: { text: options?.text?.body } });
  };

  this.routeSession = function (options) {
    //scriptusQueue = options.queue;
    SESSIONS[sessionId] = options.queue;
    return {};
  };
}

LocalAdapter.config = {
  domain: scriptusDomain,
  queue: scriptusQueue,
  appId: scriptusQueue,
  appCode: scriptusQueue,
};
module.exports = LocalAdapter;
