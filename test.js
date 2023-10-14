import fetch from "node-fetch"
await fetch("https://discord.com/api/v10/webhooks/1157707662255984791/1aZ_8tmWE1MTgtEMCQbd3w45tOMiIlUy0_xL7WSGsTvmbDZFlRt41EYmG-hV44-9L8CL?wait=true", {
    "credentials": "omit",
    "headers": {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/118.0",
        "Accept": "application/json",
        "Accept-Language": "en",
        "Content-Type": "application/json",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "cross-site",
        "Sec-GPC": "1"
    },
    "referrer": "https://discohook.org/",
    "body": JSON.stringify({
        "content": "Test",
        "embeds": null,
        "attachments": [],
        "thread_name": "Username"
    }),
    "method": "POST",
    "mode": "cors"
}).then(res => res.json()).then(data=>{
    let id = data.channel_id
    fetch('https://discord.com/api/v10/webhooks/1157707662255984791/1aZ_8tmWE1MTgtEMCQbd3w45tOMiIlUy0_xL7WSGsTvmbDZFlRt41EYmG-hV44-9L8CL?wait=true&thread_id='+id, {
        credentials: 'omit',
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/118.0",
            "Accept": "application/json",
            "Accept-Language": "en",
            "Content-Type": "application/json",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "cross-site",
            "Sec-GPC": "1"
        },
        "referrer": "https://discohook.org/",
        "body": JSON.stringify({
            "content": "Test",
            "embeds": null,
            "attachments": []
        }),
        "method": "POST",
        "mode": "cors"
    }).then(res => res.json()).then(data=>{
        console.log(data)
    })
})