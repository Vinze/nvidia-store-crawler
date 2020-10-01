# NVIDIA store crawler

Check if the RTX 3080 FE card is in stock in the NVIDIA store. Note, it only checks the dutch store, change the URL's in the config.json file to check for other site/API url's.

## Installation

- clone this repo
- run `npm install`
- rename config.json.example to config.json
- run the app with `node app.js`
- go to http://localhost:3000

## Telegram bot
If you want to be notified by your telegram bot:
- update the config.json file with the telegram bot API token
- create a telegram bot