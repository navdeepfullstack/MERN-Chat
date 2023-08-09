let mongoose = require('mongoose');
let Schema = mongoose.Schema;
let onlineUserSchema = new Schema({
    user_id: {
        type: mongoose.Types.ObjectId,
        ref: "users"
    },
    socket_id: {
        type: String,
        default: ""
    },
    status: {
        type: Boolean,
        default: true
    },
}, { timestamps: true });

const onlineUsers = mongoose.model('onlineUsers', onlineUserSchema);
module.exports = onlineUsers;
