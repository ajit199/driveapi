import { google } from "googleapis";
import axios from "axios";
import stream from "stream";
import { fileTypeFromBuffer } from "file-type";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import oAuth2Client from "../config/googleAuth.js";

// Configure AWS SDK with your credentials
const s3Client = new S3Client({
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
  region: process.env.S3_REGION,
});

const bucketName = process.env.S3_BUCKET;

async function uploadFile(req, res) {
  try {
    const user = req.user;
    let { folderName, fileName, url } = req.body;

    if (user?.id) {
      if (!url) {
        return res.status(400).json({
          message: "File Url not found.",
        });
      }

      const tokens = user?.metaData;
      oAuth2Client.setCredentials(tokens);
      const drive = google.drive({ version: "v3", auth: oAuth2Client });

      let folderId = null;
      if (folderName) {
        folderId = await checkAndCreateFolder(drive, folderName);
      } else {
        folderId = process.env.FOLDERID;
      }

      fileName = fileName || url?.split("/")?.at(-1);

      uploadData(drive, folderId, fileName, url);

      res.status(201).json({
        folderId,
        folderURL: `https://drive.google.com/drive/folders/${folderId}`,
      });
    }
  } catch (error) {
    res.status(500).json({ error });
  }
}

export default uploadFile;

async function checkAndCreateFolder(drive, folderName) {
  try {
    const { data } = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.folder'",
    });

    let folderExists = false;
    let folderId = "";

    data.files.map((folder) => {
      if (folder.name === folderName) {
        folderExists = true;
        folderId = folder.id;
      }
    });

    if (folderExists) {
      return folderId;
    }
    const newFolder = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
      },
      fields: "id",
    });

    drive.permissions.create(
      {
        fileId: newFolder.data.id,
        requestBody: {
          role: "reader",
          type: "anyone",
        },
      },
      (err) => {
        if (err) {
          console.error("Error setting file permission:", err);
        }
      }
    );

    return newFolder.data.id;
  } catch (error) {
    console.log(error);
  }
}

async function uploadData(drive, id, fileName, fileUrl) {
  try {
    //upload file to a folder
    const response = await axios.get(fileUrl, { responseType: "arraybuffer" });
    const fileContents = Buffer.from(response.data, "binary");
    const type = await fileTypeFromBuffer(fileContents);

    const { data } = await drive.files.create({
      media: {
        body: new stream.PassThrough().end(fileContents),
        mimeType: type.mime,
      },
      requestBody: {
        name: fileName,
        parents: [id],
      },
      fields: "id",
    });

    drive.permissions.create(
      {
        fileId: data.id,
        requestBody: {
          role: "reader",
          type: "anyone",
        },
      },
      (err) => {
        if (err) {
          console.error("Error setting file permission:", err);
        }
      }
    );

    if (fileUrl?.includes("amazonaws.com")) {
      const urlParts = fileUrl.split("/");
      // const bucket = urlParts[2];
      const objectKey = urlParts.slice(3).join("/");
      const params = {
        Bucket: bucketName,
        Key: objectKey,
      };
      const deleteCommand = new DeleteObjectCommand(params);
      s3Client
        .send(deleteCommand)
        .then((data) => {
          console.log("File deleted successfully.");
        })
        .catch((err) => {
          console.error("Error deleting file to S3:", err);
        });
    }
  } catch (error) {
    console.log(error);
  }
}
