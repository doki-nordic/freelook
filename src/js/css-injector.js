const { app } = require('electron');
const settings = require('electron-settings');
const fs = require('fs-extra');

class CssInjector {}

CssInjector.main = `
    /* hide the vertical ad bar */
    .${fs.existsSync(`${app.getPath('userData')}/Settings`) ? settings.get('verticalAdsClass', 'some-class-does-not-exist') : 'some-class-does-not-exist'} {
        display: none !important;
    }

    /* hide the small ad bar in other email page */
    .${fs.existsSync(`${app.getPath('userData')}/Settings`) ? settings.get('smallAdsClass', 'some-class-does-not-exist') : 'some-class-does-not-exist'} {
        display: none !important;
    }

    /* hide the upgrade premium ad bar */
    .${fs.existsSync(`${app.getPath('userData')}/Settings`) ? settings.get('premiumAdsClass', 'some-class-does-not-exist') : 'some-class-does-not-exist'} {
        display: none !important;
    }
    [id^="x_hox"], [href*="norclicsemi"] {
	border: 1px solid red;
	background: lightgreen;
    }
    [id^="x_hox"]::before, [href*="norclicsemi"]::before {
	content: "HoxHunt";
	border: 5px solid #FF0000BB;
	padding: 20px;
	display: inline-block;
	position: absolute;
	background: #FFFF00BB;
	font-size: 200%;
	font-weight: bold;
	box-shadow: 0px 0px 5px 2px red;
	text-shadow: 0px 0px 3px 2px white;
	color: black;
    }
    img[id^="x_hox"] {
	padding: 10px;
	border: 7px solid red;
	box-shadow: 0 0 6px 7px blue;
    }
`

CssInjector.noFrame = `
    /* make the header higher and dragable */
    ._1Kg3ffZABPxXxDqcmoxkBA {
        padding-top: 30px !important;
        -webkit-app-region: drag;
    }

    /* make the clickable component in header not dragable */
    .ms-FocusZone,
    ._3Nd2PGu67wifhuPZp2Sfj5 {
        -webkit-app-region: no-drag;
    }
`

module.exports = CssInjector