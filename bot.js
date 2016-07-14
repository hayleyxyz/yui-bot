var Discord = require('discord.io');
var moment = require('moment');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var config = require('./config');

const BOT_VERSION = '0.1';

function YuiDB(knex) {
    (function(scope) {

        scope.knex = knex;

        scope.recordLastSeen = function(serverId, userId, username) {
            scope.knex('server_users')
                .where({
                    server_id: serverId,
                    user_id: userId
                })
                .select('id').then(function(rows) {
                    if(rows.length > 0) {
                        knex('server_users')
                            .where('id', '=', rows[0].id)
                            .update({
                                last_seen_at: new Date(),
                                username: username
                            }).catch(function(e) {
                                console.error(e);
                            });
                    }
                    else {
                        knex('server_users')
                            .insert({
                                server_id: serverId,
                                user_id: userId,
                                username: username,
                                last_seen_at: new Date()
                            }).catch(function(e) {
                                console.error(e);
                            });
                    }
                });
        };

        scope.getLastSeen = function(serverId, userId, callback) {
            scope.knex('server_users')
                .where({
                    server_id: serverId,
                    user_id: userId
                })
                .select('last_seen_at').then(function(rows) {
                    if(rows.length > 0) {
                        callback(rows[0].last_seen_at);
                    }
                    else {
                        callback(null);
                    }
                });
        };

    })(this);
}

