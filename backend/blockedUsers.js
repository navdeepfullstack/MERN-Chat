let mongoose = require('mongoose');
let Schema = mongoose.Schema;
let blockedUserSchema = new Schema({
    user_by: {
        type: mongoose.Types.ObjectId,
    },
    user_to: {
        type: mongoose.Types.ObjectId,
    },
    status: {
        type: Boolean,
        default: true
    },
}, { timestamps: true });

const blockedUsers = mongoose.model('blockedUsers', blockedUserSchema);
module.exports = blockedUsers;
