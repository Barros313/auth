import mongoose from "mongoose";
import bcrypt from "bcrypt";

const SALT_WORK_FACTOR = process.env.SALT_WORK_FACTOR;

const UserSchema = new mongoose.Schema(
    {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { 
        type: String, 
        required: true 
    },
    loginAttempts: { type: Number, required: true, default: 0 },
    lockUntil: { type: Number },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String }
    },
    { timestamps: true }
);

UserSchema.virtual('isLocked').get(function () {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

UserSchema.pre('save', function (next) { 
    const user = this;
    if (!user.isModified('password')) return next();

    const passwordValidationRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!passwordValidationRegex.test(user.password)) {
        return next(new Error('Password must be at least 8 characters long and contain at least one letter, one number, and one special character.'));
    }

    bcrypt.genSalt(SALT_WORK_FACTOR, (error, salt) => {
        if (error) return next(error);

        bcrypt.hash(user.password, salt, (error, hash) => {
            if (error) return next(error);

            user.password = hash;
            next();
        });
    });
});

UserSchema.methods.comparePassword = async function (inputPassword) {
    try {
        return await bcrypt.compare(inputPassword, this.password);
    } catch (error) {
        throw error;
    }
};

UserSchema.methods.resetLock = async function () {
    if (this.lockUntil && this.lockUntil <= Date.now()) {
        this.loginAttempts = 0;
        this.lockUntil = null;
        await this.save();
    }
}

export default mongoose.model('User', UserSchema);