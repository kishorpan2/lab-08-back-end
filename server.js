'use strict';

const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const app = express();
const pg = require('pg');

require('dotenv').config();
app.use(cors());

const client = new pg.Client(process.env.DATABASE_URL);
client.connect();

const PORT = process.env.PORT || 3000;
var lat;
var lng;
// var searchQuery;

// Error handler
function handleError(err, res) {
  console.error(err);
  if (res) res.status(500).send('OOPS!, something went wrong');
}

//location listener
app.get('/location', (request, response) => {
  location(request.query.data)
    .then(location => response.send(location))
    .catch(error => handleError(error, response));
});

//weather listener
app.get('/weather', getWeather);

//event listener
app.get('/events', getEvents);


function location(searchQuery){
  let sqlQuery = 'SELECT * FROM location WHERE search_query = $1;';
  let values = [ searchQuery ];
  return client.query(sqlQuery, values)
    .then( (data)=>{
      if(data.rowCount > 0){
        return data.rows[0];
      }else{
        let googleGeocode = `https://maps.googleapis.com/maps/api/geocode/json?address=${searchQuery}&key=${process.env.GEOCODE_API_KEY}`;
        return superagent.get(googleGeocode)
          .then(googleMapsApiResponse=> {
            lat = googleMapsApiResponse.body.results[0].geometry.location.lat;
            lng = googleMapsApiResponse.body.results[0].geometry.location.lng;
            let locationInstance = new Place(searchQuery, googleMapsApiResponse.body.results[0].formatted_address, lat, lng);
            let insertStatement = 'INSERT INTO location ( search_query, formatted_query, latitude, longitude) VALUES ($1, $2, $3, $4 );';
            let insertValues = [locationInstance.search_query, locationInstance.formatted_query, locationInstance.latitude, locationInstance.longitude];
            client.query(insertStatement, insertValues);
            return locationInstance;
          })
          .catch(error => handleError(error));
      }
    });
}

function getWeather(request, response){
  let searchQuery = request.query.data.search_query;
  let sqlQuery = 'SELECT * FROM weather WHERE search_query = $1;';
  let values = [ searchQuery ];
  return client.query(sqlQuery, values)
    .then((data)=>{
      if(data.rowCount > 0){
        response.send(data.rows);
      }else{
        const darkskyWeatherData = `https://api.darksky.net/forecast/${process.env.DARKSKY_API_KEY}/${request.query.data.latitude},${request.query.data.longitude}`;
        return superagent.get(darkskyWeatherData)
          .then(darkskyApiResponse =>{
            let insertStatement = 'INSERT INTO weather (search_query, forecast, time) VALUES ($1, $2, $3);';
            const weatherSummary = darkskyApiResponse.body.daily.data.map(day =>{
              let values = [searchQuery, day.summary, new Date(day.time*1000).toDateString()];
              client.query(insertStatement, values);
              return new Weather(day.summary, day.time);
            });
            response.send(weatherSummary);
          })
          .catch(error => handleError(error, response));
      }
    });
}

function getEvents(request, response){
  let searchQuery = request.query.data.search_query;
  let queryStatement = 'SELECT * FROM event WHERE search_query = $1;';
  let values = [searchQuery];
  return client.query(queryStatement, values)
    .then((data)=>{
      if(data.rowCount > 0){
        response.send(data.rows);
      }else{
        const eventbrite = `https://www.eventbriteapi.com/v3/events/search?location.address=${request.query.data.formatted_query}`;
        superagent.get(eventbrite)
          .set('Authorization', `Bearer ${process.env.EVENTBRITE_API_KEY}`)
          .then(eventbriteAPI =>{
            let insertStatement = 'INSERT INTO event (search_query, link, name, event_date, summary) VALUES ($1, $2, $3, $4, $5);';
            const events = eventbriteAPI.body.events.map(eventData =>{
              let values = [searchQuery, eventData.url, eventData.name.text, new Date(eventData.start.local).toDateString(), eventData.summary];
              client.query(insertStatement, values);
              const event = new Events(eventData);
              return event;
            });
            response.send(events);
          })
          .catch(error=> handleError(error, response));
      }
    });
}


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
}

function Events (event) {
  this.link = event.url;
  this.name = event.name.text;
  this.event_date = new Date(event.start.local).toDateString();
  this.summary = event.summary;
}
