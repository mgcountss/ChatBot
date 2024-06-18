function calculateDifference(dailyStats, key, daysAgo, currencyLength) {
    try {
        let toReturn = parseFloat(Object.values(dailyStats)[currencyLength - 1][key]) - parseFloat(Object.values(dailyStats)[currencyLength - daysAgo][key]);
        if (isNaN(toReturn)) {
            return 0;
        } else {
            return toReturn;
        }
    } catch (err) {
        return 0;
    }
}

function calculateDaily(user) {
    try {
        user.daily = {
            points: calculateDifference(user.dailyStats, 'points', 2, Object.keys(user.dailyStats).length),
            messages: calculateDifference(user.dailyStats, 'messages', 2, Object.keys(user.dailyStats).length),
            xp: calculateDifference(user.dailyStats, 'xp', 2, Object.keys(user.dailyStats).length),
        };
    } catch (err) {
        user.daily = { points: 0, messages: 0, xp: 0 };
    }
    return user;
}

function calculateWeekly(user) {
    try {
        user.weekly = {
            points: calculateDifference(user.dailyStats, 'points', 8, Object.keys(user.dailyStats).length),
            messages: calculateDifference(user.dailyStats, 'messages', 8, Object.keys(user.dailyStats).length),
            xp: calculateDifference(user.dailyStats, 'xp', 8, Object.keys(user.dailyStats).length),
        };
    } catch (err) {
        user.weekly = { points: 0, messages: 0, xp: 0 };
    }
    return user;
}

function calculateMonthly(user) {
    try {
        user.monthly = {
            points: calculateDifference(user.dailyStats, 'points', 31, Object.keys(user.dailyStats).length),
            messages: calculateDifference(user.dailyStats, 'messages', 31, Object.keys(user.dailyStats).length),
            xp: calculateDifference(user.dailyStats, 'xp', 31, Object.keys(user.dailyStats).length),
        };
    } catch (err) {
        user.monthly = { points: 0, messages: 0, xp: 0 };
    }
    return user;
}

function resetIfInactive(user) {
    const currentTime = Date.now() * 1000;
    if (user.lastMSG) {
        if (currentTime - user.lastMSG > 86400000000) {
            user.daily = { points: 0, messages: 0, xp: 0 };
        }
        if (currentTime - user.lastMSG > 604800000000) {
            user.weekly = { points: 0, messages: 0, xp: 0 };
        }
        if (currentTime - user.lastMSG > 2592000000000) {
            user.monthly = { points: 0, messages: 0, xp: 0 };
        }
    }
    return user;
}

function calculateUser(user) {
    user = calculateDaily(user);
    user = calculateWeekly(user);
    user = calculateMonthly(user);
    user = resetIfInactive(user);
    return user;
}

export { calculateUser, calculateDaily, calculateWeekly, calculateMonthly, resetIfInactive };