/**
 * Created by oscar on 14/07/2016.
 */

module.exports = function(bookshelf) {

    var Message = bookshelf.Model.extend({
        tableName: 'messages'
    });

    var User = bookshelf.Model.extend({
        tableName: 'users',
        hasTimestamps: true
    });

    var UserPantsu = bookshelf.Model.extend({
        tableName: 'user_pantsu',
        hasTimestamps: true
    });

    return {
        Message: Message,
        User: User,
        UserPantsu: UserPantsu
    };
};