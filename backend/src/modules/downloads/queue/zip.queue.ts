import { Queue } from "bullmq";
import { redisConnection } from "../../../infra/redisConnection";


export const zipQueue = new Queue("zip-jobs", {
    connection: redisConnection,
})

