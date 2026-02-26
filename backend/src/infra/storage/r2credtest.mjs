import "dotenv/config";
import { S3Client, HeadBucketCommand } from "@aws-sdk/client-s3";
const client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

try {
  await client.send(
    new HeadBucketCommand({
      Bucket: process.env.R2_BUCKET, // e.g. "iwcrm"
    })
  );
  console.log("✅ Bucket access OK");
} catch (err) {
  console.error("❌ Bucket access failed:");
  console.error(err.name, err.message);
}
