import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "";
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "";
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "";
const BUCKET_NAME = process.env.R2_BUCKET_NAME || "gr-qc-storage";
const PUBLIC_URL = process.env.R2_PUBLIC_URL || "https://pub-0552fe00fad94e599e35172077c85640.r2.dev";

const S3 = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

export async function uploadBase64ToR2(base64Data: string, fileName: string): Promise<string> {
  if (!base64Data) return "";
  if (base64Data.startsWith("http://") || base64Data.startsWith("https://")) {
    return base64Data;
  }

  try {
    const matches = base64Data.match(/^data:(.+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return base64Data;
    }

    const mimeType = matches[1];
    const buffer = Buffer.from(matches[2], "base64");

    const key = `qc/${Date.now()}_${fileName}`;

    await S3.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      })
    );

    const cleanPublicUrl = PUBLIC_URL.replace(/\/+$/, "");
    return `${cleanPublicUrl}/${key}`;
  } catch (error: any) {
    console.error("Error uploading to Cloudflare R2:", error);
    // Fallback so application doesn't crash if R2 upload fails
    return base64Data;
  }
}