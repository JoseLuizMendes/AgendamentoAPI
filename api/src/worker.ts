import "dotenv/config";
import { Worker } from "bullmq";
import { getRedisConnection, getRedisUrl } from "./queues/redis.js";
import { notificationsQueueName } from "./queues/notifications.js";

const connection = getRedisConnection();

const worker = new Worker(
  notificationsQueueName,
  async (job) => {
    // Placeholder: integrar WhatsApp aqui
    return { ok: true, job: job.name, data: job.data };
  },
  { connection }
);

worker.on("failed", (job, err) => {
  // eslint-disable-next-line no-console
  console.error("Job failed", job?.id, err);
});

// eslint-disable-next-line no-console
console.log(`Worker running. queue=${notificationsQueueName} redis=${getRedisUrl()}`);
