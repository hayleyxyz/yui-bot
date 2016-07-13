var Discord = require('discord.io');
var moment = require('moment');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var config = require('./config');

const BOT_VERSION = '0.1';

function YuiDiscordClient(options) {
    Discord.Client.call(this, options);

    (function(scope) {

        scope.editChannelPermissions = function(channelId, overwriteId) {
            var payload = {
                deny: (1 << Discord.Client.Permissions.TEXT_SEND_MESSAGES),
                allow: 0,
                type: 'member'
            };

            this._req('put', "https://discordapp.com/api/channels/" + channelId + "/permissions/" + overwriteId, payload, function(err, res) {
                
            });
        }

    })(this);
}

util.inherits(YuiDiscordClient, Discord.Client);

function YuiBot(token) {
    (function(scope) {

        scope.client = null;
        scope.commands = [ ];
        scope.adminRoles = [ ];

        scope.ctor = function() {
            scope.client = new YuiDiscordClient({
                token: token,
                autorun: true
            });

            scope.client.on('ready', scope.events.ready);
            scope.client.on('message', scope.events.message);
        };

        scope.setAdminRoles = function(adminRoles) {
            this.adminRoles = adminRoles;
        };

        scope.addCommand = function(command) {
            scope.commands.push(command);
        };

        scope.testTrigger = function(trigger, message) {
            if(typeof trigger === 'object' && typeof trigger.exec === 'function') {
                return (trigger.exec(message) !== null);
            }

            return false;
        };

        scope.printUserMessage = function(event) {
            var serverId = scope.client.serverFromChannel(event.d.channel_id);
            var serverName = scope.client.servers[serverId].name;
            var channelName = scope.client.servers[serverId].channels[event.d.channel_id].name;

            console.log(util.format('%s - #%s [%s] %s: %s', serverName, channelName,
                moment(event.d.timestamp).format('YYYY-MM-DD HH:mm'), event.d.author.username, event.d.content));
        };

        scope.getRoleIdFromName = function(serverId, roleName) {
            for(var i in scope.client.servers[serverId].roles) {
                if(scope.client.servers[serverId].roles[i].name === roleName) {
                    return scope.client.servers[serverId].roles[i].id;
                }
            }

            return null;
        };

        scope.checkUserHasRoleByName = function(serverId, roleName, userId) {
            var roleId = scope.getRoleIdFromName(serverId, roleName);

            return (scope.client.servers[serverId].members[userId].roles.indexOf(roleId) >= 0);
        };

        scope.userHasAdmin = function(serverId, userId) {
            if(serverId in scope.adminRoles) {
                for(var i in scope.adminRoles[serverId]) {
                    if(scope.checkUserHasRoleByName(serverId, scope.adminRoles[serverId][i], userId)) {
                        return true;
                    }
                }
            }

            return false;
        };

        scope.events = {

            ready: function() {
                console.log('Yui bot v' + BOT_VERSION);
                console.log('Bot username: ' + scope.client.username);
                console.log('Servers:');

                for(var i in scope.client.servers) {
                    console.log('\t' + scope.client.servers[i].name);
                }

                console.log();
            },

            message: function(user, userId, channelId, message, event) {
                if(scope.client.id === userId) {
                    return; // Never want the bot to respond to itself
                }

                for(var i in scope.commands) {
                    if(scope.testTrigger(scope.commands[i].trigger, message)) {
                        scope.printUserMessage(event);

                        scope.commands[i].handler.call(scope, scope.client, user, userId, channelId, message, event);
                    }
                }
            }

        };

        scope.ctor();

    })(this);
}

util.inherits(YuiBot, EventEmitter);

function Command(trigger, handler) {
    this.trigger = trigger;
    this.handler = handler;
}

function TextRespondCommand(trigger, response) {
    this.trigger = trigger;

    this.handler = function(client, user, userId, channelId, message, event) {
        client.sendMessage({
            to: channelId,
            message: response
        });
    };
}

util.inherits(TextRespondCommand, Command);

function UploadRespondCommand(trigger, file, message) {
    this.trigger = trigger;

    this.handler = function(client, user, userId, channelId, message, event) {
        client.uploadFile({
            to: channelId,
            file: './media/' + file,
            message: message
        });
    };
}

util.inherits(UploadRespondCommand, Command);

var bot = new YuiBot(config.token);

bot.setAdminRoles(config.adminRoles);

/*
 * Add all basic commands that simply respond to a certain pattern in a message with a text message
 */
for(var i in config.textResponses) {
    bot.addCommand(new TextRespondCommand(config.textResponses[i].trigger, config.textResponses[i].response));
}

/*
 * Adds all commands that respond with a file upload (and optionally a message) whenever a pattern is detected
 * in message text
 */
for(var i in config.fileResponses) {
    bot.addCommand(new UploadRespondCommand(config.fileResponses[i].trigger, config.fileResponses[i].file,
        config.fileResponses[i].message));
}

/*
 * Change user nickname on the server
 * Usage: .nick @user nickname
 */
bot.addCommand(new Command(/^.nick (<@!?([0-9]+)>)( +)(.+)$/i, function(client, user, userId, channelId, message, event) {

    var serverId = client.serverFromChannel(channelId);

    if(this.userHasAdmin(serverId, userId)) {
        var args = message.match(/(<@!?([0-9]+)>) +(.+)/);
        var targetUserId = args[2];
        var targetNick = args[3];

        client.editNickname({
            nick: targetNick,
            serverID: serverId,
            userID: targetUserId
        });
    }
}));

/*
 * Change the bot's currently displayed playing game
 * Usage: .game game name
 */
bot.addCommand(new Command(/^.game (.+)$/i, function(client, user, userId, channelId, message, event) {

    var serverId = client.serverFromChannel(channelId);

    if(this.userHasAdmin(serverId, userId)) {
        var gameName = message.match(/ .+/, '');

        client.setPresence({
            game: gameName
        });
    }
}));

bot.addCommand(new Command(/^.mute (<@!?([0-9]+)>)$/i, function(client, user, userId, channelId, message, event) {

    var serverId = client.serverFromChannel(channelId);

    if(this.userHasAdmin(serverId, userId)) {
        var args = message.match(/(<@!?([0-9]+)>)/);
        var targetUserId = args[2];

        client.editChannelPermissions(channelId, targetUserId);
    }
}));

/*
 * Send a welcome message whenever a user joins the server
 */
bot.client.on('guildMemberAdd', function(user, event) {
    var serverChannelId = user.guild_id;
    var serverName = this.servers[serverChannelId].name;

    var welcomeMessage = util.format('<@!%s> has joined %s', user.id, serverName);

    this.sendMessage({
        to: serverChannelId,
        message: welcomeMessage
    });
});

/*
 * Send a message whenever a user leaves the server
 */
bot.client.on('guildMemberRemove', function(user, event) {
    var serverChannelId = user.guild_id;
    var serverName = this.servers[serverChannelId].name;

    var message = util.format('Byebye <@!%s>', user.id);

    this.sendMessage({
        to: serverChannelId,
        message: message
    });
});

bot.client.on('ready', function(user, event) {
    console.log(this.servers['199113218600206336'].channels['199113218600206336']);
});

bot.client.on('any', function(user, event) {
    //console.log(arguments);
});