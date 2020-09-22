const { app, BrowserWindow, shell, ipcMain, session, Notification } = require('electron');
const settings = require('electron-settings');
const CssInjector = require('../js/css-injector');
const path = require('path');
const fs = require('fs-extra');
const isOnline = require('is-online');

const settingsExist = fs.existsSync(`${app.getPath('userData')}/Settings`);
const homepageUrl = settingsExist ? settings.get('homepageUrl', 'http://outlook.office365.com/') : 'http://outlook.office365.com/';
const deeplinkUrls = ['outlook.live.com/mail/deeplink', 'outlook.office365.com/mail/deeplink', 'outlook.office.com/mail/deeplink'];
const outlookUrls = ['outlook.live.com', 'outlook.office365.com', 'outlook.office.com'];

class MailWindowController {
    constructor() {
        this.initSplash();
        setTimeout(() => this.connectToMicrosoft(), 1000);
    }

    init() {
        // Get configurations.
        const showWindowFrame = settings.get('showWindowFrame', true);

        // Create the browser window.
        this.win = new BrowserWindow({
            x: 100,
            y: 100,
            width: 1400,
            height: 900,
            frame: showWindowFrame,
            autoHideMenuBar: true,
            show: false,
            icon: path.join(__dirname, '../../assets/outlook_linux_black.png'),
            webPreferences: {
                nodeIntegration: true,
                preload: path.join(__dirname, '../js/preload.js')
            }
        });

        // and load the index.html of the app.
        this.win.loadURL(homepageUrl);

        // Show window handler
        ipcMain.on('show', () => {
            this.show()
        });

        // insert styles
        this.win.webContents.on('dom-ready', () => {
            this.win.webContents.insertCSS(CssInjector.main);
            if (!showWindowFrame) this.win.webContents.insertCSS(CssInjector.noFrame);

            this.addUnreadNumberObserver();

            this.win.show()
        });

        // prevent the app quit, hide the window instead.
        this.win.on('close', (e) => {
            if (this.win.isVisible()) {
                e.preventDefault();
                this.win.hide()
            }
        });

        // Emitted when the window is closed.
        this.win.on('closed', () => {
            // Dereference the window object, usually you would store windows
            // in an array if your app supports multi windows, this is the time
            // when you should delete the corresponding element.
            this.win = null
        });

        // Open the new window in external browser
        this.win.webContents.on('new-window', this.openInBrowser)

        this.notify = null;
        this.iconUnread = false;

        let setNotify = (visible, text) => {
            if (this.notify === null && visible) {
                this.notify = new Notification({
                    title: 'Outlook',
                    body: text || 'You have a new e-mail!',
                    requireInteraction: true
                });
                this.notify.on('onclick', () => {
                    this.show();
                });
                this.notify.show();
            } else if (this.notify !== null && !visible) {
                this.notify.close();
                this.notify = null;
            }
        };

        this.win.on('focus', (e) => {
            if (!this.iconUnread && this.onUpdateUnread) {
                this.onUpdateUnread(0);
                setNotify(0);
            }
        });

        this.win.webContents.on('page-favicon-updated', (e, icons) => {
            if (this.onUpdateUnread) {
                for (var icon of icons)
                {
                    if (icon.match(/.*mail-seen\..*/)) {
                        this.iconUnread = false;
                        this.onUpdateUnread(0);
                        setNotify(0);
                    } else if (icon.match(/.*mail-unseen\..*/)) {
                        this.iconUnread = true;
                        this.onUpdateUnread(1);
                        setNotify(1);
                    }
                }
            }
        });

        setTimeout(() => {setNotify(1, 'Outlook has started. Please check if you have any new e-mails!')}, 5000);

        session.defaultSession.webRequest.onCompleted({urls:['*://*/*/newmail.mp3']}, (details) => {
            if (this.onUpdateUnread) {
                this.onUpdateUnread(1);
                setNotify(1);
            }
        });

        session.defaultSession.webRequest.onCompleted({urls:['*://*/*/reminder.mp3']}, (details) => {
            if (this.onUpdateUnread) {
                this.onUpdateUnread(1);
                setNotify(1, 'Check your calendar!');
            }
        });

        //this.win.webContents.openDevTools();
    }

