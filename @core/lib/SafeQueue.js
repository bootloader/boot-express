// reliable_xqueue.js
import { redis, waitForReady } from "@bootloader/redison";

class SafeQueue {
  constructor(queueName, options = {}) {
    this.queue = queueName;
    this.processingQueue = `${queueName}:processing`;
    this.redis = redis;
  }

  async push(message) {
    const str = typeof message === "string" ? message : JSON.stringify(message);
    await this.redis.lpush(this.queue, str);
  }

  async poll(count = 1) {
    const messages = [];
    for (let i = 0; i < count; i++) {
      const msg = await this.redis.rpoplpush(this.queue, this.processingQueue);
      if (!msg) break;
      try {
        messages.push({ raw: msg, data: JSON.parse(msg) });
      } catch {
        messages.push({ raw: msg, data: msg });
      }
    }
    return messages;
  }

  async ack(msgs) {
    if (!msgs || !msgs.length) return;

    const pipeline = this.redis.pipeline?.();
    if (pipeline && typeof pipeline.lrem === "function") {
      for (const msg of msgs) {
        pipeline.lrem(this.processingQueue, 1, msg.raw);
      }
      await pipeline.exec();
    } else {
      // Fallback to individual commands
      for (const msg of msgs) {
        await this.redis.lrem(this.processingQueue, 1, msg.raw);
      }
    }
  }

  async nack(msgs) {
    if (!msgs || !msgs.length) return;

    const pipeline = this.redis.pipeline?.();
    if (pipeline && typeof pipeline.lrem === "function" && typeof pipeline.rpush === "function") {
      for (const msg of msgs) {
        pipeline.lrem(this.processingQueue, 1, msg.raw);
        pipeline.rpush(this.queue, msg.raw);
      }
      await pipeline.exec();
    } else {
      // Fallback to individual commands
      for (const msg of msgs) {
        await this.redis.lrem(this.processingQueue, 1, msg.raw);
        await this.redis.rpush(this.queue, msg.raw);
      }
    }
  }
}

export default SafeQueue;
