var util = require('util');
var config = require('./config');
var moment = require('moment');
var YuiBot = require('./lib/bot')

var bot = new YuiBot(config.token);
bot.setAdminRoles(config.adminRoles);

var knex = require('knex')(config.knexOptions);
var bookshelf = require('bookshelf')(knex);
var models = require('./lib/models')(bookshelf);

var commands = require('./lib/commands')(models, knex);

/*
 * Add all basic commands that simply respond to a certain pattern in a message with a text message
 */
for(var i in config.textResponses) {
    bot.addCommand(new commands.TextRespondCommand(config.textResponses[i].trigger, config.textResponses[i].response));
}

/*
 * Adds all commands that respond with a file upload (and optionally a message) whenever a pattern is detected
 * in message text
 */
for(var i in config.fileResponses) {
    bot.addCommand(new commands.UploadRespondCommand(config.fileResponses[i].trigger, config.fileResponses[i].file,
        config.fileResponses[i].message));
}

/*
 * Add all bespoke commands
 */
bot.addCommand(commands.NickCommand);
bot.addCommand(commands.GameCommand);
bot.addCommand(commands.PokeCommand);
bot.addCommand(commands.PatCommand);
bot.addCommand(commands.MuteCommand);
bot.addCommand(commands.UnmuteCommand);
bot.addCommand(commands.MuteAllCommand);
bot.addCommand(commands.UnmuteAllCommand);
//bot.addCommand(commands.LastSeenCommand);
bot.addCommand(commands.SayCommand);
bot.addCommand(commands.LastSeenCommand);
bot.addCommand(commands.UnflipTableCommand);
bot.addCommand(commands.PantsuCommand);
bot.addCommand(commands.RankCommand);

/*
 * Send a welcome message whenever a user joins the server
 */
bot.client.on('guildMemberAdd', function(user, event) {
    var serverChannelId = user.guild_id;
    var serverName = this.servers[serverChannelId].name;

    var message = util.format('<@!%s> has joined %s', user.id, serverName);
	
    this.sendMessage({
        to: serverChannelId,
        message: message
    });
});

/*
 * Send a message whenever a user leaves the server
 */
bot.client.on('guildMemberRemove', function(user, event) {
    var serverChannelId = user.guild_id;
    var serverName = this.servers[serverChannelId].name;

    var message = util.format('Byebye <@!%s> \=\(', user.id);

    this.sendMessage({
        to: serverChannelId,
        message: message
    });
});

/*
 * Log all received messages to DB
 */
bot.client.on('message', function(user, userId, channelId, message, event) {
    var serverId = this.serverFromChannel(channelId);

    /*
     * Create/update user record
     */
    new models.User({ discord_id: userId })
        .fetch()
        .then(function(model) {
            if(!model) {
                model = new models.User();
            }

            model.save({
                discord_id: event.d.author.id,
                discriminator: event.d.author.discriminator,
                username: event.d.author.username,
                last_seen_at: moment().format('Y-MM-DD HH:mm:ss')
            });
        });

    /*
     * Here lies the logic for the XP cooldown
     * It checks to see if the user has posted within the last minute, and if so will set an xp value of 0, otherwise
     * it will set a random xp value between 80-100
     */
    knex('messages').count('id as count')
        .where('user_id', userId)
        .where('timestamp', '>=', moment().subtract(1, 'minutes').format('Y-MM-DD HH:mm:ss'))
        .then(function(result) {

            var xp = Math.round(Math.random() * (100 - 60)) + 60; // Random XP between 80-100

            if(result.length > 0) {
                if(result[0].count >0) {
                    xp = 0;
                }
            }

            /*
             * Save the message in the db
             */
            var messageRecord = new models.Message({
                discord_id: event.d.id,
                server_id: serverId,
                channel_id: channelId,
                user_id: userId,
                content: message,
                xp: xp,
                timestamp: moment(event.d.timestamp).format('Y-MM-DD HH:mm:ss')
            }).save();
        });
});

bot.client.on('presence', function(username, userId, status, game, event) {
    new models.User({ discord_id: event.d.user.id })
        .fetch()
        .then(function(model) {
            if(!model) {
                model = new models.User();
            }

            model.save({
                discord_id: event.d.user.id,
                discriminator: event.d.user.discriminator || model.discriminator,
                username: event.d.user.username || model.username,
                last_seen_at: moment().format('Y-MM-DD HH:mm:ss')
            });
        });
});

bot.client.on('any', function(user, event) {
    //console.log(arguments);
});