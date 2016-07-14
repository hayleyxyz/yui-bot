
exports.up = function(knex, Promise) {
    return knex.schema.table('messages', function (table) {
        table.integer('xp').after('content');
    });
};

exports.down = function(knex, Promise) {
    return knex.schema.table('messages', function (table) {
        table.dropColumn('xp');
    });
};
