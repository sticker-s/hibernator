import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import candidateRouter from './routes/candidates.js';
import campaignRouter from './routes/campaigns.js';

dotenv.config({ path: '../.env' });
dotenv.config();
const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json());
app.use(
    cors({
        origin: ['http://localhost:3000', 'https://hibernator-frontend.vercel.app'],
        credentials: true
    })
);

app.use('/candidates', candidateRouter);
app.use('/campaigns', campaignRouter);

app.get('/', (_req, res) => {
    res.json({ status: 'online', system: 'Hibernator Express API running (MongoDB)' });
});

// Start Server 
async function start() {
    await connectDB();
    app.listen(PORT, () => {
        console.log(` Hibernator Express Backend running on http://localhost:${PORT}`);
    });
}
start();
