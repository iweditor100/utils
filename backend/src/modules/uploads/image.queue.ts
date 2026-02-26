import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "../../config/env.js";


const connection = new IORedis({
    host: env.REDIS_HOST,
    port: Number(env.REDIS_PORT),
    maxRetriesPerRequest: null,
});


export const imageQueue = new Queue("image-processing", {
    connection,
})