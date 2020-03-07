process.env.NTBA_FIX_319 = 1;

const TelegramBot = require('node-telegram-bot-api')
const mongoose = require('mongoose')
//const Agent = require('socks5-https-client/lib/Agent')
const config = require('./config')

mongoose.connect(config.db).then(() => {console.log('MongoDB connected')}).catch((e) => {console.log('MongoDB error: '+e)})

require('./model/users')
require('./model/costs')
require('./model/limit')
const Users = mongoose.model('users')
const Cost = mongoose.model('cost')
const Limit = mongoose.model('limit')

// ==============================================

const bot = new TelegramBot(config.TOKEN, {
    polling: {
        interval: 300,
        autoStart: true,
        params: {
            timeout: 10
        }
    },
    // request: {
    //     agentClass: Agent,
    //     agentOptions: {
    //         socksHost: '127.0.0.1',
    //         socksPort: 9150,
    //         // If authorization is needed:
    //         // socksUsername: process.env.PROXY_SOCKS5_USERNAME,
    //         // socksPassword: process.env.PROXY_SOCKS5_PASSWORD
    //     }
    // }
})

bot.on('message', msg => {
    const chat_id = msg.chat.id
    const month = getMonth()

    switch (msg.text) {
        case config.keyboard.show:
            let sum = 0
            let limit = 0
            Cost.find({uid: chat_id, month: month}).then(data => {
                if(data[0]) {
                    data.forEach((item) => {
                        sum += item.cost
                    })
                }
                Limit.find({uid: chat_id, month: month}).then(lim => {
                    limit = lim[0].limit
                    let text = `Лимит на месяц - ${limit} руб.\n`
                    text += `Потрачено в этом месяце - ${sum} руб.\n`

                    const res = limit - sum
                    if(res < 0) text += `Вы ушли в минус на ${res} руб.`
                    else text += `У вас осталось ${res} руб.`
                    sendWidthKeyboard(chat_id, text)
                })
            })
            break;
        case config.keyboard.showToday:
            let sum1 = 0
            let all_sum1 = 0
            let limit1 = 0

            const current_date = new Date()
            const current_year = current_date.getFullYear()
            const current_month = current_date.getMonth()
            const current_day = current_date.getDate()

            const search_date = new Date(current_year, current_month, current_day, 0, 0, 0).getTime()

            //date: {$gte: search_date}
            Cost.find({uid: chat_id}).then(data => {
                data.forEach((item) => {
                    if(item.date >= search_date) sum1 += Number(item.cost)
                    all_sum1 += Number(item.cost)
                })

                Limit.find({uid: chat_id, month: month}).then(lim => {
                    limit1 = lim[0].limit
                    let text = `Лимит на месяц - ${limit1} руб.\n`
                    text += `Потрачено за сегодня - ${sum1} руб.\n`

                    const res = limit1 - all_sum1
                    if(res < 0) text += `Вы ушли в минус на ${res} руб.`
                    else text += `У вас осталось ${res} руб.`
                    sendWidthKeyboard(chat_id, text)
                })
            })
            break;
        case config.keyboard.showListPays:
            Cost.find({uid: chat_id, month: month}).then(data => {
                let html = ``
                if(data[0]) {
                    data.forEach(item => {
                        const d = new Date(item.date)
                        html += `<strong>${item.cost} руб. - </strong>`
                        html += `<i>${item.description} - </i>`
                        html += `${d.getDate()+'.'+(Number(d.getMonth())+1)+'.'+d.getFullYear()+' '+d.getHours()+':'+d.getMinutes()+':'+d.getSeconds()}\n`
                    })
                }
                else html = 'У вас не было оплат в этом месяце'
                sendHtmlWidthKeyboard(chat_id, html)
            })
            break;
        case config.keyboard.showListPaysToday:
            const current_date1 = new Date()
            const current_year1 = current_date1.getFullYear()
            const current_month1 = current_date1.getMonth()
            const current_day1 = current_date1.getDate()

            const search_date1 = new Date(current_year1, current_month1, current_day1, 0, 0, 0).getTime()
            Cost.find({uid: chat_id, date: {$gte: search_date1}}).then(data => {
                let html = ``
                if(data[0]) {
                    data.forEach(item => {
                        const d = new Date(item.date)
                        html += `<strong>${item.cost} руб. - </strong>`
                        html += `<i>${item.description} - </i>`
                        html += `${d.getDate()+'.'+(Number(d.getMonth())+1)+'.'+d.getFullYear()+' '+d.getHours()+':'+d.getMinutes()+':'+d.getSeconds()}\n`
                    })
                }
                else html = 'У вас не было оплат за сегодня'
                sendHtmlWidthKeyboard(chat_id, html)
            })
            break;
        // case config.keyboard.statMonths:
        //     break;
    }
})

