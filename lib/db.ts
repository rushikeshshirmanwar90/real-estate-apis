import mongoose from "mongoose";

const DB_URL = process.env.DB_URL;

const connect = async () => {
  const connectionState = mongoose.connection.readyState;

  if (connectionState == 1) {
    console.log("Connected to Database Successfully..!");
    return;
  }

  if (connectionState == 2) {
    console.log("Connecting to the Database..!");
    return;
  }

  try {
    mongoose.connect(DB_URL!, {
      dbName: "realEstate",
      bufferCommands: true,
    });
  } catch (error: unknown) {
    console.log("Error : " + error);
  }
};

export default connect;
