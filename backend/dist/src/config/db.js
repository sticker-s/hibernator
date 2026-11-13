import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
dotenv.config();
export const connectDB = async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hibernator';
    try {
        await mongoose.connect(uri);
        console.log('✅ Connected to MongoDB successfully!');
    }
    catch (err) {
        console.error('❌ MongoDB Connection Error:', err);
        process.exit(1);
    }
};
