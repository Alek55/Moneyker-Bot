const mongoose = require('mongoose')
const Schema = mongoose.Schema

const LimitSchema = new Schema({
    uid: {
        type: Number,
        required: true,
    },
    limit: {
        type: Number,
        required: true,
    },
    month: { //номер месяца
        type: Number,
        required: true,
    },
    date: { //дата изменения
        type: Number,
        required: true,
    },
})

mongoose.model('limit', LimitSchema)