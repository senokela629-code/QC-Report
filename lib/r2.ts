import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

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

    // Dibaca dan diinisialisasi secara runtime di dalam fungsi (aman saat build)
    const accountId = process.env.R2_ACCOUNT_ID || "";
    const accessKeyId = process.env.R2_ACCESS_KEY_ID || "";
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";
    const bucketName = process.env.R2_BUCKET_NAME || "gr-qc-storage";
    const publicUrl = process.env.R2_PUBLIC_URL || "https://pub-0552fe00fad94e599e35172077c85640.r2.dev";

    const s3 = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      })
    );

    const cleanPublicUrl = publicUrl.replace(/\/+$/, "");
    return `${cleanPublicUrl}/${key}`;
  } catch (error: any) {
    console.error("Error uploading to Cloudflare R2:", error);
    // Fallback so application doesn't crash if R2 upload fails
    return base64Data;
  }
}