import express from 'express';
import User from '../models/User.js';

const router = express.Router();

const MAX_LOGIN_ATTEMPTS = 3;
const LOCK_TIME = 2*60*60*1000;

const formatDate = (date) => {
    const pad = (num) => String(num).padStart(2, '0');

    const year = date.get;
    const month = pad(date.getMonth() + 1); // Months are zero-based
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

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

        await user.resetLock();

        if (!user) {
            console.log(`${email} not registered`);
            return res.status(400).json({ message: 'User not found' });
        }

        if (user.isLocked) {
            console.log(`${email} is locked out until ${user.lockUntil}`);
            return res.status(403).json({ message: 'Account is temporarily locked. Try again later' });
        }

        const isMatch = await user.comparePassword(password);

        if (isMatch) {
            user.loginAttempts = 0;
            user.lockUntil = null;
            await user.save();

            console.log(`User ${user.name} (${user.email}) logged in`);
            res.status(200).json({ user: { id: user._id, name:user.name, email: user.email } });
        } else {
            user.loginAttempts += 1;

            if (user.loginAttempts >= 3) {
                user.lockUntil = new Date(Date.now() + 2*60*60*1000);
                console.log(`User ${user.email} is now locked out.`);
            }

            await user.save();

            console.log(`${email} login failed. Passwords don't match`);
            return res.status(401).json({ message: 'Wrong credentials' });
        }
    } catch(err) {
        console.error(err)
        res.status(500).json({ message: `Internal server error` });
    }
});

export default router;
