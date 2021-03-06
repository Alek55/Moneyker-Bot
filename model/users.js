const mongoose = require('mongoose')
const Schema = mongoose.Schema

const UserSchema = new Schema({
    id: {
        type: Number,
        required: true
    },
    date: {
        type: Number,
        required: true,
    },
})

mongoose.model('users', UserSchema)