import { S3Client, PutObjectCommand, ListObjectsV2Command, CopyObjectCommand, } from "@aws-sdk/client-s3";

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

    await Promise.all(listedObjects.Contents.map(async (object) => {
      if (!object.Key) return; // Key==> Means whole path of object in bucket 
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
    }))

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