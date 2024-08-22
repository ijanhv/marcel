const { promisify } = require("util");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const Minio = require("minio");
const mime = require("mime-types");

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_HOST_NAME || "192.168.29.40",
  port: 9000,
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY_ID || "VGkwTuEZaLG2lfKJWKzT",
  secretKey:
    process.env.MINIO_ACCESS_SECRET ||
    "5kGTLxFJjm3wbv2pSFCyAcTPIn8IGDHLj0dQgZZZ",
});

const bucketName = "vercel";
const PROJECT_ID = process.env.PROJECT_ID;
const putObjectAsync = promisify(minioClient.putObject.bind(minioClient));
const presignedGetObjectAsync = promisify(
  minioClient.presignedGetObject.bind(minioClient)
);
const setBucketPolicyAsync = promisify(
  minioClient.setBucketPolicy.bind(minioClient)
);

async function init() {
  console.log("Executing script...");
  const buckets = await minioClient.listBuckets();
  console.log(buckets);
  const outDirPath = path.join(__dirname, "output");

  const p = exec(`cd ${outDirPath} && npm install && npm run build`);

  p.stdout.on("data", function (data) {
    console.log(data);
  });
  p.stdout.on("error", function (data) {
    console.log("Error", data.toString());
  });

  p.on("close", async function () {
    console.log("Build Complete!");

    const distFolderPath = path.join(__dirname, "output", "dist");

    const policy = {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: { AWS: ["*"] },
          Action: ["s3:GetObject"],
          Resource: [`arn:aws:s3:::${bucketName}/*`],
        },
      ],
    };

    await setBucketPolicyAsync(bucketName, JSON.stringify(policy));
    console.log("BUCKETs", await minioClient.listBuckets());

    await uploadDirectory(distFolderPath, `__output/${PROJECT_ID}`);

    console.log("Done");
  });
}

async function uploadDirectory(directoryPath, baseKey) {
  const items = fs.readdirSync(directoryPath, { withFileTypes: true });

  for (const item of items) {
    const itemPath = path.join(directoryPath, item.name);
    const itemKey = path.join(baseKey, item.name).replace(/\\/g, "/"); // Ensure correct key format for MinIO

    if (item.isDirectory()) {
      // Recursively upload subdirectory
      await uploadDirectory(itemPath, itemKey);
    } else {
      // Upload file
      const fileStream = fs.createReadStream(itemPath);
      const contentType = mime.lookup(itemPath) || "application/octet-stream";

      try {
        await putObjectAsync(bucketName, itemKey, fileStream, {
          "Content-Type": contentType,
        });
        const url = await presignedGetObjectAsync(bucketName, itemKey);
        console.log(`Uploaded ${item.name} successfully.`);
        console.log(`URL: ${url.split("?")[0]}`);
      } catch (err) {
        console.error(`Error uploading ${item.name}:`, err);
      }
    }
  }
}

init();
