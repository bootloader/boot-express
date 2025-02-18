import express from "express";
import { readdirSync } from "fs";
import { join } from "path";
import { decorators } from "@bootloader/core";

function normalizePath(path) {
  return path.replace(/\/+/g, "/").replace(/\/$/, "") || "/";
}

export function loadApp({ name = "app", context = "", app, prefix = "" }) {
  const router = express.Router();
  const controllersPath = join(process.cwd(), `${name}/controllers`);
  const controllerFiles = readdirSync(controllersPath).filter((file) => file.endsWith(".js"));

  for (const file of controllerFiles) {
    const { default: ControllerClass } = require(join(controllersPath, file));

    if (!ControllerClass) continue;

    let controller = decorators.mappings.controller[decorators.mappings.controller.length - 1];
    if (!controller._routed) {
      controller._routed = true;
      let cTarget = new ControllerClass();
      for (const { path, method, handler, responseType, name } of controller.maps) {
        let full_path = normalizePath(`/${prefix}/${controller.basePath}/${path}`);
        console.log(`@RequestMappings:${method}:/${full_path} -> ${name}`);
        router[method](`${full_path}`, async (req, res) => {
          try {
            const CONST = {
              CDN_URL: "https://deployed.boot-web.pages.dev",
              CDN_DEBUG: false,
              APP_TITLE: "Test",
              APP: "wwww",
              APP: "www",
              APP_SITE: undefined,
              APP_CONTEXT: "/www",
              CDN_VERSION: "5",
              SESS: "req.session.user",
            };
            const model = {};
            const result = await handler.call(cTarget, {
              request: req,
              response: res,
              model,
              CONST,
            });
            if (responseType == "view" || (!responseType && typeof result === "string")) {
              res.render(result, {
                model,
                CONST,
                CONST_SCRIPT: "window.CONST=" + JSON.stringify(CONST),
              });
            } else if (responseType == "json" || !responseType) {
              res.json(result);
            }
          } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Internal Server Error" });
          }
        });
      }
    }
  }
  router.use((req, res, next) => {
    res.app.set("views", join(process.cwd(), `${name}/views`));
    next();
  });
  app.use(context, router);
}
