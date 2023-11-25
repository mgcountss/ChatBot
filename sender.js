import puppeteer from 'puppeteer-extra';
import StealthPlugin from "puppeteer-extra-plugin-stealth"
import fs from 'fs';
import { log } from 'console';
const stealthPlugin = StealthPlugin();
puppeteer.use(stealthPlugin)
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
let isRunning = true;
let page;
let loginPage;
let browser;

setInterval(async () => {
    if (!isRunning && queue.length > 0) {
        isRunning = true;
        console.log('new', queue);
        currentMSGThing = {
            "message": queue[0],
            "sent": false
        };
        try {
            await page.waitForSelector('yt-live-chat-text-input-field-renderer');
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
            console.log('error, cant find input field');
            loginToYT();
        } finally {
            isRunning = false;
        }
    }
}, 1000);

let toCall = 0;
if (!fs.existsSync('./user_data')) {
    toCall = 1;
}

puppeteer.launch({ headless: true, args: ['--no-sandbox'], userDataDir: "./user_data" }).then(async browser2 => {
    browser = browser2;
    if (toCall === 1) {
        loginToYT();
    } else {
        pageSetup();
    }
})
async function pageSetup() {
    console.log('page setup');
    page = await browser.newPage()
    await page.setViewport({ width: 1000, height: 600 })
    await page.setJavaScriptEnabled(true)
    await page.goto('https://www.youtube.com/live_chat?is_popout=1&v=' + process.argv[3])
    await page.setRequestInterception(true);
    page.on('request', async request => {
        if (request.url().includes('send_message')) {
            let data = request.postData();
            data = JSON.parse(data);
            console.log(currentMSGThing.message, data.richMessage.textSegments[0].text, currentMSGThing.message == data.richMessage.textSegments[0].text)
            data.richMessage.textSegments[0].text = currentMSGThing.message;
            request.continue({ postData: JSON.stringify(data) });
            currentMSGThing.sent = true;
        }
    });
    setTimeout(async () => {
        await page.close();
        pageSetup()
    }, 1000 * 60 * 60);
    isRunning = false;
}

async function loginToYT() {
    console.log('login');
    let email = fs.readFileSync('./user/login.txt', 'utf8');
    email = email.split('login:')[1].split('password:')[0];
    let password = fs.readFileSync('./user/login.txt', 'utf8');
    password = password.split('password:')[1];
    loginPage = await browser.newPage()
    await loginPage.setViewport({ width: 1000, height: 600 })
    await loginPage.setJavaScriptEnabled(true)
    await loginPage.goto('https://www.youtube.com')
    await loginPage.waitForSelector("#buttons > ytd-button-renderer > yt-button-shape > a");
    //await loginPage.screenshot({ path: 'screenshot.png' });
    await loginPage.click("#buttons > ytd-button-renderer > yt-button-shape > a");
    console.log('sign up')
    await delay(2000);
    //await loginPage.screenshot({ path: 'screenshot.png' });
    await loginPage.waitForSelector('input[type="email"]');
    await loginPage.type('input[type="email"]', email);
    await loginPage.keyboard.press('Enter');
    await delay(2000);
    console.log('email')
    //await loginPage.screenshot({ path: 'screenshot.png' });
    await loginPage.waitForSelector('input[type="password"]');
    await loginPage.type('input[type="password"]', password);
    await loginPage.keyboard.press('Enter');
    await delay(2000);
    console.log('password')
    await loginPage.close();
    pageSetup()
}