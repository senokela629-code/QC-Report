import { google } from "googleapis";
import { uploadBase64ToR2 } from "./r2";

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
  scopes: [
    "https://www.googleapis.com/auth/spreadsheets"
  ],
});

const sheets = google.sheets({ version: "v4", auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

const USERS_RANGE = "Users!A:D";
const PROJECTS_RANGE = "Projects!A:J";
const SETTINGS_RANGE = "Settings!A:B";

export async function checkAndRegisterUser(email: string, name: string) {
  if (!SPREADSHEET_ID) return "observer";

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: USERS_RANGE,
    });

    const rows = response.data.values || [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row[0] && row[0].toLowerCase() === email.toLowerCase()) {
        return row[2] || "observer";
      }
    }

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: USERS_RANGE,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[email, name, "observer", new Date().toISOString()]],
      },
    });

    return "observer";
  } catch (error) {
    console.error("Error checkAndRegisterUser:", error);
    return "observer";
  }
}

export async function getProjects() {
  if (!SPREADSHEET_ID) return [];
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: PROJECTS_RANGE,
    });
    const rows = res.data.values || [];
    const projects = [];
    
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (r[0]) {
        // Cek kolom J (index 9) atau fallback ke kolom lain jika row pendek
        const dokumentasiVal = r[9] || r[4] || "";
        let items = [];

        if (dokumentasiVal.trim().startsWith("[")) {
          try {
            items = JSON.parse(dokumentasiVal);
          } catch (e) {
            console.error("Error parsing items JSON from sheet:", e);
            items = [];
          }
        } else if (dokumentasiVal.trim().startsWith("{")) {
          try {
            const parsed = JSON.parse(dokumentasiVal);
            items = Array.isArray(parsed) ? parsed : [parsed];
          } catch {
            items = [];
          }
        } else if (dokumentasiVal.length > 0) {
          // Fallback untuk URL koma
          const urls = dokumentasiVal.split(",").map((u: string) => u.trim()).filter(Boolean);
          items = urls.map((url: string, idx: number) => ({
            id: (idx + 1).toString(),
            photo: url,
            jobs: [],
            optionQC: "Good",
            ngReasons: { speedMati: false, blank: false, komponenKurang: false, komponenDetail: "" },
            note: ""
          }));
        }

        projects.push({
          projectId: r[0],
          title: r[1],
          date: r[2],
          status: r[3] || "Proses Pengiriman Menuju User",
          receiptPhoto: r[4] && !r[4].startsWith("[") ? r[4] : "",
          summaryGood: parseInt(r[5]) || 0,
          summaryNG: parseInt(r[6]) || 0,
          totalPcs: parseInt(r[7]) || parseInt(items.length) || 0,
          createdBy: r[8] || "admin",
          items: items,
        });
      }
    }
    return projects.reverse();
  } catch (error) {
    console.error("Error getProjects:", error);
    return [];
  }
}

export async function saveProject(
  project: {
    projectId: string;
    title: string;
    date: string;
    status: string;
    receiptPhoto: string;
    summaryGood: number;
    summaryNG: number;
    totalPcs: number;
    createdBy: string;
    items: any[];
  }
) {
  if (!SPREADSHEET_ID) throw new Error("GOOGLE_SHEET_ID missing");

  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: "Projects!J1",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [["Dokumentasi"]] },
    });
  } catch (err) {
    console.warn("Could not update header J1:", err);
  }

  if (project.receiptPhoto && project.receiptPhoto.startsWith("data:")) {
    const receiptFileName = `receipt_${project.projectId}_${Date.now()}.jpg`;
    try {
      const uploadedReceipt = await uploadBase64ToR2(project.receiptPhoto, receiptFileName);
      if (uploadedReceipt) project.receiptPhoto = uploadedReceipt;
    } catch (e) {
      console.warn("Gagal upload resi ke R2:", e);
    }
  }

  for (let i = 0; i < project.items.length; i++) {
    const item = project.items[i];
    if (item.photo && item.photo.startsWith("data:")) {
      const itemFileName = `qc_${project.projectId}_item_${item.id}_${Date.now()}.jpg`;
      try {
        const uploadedUrl = await uploadBase64ToR2(item.photo, itemFileName);
        if (uploadedUrl && !uploadedUrl.startsWith("data:")) {
          item.photo = uploadedUrl;
        }
      } catch (e) {
        console.warn(`Gagal upload item ${item.id} ke R2:`, e);
      }
    }
  }

  const dokumentasiValue = JSON.stringify(project.items);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: PROJECTS_RANGE,
  });
  const rows = res.data.values || [];
  
  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === project.projectId) {
      rowIndex = i + 1;
      break;
    }
  }

  const rowValues = [
    project.projectId,
    project.title,
    project.date,
    project.status,
    project.receiptPhoto,
    project.summaryGood.toString(),
    project.summaryNG.toString(),
    project.totalPcs.toString(),
    project.createdBy,
    dokumentasiValue,
  ];

  if (rowIndex > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Projects!A${rowIndex}:J${rowIndex}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [rowValues] },
    });
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: PROJECTS_RANGE,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [rowValues] },
    });
  }
}

export async function getJobSettings() {
  const defaultJobs = ["REWORK_160_150", "REPLACE_CONNECTOR", "ASSY_UART", "ASSY_TES_BOX", "RETURN"];
  if (!SPREADSHEET_ID) return defaultJobs;
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: SETTINGS_RANGE,
    });
    const rows = res.data.values || [];
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === "JOB_LIST") {
        return JSON.parse(rows[i][1]);
      }
    }
    return defaultJobs;
  } catch {
    return defaultJobs;
  }
}

export async function saveJobSettings(jobs: string[]) {
  if (!SPREADSHEET_ID) return;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: SETTINGS_RANGE,
  });
  const rows = res.data.values || [];
  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === "JOB_LIST") {
      rowIndex = i + 1;
      break;
    }
  }
  if (rowIndex > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Settings!A${rowIndex}:B${rowIndex}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [["JOB_LIST", JSON.stringify(jobs)]] },
    });
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: SETTINGS_RANGE,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [["JOB_LIST", JSON.stringify(jobs)]] },
    });
  }
}