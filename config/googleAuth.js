import { OAuth2Client } from "google-auth-library";
import dotenv from "dotenv";
dotenv.config();

const oAuth2Client = new OAuth2Client(
  process.env.CLIENTID,
  process.env.CLIENTSECRET,
  process.env.REDIRECTURI
);

export default oAuth2Client;
