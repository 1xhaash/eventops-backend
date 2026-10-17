import mongoose from "mongoose";
import dns from "node:dns";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const dbConnection = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("Database Connected Successfully!");
  } catch (err) {
    console.error("Database Connection Failed:", err.message);
    throw err;
  }
};

export default dbConnection;
