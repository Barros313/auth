import express, { json, urlencoded } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

import authRouter from './routes/auth.js'

dotenv.config();

const app = express();
const PORT = process.env.PORT;
const MONGO_URI = process.env.MONGO_URI;

app.use(cors());
app.use(json());
app.use(urlencoded({ extended: true }));

mongoose.connect(MONGO_URI)
    .then(() => console.log('Database connection established'))
    .catch((err) => console.err(err));

app.use('/auth', authRouter);

app.listen(PORT, () => {
    console.log(`Server opened at port ${PORT}`);
});