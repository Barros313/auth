import express from 'express';
import User from '../models/User.js';

const router = express.Router();

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
        console.error(err);
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            console.log(`${email} not registered`);
            return res.status(400).json({ message: 'User not found' });
        }

        User.getAuthenticated(email, password, function (error, user, reason) {
            if (error) throw error;

            if (user) {
                console.log(`${email} logged in`);
                return res.status(200).json({ message: 'Success!' });
            }

            let reasons = User.failedLogin;

            switch (reason) {
                case reasons.NOT_FOUND:
                    break;
                case reasons.PASSWORD_INCORRECT:
                    break;
                case reasons.MAX_ATTEMPTS:
                    break;
            }
        });

    } catch(err) {
        console.error(err)
        res.status(500).json({ message: `Internal server error` });
    }
});

export default router;
