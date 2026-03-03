const userModel = require("../model/userModels");

module.exports = async (req, res, next) => {
    const userApiKey = req.header('x-api-key'); 

    if (!userApiKey) {
        return res.status(401).json({ message: "No API Key provided. Please sign up." });
    }

    try {
        const user = await userModel.findOne({ generatedApiKey: userApiKey });

        if (!user) {
            return res.status(403).json({ message: "Invalid API Key." });
        }

        // We will use 'gatewayUser' to match your AI logic
        req.gatewayUser = user; 
        next();
    } catch (err) {
        res.status(500).json({ message: "Server error during key validation" });
    }
};