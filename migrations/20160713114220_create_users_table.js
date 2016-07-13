
exports.up = function(knex, Promise) {
    return knex.schema.createTable('server_users', function (table) {
        table.increments();
        table.string('server_id');
        table.string('user_id');
        table.string('username');
        table.dateTime('last_seen_at');
        table.timestamps();

        table.unique([ 'server_id', 'user_id' ]);
    });
};

exports.down = function(knex, Promise) {
    return knex.schema.dropTable('server_users');
};
