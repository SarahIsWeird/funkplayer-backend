const db = require('../database/database');
const express = require('express');

const router = express.Router();

router.get('/', async (req, res) => {
    const artists = await db.getAllArtists();

    res.send(artists);
});

router.post('/', async (req, res) => {
    const name = req.body.name;

    if (name === undefined) {
        res.status(400).send('Invalid request.');
        return;
    }

    const response = await db.insertArtist(name);

    res.status(204).send(response[0]);
});

router.get('/search', async (req, res) => {
    const artist = req.query.name;

    if (artist === undefined) {
        res.status(400).send('Invalid request.');
        return;
    }

    const info = await db.getArtistByName(artist);

    const response = {
        exists: info.length > 0,
    };

    if (response.exists) {
        response.id = info[0].id;
    }

    res.send(response);
});

module.exports = router;