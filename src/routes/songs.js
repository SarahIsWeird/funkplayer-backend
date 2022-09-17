const { spawn } = require('child_process');
const db = require('../database/database');
const express = require('express');
const { statSync, createReadStream } = require('fs');
const logger = require('pino')();

const router = express.Router();

router.get('/', async (req, res) => {
    const songs = await db.getAllSongs();

    res.send(songs);
});

router.post('/', async (req, res) => {
    const name = req.body.name;
    const artistId = req.body.artist_id;
    const youtubeLink = req.body.youtube_link;

    if (name === undefined || artistId === undefined || youtubeLink === undefined) {
        res.status(400).send('Invalid request.');
        return;
    }

    logger.info(`Inserting song "${name}" (artist id ${artistId}).`);

    const info = await db.insertSong(name, artistId);

    logger.info(info);

    const proc = spawn('yt-dlp', [
        youtubeLink,
        '--format', 'bestaudio',
        '--output', `data/${info[0].id}.%(ext)s`,
        '--print', 'filename',
        '--print', 'duration',
        '--no-simulate',
        '--quiet'
    ]);

    let count = 0;
    const metadata = {};

    proc.stdout.on('data', async (dataIn) => {
        const line = dataIn.toString().trim();

        switch (count) {
            case 0:
                metadata.filename = line;
                break;
            case 1:
                metadata.duration = Number.parseInt(line);
                break;
        }

        count++;
    });

    proc.on('close', async (code) => {
        if (code !== 0) {
            await db.deleteSong(info[0].id);

            res.status(500).send('Couldn\'t download song.');
            return;
        }

        await db.setSongMetadata(info[0].id, metadata);

        res.send('yay :D');
    });
});

router.delete('/:id', async (req, res) => {
    const id = req.params.id;

    if (id === undefined) {
        res.status(400).send('Invalid request.');
        return;
    }

    await db.deleteSong(id);

    res.status(204).send();
});

router.get('/:id/stream', async (req, res) => {
    const id = req.params.id;

    if (id === undefined) {
        res.status(400).send('Invalid request.');
        return;
    }

    const data = await db.getSongFilename(id);
    const filename = './' + data[0].filename;
    const stats = statSync(filename);

    res.header('Content-Type', 'audio/webm');
    res.header('Accept-Ranges', 'bytes');
    res.header('Content-Length', stats.size.toString());

    const readStream = createReadStream(filename, {
        highWaterMark: 1024,
        encoding: 'binary',
    });

    readStream.on('data', (chunk) => {
        res.write(chunk, 'binary');
    });

    readStream.on('end', () => {
        res.end();
    });
});

module.exports = router;