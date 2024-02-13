import oAuth2Client from "../../config/googleAuth.js";
import User from "../../models/User.js";
import jwt from "jsonwebtoken";

async function getTokenFromGoogle(req, res) {
  const code = req.query.code;
  try {
    const { tokens } = await oAuth2Client.getToken(code);

    const user = await oAuth2Client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.CLIENTID,
    });

    // const userId = user.getPayload().sub;
    const userName = user.getPayload().name;
    const userEmail = user.getPayload().email;

    const userExists = await User.findOne({
      where: {
        email: userEmail,
      },
    });
    let currentUser;
    if (userExists?.dataValues?.id) {
      const [count, updatedUser] = await User.update(
        {
          metaData: {
            ...tokens,
            refresh_token: tokens?.refresh_token
              ? tokens?.refresh_token
              : userExists?.dataValues?.metaData?.refresh_token,
          },
          tokenIssuedAt: new Date(),
        },
        {
          where: {
            id: userExists.dataValues.id,
          },
          returning: true,
          plain: true,
        }
      );
      currentUser = updatedUser;
    } else {
      currentUser = await User.create({
        name: userName,
        email: userEmail,
        metaData: tokens,
        tokenIssuedAt: new Date(),
      });
    }

    const token = jwt.sign(
      {
        id: currentUser?.dataValues?.id,
        email: currentUser?.dataValues?.email,
      },
      process.env.JWT_SECRET_KEY
    );

    res.json({ token });
  } catch (error) {
    console.error("Error retrieving access token:", error);
    res.status(500).send("Error retrieving access token");
  }
}

export default getTokenFromGoogle;
