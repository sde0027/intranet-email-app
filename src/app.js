import express from "express";

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

app.get("/api/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        message: "Intranet Email API is running",
    });
});

export default app;