    addUnreadNumberObserver() {

	let addHoxHuntObserver = function() {

		let hoxHuntTimer = null;
		let hoxHuntLevel = 0;

		function alertHoxHunt(level) {
			hoxHuntLevel = Math.max(hoxHuntLevel, level);
			if (hoxHuntTimer !== null) {
				window.clearTimeout(hoxHuntTimer);
			}
			hoxHuntTimer = setTimeout(() => {
				hoxHuntTimer = null;
				if (hoxHuntLevel > 1) {
					alert(`\n=====================\n\n  Probably HoxHunt.\n\n=====================\n`);
				} else {
					alert(`\n--------------------------------\n\n  Maybe HoxHunt?\n\n--------------------------------\n`);
				}
				hoxHuntLevel = 0;
			}, 300);
		}

		setTimeout(() => {
			let observer = new MutationObserver(mutations => {
				let hh = false;
				for (let m of mutations) {
					if (m.type != 'childList') continue;
					for (let n of m.addedNodes) {
						if (/norclicsemi|x_hox/.test(n.innerHTML)) {
							hh = 2;
						}
						if (!n.querySelectorAll) continue;
						let list = n.querySelectorAll('[href^="http"]');
						for (let l of list) {
							l.getAttribute('href').replace(/https?:\/\/[a-zA-Z_\.0-9-]+\/+([a-zA-Z0-9_-]{9,99})(\?|$)/, (m, h) => {
								let short = 0;
								let words = h.split(/-|_|(?=[A-Z0-9])/);
								for (let w of words) {
									if (w.length <= 3) {
										short++;
									}
								}
								if (2 * short > words.length) {
									hh = 1;
								}
							});
						}
					}
				}
				if (hh) {
					alertHoxHunt(hh);
				}
			});
			let readingPane = document.querySelector('[aria-label="Reading Pane"]');
			observer.observe(readingPane, {childList: true, subtree: true});
			console.log('======== OBSERVING ========');
		}, 10000);

	}
	addHoxHuntObserver = addHoxHuntObserver.toString();
	addHoxHuntObserver = addHoxHuntObserver.slice(addHoxHuntObserver.indexOf("{") + 1, addHoxHuntObserver.lastIndexOf("}"));
	addHoxHuntObserver = `((function(){ ${addHoxHuntObserver} })())`;
	this.win.webContents.executeJavaScript(addHoxHuntObserver);

        settingsExist && settings.get('unreadMessageClass') && this.win.webContents.executeJavaScript(`
            setTimeout(() => {
                let unreadSpan = document.querySelector(".${settings.get('unreadMessageClass')}");
                require('electron').ipcRenderer.send('updateUnread', unreadSpan.hasChildNodes());

                let observer = new MutationObserver(mutations => {
                    mutations.forEach(mutation => {
                        // console.log('Observer Changed.');
                        require('electron').ipcRenderer.send('updateUnread', unreadSpan.hasChildNodes());

                        // Scrape messages and pop up a notification
                        var messages = document.querySelectorAll('div[role="listbox"][aria-label="Message list"]');
                        if (messages.length)
                        {
                            var unread = messages[0].querySelectorAll('div[aria-label^="Unread"]');
                            var body = "";
                            for (var i = 0; i < unread.length; i++)
                            {
                                if (body.length)
                                {
                                    body += "\\n";
                                }
                                body += unread[i].getAttribute("aria-label").substring(7, 127);
                            }
                            if (unread.length)
                            {
                                var notification = new Notification("Microsoft Outlook - receiving " + unread.length + " NEW mails", {
                                    body: body,
                                    icon: "assets/outlook_linux_black.png"
                                });
                                notification.onclick = () => {
                                    require('electron').ipcRenderer.send('show');
                                };
                            }
                        }
                    });
                });
            
                observer.observe(unreadSpan, {childList: true});

                // If the div containing reminders gets taller we probably got a new
                // reminder, so force the window to the top.
                let reminders = document.getElementsByClassName("_1BWPyOkN5zNVyfbTDKK1gM");
                let height = 0;
                let reminderObserver = new MutationObserver(mutations => {
                    mutations.forEach(mutation => {
                        if (reminders[0].clientHeight > height)
                        {
                            require('electron').ipcRenderer.send('show');
                        }
                        height = reminders[0].clientHeight;
                    });
                });

                if (reminders.length) {
                    reminderObserver.observe(reminders[0], { childList: true });
                }

            }, 10000);
        `)
    }

    toggleWindow() {
        if (this.win) {
            if (this.win.isFocused()) {
                this.win.hide()
            } else {
                this.show()
            }
        }
    }

    openInBrowser(e, url) {
        // console.log(url);
        if (new RegExp(deeplinkUrls.join('|')).test(url)) {
            // Default action - if the user wants to open mail in a new window - let them.
        }

        // Disable the logic to load calendar contact and tasks in the election window.
        // Calendar has no link to back to mail. Once switch the window to calendar no way to back to mail unless close the app.

        // else if (new RegExp(outlookUrls.join('|')).test(url)) {
        //     // Open calendar, contacts and tasks in the same window
        //     e.preventDefault();
        //     this.loadURL(url)
        // }
        else {
            // Send everything else to the browser
            e.preventDefault();
            shell.openExternal(url)
        }
    }

    show() {
        this.win.show();
        this.win.focus()
    }

    initSplash() {
        this.splashWin = new BrowserWindow({
            width: 300,
            height: 300,
            frame: false,
            autoHideMenuBar: true,
            webPreferences: {
                nodeIntegration: true
            }
        });
        this.splashWin.loadURL(`file://${path.join(__dirname, '../view/splash.html')}`);

        ipcMain.on('reconnect', () => {
            this.connectToMicrosoft();
        });
    }

    connectToMicrosoft() {
        (async () => await isOnline({timeout: 15000}))().then(result => {
            if (result) {
                this.init();
                this.splashWin.destroy();
            } else {
                this.splashWin.webContents.send('connect-timeout');
            }
        });
    }
}

module.exports = MailWindowController;
