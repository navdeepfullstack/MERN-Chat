// let users = db.users;
// let chats = db.chats;
// let constants = db.constants;
// let blockedUsers = db.blockedUsers
// let onlineUsers = db.onlineUsers;

const Models = require('./models')
const fun = require('./helper/socketFunctions');

module.exports = function (io) {
    try {
        io.on('connection', function (socket) {

            socket.on('connect_user', async function (connect_listener) {
                console.log('a user connected');

                try {
                    var socket_id = socket.id
                    console.log(socket_id)
                    await Models.OnlineUsers.updateOne({ user_id: connect_listener.user_id }, { $set: { socket_id: socket_id, status: true } }, {
                        "upsert": true
                    })

                    success_message = {
                        'success_message': 'connected successfully'
                    }
                    socket.emit('connect_listener', success_message);
                } catch (error) {
                    throw error
                }
            });
            socket.on('send_message', async function (get_data) {
                console.log(get_data)
                try {
                    let find_block = await Models.BlockedUsers.findOne({
                        $or: [
                            { user_by: get_data.user_id, user_to: get_data.other_user_id },
                            { user_by: get_data.other_user_id, user_to: get_data.user_id },
                        ]
                    })

                    if (!find_block) {

                        if (get_data.message_type != 1) {
                            extension_data = get_data.extension
                            convert_image = await fun.image_base_64(get_data.message, extension_data, get_data.message_type);
                            get_data.message = convert_image;
                        }

                        var constant_data = await Models.Constants.findOne({
                            $or: [
                                { user_id: get_data.user_id, other_user_id: get_data.other_user_id },
                                { user_id: get_data.other_user_id, other_user_id: get_data.user_id },
                            ]
                        });

                        if (constant_data) {
                            let create_message = await Models.Chats.create({
                                user_id: get_data.user_id,
                                other_user_id: get_data.other_user_id,
                                message_type: get_data.message_type,
                                message: get_data.message,
                                constant_id: constant_data._id,
                            })

                            let update_last_message = await Models.Constants.updateOne(
                                {
                                    _id: constant_data._id
                                },
                                {
                                    $set: {
                                        last_msg_id: ObjectId(create_message._id),
                                        deleted_id: "",
                                    }
                                }
                            );

                            let msg_data = await Models.Chats.findOne({
                                _id: create_message._id
                            })
                                .populate({ path: 'userProfile', select: 'first_name last_name', alias: "userProfile" })
                                .populate({ path: 'otherUserProfile', select: 'first_name last_name', alias: "otherUserProfile" })


                            if (msg_data) {
                                let other_user_socket = await Models.OnlineUsers.findOne({
                                    user_id: get_data.other_user_id
                                })
                                if (other_user_socket) {
                                    io.to(other_user_socket.socket_id).emit('new_message', msg_data);
                                }
                                socket.emit('new_message2', msg_data)
                            }
                        }
                        else {
                            let create_constant = await Models.Constants.create({
                                user_id: get_data.user_id,
                                other_user_id: get_data.other_user_id,
                                last_msg_id: "",
                            });

                            let create_message = await Models.Chats.create({
                                user_id: get_data.user_id,
                                other_user_id: get_data.other_user_id,
                                message_type: get_data.message_type,
                                message: get_data.message,
                                constant_id: create_constant._id,
                            });

                            let update_last_message = await Models.Constants.updateOne(
                                {
                                    _id: create_constant._id
                                },
                                {
                                    $set: {
                                        last_msg_id: ObjectId(create_message._id),
                                        deleted_id: "",
                                    }
                                }
                            );

                            let msg_data = await Models.Chats.findOne({
                                _id: create_message._id
                            })
                                .populate({ path: 'userProfile', select: 'first_name last_name', alias: "userProfile" })
                                .populate({ path: 'otherUserProfile', select: 'first_name last_name', alias: "otherUserProfile" })


                            if (msg_data) {
                                let other_user_socket = await Models.OnlineUsers.findOne({
                                    user_id: get_data.other_user_id
                                })
                                if (other_user_socket) {
                                    io.to(other_user_socket.socket_id).emit('new_message', msg_data);
                                }
                                socket.emit('new_message2', msg_data)
                            }
                        }
                    }
                    else {
                        success_message = []
                        if (find_block.user_by == get_data.user_id) {
                            success_message = {
                                'success_message': 'You have blocked this user'
                            }
                        }
                        else {
                            success_message = {
                                'success_message': 'You are blocked by this user'
                            }
                        }
                        socket.emit('new_message', success_message);
                    }

                } catch (error) {
                    console.log(error)
                    throw error
                }
            });
            socket.on('get_users_chat', async function (data) {
                if (data) {
                    let get_data_chat = await fun.getUsersChat(data);
                    socket.emit('my_chat', get_data_chat);
                }

            });

            socket.on('get_chat_contacts_list', async function (data) {
                try {
                    console.log('get_chat_contacts_list')
                    if (data) {
                        var get_list = await fun.getChatContactsList(data);
                        if (get_list) {
                            socket.emit('get_contacts_list', get_list);
                        }

                    }
                } catch (error) {
                    console.log(error, "========error=========");
                }

            });
            socket.on('get_typing_list', async function (data) {
                try {
                    if (data) {
                        let message = "";
                        var get_list2 = await fun.get_typing_list(data);
                        get_id = await onlineUsers.findOne({
                            where: {
                                userid: data.user2Id
                            }

                        })
                        if (get_id) {
                            var get_list = await fun.get_chat_list(data);
                            io.to(get_id.socketId).emit('get_list', get_list);
                        }
                        if (data.status == 0) {
                            message = "typing off";
                        } else {
                            message = "typing on";
                        }
                        socket.emit('typing_listener', message);
                    }
                } catch (error) {
                    console.log(error, "========error=========");
                }

            });

            // socket.on('clear_chat', async function (clear_chat) {
            //     try {

            //         let clear_chat_data = await fun.clear_chat(clear_chat)
            //         success_message = []
            //         success_message = {
            //             'success_message': 'Chat Clear Successfully'
            //         }
            //         socket.emit('clear_data', success_message);

            //     } catch (error) {
            //         throw error
            //     }
            // });
            socket.on('delete_chat', async function (delete_chat) {
                try {

                    let delete_chat_data = await fun.delete_chat(delete_chat)
                    success_message = []
                    success_message = {
                        'success_message': 'Chat Deleted Successfully'
                    }

                    socket.emit('delete_data', success_message);

                } catch (error) {
                    throw error
                }
            });
            socket.on('disconnect', async function () {

                let socket_id = socket.id
                let socket_disconnect = await fun.socket_disconnect(socket_id)

                console.log('socket user disconnected');
            });
            socket.on('read_messages', async function (get_read_status) {

                let get_read_unread = await fun.get_read_unread_status(get_read_status);

                let onlineStatus = await Models.OnlineUsers.findOne({   //GETTING MESSAGE SENDER DETAIL
                    user_id: get_read_status.other_user_id
                })
                if (onlineStatus) {
                    io.to(onlineStatus.socket_id).emit('messages_read_noti_sender', { user_id: get_read_status.user_id });
                }
                socket.emit('read_status', get_read_unread)

            });


            socket.on('blockUnblock_user', async function (delete_chat) {
                try {

                    let blockUnblock_user = await fun.blockUnblock_user(delete_chat)
                    success_message = []
                    if (delete_chat.type == 1) {
                        success_message = {
                            'success_message': 'User Block Successfully'
                        }
                    }
                    else if (delete_chat.type == 2) {
                        success_message = {
                            'success_message': 'User unblock Successfully'
                        }
                    }
                    socket.emit('block_data', success_message);

                } catch (error) {
                    throw error
                }
            });

            socket.on('typing', async function (data) {
                try {

                    let onlineStatus = await Models.OnlineUsers.findOne({   //GETTING MESSAGE SENDER DETAIL
                        user_id: data.other_user_id
                    })
                    if (onlineStatus) {
                        io.to(onlineStatus.socket_id).emit('user_typing', {
                            user_id: data.other_user_id,
                            other_user_id: data.user_id
                        });
                    }

                } catch (error) {
                    throw error
                }
            });
        });
    }
    catch (err) {
        console.log(err)
    }

}