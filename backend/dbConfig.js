'use strict';

let mongoURI = "";

if (process.env.NODE_ENV === "test") {
    mongoURI = ``;
} else if (process.env.NODE_ENV === "dev") {
    mongoURI = ``
    mongoURI = `mongodb+srv://${process.env.MONGO_DB_USER}:${process.env.MONGO_DB_PASSWORD}@${process.env.MONGO_DB_HOST}/${process.env.MONGO_DB_NAME}?retryWrites=true&w=majority`
} else if (process.env.NODE_ENV === "local") {
    mongoURI = dburl;
}


module.exports = {
    mongo: mongoURI
};
