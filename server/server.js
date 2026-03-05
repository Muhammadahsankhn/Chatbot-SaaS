require('dotenv').config();
const app = require("./src/app");
const mongoose = require('mongoose');




console.log("Attempting to start server..."); // Debug Log 1

const PORT = process.env.PORT || 3002;

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("Connected to MongoDB"); // Debug Log 2
        app.listen(PORT, "0.0.0.0", () => {  // ← "0.0.0.0" means all interfaces
            console.log("Server running on port 5002");
        });
    })
    .catch((err) => {
        console.error("MongoDB Connection Error:", err);
    });