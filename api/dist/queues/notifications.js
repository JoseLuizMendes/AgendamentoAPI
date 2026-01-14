import { Queue } from "bullmq";
import { getRedisConnection } from "./redis.js";
export const notificationsQueueName = "notifications";
let queueSingleton = null;
export function getNotificationsQueue() {
    if (!queueSingleton) {
        queueSingleton = new Queue(notificationsQueueName, {
            connection: getRedisConnection(),
        });
    }
    return queueSingleton;
}
//# sourceMappingURL=notifications.js.map