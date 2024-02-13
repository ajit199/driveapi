import oAuth2Client from "../../config/googleAuth.js";

const SCOPES = [
  "openid",
  "profile",
  "email",
  "https://www.googleapis.com/auth/drive.file",
];

function redirectToAuthURL(req, res) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });
  res.redirect(authUrl);
}

export default redirectToAuthURL;
