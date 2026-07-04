import mongoose from "mongoose";

const DB_URL = process.env.DB_URL;

const connect = async () => {
  const connectionState = mongoose.connection.readyState;

  if (connectionState == 1) {
    console.log("✅ Already connected to Database");
    return;
  }

  if (connectionState == 2) {
    console.log("⏳ Connecting to the Database...");
    return;
  }

  try {
    console.log("🔌 Initiating database connection...");
    await mongoose.connect(DB_URL!, {
      dbName: "realEstate",
      bufferCommands: true,
    });
    console.log("✅ Connected to Database Successfully!");
  } catch (error: unknown) {
    console.error("❌ Database connection error:", error);
    throw error; // Re-throw to propagate error
  }
};

export default connect;
