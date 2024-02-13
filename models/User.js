import { DataTypes, Model } from "sequelize";
import sequelize from "../config/sequalize.js";

class User extends Model {
  async getGoogleAccessToken() {
    if (this.isGoogleAccessTokenExpired()) {
      //refresh, save, return
      return; //refreshed
    }

    return this.access_token;
  }

  isGoogleAccessTokenExpired() {
    return this.issued + this.expired_at < Date.now();
  }
}

User.init(
  {
    // Define  User model fields
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    metaData: {
      type: DataTypes.JSON,
    },
    tokenIssuedAt: {
      type: DataTypes.DATE,
    },
  },
  {
    sequelize,
    createdAt: true,
    updatedAt: true,
  }
);

export default User;
