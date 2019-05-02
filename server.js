'use strict';

const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const app = express();

require('dotenv').config();
app.use(cors());
const PORT = process.env.PORT || 3000;
var weatherArr = [];
var lat;
var lng;

app.get('/location', (request, response) => {
  try {
    let searchQuery = request.query.data;
    let googleGeocode = `https://maps.googleapis.com/maps/api/geocode/json?address=${searchQuery}&key=${process.env.GEOCODE_API_KEY}`;
    superagent.get(googleGeocode)
      .end((err, googleMapsApiResponse)=>{
        lat = googleMapsApiResponse.body.results[0].geometry.location.lat;
        lng = googleMapsApiResponse.body.results[0].geometry.location.lng;
        const locationInstance = new Place(searchQuery, googleMapsApiResponse.body.results[0].formatted_address, googleMapsApiResponse.body.results[0].geometry.location.lat, googleMapsApiResponse.body.results[0].geometry.location.lng);
        response.send(locationInstance);
      });

  } catch( error ) {
    console.log('Sorry, There was an Error');
    response.status(500).send('Sorry, There was an Error');
  }
});

app.get('/events', (request, response) => {
  try {
    let eventbrite = `https://www.eventbriteapi.com/v3/events/search?location.address=${request.query.data.formatted_query}`;
    superagent.get(eventbrite)
      .set('Authorization', `Bearer ${process.env.EVENTBRITE_API_KEY}`)
      .then(eventbriteAPI=>{
        const events = eventbriteAPI.body.events.map(eventData =>{
          const event = new Events(eventData);
          return event;
        });
        response.send(events);
      });
  } catch (err) {
    console.log('Error');
    response.status(500).send('Error in Server');
  }
});

app.get('/weather', (request, response) => {
  weatherArr = [];
  try {
    let darkskyWeatherData = `https://api.darksky.net/forecast/${process.env.DARKSKY_API_KEY}/${lat},${lng}`;
    superagent.get(darkskyWeatherData)
      .end((err, darkskyApiResponse)=>{
        darkskyApiResponse.body.daily.data.map(function(weather) {
          new Weather(weather.summary, weather.time);
        });
        response.send(weatherArr);
      });
  } catch( error ) {
    console.log('Sorry, There was an Error');
    response.status(500).send('Sorry, There was an Error');
  }
});

app.listen(PORT,()=> console.log(`Listening on port ${PORT}`));

function Place (searchQuery, formattedAddress, lat, lng) {
  this.search_query = searchQuery;
  this.formatted_query = formattedAddress;
  this.latitude = lat;
  this.longitude = lng;
}

function Weather (forecast, time) {
  this.forecast = forecast;
  this.time = new Date(time*1000).toDateString();
  weatherArr.push(this);
}

function Events (event) {
  this.link = event.url;
  this.name = event.name.text;
  this.event_date = new Date(event.start.local).toDateString();
  this.summary = event.summary;
}
