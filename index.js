const puppeteer = require('puppeteer');
const moment = require('moment');
const request = require('request')

let today = moment().format('YYYYMMDD');
let startTime = new Date().getTime();

(async () => {

    // Puppeteer start
    console.log('Starting headless browser session...')
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.50 Safari/537.36');
    await page.setViewport({ width: 1000, height: 1000 })

    // Go to greyhound racing page
    console.log('Going to Ubet website...')
    await page.goto('https://tab.ubet.com/racing/greyhound-racing');

    // Get all locations for greyhound races
    console.log('Getting all race locations...')
    let locationData = await page.evaluate(() => {
        let locations = [];
        let locationElms = document.querySelectorAll('div.location');

        locationElms.forEach(locationElement => {
            try {
                locations.push({
                    name: locationElement.querySelector('.name').innerHTML,
                    code: locationElement.querySelector('.code').innerHTML.substring(1, 3),
                    numRaces: 0,
                    races: []
                })
            }
            catch (e) { console.log(e) };
        })
        return locations;
    })

    // Get number of races in each location
    console.log('Getting number of races at each location...')
    for (let i = 0; i < locationData.length; i++) {

        let location = locationData[i].name.replace(/ /g, '-');
        let code = locationData[i].code;

        let link = 'https://tab.ubet.com/racing/greyhound-racing/' + location + '-' + code;

        await page.goto(link);

        locationData[i].numRaces = await page.evaluate(() => {
            let numberElms = document.querySelectorAll('div.race-number').length
            return numberElms - 1
        });

        console.log(locationData[i]);
    }

    // Get all races in each location
    console.log('Getting all races at each location...')
    for (let i = 0; i < locationData.length; i++) {
        for (let j = 0; j < locationData[i].numRaces; j++) {

            let location = locationData[i].name.replace(/ /g, '-');
            let code = locationData[i].code;

            let link = 'https://tab.ubet.com/racing/greyhound-racing/' + location + '-' + code + '/Race-' + (j + 1) + '/Win?Date=' + today;

            await page.goto(link)

            let raceData = await page.evaluate(() => {

                document.querySelectorAll('.runner-info').forEach(el => el.click())

                let trackCondition = document.querySelector('span.track-condition') ? document.querySelector('span.track-condition').innerHTML : null
                let weatherCondition = document.querySelector('span.weather-condition') ? document.querySelector('span.weather-condition').innerHTML : null
                let tipster = document.querySelector('div.tipster') ? document.querySelector('div.tipster').innerHTML : null
                let tips = document.querySelector('div.tips') ? document.querySelector('div.tips').innerHTML : null

                let runnerEls = document.querySelectorAll('li.runner-list')
                let odds = document.querySelector('[data-automationid="odds"')

                let race = {
                    name: document.querySelector('span.race-name').innerHTML,
                    distance: document.querySelector('div.race-distance').innerHTML,
                    status: document.querySelector('div.status-text').innerHTML,
                    trackCondition: trackCondition,
                    weatherCondition: weatherCondition,
                    tipster: tipster,
                    tips: tips,
                    dogs: []
                }

                // Get all dogs in each race
                runnerEls.forEach(el => {

                    let name = el.querySelector('span.n1.not-harness') ? el.querySelector('span.n1.not-harness').innerHTML : null
                    let trainer = el.querySelector('.jockey') ? el.querySelector('.jockey').innerHTML : null
                    let rating = el.querySelector('[data-automationid="rating"]') ? el.querySelector('[data-automationid="rating"]').innerHTML : null
                    let l3s = el.querySelector('[data-automationid="last-three-start"]') ? el.querySelector('[data-automationid="last-three-start"]').innerHTML : null
                    let form = el.querySelector('[data-automationid="form"]') ? el.querySelector('[data-automationid="form"]').innerHTML : null
                    let fixedWin, fixedPlace

                    if (el.querySelector('div.fixed-price').querySelector('span.odds')) {
                        fixedWin = el.querySelector('div.fixed-price').querySelectorAll('span.odds')[0].innerHTML
                    } else if (el.querySelector('div.fixed-price').querySelector('span.no-odds-label-button')) {
                        fixedWin = el.querySelector('div.fixed-price').querySelectorAll('span.no-odds-label-button')[0].innerHTML
                    } else {
                        fixedWin = null
                    }

                    if (el.querySelector('div.fixed-price').querySelectorAll('span.odds')[1]) {
                        fixedPlace = el.querySelector('div.fixed-price').querySelectorAll('span.odds')[1].innerHTML
                    } else if (el.querySelector('div.fixed-price').querySelectorAll('span.no-odds-label-button')[1]) {
                        fixedPlace = el.querySelector('div.fixed-price').querySelectorAll('span.no-odds-label-button')[1].innerHTML
                    } else {
                        fixedPlace = null
                    }

                    race.dogs.push({
                        name: name,
                        scratched: false,
                        trainer: trainer,
                        rating: rating,
                        l3s: l3s,
                        form: form,
                        fixedPrice: {
                            win: fixedWin,
                            place: fixedPlace,
                        },
                        age: 0,
                        races: 0,
                        wins: 0,
                        places: 0,
                        prizeMoney: 0,
                        last20: '',
                        weight: 0,//el.querySelector('[data-automationid="component-weight"]').innerHTML,
                        winPercent: 0,
                        placePercent: 0,
                        trackRecord: '',
                        distanceRecord: '',
                        trackDistanceRecord: '',
                        fromBox: '',
                        firstUp: '',
                        secondUp: '',

                    })
                })

                return race
            })

            locationData[i].races.push(raceData)
        }
    }
    //console.log(locationData[0].races[0].dogs)

    await browser.close();

    let endTime = new Date().getTime()
    let totalTime = ((endTime - startTime) / 1000) / 60

    console.log('Total Time: ' + totalTime + ' minutes')

})();
