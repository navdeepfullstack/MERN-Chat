let mongoose = require('mongoose');
let Schema = mongoose.Schema;
let constantSchema = new Schema({
    user_id: {
        type: mongoose.Types.ObjectId,
        ref: "users"
    },
    other_user_id: {
        type: mongoose.Types.ObjectId,
        ref: "users"
    },
    last_msg_id: {
        type: String,
        required: false,
        ref: 'chats'
    },
    typing: {
        type: Boolean,
        default: false
    },
    deleted_id: {
        type: String,
        default: ''
    },
}, { timestamps: true });

constantSchema.virtual('lastMsg',{
    ref: "chats",
    localField: 'last_msg_id',
    foreignField: '_id',
    justOne: true, // default is false
})

constantSchema.set('toObject', { virtuals: true });
constantSchema.set('toJSON', { virtuals: true });


const constants = mongoose.model('constants', constantSchema);
module.exports = constants;
