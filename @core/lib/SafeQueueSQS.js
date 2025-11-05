import {
  SQSClient,
  CreateQueueCommand,
  GetQueueUrlCommand,
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
  ChangeMessageVisibilityCommand,
} from "@aws-sdk/client-sqs";

class SafeQueueSQS {
  constructor(queueName, options = {}) {
    this.queueName = queueName;
    this.options = options;
    this.sqs = options.sqs || new SQSClient({});
    this.queueUrl = null;
  }

  async init() {
    // Check if queue exists or create it
    try {
      const getQueue = await this.sqs.send(new GetQueueUrlCommand({ QueueName: this.queueName }));
      this.queueUrl = getQueue.QueueUrl;
    } catch (err) {
      if (err.name === "QueueDoesNotExist") {
        const createQueue = await this.sqs.send(
          new CreateQueueCommand({
            QueueName: this.queueName,
            Attributes: {
              VisibilityTimeout: "30", // default timeout in seconds
            },
          })
        );
        this.queueUrl = createQueue.QueueUrl;
      } else {
        throw err;
      }
    }
  }

  async push(message) {
    const str = typeof message === "string" ? message : JSON.stringify(message);
    await this.sqs.send(
      new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: str,
      })
    );
  }

  async poll(count = 1) {
    const result = await this.sqs.send(
      new ReceiveMessageCommand({
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: count,
        VisibilityTimeout: 30, // seconds
        WaitTimeSeconds: 5, // long polling
      })
    );
    return (result.Messages || []).map((msg) => ({
      raw: msg.Body,
      data: this.safeParse(msg.Body),
      receiptHandle: msg.ReceiptHandle,
    }));
  }

  async ack(msgs) {
    for (const msg of msgs) {
      await this.sqs.send(
        new DeleteMessageCommand({
          QueueUrl: this.queueUrl,
          ReceiptHandle: msg.receiptHandle,
        })
      );
    }
  }

  async nack(msgs) {
    for (const msg of msgs) {
      await this.sqs.send(
        new ChangeMessageVisibilityCommand({
          QueueUrl: this.queueUrl,
          ReceiptHandle: msg.receiptHandle,
          VisibilityTimeout: 0, // make visible immediately
        })
      );
    }
  }

  safeParse(str) {
    try {
      return JSON.parse(str);
    } catch {
      return str;
    }
  }
}
export default SafeQueueSQS;
