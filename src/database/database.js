const logger = require('pino')();
const knex = require('knex')({
    client: 'pg',
    connection: {
        host: '127.0.0.1',
        port: 5432,
        user: 'funkyboi',
        password: 'uptown funk',
        database: 'funkplayer',
    },
});

const initializeTables = async () => {
    if (!await knex.schema.hasTable('songs')) {
        await knex.schema.createTable('songs', (table) => {
            table.increments('id').primary();
            table.string('name');
            table.integer('artist');
            table.foreign('artist', 'id');
            table.integer('duration').nullable().defaultTo(null);
            table.string('filename').nullable().defaultTo(null);
        });

        logger.info('Created table \'songs\'.');
    }

    if (!await knex.schema.hasTable('artists')) {
        await knex.schema.createTable('artists', (table) => {
            table.increments('id').primary();
            table.string('name');
        });

        logger.info('Created table \'artists\'.');
    }
};

const insertArtist = async (name) => {
    return knex('artists').insert({
        name: name,
    }, ['id']);
};

const insertSong = async (name, artistId) => {
    return knex('songs').insert({
        name: name,
        artist: artistId,
    }, ['id']);
};

const deleteSong = async (id) => {
    return knex('songs')
        .where('id', id)
        .del();
};

const setSongDuration = async (id, duration) => {
    return knex('songs')
        .where('id', id)
        .update({
            duration: duration
        });
};

const setSongFilename = async (id, filename) => {
    return knex('songs')
        .where('id', id)
        .update({
            filename: filename,
        });
};

const getSongFilename = async (id) => {
    return knex.select('filename')
        .from('songs')
        .where('id', id);
};

const getAllArtists = async () => {
    return knex.select('id', 'name')
        .from('artists');
};

const getArtistByName = async (name) => {
    return knex.select('id', 'name')
        .from('artists')
        .where('name', name);
};

const getAllSongs = async () => {
    return knex.select('songs.id as id', 'songs.name as name',
        'artists.name as artist', 'songs.duration as duration')
        .from('songs')
        .join('artists', 'songs.artist', '=', 'artists.id');
};

initializeTables().then();

module.exports = {
    insertArtist,
    insertSong,
    deleteSong,
    setSongDuration,
    setSongFilename,
    getSongFilename,
    getAllArtists,
    getArtistByName,
    getAllSongs,
};
