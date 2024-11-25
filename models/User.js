import mongoose from "mongoose";
import bcrypt from "bcrypt";

const SALT_WORK_FACTOR = process.env.SALT_WORK_FACTOR;
const MAX_LOGIN_ATTEMPTS = process.env.MAX_LOGIN_ATTEMPTS;
const LOCK_TIME = process.env.LOCK_TIME;

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    loginAttempts: { type: Number, required: true, default: 0 },
    lockUntil: { type: Number }
});

UserSchema.virtual('isLocked').get(function () {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

UserSchema.pre('save', function (next) { 
    const user = this;

    if (!user.isModified('password')) return next();

    bcrypt.genSalt(SALT_WORK_FACTOR, (error, salt) => {
        if (error) return next(error);

        // Encripta senha com "sal" gerado
        bcrypt.hash(user.password, salt, (error, hash) => {
            if (error) return next(error);

            // Substitui plaintext
            user.password = hash;
            next();
        });
    });
});

UserSchema.methods.comparePassword = function (inputPassword, callback) {
    bcrypt.compare(inputPassword, this.password, (err, isMatch) => {
        if (err) return callback(err);

        callback(null, isMatch);
    });
};

UserSchema.methods.incLoginAttempts = function(callback) {
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.update({ 
            $set: { loginAttempts: 1 }, 
            $unset: {lockUntil: 1 } }, 
            callback);
    }

    let updates = { $inc: { loginAttempts: 1 } };

    if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked) {
        updates.$set = { lockUntil: Date.now() + LOCK_TIME };
    } 
    
    return this.update(updates, callback);
};

const reasons = UserSchema.statics.failedLogin = {
    NOT_FOUND: 0,
    PASSWORD_INCORRECT: 1,
    MAX_ATTEMPTS: 2
};

UserSchema.statics.getAuthenticated = function(email, password, callback) {
    this.findOne({ email: email }, function (error, user) {
        if (error) return callback(error);

        if (!user) {
            return callback(null, null, reasons.NOT_FOUND);
        }

        if (user.isLocked) {
            return user.incLoginAttempts(function(error) {
                if (error) return callback(error);

                return callback(null, null, reasons.MAX_ATTEMPTS);
            });
        }

        user.comparePassword(password, function (error, isMatch) {
            if (error) return callback(error);

            if (isMatch) {
                if (!user.loginAttempts && !user.lockUntil) return callback(null, user);

                let updates = {
                    $set: { loginAttempts: 1 },
                    $unset: { lockUntil: 1 }
                };

                return user.update(updates, function (error) {
                    if (error) return callback(error);

                    return callback(null, user);
                });
            }

            user.incLoginAttempts(function(error) {
                if (error) return callback(error);

                return callback(null, null, reasons.PASSWORD_INCORRECT);
            })
        })
    })
}

export default mongoose.model('User', UserSchema);