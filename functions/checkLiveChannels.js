import fs from 'fs';
import db from '../functions/db.js';
import chatbot from '../chatbot.js';
import fetch from 'node-fetch';

async function getStream(id, id2) {
    try {
        let url = 'https://www.youtube.com/watch?v=' + id2;
        let bodyText = await fetch(url).then(res => res.text());
        let stream = bodyText.match(/(?<=hlsManifestUrl":").*\.m3u8/g);
        if (stream) {
            let id = bodyText.split(`<link rel="canonical" href="https://www.youtube.com/watch?v=`)[1].split(`">`)[0];
            let title = bodyText.split(`<title>`)[1].split(` - YouTube</title>`)[0];
            let viewers = bodyText.split(`viewCount":{"runs":[{"text":"`)[1].split(`"`)[0];
            return {
                "stream": {
                    "id": id,
                    "title": title,
                    "viewers": viewers,
                }
            };
        } else {
            let url = 'https://www.youtube.com/channel/' + id + '/live';
            //let url = 'https://www.youtube.com/watch?v=pnZ8bRsjSAs'// + id2;
            let bodyText = await fetch(url).then(res => res.text());
            let stream = bodyText.match(/(?<=hlsManifestUrl":").*\.m3u8/g);
            if (stream) {
                let id = bodyText.split(`<link rel="canonical" href="https://www.youtube.com/watch?v=`)[1].split(`">`)[0];
                let title = bodyText.split(`<title>`)[1].split(` - YouTube</title>`)[0];
                let viewers = bodyText.split(`viewCount":{"runs":[{"text":"`)[1].split(`"`)[0];
                return {
                    "stream": {
                        "id": id,
                        "title": title,
                        "viewers": viewers,
                    }
                };
            } else {
                return ({ "stream": null });
            }
        }
    } catch (e) {
        return ({ "stream": null });
    }
}

async function checkLiveChannels() {
    try {
        if (!fs.existsSync('./user/db')) return false;
        let settings = JSON.parse(fs.readFileSync('./user/db/settings.json'));
        if (settings && settings.chatbot) {
            if (!settings.chatbot.enabled) {
                return false;
            }
        }
        let connection = JSON.parse(fs.readFileSync('./user/db/connection.json'));
        let stream = JSON.parse(fs.readFileSync('./user/db/stream.json'));
        if (connection.channel) {
            function redoThing(already) {
                if ((stream.id != "") && (stream.id != undefined) && (stream.id != null) && (stream.id.length > 0)) {
                    if (already) {
                        stream.id = "";
                    }
                }
                getStream(connection.channel.id, stream.id).then(async (stream2) => {
                    console.log(stream2)
                    if (stream2.stream) {
                        if (stream.isLive) {
                            let lcmessages = stream.messages;
                            if (stream2.stream.viewers.includes(' ')) {
                                stream2.stream.viewers = stream2.stream.viewers.split(' ')[0];
                            }
                            await db.overwriteOne('stream', {
                                id: stream2.stream.id,
                                title: stream2.stream.title,
                                thumbnail: 'https://i.ytimg.com/vi/' + stream2.stream.id + '/hqdefault.jpg',
                                live: true,
                                messages: lcmessages,
                                viewers: stream2.stream.viewers
                            });
                            chatbot.startBot(stream2.stream.id, connection.bot.id);
                        } else {
                            await db.overwriteOne('stream', {
                                id: stream2.stream.id,
                                title: stream2.stream.title,
                                thumbnail: 'https://i.ytimg.com/vi/' + stream2.stream.id + '/hqdefault.jpg',
                                live: true,
                                messages: stream.messages,
                                viewers: stream2.stream.viewers
                            });
                            chatbot.startBot(stream2.stream.id, connection.bot.id);
                        }
                    } else {
                        if (!already) {
                            redoThing(true);
                        } else {
                            if (stream.live) {
                                console.log('stream ended')
                                stream.live = false;
                                await db.overwriteOne('stream', stream);
                            }
                        }
                    }
                });
            }
            redoThing(false);
        }
    } catch (err) {
        console.log(err);
    }
}

export {
    checkLiveChannels,
    getStream
}