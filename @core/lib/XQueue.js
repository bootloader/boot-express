// reliable_xqueue.js
import { redis, waitForReady } from "@bootloader/redison";

class ReliableXQueue {
  constructor(queueName, options = {}) {
    this.queue = queueName;
    this.processingQueue = `${queueName}:processing`;
    this.lockKey = `lock:${queueName}`;
    this.consumerId = `xqueue-${process.pid}`;
    this.redis = redis;
    this.lockTTL = options.lockTTL || 10000; // 10s default
    this.heartbeatInterval = options.heartbeatInterval || 5000;
    this.heartbeatTimer = null;
    this.lockHeld = false;
    this.subscribeTimer = null;
  }

  async push(message) {
    const str = typeof message === "string" ? message : JSON.stringify(message);
    await this.redis.lpush(this.queue, str);
  }

  async poll(count = 1) {
    const locked = await this.redis.set(this.lockKey, this.consumerId, "NX", "PX", this.lockTTL);
    if (!locked) return [];

    this.lockHeld = true;
    this._startHeartbeat();

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

  async release() {
    if (!this.lockHeld) return;

    const current = await this.redis.get(this.lockKey);
    if (current === this.consumerId) {
      await this.redis.del(this.lockKey);
    }
    this._stopHeartbeat();
    this.lockHeld = false;
  }

  _startHeartbeat() {
    if (this.heartbeatTimer) return;
    this.heartbeatTimer = setInterval(async () => {
      const current = await this.redis.get(this.lockKey);
      if (current === this.consumerId) {
        await this.redis.pexpire(this.lockKey, this.lockTTL);
      }
    }, this.heartbeatInterval);
  }

  _stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  async isLocked() {
    const current = await this.redis.get(this.lockKey);
    return current === this.consumerId;
  }

  /**
   * Subscribe to messages in a loop
   * @param {Function} handler - async function({ messages, ack, nack })
   * @param {number} interval - in milliseconds (default 2000)
   */
  subscribe(handler, interval = 2000, batchSize = 10) {
    if (this.subscribeTimer) return;

    const run = async () => {
      try {
        const messages = await this.poll(batchSize);
        if (!messages.length) return;

        await handler({
          messages,
          ack: async () => await this.ack(messages),
          nack: async () => await this.nack(messages),
        });

        await this.ack(messages); // fallback ack if handler didn't
      } catch (err) {
        console.error(`[XQueue:${this.queue}] Subscribe error`, err);
      } finally {
        await this.release();
      }
    };

    this.subscribeTimer = setInterval(run, interval);
  }

  stop() {
    if (this.subscribeTimer) {
      clearInterval(this.subscribeTimer);
      this.subscribeTimer = null;
    }
  }
}

export default ReliableXQueue;
