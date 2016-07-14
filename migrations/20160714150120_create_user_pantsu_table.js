
exports.up = function(knex, Promise) {
    return knex.schema.createTable('user_pantsu', function (table) {
        table.increments();
        table.string('discord_user_id');
        table.integer('count');
        table.timestamps();
    });
};

exports.down = function(knex, Promise) {
    return knex.schema.dropTable('user_pantsu');
};
