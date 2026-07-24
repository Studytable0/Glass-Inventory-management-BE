import app from "./app.js";

app.listen(5000, ()=> {
    console.log("Server is up and running on port 5000")
})

app.get("/", (req, res)=> {
    res.send("Backend is ready")
})