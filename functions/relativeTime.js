function relativeTime(previous) {
    if (previous === 0) {
        return "never"
    }
    previous = parseInt(previous) / 1000;
    const date = new Date();
    const timestamp = date.getTime();
    previous = Math.floor(previous / 1000)
    const difference = Math.floor(timestamp / 1000) - previous;
    let output = ``;
    if (difference < 60) {
        if (difference === 1) {
            output = `${difference} second ago`;
        } else {
            output = `${difference} seconds ago`;
        }
    } else if (difference < 3600) {
        if (difference === 1) {
            output = `${Math.floor(difference / 60)} minute ago`;
        } else {
            output = `${Math.floor(difference / 60)} minutes ago`;
        }
    } else if (difference < 86400) {
        if (difference === 1) {
            output = `${Math.floor(difference / 3600)} hour ago`;
        } else {
            output = `${Math.floor(difference / 3600)} hours ago`;
        }
    } else if (difference < 2620800) {
        if (difference === 1) {
            output = `${Math.floor(difference / 86400)} day ago`;
        } else {
            output = `${Math.floor(difference / 86400)} days ago`;
        }
    } else if (difference < 31449600) {
        if (difference === 1) {
            output = `${Math.floor(difference / 2620800)} month ago`;
        } else {
            output = `${Math.floor(difference / 2620800)} months ago`;
        }
    } else {
        if (difference === 1) {
            output = `${Math.floor(difference / 31449600)} year ago`;
        } else {
            output = `${Math.floor(difference / 31449600)} years ago`;
        }
    }
    return output;
}

export default relativeTime;