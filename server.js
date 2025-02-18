require("./@core/babel-register"); // Ensure Babel is loaded first

const { BootLoader } = require("./@core");

new BootLoader()
  .map({
    name: "app",
    context: "/",
  })
  .map({
    name: "app-test",
    context: "/test/",
  })
  .create(function ({ name, app }) {
    console.log(`APP[${name}]: Created`);
  })
  .launch(function ({ name, server }) {
    console.log(`APP[${name}]: Launched`);
  });
