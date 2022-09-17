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

    const proc = spawn('yt-dlp', [
        youtubeLink,
        '--format', 'bestaudio',
        '--output', `data/${info[0].id}.%(ext)s`,
        '--print', 'filename: %(filename)s',
        '--print', 'duration: %(duration)s',
        '--no-simulate',
        '--quiet'
    ]);

    proc.stdout.on('data', async (dataIn) => {
        const lines = dataIn.toString().trim().split('\n');

        for (let i in lines) {
            const line = lines[i];

            if (line.startsWith('filename: ')) {
                const filename = line.substring('filename: '.length);
                await db.setSongFilename(info[0].id, filename);
            }

            if (line.startsWith('duration: ')) {
                const duration = Number.parseInt(line.substring('duration: '.length));
                await db.setSongDuration(info[0].id, duration);
            }
        }
    });

    proc.on('close', async (code) => {
        if (code !== 0) {
            await db.deleteSong(info[0].id);

            res.status(500).send('Couldn\'t download song.');
            return;
        }

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
    let stats;

    try {
        stats = statSync(filename);
    } catch {
        res.status(500).send('bruh');
        return;
    }

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