function YuiDiscordClient(options) {
    Discord.Client.call(this, options);

    (function(scope) {

        scope.createPermissionsMask = function(permissions) {
            var mask = 0;

            for(var i in permissions) {
                mask |= (1 << permissions[i]);
            }

            return mask;
        };

        scope.editChannelPermissions = function(channelId, overwriteId, type, allow, deny) {
            var payload = {
                allow: allow,
                deny: deny,
                type: type
            };

            this._req('put', "https://discordapp.com/api/channels/" + channelId + "/permissions/" + overwriteId, payload, function(err, res) {
                
            });
        };

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

        scope.getPermissionOverwrites = function(serverId, channelId, id, type) {
            for(var i in scope.client.servers[serverId].channels[channelId].permission_overwrites) {
                var perm = scope.client.servers[serverId].channels[channelId].permission_overwrites[i];

                if(perm.type === type && perm.id === id) {
                    return perm;
                }
            }
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

                scope.printUserMessage(event);

                for(var i in scope.commands) {
                    if(scope.testTrigger(scope.commands[i].trigger, message)) {
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

var knex = require('knex')({
    client: 'sqlite3',
    connection: {
        filename: "./db.sqlite3"
    }
});

var db = new YuiDB(knex);

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
bot.addCommand(new Command(/^\.nick (<@!?([0-9]+)>)( +)(.+)$/i, function(client, user, userId, channelId, message, event) {

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
bot.addCommand(new Command(/^\.game (.+)$/i, function(client, user, userId, channelId, message, event) {

    var serverId = client.serverFromChannel(channelId);

    if(this.userHasAdmin(serverId, userId)) {
        var gameName = message.match(/ .+/, '');

        client.setPresence({
            game: gameName
        });
    }
}));

/*
 * Text mute a specified user in the current channel
 * Usage .mute @user
 */
bot.addCommand(new Command(/^\.mute (<@!?([0-9]+)>)$/i, function(client, user, userId, channelId, message, event) {
    var serverId = client.serverFromChannel(channelId);

    if(this.userHasAdmin(serverId, userId)) {
        var args = message.match(/(<@!?([0-9]+)>)/);
        var targetUserId = args[2];

        var allowMask = 0;
        var denyMask = client.createPermissionsMask([ Discord.Client.Permissions.TEXT_SEND_MESSAGES ]);

        var perms = this.getPermissionOverwrites(serverId, channelId, targetUserId, 'member');
        if(perms) {
            denyMask = perms.deny | client.createPermissionsMask([ Discord.Client.Permissions.TEXT_SEND_MESSAGES ]);
            allowMask = perms.allow & ~client.createPermissionsMask([ Discord.Client.Permissions.TEXT_SEND_MESSAGES ]);
        }

        client.editChannelPermissions(channelId, targetUserId, 'member', allowMask, denyMask);

        client.sendMessage({
            to: channelId,
            message: util.format('<@!%s> has been muted on <#%s>', targetUserId, channelId)
        });
    }
}));

/*
 * Text unmute a specified user in the current channel
 * Usage: .unmute @user
 */
bot.addCommand(new Command(/^\.unmute (<@!?([0-9]+)>)$/i, function(client, user, userId, channelId, message, event) {
    var serverId = client.serverFromChannel(channelId);

    if(this.userHasAdmin(serverId, userId)) {
        var args = message.match(/(<@!?([0-9]+)>)/);
        var targetUserId = args[2];

        var allowMask = 0;
        var denyMask = client.createPermissionsMask([ Discord.Client.Permissions.TEXT_SEND_MESSAGES ]);

        var perms = this.getPermissionOverwrites(serverId, channelId, targetUserId, 'member');
        if(perms) {
            denyMask = perms.deny & ~client.createPermissionsMask([ Discord.Client.Permissions.TEXT_SEND_MESSAGES ]);
            allowMask = perms.allow;
        }

        client.editChannelPermissions(channelId, targetUserId, 'member', allowMask, denyMask);

        client.sendMessage({
            to: channelId,
            message: util.format('<@!%s> has been unmuted on <#%s>', targetUserId, channelId)
        });
    }
}));

/*
 * Text mute a specified user on all channels
 * Usage: .muteall @user
 */
bot.addCommand(new Command(/^\.muteall (<@!?([0-9]+)>)$/i, function(client, user, userId, channelId, message, event) {
    var serverId = client.serverFromChannel(channelId);

    if(this.userHasAdmin(serverId, userId)) {
        var args = message.match(/(<@!?([0-9]+)>)/);
        var targetUserId = args[2];

        for(var i in client.servers[serverId].channels) {
            var channel = client.servers[serverId].channels[i];

            var allowMask = 0;
            var denyMask = client.createPermissionsMask([Discord.Client.Permissions.TEXT_SEND_MESSAGES]);

            var perms = this.getPermissionOverwrites(serverId, channel.id, targetUserId, 'member');
            if (perms) {
                denyMask = perms.deny | client.createPermissionsMask([Discord.Client.Permissions.TEXT_SEND_MESSAGES]);
                allowMask = perms.allow & ~client.createPermissionsMask([Discord.Client.Permissions.TEXT_SEND_MESSAGES]);
            }

            client.editChannelPermissions(channel.id, targetUserId, 'member', allowMask, denyMask);
        }

        client.sendMessage({
            to: channelId,
            message: util.format('<@!%s> has been muted on all channels!', targetUserId)
        });
    }
}));

/*
 * Text unmute a specified user on all channels
 * Usage: .unmuteall @user
 */
bot.addCommand(new Command(/^\.unmuteall (<@!?([0-9]+)>)$/i, function(client, user, userId, channelId, message, event) {
    var serverId = client.serverFromChannel(channelId);

    if(this.userHasAdmin(serverId, userId)) {
        var args = message.match(/(<@!?([0-9]+)>)/);
        var targetUserId = args[2];

        for(var i in client.servers[serverId].channels) {
            var channel = client.servers[serverId].channels[i];

            var allowMask = 0;
            var denyMask = client.createPermissionsMask([Discord.Client.Permissions.TEXT_SEND_MESSAGES]);

            var perms = this.getPermissionOverwrites(serverId, channel.id, targetUserId, 'member');
            if (perms) {
                denyMask = perms.deny & ~client.createPermissionsMask([ Discord.Client.Permissions.TEXT_SEND_MESSAGES ]);
                allowMask = perms.allow;
            }

            client.editChannelPermissions(channel.id, targetUserId, 'member', allowMask, denyMask);
        }

        client.sendMessage({
            to: channelId,
            message: util.format('<@!%s> has been unmuted on all channels!', targetUserId)
        });
    }
}));

bot.addCommand(new Command(/^\.lastseen (<@!?([0-9]+)>)$/i, function(client, user, userId, channelId, message, event) {
    var serverId = client.serverFromChannel(channelId);
    var args = message.match(/(<@!?([0-9]+)>)/);
    var targetUserId = args[2];

    if(targetUserId === client.id) {
        client.sendMessage({
            to: channelId,
            message: util.format('I\'m always watching.')
        });
    }
    else if(targetUserId === '159592526498496512') { // Luna
        client.sendMessage({
            to: channelId,
            message: util.format('She\'s always here.')
        });
    }
    else if(targetUserId === '175044949744680970') { // me!
        client.sendMessage({
            to: channelId,
            message: util.format('...')
        });
    }
    else if(targetUserId === '108233630018437120') { // Ene
        client.sendMessage({
            to: channelId,
            message: util.format('Doesn\'t matter, has shit taste.')
        });
    }
    else {
        db.getLastSeen(serverId, targetUserId, function (lastSeenAt) {
            if (lastSeenAt) {
                var dateTime = moment(lastSeenAt);
                var formatted = dateTime.format('dddd, MMMM Do YYYY, h:mm:ss a');

                client.sendMessage({
                    to: channelId,
                    message: util.format('<@!%s> was last seen here %s', targetUserId, formatted)
                });
            }
            else {
                client.sendMessage({
                    to: channelId,
                    message: util.format('I\'ve not seen <@!%s> here yet!', targetUserId)
                });
            }

        });
    }
}));

bot.addCommand(new Command(/^\.say (.+)$/i, function(client, user, userId, channelId, message, event) {
    var match = message.match(/^\.say (.+)$/i);
    var messageToSay = match[1];

	   client.sendMessage({
	to: channelId,
	message: messageToSay
})
}));

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

bot.client.on('presence', function(username, userId, status, game, event) {
    db.recordLastSeen(event.d.guild_id, userId, username);
});

bot.client.on('ready', function(user, event) {
    //
});

bot.client.on('any', function(user, event) {
    //console.log(arguments);
});