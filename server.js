require('dotenv').config();

// screencaps page variables
const baseUrl = 'http://www.fanpop.com';
const screensUrl = 'http://www.fanpop.com/clubs/freaks-and-geeks/screencaps';
const maxPagesScreens = 146;

// app variables
const http = require('http');
const path = require('path'),
    express = require('express'),
    app = express(),   
    Twit = require('twit'),
    config = {   
      twitter: {
        consumer_key: process.env.CONSUMER_KEY,
        consumer_secret: process.env.CONSUMER_SECRET,
        access_token: process.env.ACCESS_TOKEN,
        access_token_secret: process.env.ACCESS_TOKEN_SECRET
      }
    },
    T = new Twit(config.twitter);

// route to execute http requests to avoid Heroku sleep
app.get('/', function (req, res) {
  res.send('Twitter Bot Made by Lucas Pulliese :)');
});

// error handling
var handleError = function(error) {
  console.log("Error: " + error);
}

// crawler package
const Crawler = require("crawler");

// function to upload the image to Twitter
const uploadImageTwitter = function(urlImage) {

  // get base64 from image url
  http.get(urlImage, (resp) => {
    resp.setEncoding('base64');
    body = ' ';
    resp.on('data', (data) => { body += data});
    resp.on('end', () => {

        // first we must post the media to Twitter
        T.post('media/upload', { media_data: body }, function (err, data, response) {
          // now we can assign alt text to the media, for use by screen readers and
          // other text-based presentations and interpreters

          var mediaIdStr = data.media_id_string
          var meta_params = { media_id: mediaIdStr }
         
          T.post('media/metadata/create', meta_params, function (err, data, response) {
            if (!err) {
              // now we can reference the media and post a tweet (media will attach to the tweet)
              var params = { status: null, media_ids: [mediaIdStr] }
         
              T.post('statuses/update', params, function (err, data, response) {
                
              })
            }
          })
        })

    });
  }).on('error', (e) => {
      console.log(`Got error: ${e.message}`);
  });
}

// crawler to get the image url
const crawlerImageUrl = new Crawler({
    callback: function(err, res, done){

        // get image url
        var $ = res.$;
        const bigCard = $('.contentcard.screencapcontentcard.bigcard .imagelink')[0];
        const urlImage = bigCard.attribs.href;

        // tweet the image
        uploadImageTwitter(urlImage);

        done();
    }
});

// crawler gallery screens to get the image link
const crawlerScreensGallery = new Crawler({
    callback: function(err, res, done){

        var $ = res.$;

        // select one random image
        const screensUrlsHtml = $('#photos .photocell > a');
        const randomNumber = 1 + Math.floor(Math.random() * screensUrlsHtml.length);

        const href = screensUrlsHtml[randomNumber].attribs.href;
        const urlHref = baseUrl+href;

        crawlerImageUrl.queue(urlHref);

        done();
    }
});

// cron job every 30m
const CronJob = require('cron').CronJob;
new CronJob('*/30 * * * *', function() {

  // get a random screencap gallery page
  const randomPage = 1 + Math.floor(Math.random() * maxPagesScreens);
  const randomScreensUrl = screensUrl+'/'+randomPage;

  crawlerScreensGallery.queue(randomScreensUrl);

}, null, true, 'America/Los_Angeles');

// Heroku app
app.listen(process.env.PORT || 5000)

// avoid sleep Heroku
setInterval(function() {
    http.get("http://pure-waters-05767.herokuapp.com");
}, 600000); // every 10 minutes (600000)