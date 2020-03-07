const mongoose = require('mongoose')
const Schema = mongoose.Schema

const CostSchema = new Schema({
    uid: {
        type: Number,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    cost: {
        type: Number,
        required: true,
    },
    month: {
        type: Number,
        required: true,
    },
    date: {
        type: Number,
        required: true,
    },
})

mongoose.model('cost', CostSchema)