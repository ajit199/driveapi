import "@tensorflow/tfjs-node";
import * as canvas from "canvas";
import * as faceapi from "@vladmandic/face-api";

// Load models and configure the environment
const { Canvas, Image, ImageData } = canvas;
import { google } from "googleapis";
import oAuth2Client from "../config/googleAuth.js";
import sendMail from "../utils/sendMail.js";
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

async function getUserFiles(req, res) {
  try {
    const { url, folderId } = req.query;

    if (!url || !folderId) {
      return res
        .status(400)
        .json({ message: "Please provide url and folderId." });
    }

    const user = req.user;
    const tokens = user?.metaData;
    oAuth2Client.setCredentials(tokens);
    const drive = google.drive({ version: "v3", auth: oAuth2Client });

    const { data } = await drive.files.list({
      q: `mimeType != 'application/vnd.google-apps.folder'  and '${folderId}' in parents`,
    });

    if (data.files.length) {
      compareImages(url, data.files, user);
      res.json({ message: "You will receive an email with Images" });
    } else {
      res.json({
        message: "Images not found in the given folder.",
      });
    }
  } catch (error) {
    res.status(500).json({ error });
  }
}

export default getUserFiles;

async function loadModels() {
  // Load face detection model
  await faceapi.nets.ssdMobilenetv1.loadFromDisk("weights");
  // Load face landmark model
  await faceapi.nets.faceLandmark68Net.loadFromDisk("weights");
  // Load face recognition model
  await faceapi.nets.faceRecognitionNet.loadFromDisk("weights");
}

async function compareImages(image, imagePaths, user) {
  // Load models before performing face detection
  await loadModels();

  // Load the reference image
  const referenceImage = await canvas.loadImage(image);

  // Detect faces in the reference image
  const referenceDetections = await faceapi
    .detectAllFaces(referenceImage)
    .withFaceLandmarks()
    .withFaceDescriptors();

  // If no faces are detected in the reference image, return a message indicating the issue
  if (referenceDetections.length === 0) {
    return "Face not found in the reference image.";
  }

  // Array to store matching images
  const matchingImages = [];

  for (const imagePath of imagePaths) {
    const imageUrl = `https://drive.google.com/thumbnail?id=${imagePath?.id}&sz=w1000`;

    const currentImage = await canvas.loadImage(imageUrl);

    // Detect faces in the current image
    const currentDetections = await faceapi
      .detectAllFaces(currentImage)
      .withFaceLandmarks()
      .withFaceDescriptors();

    // If no faces are detected in the current image, skip to the next iteration
    if (currentDetections.length === 0) {
      console.log(`Face not found in ${imageUrl}.`);
      continue;
    }

    for (const selfieFaceDetection of referenceDetections) {
      for (const arrayFaceDetection of currentDetections) {
        const distance = faceapi.euclideanDistance(
          selfieFaceDetection.descriptor,
          arrayFaceDetection.descriptor
        );

        const similarityThreshold = 0.6;

        // Compare the similarity with the threshold
        if (distance < similarityThreshold) {
          matchingImages.push({
            url: imageUrl,
            name: imagePath?.name,
            mimeType: imagePath?.mimeType,
          });
          break;
        }
      }
    }
  }

  const attachments = matchingImages.map((data) => {
    return {
      filename: data.name, // Extract the filename from the URL
      path: data.url,
      encoding: "base64", // Required for URL attachments
      contentType: data.mimeType,
    };
  });

  sendMail(
    user?.email,
    attachments.length ? "Your Images" : "Images not found",
    "Filtered Images",
    attachments
  );
}
