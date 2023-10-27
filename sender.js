import puppeteer from 'puppeteer-extra';
import StealthPlugin from "puppeteer-extra-plugin-stealth"
import fs from 'fs';
puppeteer.use(StealthPlugin())
let queue = [];
process.on('message', (message) => {
    queue.push(message);
});

function delay(time) {
    return new Promise(function (resolve) {
        setTimeout(resolve, time)
    });
}
let currentMSGThing = { "message": "", "sent": true }
let isRunning = false;
let page;

setInterval(async () => {
    if (!isRunning && queue.length > 0) {
        isRunning = true;
        console.log('new', queue);
        currentMSGThing = {
            "message": queue[0],
            "sent": false
        };
        try {
            await page.click('yt-live-chat-text-input-field-renderer');
            console.log('click')
            await page.keyboard.type(queue[0]);
            console.log('type')
            await delay(500);
            await page.keyboard.press('Enter');
            console.log('enter')
            while (currentMSGThing.sent === false) {
                await delay(100);
            }
            queue.shift();
            console.log('end', queue);
        } catch (e) {
            console.log(e);
        } finally {
            isRunning = false;
        }
    }
}, 1000);

puppeteer.launch({ headless: true, args: ['--no-sandbox'] }).then(async browser => {
    page = await browser.newPage()
    await page.setExtraHTTPHeaders(JSON.parse(fs.readFileSync('./user/headers.json', 'utf8')));
    let cookies = fs.readFileSync('./user/cookies.txt', 'utf8');
    cookies = cookies.split('; ');
    for (let i = 0; i < cookies.length; i++) {
        if (!cookies[i].includes('Secure')) {
            const cookie = cookies[i];
            const name = cookie.split('=')[0];
            const value = cookie.split('=')[1];
            await page.setCookie({ name: name, value: value, domain: '.youtube.com' });
        }
    }
    await page.setViewport({ width: 1000, height: 600 })
    await page.setJavaScriptEnabled(true)
    await page.goto('https://www.youtube.com/live_chat?is_popout=1&v=' + process.argv[3])
    await page.setRequestInterception(true);
    page.on('request', async request => {
        if (request.url().includes('send_message')) {
            let data = request.postData();
            data = JSON.parse(data);
            console.log(currentMSGThing.message, data.richMessage.textSegments[0].text, currentMSGThing.message == data.richMessage.textSegments[0].text)
            if (data.richMessage.textSegments[0].text == currentMSGThing.message) {
                currentMSGThing.sent = true;
                request.continue({ postData: JSON.stringify(data) });
            } else {
                data.richMessage.textSegments[0].text = currentMSGThing.message;
                request.continue({ postData: JSON.stringify(data) });
                currentMSGThing.sent = true;
            }
        }
    });
})