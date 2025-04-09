import { Job } from "@bootloader/core/decorators";

@Job({
  name: "sendMessage",
  workers: 4,
})
export default class SendMessageJob {
  async onRun(data) {
    console.log("Running job to create message tasks:", data);
    this.execute(messages);
    return false;
  }
  sleep(ms) {
    console.log("slept")
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async onExecute(data, taskOptions) {
    console.log(taskOptions);
    console.log("Executing sendMessage with data:", data);
    try {
      const messages = [
        `Message 1-${data.channelId}`,
        `Message 2-${data.channelId}`,
        `Message 3-${data.channelId}`,
        `Message 4-${data.channelId}`,
        `Message 5-${data.channelId}`,
      ];
      for (const message of messages) {
        console.log("Message sent successfully", message);
        await this.sleep(3000)
      }
    } catch (err) {
      console.error("Message sending failed", err);
    }
  }
}
