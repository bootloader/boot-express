require("./@core/babel-register"); // Ensure Babel is loaded first

const { name } = require("@bootloader/redison/info");
const { BootLoader } = require("./@core");

new BootLoader()
  .map({
    context: "/",
  })
  .map({
    name: "sample",
    context: "/",
  })
  .map({
    name: "jobs",
    context: "/jobs/",
  })
  .map({
    name: "chat",
    context: "/chat/",
  })
  .map({
    name: "tuber",
    include: ["sample"],
    context: "/tuber/",
  })
  .map({
    name: "proxy",
    //include: ["noway"],
    context: "/",
  })
  .create(function ({ name, app }) {
    console.log(`APP[${name}]: Created`);
  })
  .launch(function ({ name, server }) {
    console.log(`APP[${name}]: Launched`);
  })
  .initJobs();
