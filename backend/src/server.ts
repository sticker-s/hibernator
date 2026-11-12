import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import candidateRouter from './routes/candidates.js';
import campaignRouter from './routes/campaigns.js';

dotenv.config({ path: '../.env' });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(
    cors({
        origin: ['http://localhost:3000', 'https://hibernator-frontend.vercel.app'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
    })
);
// 1. Body Parser (handles null and non-strict JSON bodies) 
app.use(express.json({ strict: false }));
app.use(express.urlencoded({ extended: true }));

// this catches invalid body
app.use((err: any, req: Request, _res: Response, next: NextFunction) => {
    if (err && (err instanceof SyntaxError || err.status === 400)) {
        req.body = {};
        return next();
    }
    return next(err);
});



app.use('/candidates', candidateRouter);
app.use('/campaigns', campaignRouter);

app.get('/', (_req, res) => {
    res.json({ status: 'online', system: 'Hibernator Express API running (MongoDB)' });
});

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('server error:', err);
    res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.header('Access-Control-Allow-Credentials', 'true');
    return res.status(err.status || 500).json({
        detail: err.message || 'Internal Server Error'
    });
})

// Start Server 
async function start() {
    await connectDB();
    app.listen(PORT, () => {
        console.log(` Hibernator Express Backend running on http://localhost:${PORT}`);
    });
}
start();