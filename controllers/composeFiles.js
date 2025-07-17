import sharp from "sharp";
import axios from "axios";
import fs from "fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

async function composeFiles(req, res) {
  try {
    const { filterUrl = "", imageUrl = "", fileName = "" } = req.query;

    if (!filterUrl || !imageUrl || !fileName) {
      return res.status(400).json({
        message: "Please provide filter or image url's. or fileName.",
      });
    }

    const awsurl = await getComposedImage(imageUrl, filterUrl, fileName);

    res.json({
      data: awsurl,
    });
  } catch (error) {
    res.status(500).json({ error });
  }
}

export default composeFiles;

async function getComposedImage(imageUrl, filterUrl, fileName) {
  try {
    const filePath = `${fileName}.png`;
    const filterResponse = await axios.get(filterUrl, {
      responseType: "arraybuffer",
    });
    const imageResponse = await axios.get(imageUrl, {
      responseType: "arraybuffer",
    });

    const imageBuffer = await sharp(imageResponse.data).png().toBuffer();
    const imageMetaData = await sharp(imageBuffer).metadata();

    const resizeFilterImage = await sharp(filterResponse.data)
      .resize({
        width: imageMetaData.width,
        height: imageMetaData.height,
      })
      .png()
      .toBuffer();

    await sharp(imageBuffer)
      .composite([
        {
          input: resizeFilterImage,
        },
      ])
      .png()
      .toFile(filePath);

    // Configure AWS SDK with your credentials
    const region = process.env.S3_REGION;
    const bucketName = process.env.S3_BUCKET;
    const s3Client = new S3Client({
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY,
      },
      region,
    });

    const filteredImagesPath = `public/workspaces/cloiiqoq700022qcvi760jlzp/typebots/clol0ttiu000r2qml775gz1fs/filteredImages/${filePath}`;
    // const urlParts = imageUrl.split("/");
    // urlParts[urlParts.length - 1] = filePath;
    // const objectKey = urlParts.slice(3).join("/");

    // Upload the file to S3
    const params = {
      Bucket: bucketName,
      Key: filteredImagesPath,
      Body: fs.createReadStream(filePath),
    };

    const uploadCommand = new PutObjectCommand(params);

    await s3Client.send(uploadCommand);
    fs.unlinkSync(filePath);

    // Object URL is constructed using the bucket name and object key
    const objectUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${filteredImagesPath}`;
    return objectUrl;
  } catch (error) {
    console.log("error", error);
  }
}
