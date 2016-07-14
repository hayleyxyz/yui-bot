
exports.up = function(knex, Promise) {
    return knex.schema.createTable('users', function (table) {
        table.increments();
        table.string('discord_id').unique();
        table.string('discriminator');
        table.string('username');
        table.dateTime('last_seen_at');
        table.timestamps();
    });
};

exports.down = function(knex, Promise) {
    return knex.schema.dropTable('users');
};
