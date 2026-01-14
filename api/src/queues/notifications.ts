import { Queue } from "bullmq";
import { getRedisConnection } from "./redis.js";

export const notificationsQueueName = "notifications";

let queueSingleton: Queue | null = null;

export function getNotificationsQueue(): Queue {
  if (!queueSingleton) {
    queueSingleton = new Queue(notificationsQueueName, {
      connection: getRedisConnection(),
    });
  }

  return queueSingleton;
}
