const console = require("@bootloader/log4js").getLogger("DemoService");

export default {
  async testFunction() {
    console.log("Hello : testFunction");
  },
};
