import dotenv from "dotenv";
dotenv.config();

const mongodbUri =
  process.env.MONGO_DB_URL ||
  process.env.MONGODB_URI ||
  "";

const conf = {
  mongodbUri: String(mongodbUri),
  jwtSecret: String(process.env.JWT_SECRET),
  stripeSecretKey: String(process.env.STRIPE_SECRET_KEY),
  port: String(process.env.PORT),
  corsOrigin1: String(process.env.CORS_ORIGIN1),
  corsOrigin2: String(process.env.CORS_ORIGIN2),
  corsOrigin3: String(process.env.CORS_ORIGIN3),
};

export default conf;
