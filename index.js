import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import uploadFile from "./controllers/uploadFile.js";
import getFiles from "./controllers/getFiles.js";
import getUserFiles from "./controllers/getUserFiles.js";
import composeFiles from "./controllers/composeFiles.js";
import redirectToAuthURL from "./controllers/auth/redirectToAuthURL.js";
import getTokenFromGoogle from "./controllers/auth/getTokenFromGoogle.js";
import sequelize from "./config/sequalize.js";
import verifyToken from "./utils/verifyToken.js";
import cors from "cors";
dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(cors());

app.get("/", (req, res) => {
  res.send('<a href="/auth/google">Click Me</a>');
});

app.get("/auth/google", redirectToAuthURL);
app.get("/auth/google/callback", getTokenFromGoogle);

app.get("/protected", (req, res) => {
  res.send("Welcome");
});

// Upload a file to Google Drive
app.post("/uploadFile", verifyToken, uploadFile);

// Get files from Google Drive
app.get("/getFiles", verifyToken, getFiles);

// get user images from google drive
app.get("/getUserFiles", verifyToken, getUserFiles);

// get image with filter
app.get("/getImageWithFilter", verifyToken, composeFiles);

try {
  await sequelize.sync();
  await sequelize.authenticate();
  console.log("sequelize connection has been established successfully.");
  app.listen(process.env.PORT, () => {
    console.log(`The server is running on port ${process.env.PORT}`);
  });
} catch (error) {
  console.error("Unable to connect to the database:", error);
}
