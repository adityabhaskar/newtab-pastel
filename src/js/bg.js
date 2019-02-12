const UPDATE_NOTIFICATION = false;
const EXTENSION_UPDATED_NOTIFICATION_ID = "extension_updated_notification_id";

chrome.browserAction.onClicked.addListener(_ => chrome.tabs.create({}));

// On install/update handler
chrome.runtime.onInstalled.addListener(details => {
    if (details.reason === "chrome_update")
        return;
        
    const previousVersion = details.previousVersion ? getVersionNumberFromString(details.previousVersion) : 0;
    
    // Set uninstall url, if not local/dev install
    chrome.management.getSelf(e =>
        e.installType !== "development" && chrome.runtime.setUninstallURL(URLS.UNINSTALL)
    );
        
    // Show install/update notification
    if (details.reason === "install" || UPDATE_NOTIFICATION) {
        ls.set({ "extensionUpdated": details.reason });
    }
    
    // Load colours into storage if installing or updating to first v2 colours version
    const COLOURS_V2 = 1.05;
    if (previousVersion < COLOURS_V2) {
        localStorage.allPastels = pastels.join(",");
    }
    
    // Set up ACS notification alarm if not installed, and notification not shown before
    ls.get({
        "acsNotificationShown": false
    }, st => !st.acsNotificationShown && 
        // Check if ACS is installed
        chrome.runtime.sendMessage("einokpbfcmmopbfbpiofaeohhkmcbbcg", "checkAlive", isInstalled => {
            if (isInstalled) {
                return ls.set({
                    "acsNotificationShown": true
                });
            }
            
            const ONE_DAY_IN_MS = 24 * 3600 * 1000;
            const startDay = Date.now() + (details.reason === "install" ? 5 : 5 / 24) * ONE_DAY_IN_MS;
            
            chrome.alarms.create("alarm_acs_cws_notif", {
                "when": randomDate(startDay, startDay + 1 * ONE_DAY_IN_MS, 8, 19).getTime(), // 5-24 hours (+5 days if onInstall)
            });
        })
    );

});


chrome.alarms.onAlarm.addListener(alarm => {
    
    if (alarm.name === "alarm_acs_cws_notif") {
        // Show ACS notification if not shown before && acs is not installed
        ls.get({
            "acsNotificationShown": false
        }, st => !st.acsNotificationShown &&
            // Check if ACS is installed
            chrome.runtime.sendMessage("einokpbfcmmopbfbpiofaeohhkmcbbcg", "checkAlive", isInstalled => {
                
                if (isInstalled) {
                    return ls.set({
                        "acsNotificationShown": true
                    });
                }
                
                // Show notification, and mark as shown
                ls.set({
                    "extensionUpdated": NOTIFICATIONS.ACS_CWS.ID,
                    "acsNotificationShown": true
                });
                
            })
        );
    } else 
        console.warn("Unidentified alarm: " + alarm.name);
});


/**
 * Parses version number, after removing date, from version string
 * @param {string} versionString Version string as returned by manifest
 * @param {boolean} [asString=false] If true, return `7` as `7.0`
 * @return {number} Version number
 */
function getVersionNumberFromString(versionString, asString = false) {
    const vArr = versionString.split(".")
    
    if (vArr.length < 4)
        return versionString;
    
    const version = parseFloat(`${vArr[2]}.${vArr[3] < 10 ? `0${parseInt(vArr[3])}` : vArr[3]}`);
    
    if (asString) {
        return Number.isInteger(version) ? `${version}.0` : Number.isInteger(version * 10) ? `${version}0` : `${version}`;
    }
    
    return version;
}


/**
 * @param {number} start 
 * @param {number} end 
 * @param {number} startHour 
 * @param {number} endHour 
 * @return {Date}
 */
function randomDate(start, end, startHour, endHour) {
    let date = new Date(+start + Math.random() * (end - start));
    const hour = startHour + Math.random() * (endHour - startHour) | 0;
    date.setHours(hour);
    if (date <= Date.now())
        date.setDate(date.getDate() + 1);
    return date;
}
