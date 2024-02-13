import jwt from "jsonwebtoken";
import User from "../models/User.js";
import oAuth2Client from "../config/googleAuth.js";
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
  const user = await User.findOne({ where: { id: decoded.id } });

  oAuth2Client.setCredentials(user?.dataValues?.metaData);

  // Check if the token is about to expire
  if (oAuth2Client.isTokenExpiring()) {
    try {
      // Refresh the token
      const { tokens: refreshedTokens } = await oAuth2Client.refreshToken(
        oAuth2Client.credentials.refresh_token
      );

      let updatedData = {};
      if (refreshedTokens.refresh_token) {
        updatedData = {
          metaData: refreshedTokens,
        };
      } else {
        updatedData = {
          metaData: {
            refresh_token: user?.dataValues?.metaData?.refresh_token,
            ...refreshedTokens,
          },
        };
      }
      const [count, updatedUser] = await User.update(updatedData, {
        where: {
          id: user?.dataValues?.id,
        },
      });

      req.user = updatedUser;
    } catch (error) {
      res.status(401).json({
        message: "Invalid refresh token. Re-authenticate the user.",
      });
    }
  } else {
    req.user = user;
  }

  next();
};

export default verifyToken;
