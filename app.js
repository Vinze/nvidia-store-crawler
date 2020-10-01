const axios = require('axios');
const cheerio = require('cheerio');
const colors = require('colors');
const TelegramBot = require('node-telegram-bot-api');
const dayjs = require('dayjs');
const sound = require('sound-play');
const path = require('path');
const config = require('./config.json');
const handler = require('serve-handler');
const http = require('http');
const os = require('os');

const server = http.createServer((request, response) => {
    var remote_ip = request.ip
            || request.connection.remoteAddress
            || request.socket.remoteAddress
            || request.connection.socket.remoteAddress;

    var allowed = ['*'];

    if ( ! allowed.includes('*') && ! allowed.includes(remote_ip)) {
        writeLog('Access denied for '.red + remote_ip.red);

        response.writeHead(403, { 'Content-Type': 'text/plain' });
        response.write('403 - Forbidden');
        response.end();

        return;
    }

    return handler(request, response, { public: './public' });
}).listen(3000);

const io = require('socket.io')(server);

var bot;

function writeLog(text) {
    console.log('[' + dayjs().format('HH:mm:ss') + '] ' + text);
}

function sendTelegramMsg(status) {
    playSound();
    if (config.telegram_token) {
        writeLog('Sending Telegram message'.brightCyan);
        bot.sendMessage(14534985, "NVIDIA store stock changed: `" + status + "`\n[Open the NVIDIA store](" + config.site.url + ")", { parse_mode: 'markdown' });
    }
}

function sendSocketMsg(from, text, classname) {
    io.emit('message', {
        ts: dayjs().format('HH:mm:ss'),
        from: from,
        text: text,
        classname: classname
    });
}

function playSound() {
    io.clients(function(error, clients) {
        if (clients.length == 0 && os.platform() == 'win32') {
            var filepath = path.join(__dirname, '/public/horn.mp3');
            sound.play(filepath);
            writeLog('Playing the horn'.brightCyan);
        }
    });
}

function checkSite() {
    axios.get(config.site.url).then((response) => {
        var $ = cheerio.load(response.data);
        var status = $('.cta-button').first().text();

        if (status && status != config.site.nostock) {
            sendTelegramMsg(status);
            sendSocketMsg('Site', status, 'in-stock');
            writeLog('Site status: ' + status.brightGreen);
        } else {
            sendSocketMsg('Site', status, 'no-stock');
            writeLog('Site status: ' + status.brightYellow);
        }
    }).catch((error) => {
        sendSocketMsg('Site', error.message, 'error');
        writeLog('Site status: ' + error.message.brightRed);
    });

    setTimeout(checkSite, config.refresh_seconds * 1000);
}

function checkAPI() {
    axios.get(config.api.url).then((response) => {
        var status = response.data.products.product[0].inventoryStatus.status;
        if (status && status != config.api.nostock) {
            sendTelegramMsg(status);
            sendSocketMsg('API', status, 'in-stock');
            writeLog('API status:  ' + status.brightGreen);
        } else {
            sendSocketMsg('API', status, 'no-stock');
            writeLog('API status:  ' + status.brightYellow);
        }
    }).catch((error) => {
        sendSocketMsg('API', error.message, 'error');
        writeLog('API status:  ' + error.message.brightRed);
    });

    setTimeout(checkAPI, config.refresh_seconds * 1000);
}

io.on('connection', (socket) => {
    writeLog('An user has connected'.brightCyan);
    sendSocketMsg('App', 'An user has connected', 'info');

    socket.on('disconnect', (socket) => {
        writeLog('An user has disconnected'.brightCyan);
        sendSocketMsg('App', 'An user has disconnected', 'info');
    });
});


if (config.telegram_token) {
    bot = new TelegramBot(config.telegram_token, { polling: true });

    bot.on('message', (msg) => {
        bot.sendMessage(msg.chat.id, 'NVIDIA store check is actief!');
    });
}


checkSite();
checkAPI();

writeLog('App is succesvol gestart op http://localhost:3000'.brightCyan);