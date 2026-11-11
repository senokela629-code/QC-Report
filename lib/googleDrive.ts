import { google } from "googleapis";
import { Readable } from "stream";

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

export async function uploadBase64ToDriveWithServiceAccount(
  base64Data: string, 
  fileName: string
): Promise<string> {
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

    // Menggunakan GoogleAuth Service Account langsung yang memiliki akses penuh ke folder Google Drive user yang dishare
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/drive"],
    });

    const drive = google.drive({ version: "v3", auth });

    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const fileMetadata: any = {
      name: fileName,
    };
    if (FOLDER_ID) {
      fileMetadata.parents = [FOLDER_ID];
    }

    const media = {
      mimeType: mimeType,
      body: stream,
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id",
      supportsAllDrives: true,
    });

    const fileId = response.data.id;
    if (!fileId) throw new Error("Gagal mendapatkan file ID dari Google Drive");

    // Set permission public so anyone with link can view/preview original quality image
    try {
      await drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: "reader",
          type: "anyone",
        },
      });
    } catch (permErr) {
      console.warn("Warning setting public permission:", permErr);
    }

    // Return exact web view link
    return `https://drive.google.com/file/d/${fileId}/view?usp=drive_link`;
  } catch (error: any) {
    console.error("Error uploading to Google Drive via Service Account:", error);
    throw new Error("Google Drive Upload Gagal: " + (error.message || error));
  }
}