bot.onText(/\/start/, msg => {
    const chat_id = msg.chat.id

    Users.find({id: chat_id}).then(user => {
        return new Promise((resolve, reject) => {
            if(!user[0]) {
                new Users({
                    id: chat_id,
                    date: getTime()
                }).save()
            }
            resolve(chat_id)
        })
    })
    .then(user_id => {
        return Limit.find({uid: user_id})
    })
    .then(lim => {
        let is_limit = false
        if(lim[0]) is_limit = true

        if(!is_limit) {
            const text = `
Привет, ${msg.from.first_name}!
Установи лимит на текущий месяц.
Введи команду /limit и сумму.
Пример - /limit 10000
`
            send(chat_id, text)
        }
        else {
            const text = `Привет, ${msg.from.first_name}!\nВыбери команду для начала работы`
            sendWidthKeyboard(chat_id, text)
        }
    })
})

bot.onText(/\/limit (.+)/, (msg, arr) => {
    //arr - [/limit 10000, 10000]
    const month = getMonth()
    const {id} = msg.chat

    if(!Number(arr[1])) {
        sendWidthKeyboard(id, 'Вы ввели неверные данные')
        return false
    }

    Limit.find({uid: id, month: month}).then(lim => {
        if(lim[0]) {
            Limit.update({uid: id, month: month}, {$set: {limit: arr[1]}}).then(res => console.log('ok'))
        }
        else {
            new Limit({
                uid: id,
                date: getTime(),
                limit: arr[1],
                month: month
            }).save()
        }
    })
    const text = `
Лимит изменен на ${arr[1]} руб.
Чтобы добавить оплату, введите команду - /add сумма_описание оплаты.
Пример - "/add 500_оплата интернета". 
Чтобы посмотреть статистику, используйте нужные кнопки внизу.
    `
    sendWidthKeyboard(id, text)
})

bot.onText(/\/add (.+)/, (msg, arr) => {
    const {id} = msg.chat
    const month = getMonth()

    const data = arr[1].split('_')
    if(!Number(data[0])) {
        sendWidthKeyboard(id, 'Вы ввели неверные данные')
    }
    else {
        new Cost({
            uid: id,
            description: data[1],
            cost: Number(data[0]),
            date: getTime(),
            month: month
        }).save()

        sendWidthKeyboard(id, 'Готово!')
    }
})

function sendWidthKeyboard(id, text) {
    const kb = config.keyboard
    bot.sendMessage(id, text, {
        reply_markup: {
            keyboard: [
                [kb.show, kb.showToday],
                [kb.showListPays, kb.showListPaysToday],
                // [kb.statMonths],
            ]
        }
    })
}

function sendHtmlWidthKeyboard(id, text) {
    const kb = config.keyboard
    bot.sendMessage(id, text, {
        reply_markup: {
            keyboard: [
                [kb.show, kb.showToday],
                [kb.showListPays, kb.showListPaysToday],
                // [kb.statMonths],
            ]
        },
        parse_mode: 'HTML'
    })
}

function send(id, text) {
    bot.sendMessage(id, text)
}

function getMonth() {
    return new Date().getMonth()
}

function getTime() {
    return new Date().getTime()
}

// bot.onText(/\/show/, msg => {
//     const {id} = msg.chat
//     bot.sendMessage(id, `1000 руб`)
// })
// bot.onText(/\/commands/, msg => {
//     const {id} = msg.chat
//     bot.sendMessage(id, `Выберите нужное`, {
//         reply_markup: {
//             keyboard: [
//                 [{
//                     text: 'Показать затраты'
//                 }, 'Изменить лимит'],
//                 ['Добавить затраты', 'Закрыть']
//             ],
//             one_time_keyboard: true
//         }
//     })
// })

// bot.on('message', (msg) => {
//     const {id} = msg.chat
//
//     if(msg.text.toLowerCase() === 'привет') {
//         bot.sendMessage(id, `Привет! ${msg.from.first_name}`)
//     }
//     else if(msg.text === 'Закрыть') {
//         bot.sendMessage(id, `OK`, {
//             reply_markup: {
//                 remove_keyboard: true
//             }
//         })
//     }
//     else if(msg.text === 'Изменить лимит') {
//         bot.sendMessage(id, ``)
//     }
//     else {
//         bot.sendMessage(id, `Выберите нужное`, {
//             reply_markup: {
//                 keyboard: [
//                     ['Показать затраты', 'Изменить лимит'],
//                     ['Добавить затраты', 'Закрыть']
//                 ],
//                 one_time_keyboard: true
//             }
//         })
//     }
// })