DROP TABLE location;
DROP TABLE weather;
DROP TABLE event;

CREATE TABLE IF NOT EXISTS 
location(
  id SERIAL PRIMARY KEY,
  search_query varchar(255), 
  formatted_query varchar(255), 
  latitude decimal, 
  longitude decimal
);

CREATE TABLE IF NOT EXISTS 
weather(
  search_query TEXT,
  forecast varchar(255), 
  time varchar(255)
);

CREATE TABLE IF NOT EXISTS
event(
  search_query TEXT,
  link varchar(255),
  name varchar(255),
  event_date varchar(255),
  summary varchar(255)
);