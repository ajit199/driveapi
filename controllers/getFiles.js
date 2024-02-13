import { google } from "googleapis";
import oAuth2Client from "../config/googleAuth.js";

async function getFiles(req, res) {
  try {
    const { nextPage = null, limit = 10, folderId = "" } = req.query;
    const user = req.user;

    const tokens = user?.metaData;
    oAuth2Client.setCredentials(tokens);
    const drive = google.drive({ version: "v3", auth: oAuth2Client });

    const { data } = await drive.files.list({
      q: `mimeType != 'application/vnd.google-apps.folder'  and '${folderId}' in parents`,
      pageSize: +limit,
      pageToken: nextPage,
    });
    res.json({
      data: data,
    });
  } catch (error) {
    res.status(500).json({ error });
  }
}

export default getFiles;
