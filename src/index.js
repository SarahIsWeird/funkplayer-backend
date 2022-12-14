const dotenv = require('dotenv');

dotenv.config({
    path: process.env.MODE === "prod" ? ".env.production" : ".env.development",
});

const cors = require('cors');
const express = require('express');
const logger = require('pino')();

const routes = {
    artists: require('./routes/artists'),
    songs: require('./routes/songs'),
};

const app = express();
const port = Number.parseInt(process.env.PORT);

app.use(cors());
app.use(express.json());

app.use('/artists', routes.artists);
app.use('/songs', routes.songs);

app.listen(port, () => {
    logger.info(`Listening at http://127.0.0.1:${port}`);
});
