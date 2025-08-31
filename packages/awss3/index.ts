import { S3Client, PutObjectCommand, ListObjectsV2Command, CopyObjectCommand, GetObjectCommand, } from "@aws-sdk/client-s3";
import fs from "fs"
import path from "path"


const s3 = new S3Client({
  region: "auto", // only for r2
  endpoint: process.env.S3_ENDPOINT ?? "",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? ""
  }
});

export async function copyS3Folder(
  sourcePrefix: string,
  destinationPrefix: string,
  continuationToken?: string
) {
  try {
    // List all the objects in the source folder
    const listParams = {
      Bucket: process.env.BUCKET ?? "",
      Prefix: sourcePrefix,
      ContinuationToken: continuationToken
    }

    const listedObjects = await s3.send(new ListObjectsV2Command(listParams));

    if (!listedObjects.Contents || listedObjects.Contents.length == 0) return;

    // copy each object to the new location
    // We are doing it parallelly here, using promise.all()

    for (const object of listedObjects.Contents) {
      if (!object.Key) continue; // Key==> Means whole path of object in bucket 
      // Key==> base/base-go/main.go

      let destinationKey = object.Key.replace(sourcePrefix, destinationPrefix)

      let copyParams = {
        Bucket: process.env.BUCKET ?? "",
        CopySource: `${process.env.BUCKET}/${object.Key}`,
        Key: destinationKey
      }

      console.log(copyParams)

      await s3.send(new CopyObjectCommand(copyParams));
      console.log(`Copied ${object.Key} to ${destinationKey}`)
    }

    // Check if the list was truncated and continue copying if necessary
    if (listedObjects.IsTruncated) {
      await copyS3Folder(sourcePrefix, destinationPrefix, listedObjects.NextContinuationToken)
    }
  } catch (error) {
    console.error("Error copying folder:", error)
  }
}

export const saveToS3 = async (key: string, filePath: string, content: string): Promise<void> => {
  const params = {
    Bucket: process.env.BUCKET ?? "",
    Key: `${key}${filePath}`,
    Body: content
  }

  await s3.send(new PutObjectCommand(params));
}

export const fetchS3Folder = async (key: string, localPath: string): Promise<void> => {
  const params = {
    Bucket: process.env.BUCKET ?? "",
    Prefix: key
  }

  const response = await s3.send(new ListObjectsV2Command(params))

  if (response.Contents) {
    for (const file of response.Contents) {
      const fileKey = file.Key // file path
      if (fileKey) {
        const params = {
          Bucket: process.env.BUCKET ?? "",
          Key: fileKey
        }
        const data = await s3.send(new GetObjectCommand(params))
        if (data.Body) {
          const fileDataStream = data.Body as NodeJS.ReadableStream;
          const chunks: Buffer[] = [];
          for await (const chunk of fileDataStream) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          const fileBuffer = Buffer.concat(chunks);
          const filePath = `${localPath}/${fileKey.replace(key, "")}`;
          await fs.promises.writeFile(filePath, fileBuffer);
        }
      }

    }
  }
}
