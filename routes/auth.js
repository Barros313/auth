import express from 'express';
import User from '../models/User.js';

const router = express.Router();

router.get("/", (req, res) => {
    res.send("Hello World!");
});

router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const registeredUser = await User.findOne({ email });
        if (registeredUser) {
            console.log(`${email} already registered`);
            
            return res.status(401).json({ message: 'User already exists' });
        } 

        const newUser = new User({ name: name, email: email, password: password });
        await newUser.save();

        console.log(`User ${name} registered successfully`);
        return res.status(200).json({ message: `User registered successfully` });
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
        console.err(err);
    }
});

export default router;
