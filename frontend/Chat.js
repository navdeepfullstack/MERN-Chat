import './chat.css'
import openSocket from 'socket.io-client';
import { useEffect, useState, useRef } from 'react';
import { IoIosSend } from 'react-icons/io'
import { ImAttachment } from 'react-icons/im'
import { AiOutlineDelete } from 'react-icons/ai';
import { useDispatch, useSelector } from 'react-redux';
import { getUserProfiles } from 'redux/actions/profile';
import { ReactComponent as DoubleTickSvg } from 'assets/img/double-tick-icon.svg'
import { ReactComponent as FileSvg } from 'assets/img/file-svgrepo-com.svg'
import { USERS_PROFILE_SUCCESS } from 'redux/types';

const socket = openSocket(process.env.REACT_APP_SOCKET_URL);
const REACT_APP_CHAT_FILE_URL = process.env.REACT_APP_CHAT_FILE_URL


const Chat = () => {
    const { user } = useSelector((state) => state.auth);
    const { userProfiles } = useSelector((state) => state.profile);
    const dispatch = useDispatch();

    const [contacts, setContacts] = useState([])
    const [activeChat, setActiveChat] = useState(null)
    const [messages, setMessages] = useState(null)
    const [message, setMessage] = useState('')
    const [activeTab, setActiveTab] = useState()
    const [isTyping, setIsTyping] = useState(false)
    const [search, setSearch] = useState('')

    const fileInputRef = useRef(null)

    const [imageFiles, setImageFiles] = useState([]);
    const [images, setImages] = useState([]);
    const [pageRerender, setPageRerender] = useState('')
    // const [otherUserProfile, setOtherUserProfile] = useState(null)
    const endListRef = useRef()

    const scrollToBottom = () => {
        endListRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages]);

    const fileInputChangeHandler = (e) => {
        const { files } = e.target;
        const validImageFiles = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            // if (file.type.match(imageTypeRegex)) {
            validImageFiles.push(file);
            // }
        }
        if (validImageFiles.length) {
            setImageFiles(validImageFiles);
            return;
        }
        alert("Selected images are not of valid type!");
    };

    useEffect(() => {
        const images = [], fileReaders = [];
        let isCancel = false;
        if (imageFiles.length) {
            imageFiles.forEach((file) => {
                // console.log('file.type-------', file.type)
                const fileReader = new FileReader();
                fileReaders.push(fileReader);
                fileReader.onload = (e) => {
                    const { result } = e.target;
                    // console.log(result)
                    if (result) {
                        // console.log(result,  file.type)
                        images.push({ fileData: result, fileType: file.type })
                    }
                    if (images.length === imageFiles.length && !isCancel) {
                        setImages(images);
                    }
                }
                fileReader.readAsDataURL(file);
            })
        };
        return () => {
            isCancel = true;
            fileReaders.forEach(fileReader => {
                if (fileReader.readyState === 1) {
                    fileReader.abort()
                }
            })
        }
    }, [imageFiles]);

    const handleDelete = (idx) => {
        let filteredImages = images.filter((image, index) => index != idx)
        setImages(filteredImages)
    }


    useEffect(() => {
        if (user?._id) {
            let active_tab = localStorage.getItem('active_tab')
            setActiveTab(active_tab ? active_tab : 'chats')
            let active_chat = JSON.parse(localStorage.getItem('active_chat'))
            setActiveChat(active_chat ? active_chat : null)
            socket.emit('connect_user', { user_id: user?._id })
        }
    }, [])

    useEffect(() => {
        if (user && activeChat) {
            console.log("IN GET CHAT EMIT ")
            socket.emit('get_users_chat', {
                "user_id": user?._id,
                "other_user_id": activeChat?._id
            })
            socket.emit('read_messages', {
                "user_id": user?._id,
                "other_user_id": activeChat?._id
            })
        }
    }, [activeChat, pageRerender])


    useEffect(() => {
        if (user) {
            let timeout = setTimeout(() => {
                console.log("IN GET CONTACTS EMIT ")

                if (activeTab == 'chats') {
                    socket.emit('get_chat_contacts_list', { user_id: user?._id })
                }
                else if (activeTab == 'allUsers') {
                    dispatch(getUserProfiles({ access_token: `Bearer ${user.access_token}` }))
                }
            }, 500)

            return () => {
                console.log("CLEARING")
                clearTimeout(timeout);
            };

        }
    }, [activeTab, messages, search, pageRerender])


    const sendMessage = async () => {
        try {
            if (user) {

                console.log("SEND MESSAGE")

                if (message.trim().length > 0) {

                    socket.emit('send_message', {
                        "user_id": user?._id,
                        "other_user_id": activeChat?._id,
                        "message": message,
                        "message_type": 1
                    })
                    setMessage('')
                }

                if (images && images.length > 0) {
                    for await (let image of images) {
                        // console.log(image)
                        await delayingFunc(700)
                        socket.emit('send_message', {
                            "user_id": user?._id,
                            "other_user_id": activeChat?._id,
                            "message": image.fileData,
                            "message_type": image.fileType.includes('image') ? 3 : image.fileType.includes('video') ? 4 : 5,
                            //FOR IMAGE TYPE IS 3 , FOR VIDEO TYPE IS 4, FOR OTHER FILES TYPE IS 5
                            "extension": image.fileType.split('/')[1].includes('svg') ? 'svg' : image.fileType.split('/')[1]
                        })
                    }
                    setImages([])
                }
            }

        }
        catch (err) {
            console.log(err)
        }

    }

    function delayingFunc(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    useEffect(() => {
        let timeout;
        socket.on('user_typing', (data) => {
            console.log("user_typing")
            if (data.other_user_id == activeChat?._id) {
                clearTimeout(timeout)

                setIsTyping(true)
                timeout = setTimeout(() => {
                    console.log("IN SET TIMEOUT")
                    setIsTyping(false)
                }, 500)
            }
        })

        socket.on('my_chat', (data) => {
            console.log('my_chat ON')
            // console.log(data)
            setMessages(data)
        })

        socket.on('read_status', (data) => {
            console.log("MESSAGES READ")
        })

        socket.on('get_contacts_list', (data) => {
            console.log('get_contacts_list ON')
            setContacts(data)
        })


        socket.on('new_message', (data) => {
            console.log('new_message ON')
            // console.log(messages)
            if (data.user_id == activeChat?._id) {
                // console.log("SAME WINDOW")
                socket.emit('read_messages', {
                    "user_id": user?._id,
                    "other_user_id": activeChat?._id
                })
            }
            setPageRerender(Math.random().toString())

            // var msgDetail
            // if (messages && messages.hasOwnProperty('messagesList') && messages.messagesList.length > 0) {
            //     msgDetail = messages.messagesList.find((msg) => msg._id == data._id)
            // }

            // setMessages(((data.user_id == activeChat?._id) && !msgDetail) && { ...(messages ? messages : {}), messagesList: [...(messages ? messages.messagesList : []), data] })
        })

        socket.on('messages_read_noti_sender', (data) => {
            console.log("messages_read_noti_sender")
            if (activeChat && (data.user_id == activeChat?._id)) {
                // console.log("SAME WINDOW CHAT UPDATION")
                socket.emit('get_users_chat', {
                    "user_id": user?._id,
                    "other_user_id": activeChat?._id
                })
            }
        })

        socket.on('new_message2', (data) => {
            setPageRerender(Math.random().toString())

            // console.log("new_message2 ON")
            // // console.log(messages)
            // var msgDetail
            // if (messages && messages.hasOwnProperty('messagesList') && messages.messagesList.length > 0) {
            //     msgDetail = messages.messagesList.find((msg) => msg._id == data._id)
            // }

            // setMessages(!msgDetail && { ...(messages ? messages : {}), messagesList: [...(messages ? messages.messagesList : []), data] })
        })


        return () => {
            socket.off()
        }
    }, [socket, messages, contacts, activeChat, activeTab])


    const handleTyping = () => {
        socket.emit('typing', { user_id: user?._id, other_user_id: activeChat?._id })
    }

    const handleSearchInputChange = (e) => {
        setSearch(e.target.value)
    }

    const handleSearchButtonClick = () => {
        if (search.trim().length > 0) {
            let regex = new RegExp(search, 'i');
            if (activeTab == 'chats') {
                let filteredContacts = contacts.filter((ele) => ele.otherUserDetails.first_name.match(regex) || ele.otherUserDetails.last_name.match(regex)
                )
                setContacts(filteredContacts)
            }
            if (activeTab == 'allUsers') {
                let filteredContacts = userProfiles.filter((ele) => ele.first_name.match(regex) || ele.last_name.match(regex)
                )

                dispatch({
                    type: USERS_PROFILE_SUCCESS,
                    payload: filteredContacts
                })
            }
        }
    }


    const downloadFile = (message) => {
        try {
            if (message.message_type != 1) {
                fetch(REACT_APP_CHAT_FILE_URL + '/' + message.message).then(response => {
                    response.blob().then(blob => {
                        // Creating new object of PDF file
                        const fileURL = window.URL.createObjectURL(blob);
                        // Setting various property values
                        let alink = document.createElement('a');
                        alink.href = fileURL;
                        alink.download = message.message;
                        alink.click();
                    })
                })
            }
        }
        catch (err) {
            console.log(err)
        }
    }

    return (
        <div className="container">
            <div className="row clearfix">
                <div className="col-lg-12">
                    <div className="card chat-app">
                        <div id="plist" className="people-list">
                            <div className="input-group">

                                <input type="text" className="form-control" placeholder="Search..."
                                    value={search}
                                    onChange={handleSearchInputChange}
                                    onKeyPress={(e) => {
                                        if (e.key === "Enter") {
                                            handleSearchButtonClick()
                                        }
                                    }}
                                />
                                <div className="input-group-prepend" style={{ cursor: "pointer" }} onClick={handleSearchButtonClick}>
                                    <span className="input-group-text"><i className="fa fa-search"></i></span>
                                </div>
                            </div>
                            <div>
                                <nav className="nav nav-pills nav-fill">

                                    <span className={`nav-link ${activeTab == 'chats' && "active"}`} aria-current="page" onClick={() => {
                                        setActiveTab('chats')
                                        localStorage.setItem('active_tab', 'chats')
                                    }}>Chats</span>

                                    <span className={`nav-link ${activeTab == 'allUsers' && "active"}`} onClick={() => {
                                        setActiveTab('allUsers')
                                        localStorage.setItem('active_tab', 'allUsers')
                                    }}>All Users</span>

                                </nav>
                            </div>
                            {activeTab == 'chats' ?
                                <ul className="list-unstyled chat-list mt-2 mb-0">

                                    {
                                        contacts?.map((contact) => {
                                            return (
                                                <li className={`clearfix ${contact?.otherUserId == activeChat?._id && "active"}`} onClick={() => {
                                                    let activeChatObj = { _id: contact.otherUserId, first_name: contact.otherUserDetails.first_name, last_name: contact.otherUserDetails.last_name }

                                                    setActiveChat(activeChatObj);

                                                    localStorage.setItem('active_chat', JSON.stringify(activeChatObj))

                                                }} key={Math.random()}>
                                                    <div className="user-layout">
                                                        <img src="https://bootdey.com/img/Content/avatar/avatar1.png" alt="avatar" />
                                                        <div className="about">
                                                            <div className="name">{`${contact?.otherUserDetails?.first_name} ${contact?.otherUserDetails?.last_name}`}</div>
                                                            {<div className="message">
                                                                {contact.msgDetails
                                                                    &&
                                                                    <>
                                                                        {
                                                                            contact.msgDetails.message_type == 3
                                                                                ?
                                                                                'Image'
                                                                                :
                                                                                contact.msgDetails.message_type == 4
                                                                                    ?
                                                                                    'Video'
                                                                                    :
                                                                                    contact.msgDetails.message_type == 5
                                                                                        ?
                                                                                        "File"
                                                                                        :
                                                                                        contact.msgDetails.message}
                                                                                        {
                                                                                            console.log(contact.msgDetails.createdAt)
                                                                                        }

                                                                        {
                                                                            contact.msgDetails.createdAt.split('T')[0] == new Date().toJSON().split('T')[0] ?
                                                                                <small>{new Date(contact.msgDetails.createdAt).toLocaleTimeString().slice(0, 5)}</small>
                                                                                :
                                                                                <small>{contact.msgDetails.createdAt.split('T')[0]}</small>

                                                                        }
                                                                    </>
                                                                }
                                                            </div>
                                                            }
                                                        </div>
                                                    </div>
                                                </li>
                                            )
                                        })
                                    }
                                </ul>
                                :
                                <ul className="list-unstyled chat-list mt-2 mb-0">
                                    {
                                        userProfiles?.map((contact) => {
                                            if (contact._id != user._id) {
                                                return (
                                                    <li key={Math.random()} className={`clearfix ${contact?._id == activeChat?._id && "active"}`} onClick={() => {
                                                        let activeChatObj = { _id: contact._id, first_name: contact.first_name, last_name: contact.last_name };
                                                        setActiveChat(activeChatObj);
                                                        localStorage.setItem('active_chat', JSON.stringify(activeChatObj))

                                                    }} >
                                                        <img src="https://bootdey.com/img/Content/avatar/avatar1.png" alt="avatar" />
                                                        <div className="about">
                                                            <div className="name">{`${contact.first_name} ${contact.last_name}`}</div>
                                                        </div>
                                                    </li>
                                                )
                                            }
                                            else {
                                                return <p key={Math.random()} ></p>
                                            }

                                        })
                                    }
                                </ul>
                            }

                        </div>
                        {
                            activeChat ?
                                <div className="chat">
                                    <div className="chat-header clearfix">
                                        <div className="row">
                                            <div className="col-lg-6">

                                                <>
                                                    <a data-toggle="modal" data-target="#view_info">
                                                        <img src="https://bootdey.com/img/Content/avatar/avatar2.png" alt="avatar" />
                                                    </a>
                                                    <div className="chat-about">

                                                        <h6 className="m-b-0">{`${activeChat?.first_name} ${activeChat?.last_name}`}</h6>

                                                        {isTyping && <small>Typing...</small>}

                                                        {messages ?
                                                            (
                                                                messages.otherUserProfile.onlineDetails.status
                                                                    ?
                                                                    <>
                                                                        <small>Online
                                                                            <i className={`fa fa-circle online`}></i>
                                                                        </small>
                                                                    </>
                                                                    :
                                                                    <>
                                                                        <small>Offline
                                                                            <i className={`fa fa-circle offline`}></i>
                                                                        </small>

                                                                        <small>{" Last seen at " + new Date(messages.otherUserProfile.onlineDetails.updatedAt).toLocaleString()}</small>
                                                                    </>
                                                            )
                                                            : <small></small>}

                                                    </div>
                                                </>
                                            </div>

                                        </div>
                                    </div>
                                    <div className="chat-history">
                                        <ul className="m-b-0">
                                            {
                                                messages?.messagesList?.map((message) => {
                                                    if (message.user_id == user?._id) {
                                                        return (
                                                            <li className="clearfix" key={Math.random()}>
                                                                <div className="message-data text-right">
                                                                    <span className="message-data-time">{new Date(message.createdAt).toLocaleString()}</span>
                                                                </div>
                                                                <div className="message my-message float-right" onClick={() => downloadFile(message)}>
                                                                    {
                                                                        message.message_type == 3
                                                                            ?
                                                                            <img height={100} width={150} src={`${REACT_APP_CHAT_FILE_URL}/${message.message}`} alt="avatar" />
                                                                            :
                                                                            (
                                                                                message.message_type == 4
                                                                                    ?
                                                                                    <video width={300} height={240} src={`${REACT_APP_CHAT_FILE_URL}/${message.message}`} alt="avatar" />
                                                                                    : (
                                                                                        message.message_type == 5
                                                                                            ?
                                                                                            <FileSvg width="30" height="30" />
                                                                                            :
                                                                                            message.message
                                                                                    )
                                                                            )
                                                                    }
                                                                    <DoubleTickSvg width="15" height="15" style={(message.read_status ? { fill: "#46d146" } : {})} />

                                                                </div>
                                                            </li>
                                                        )
                                                    }
                                                    else {
                                                        return (
                                                            <li className="clearfix" key={Math.random()}>
                                                                <div className="message-data">
                                                                    <img src="https://bootdey.com/img/Content/avatar/avatar7.png" alt="avatar" />

                                                                    <span className="message-data-time">{new Date(message.createdAt).toLocaleString()}</span>

                                                                </div>
                                                                <div className="message other-user-message" onClick={() => downloadFile(message)}>
                                                                    {
                                                                        message.message_type == 3
                                                                            ?
                                                                            <img height={100} width={150} src={`${REACT_APP_CHAT_FILE_URL}/${message.message}`} alt="avatar" />
                                                                            :
                                                                            (
                                                                                message.message_type == 4
                                                                                    ?
                                                                                    <video width={300} height={240} src={`${REACT_APP_CHAT_FILE_URL}/${message.message}`} alt="avatar" />
                                                                                    :
                                                                                    (
                                                                                        message.message_type == 5
                                                                                            ?
                                                                                            <FileSvg width="30" height="30" />

                                                                                            :
                                                                                            message.message
                                                                                    )
                                                                            )
                                                                    }
                                                                </div>
                                                            </li>
                                                        )

                                                    }

                                                })
                                            }
                                            <li ref={endListRef} />

                                        </ul>
                                    </div>
                                    {
                                        images.length > 0 ?
                                            <div>

                                                {
                                                    images.map((image, idx) => {
                                                        if (image.fileType.includes('image')) {
                                                            return (
                                                                <>
                                                                    <div style={{ width: "100px", height: "75px", postion: "relative" }} key={Math.random()} >
                                                                        <span><AiOutlineDelete style={{ color: "red", cursor: "pointer" }} onClick={() => handleDelete(idx)} /></span>
                                                                        <p key={idx}> <img src={image.fileData} alt="" style={{ height: "200px", width: "240px" }} /> </p>
                                                                    </div>
                                                                </>
                                                            )
                                                        }
                                                        if (image.fileType.includes('video')) {
                                                            return (
                                                                <>
                                                                    <div style={{ width: "100px", height: "75px", postion: "relative" }} key={Math.random()} >
                                                                        <span><AiOutlineDelete style={{ color: "red", cursor: "pointer" }} onClick={() => handleDelete(idx)} /></span>
                                                                        <p key={idx}> <video width={200} height={240} src={image.fileData} alt="" /> </p>
                                                                    </div>
                                                                </>
                                                            )
                                                        }

                                                        if (image.fileType.includes('application')) {
                                                            return (
                                                                <>
                                                                    <div style={{ width: "100px", height: "75px", postion: "relative" }} key={Math.random()} >
                                                                        <span><AiOutlineDelete style={{ color: "red", cursor: "pointer" }} onClick={() => handleDelete(idx)} /></span>
                                                                        <p key={idx}>
                                                                            <FileSvg width={100} height={100} />
                                                                        </p>
                                                                    </div>
                                                                </>
                                                            )
                                                        }

                                                    })
                                                }
                                                {/* <div >
                                                    <span onClick={sendMessage} ><IoIosSend style={{ fontSize: "1.4rem", color: '#4773ff' }} /></span>
                                                </div> */}
                                            </div> : null
                                    }
                                    <div className="chat-message clearfix">
                                        <div className="input-group mb-0">
                                            <input type="text"
                                                className="form-control"
                                                id='chatInput'
                                                placeholder="Enter text here..."
                                                onChange={(e) => setMessage(e.target.value)}
                                                value={message}
                                                onKeyPress={(e) => {
                                                    if (e.key === "Enter") {
                                                        sendMessage()
                                                    }
                                                }}
                                                onKeyDown={handleTyping}
                                            />

                                            <div className="input-group-prepend"
                                                style={{
                                                    "cursor": "pointer"
                                                }}
                                                onClick={() => fileInputRef.current.click()}
                                            >
                                                <span className="input-group-text" ><ImAttachment style={{ fontSize: "1.4rem", color: '#8f8f8f' }} />
                                                    <input type="file" id="file" accept="audio/*, image/*, video/*, .doc, .docx, .pdf" style={{ display: "none" }} ref={fileInputRef} multiple onChange={fileInputChangeHandler} />
                                                </span>
                                            </div>

                                            <div className="input-group-prepend"
                                                style={{
                                                    "cursor": "pointer"
                                                }}
                                                onClick={sendMessage}>
                                                <span className="input-group-text" ><IoIosSend style={{ fontSize: "1.4rem", color: '#4773ff' }} /></span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                :
                                <div className='chat'>
                                    <div className="chat-header clearfix">
                                        <div className="row">
                                            <div className="col-lg-6">

                                                {/* <h3>Select a contact to start chatting...</h3> */}

                                            </div>

                                        </div>
                                    </div>
                                    <div className="chat-history">
                                        <h3>Select a contact to start chatting...</h3>
                                    </div>
                                </div>
                        }
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Chat


