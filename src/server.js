import dotenv from "dotenv";
import os from "os";
import app from "./app.js";

dotenv.config();

const PORT = process.env.PORT || 8000;

// Get local IPv4 address
function getLocalIPAddress() {
    const interfaces = os.networkInterfaces();

    for (const interfaceName of Object.keys(interfaces)) {
        for (const iface of interfaces[interfaceName]) {
            if (iface.family === "IPv4" && !iface.internal) {
                return iface.address;
            }
        }
    }

    return "Unable to detect IP";
}

const localIP = getLocalIPAddress();

// Listen on all network interfaces
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running`);
    console.log(`   Local:   http://localhost:${PORT}`);
    console.log(`   Network: http://${localIP}:${PORT}`);
});

// import dotenv from "dotenv";
// import app from "./app.js";

// dotenv.config();
// const PORT = process.env.PORT || 8000;

// app.listen(PORT, () => {
//     console.log(`Server running on http://localhost:${PORT}`);
// });
