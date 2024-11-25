import mongoose from "mongoose";
import bcrypt from "bcrypt";

const SALT_WORK_FACTOR = process.env.SALT_WORK_FACTOR;

const UserSchema = new mongoose.Schema({
    name: { type: String, require: true },
    email: { type: String, require: true, unique: true },
    password: { type: String, require: true },
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
}

export default mongoose.model('User', UserSchema);