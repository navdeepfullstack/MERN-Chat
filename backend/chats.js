let mongoose = require('mongoose');
let Schema = mongoose.Schema;
let chatSchema = new Schema({
    user_id: {
        type: mongoose.Types.ObjectId,
        ref: "users",
    },
    other_user_id: {
        type: mongoose.Types.ObjectId,
        ref: "users",
    },
    constant_id: {
        type: mongoose.Types.ObjectId,
    },
    message: {
        type: String,
    },
    message_type: {
        type: Number,
    },
    deleted_id: {
        type: String,
        default: ''
    },
    read_status: {
        type: Boolean,
        default: false
    },
}, { timestamps: true });


chatSchema.virtual('userProfile',{
    ref: "users",
    localField: 'user_id',
    foreignField: '_id',
    justOne: true, // default is false
})


chatSchema.virtual('otherUserProfile',{
    ref: "users",
    localField: 'other_user_id',
    foreignField: '_id',
    justOne: true, // default is false
})

chatSchema.set('toObject', { virtuals: true });
chatSchema.set('toJSON', { virtuals: true });

const chats = mongoose.model('chats', chatSchema);
module.exports = chats;
