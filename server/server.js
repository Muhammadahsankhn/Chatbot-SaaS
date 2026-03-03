require('dotenv').config();
const app = require("./src/app");
const mongoose = require('mongoose');




console.log("Attempting to start server..."); // Debug Log 1

const PORT = process.env.PORT || 3002;

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("Connected to MongoDB"); // Debug Log 2
        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`); // Debug Log 3
        });
    })
    .catch((err) => {
        console.error("MongoDB Connection Error:", err);
    });