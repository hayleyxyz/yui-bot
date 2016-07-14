
exports.up = function(knex, Promise) {
    return knex.schema.createTable('messages', function (table) {
        table.increments();
        table.string('discord_id').unique();
        table.string('server_id');
        table.string('channel_id');
        table.string('user_id');
        table.text('content');
        table.dateTime('timestamp');
    });
};

exports.down = function(knex, Promise) {
    return knex.schema.dropTable('messages');
};
