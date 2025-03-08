const AbortController = globalThis.AbortController || require("abort-controller");
const REQUEST_TIMOUT = 5000;

function createTimeout(time) {
  const controller = new AbortController();
  controller.timeout = setTimeout(() => {
    controller.abort();
  }, time || REQUEST_TIMOUT);
  return controller;
}

class RespPromise extends Promise {
  constructor(executor = (resolve) => resolve()) {
    let resolver;
    super((resolve, reject) => {
      resolver = resolve;
      executor(resolve, reject);
    });
    this.resolver = resolver;
    this.data = null;
  }

  reply(options) {
    return new RespPromise((resolve) => {
      console.log(`To(${contact_id}) Sending:`, options);
      adapter.sendMessage(options);
      resolve(options);
    });
  }

  listen(options) {
    return new RespPromise((resolve) => {
      setTimeout(() => {
        console.log("Listing Options:", options);
        resolve(options);
      }, 1000);
    });
  }
}

async function request(url, method, headers, body) {
  const timer = createTimeout();

  try {
    const response = await fetch(url, {
      method,
      mode: "cors",
      cache: "no-cache",
      credentials: "same-origin",
      headers,
      redirect: "follow",
      referrerPolicy: "no-referrer",
      body: body ? JSON.stringify(body) : undefined,
      signal: timer.signal,
    });

    clearTimeout(timer.timeout);
    return new RespPromise((resolve) => resolve(response));
  } catch (error) {
    console.error(`${method} Error:`, error);
    throw error;
  }
}

module.exports = function (options) {
  if (typeof options == "string") {
    options = { url: options };
  }
  options.headers = options.headers || {};

  return {
    async post(json) {
      return request(
        options.url,
        "POST",
        {
          "Content-Type": "application/json",
          ...options.headers,
        },
        JSON.stringify(json)
      );
    },
  };
};
