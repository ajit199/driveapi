import "@tensorflow/tfjs-node";
import * as canvas from "canvas";
import * as faceapi from "@vladmandic/face-api";

// Load models and configure the environment
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });


async function loadModels() {
  // Load face detection model
  await faceapi.nets.ssdMobilenetv1.loadFromDisk("weights");
  // Load face landmark model
  await faceapi.nets.faceLandmark68Net.loadFromDisk("weights");
  // Load face recognition model
  await faceapi.nets.faceRecognitionNet.loadFromDisk("weights");
}

// Function to compare faces and send result to the parent process
async function compareFaces(referenceDescriptors, currentImagePath) {
  try {

    await loadModels();

    // Load the reference image
    const currentImage = await canvas.loadImage(currentImagePath);
console.log("enterec compare");
    // Detect faces in the reference image
    const currentDetections = await faceapi
      .detectAllFaces(currentImage)
      .withFaceLandmarks()
      .withFaceDescriptors();

    // If no faces are detected in the reference image, send a message indicating the issue
    if (currentDetections.length === 0) {
      process.send({ result: 'no_face', imagePath: currentImagePath });
      return;
    }

    const currentDescriptors = currentDetections[0].descriptor;

    // Compute similarity between the faces
    const euclideanDistance = faceapi.euclideanDistance(
      referenceDescriptors,
      currentDescriptors
    );

    // Set a threshold for similarity (you can adjust this as needed)
    const similarityThreshold = 0.6;

    // Compare the similarity with the threshold
    if (euclideanDistance < similarityThreshold) {
      process.send({ result: 1, distance:euclideanDistance, imagePath: currentImagePath });
    } else {
      process.send({ result: 0, distance:euclideanDistance,   imagePath: currentImagePath });
    }
  } catch (error) {
    console.error('Error in child process:', error);
    process.send({ result: 'error', error, imagePath: currentImagePath });
  }
}

// Receive data from the parent process
process.on('message', (message) => {
  const { referenceDescriptors, currentImagePath } = message;
  console.log("entered compare process");
  // Perform the face recognition
  compareFaces(referenceDescriptors, currentImagePath);
});
