let counter = 0;

function DecoMap() {
  return {
    clazz: [],
    _clazz_: null,
    add() {
      this._clazz_ = {
        maps: [],
        meta: {},
      };
      this.clazz.push(this._clazz_);
    },
    update(handler, context, meta) {
      this._clazz_ = this.clazz[this.clazz.length - 1];
      this._clazz_ = {
        ...this._clazz_,
        meta: {
          ...(this._clazz_?.meta || {}),
          ...meta,
        },
        context,
      };
      this.clazz[this.clazz.length - 1] = this._clazz_;
    },
    find({ name }) {
      return this.clazz.find((clazz) => clazz.context.name == name);
    },
    addHandler(handler, context) {
      let map = this._clazz_.maps.find((m) => m.handler === handler);
      if (map) return map;

      if (handler.__index !== undefined) {
        return this._clazz_.maps[handler.__index];
      }

      map = this._clazz_.maps.find((m) => m.context.name === context.name);
      if (map) return map;

      handler.__index = this._clazz_.maps.length;
      context.access.__index = this._clazz_.maps.length;
      map = { context, meta: { name: context.name }, logs: [] };
      this._clazz_.maps.push(map);
      return map;
    },
    updateHandler(handler, context, meta, log) {
      let map = this.addHandler(handler, context);
      map.meta = Object.assign(map.meta, meta);
      map.logs = [...map.logs, log];
      map.meta.handler = map.meta.handler || handler;

      // if(map.meta?.name == "postMessage"){
      //   console.log("-------------------postMessage==",map.meta?.handler?.toString())
      // }
    },
  };
}

const mappings = {
  controller: new DecoMap(),
  jobs: new DecoMap(),
};

function Controller(basePathOption) {
  let meta =
    (typeof basePathOption == "string"
      ? {
          path: basePathOption,
        }
      : basePathOption) || {};
  mappings.controller.add();
  return function (handler, context) {
    //console.log(`@Controller:IN ${meta.path}`,handler, context)
    mappings.controller.update(handler, context, meta);
  };
}

function RequestMapping(requestOptions) {
  return function (handler, context) {
    //console.log(`@RequestMapping:IN ${method}:${path}`,context)
    if (context.kind !== "method" || !context.access) {
      throw new Error(`@RequestMapping can only be used on methods! found ${context.kind}`);
    }
    mappings.controller.updateHandler(
      handler,
      context,
      {
        ...requestOptions,
        name: context.name,
      },
      `RequestMapping:handler ${handler.toString()}`
    );
  };
}

function ResponseType(handler, context, meta) {
  if (typeof handler == "function" && context?.kind == "method" && context?.access) {
    mappings.controller.updateHandler(handler, context, meta, `ResponseType:handler ${handler.name}`);
  } else if (context && context.kind !== "method") {
    throw new Error("@ResponseView can only be used on methods!");
  }
}

function ResponseBody(handler, context) {
  let meta = { responseType: "json" };
  ResponseType(handler, context, meta);
  return function (handler, context) {
    ResponseType(handler, context, meta);
  };
}

function ResponseView(handler, context) {
  let meta = { responseType: "view" };
  ResponseType(handler, context, meta);
  return function (handler, context) {
    ResponseType(handler, context, meta);
  };
}

function AuthRequired(handler, context) {
  let auth = typeof handler == "function" ? {} : handler;
  let meta = { auth: auth || {} };
  ResponseType(handler, context, meta);
  return function (handler, context) {
    ResponseType(handler, context, meta);
  };
}

function Job(baseJobOptions) {
  let meta =
    (typeof baseJobOptions == "string"
      ? {
          name: baseJobOptions,
        }
      : baseJobOptions) || {};
  mappings.jobs.add();
  return function (handler, context) {
    //console.log(`@Controller:IN ${basePath}`,context)
    mappings.jobs.update(handler, context, meta);
  };
}

function decorate(...classDecorators) {
  return {
    to(targetClass) {
      // Apply class decorators
      for (const decorator of classDecorators.reverse()) {
        decorator(targetClass, {
          kind: "class",
          name: targetClass.name,
        });
      }

      const chain = {
        method(...args) {
          const methodFn = args.pop(); // last argument is the method function
          const methodName = methodFn.name;

          const context = {
            kind: "method",
            name: methodName,
            static: false,
            access: { type: "public" },
            addInitializer: () => {},
          };

          for (const decorator of args.reverse()) {
            decorator(methodFn, context);
          }

          return chain;
        },
      };

      return chain;
    },
  };
}

module.exports = {
  Controller,
  RequestMapping,
  ResponseBody,
  ResponseView,
  AuthRequired,
  Job,
  mappings,
  decorate,
};
