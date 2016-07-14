/**
 * Created by oscar on 14/07/2016.
 */
var util = require('util');
var Discord = require('discord.io');

module.exports = function(models, knex) {

    function Command(trigger, handler) {
        this.trigger = trigger;
        this.handler = handler;
    }

    function TextRespondCommand(trigger, response) {
        this.trigger = trigger;

        this.handler = function (client, user, userId, channelId, message, event) {
            client.sendMessage({
                to: channelId,
                message: response
            });
        };
    }

    util.inherits(TextRespondCommand, Command);

    function UploadRespondCommand(trigger, file, text) {
        this.trigger = trigger;

        this.handler = function (client, user, userId, channelId, message, event) {
            client.uploadFile({
                to: channelId,
                file: './media/' + file,
                message: text
            });
        };
    }

    util.inherits(UploadRespondCommand, Command);

    /*
     * Change user nickname on the server
     * Usage: .nick @user nickname
     */
    var NickCommand = new Command(/^\.nick +(<@!?([0-9]+)>)( +)?(.+)?$/i, function (client, user, userId, channelId, message, event) {

        var serverId = client.serverFromChannel(channelId);

        if (this.userHasAdmin(serverId, userId)) {
            var args = message.match(/(<@!?([0-9]+)>)( +)?(.+)?/);

            var targetUserId = args[2];
            var targetNick = args[4];

            client.editNickname({
                nick: targetNick,
                serverID: serverId,
                userID: targetUserId
            });
        }
    });

    /*
     * Change the bot's currently displayed playing game
     * Usage: .game game name
     */
    var GameCommand = new Command(/^\.game +(.+)$/i, function (client, user, userId, channelId, message, event) {

        var serverId = client.serverFromChannel(channelId);

        if (this.userHasAdmin(serverId, userId)) {
            var gameName = message.match(/ .+/, '');

            client.setPresence({
                game: gameName
            });
        }
    });

    /*
     * Poke a user.
     * Usage .poke @user
     */
    var PokeCommand = new Command(/^\.poke +(<@!?([0-9]+)>)$/i, function (client, user, userId, channelId, message, event) {
        var args = message.match(/(<@!?([0-9]+)>)/);
        var targetUserId = args[2];

        if (targetUserId === client.id) {
            targetUserId = userId;
        }

        client.sendMessage({
            to: channelId,
            message: util.format('*pokes <@!%s>*', targetUserId)
        });
    });

    /*
     * Pats a user
     * Usage: .pat @user
     */
    var PatCommand = new Command(/^\.pat +(<@!?([0-9]+)>)$/i, function (client, user, userId, channelId, message, event) {
        var args = message.match(/(<@!?([0-9]+)>)/);
        var targetUserId = args[2];

        if (targetUserId === client.id) {
            targetUserId = userId;
        }

        client.sendMessage({
            to: channelId,
            message: util.format('*pats <@!%s>*', targetUserId)
        });
    });

    /*
     * Text mute a specified user in the current channel
     * Usage .mute @user
     */
    var MuteCommand = new Command(/^\.mute +(<@!?([0-9]+)>)$/i, function (client, user, userId, channelId, message, event) {
        var serverId = client.serverFromChannel(channelId);

        if (this.userHasAdmin(serverId, userId)) {
            var args = message.match(/(<@!?([0-9]+)>)/);
            var targetUserId = args[2];

            var allowMask = 0;
            var denyMask = client.createPermissionsMask([Discord.Client.Permissions.TEXT_SEND_MESSAGES]);

            var perms = this.getPermissionOverwrites(serverId, channelId, targetUserId, 'member');
            if (perms) {
                denyMask = perms.deny | client.createPermissionsMask([Discord.Client.Permissions.TEXT_SEND_MESSAGES]);
                allowMask = perms.allow & ~client.createPermissionsMask([Discord.Client.Permissions.TEXT_SEND_MESSAGES]);
            }

            client.editChannelPermissions(channelId, targetUserId, 'member', allowMask, denyMask);

            client.sendMessage({
                to: channelId,
                message: util.format('<@!%s> has been muted on <#%s>', targetUserId, channelId)
            });
        }
    });

    /*
     * Text unmute a specified user in the current channel
     * Usage: .unmute @user
     */
    var UnmuteCommand = new Command(/^\.unmute +(<@!?([0-9]+)>)$/i, function (client, user, userId, channelId, message, event) {
        var serverId = client.serverFromChannel(channelId);

        if (this.userHasAdmin(serverId, userId)) {
            var args = message.match(/(<@!?([0-9]+)>)/);
            var targetUserId = args[2];

            var allowMask = 0;
            var denyMask = client.createPermissionsMask([Discord.Client.Permissions.TEXT_SEND_MESSAGES]);

            var perms = this.getPermissionOverwrites(serverId, channelId, targetUserId, 'member');
            if (perms) {
                denyMask = perms.deny & ~client.createPermissionsMask([Discord.Client.Permissions.TEXT_SEND_MESSAGES]);
                allowMask = perms.allow;
            }

            client.editChannelPermissions(channelId, targetUserId, 'member', allowMask, denyMask);

            client.sendMessage({
                to: channelId,
                message: util.format('<@!%s> has been unmuted on <#%s>', targetUserId, channelId)
            });
        }
    });

    /*
     * Text mute a specified user on all channels
     * Usage: .muteall @user
     */
    var MuteAllCommand = new Command(/^\.muteall +(<@!?([0-9]+)>)$/i, function (client, user, userId, channelId, message, event) {
        var serverId = client.serverFromChannel(channelId);

        if (this.userHasAdmin(serverId, userId)) {
            var args = message.match(/(<@!?([0-9]+)>)/);
            var targetUserId = args[2];

            for (var i in client.servers[serverId].channels) {
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
    });

    /*
     * Text unmute a specified user on all channels
     * Usage: .unmuteall @user
     */
    var UnmuteAllCommand = new Command(/^\.unmuteall +(<@!?([0-9]+)>)$/i, function (client, user, userId, channelId, message, event) {
        var serverId = client.serverFromChannel(channelId);

        if (this.userHasAdmin(serverId, userId)) {
            var args = message.match(/(<@!?([0-9]+)>)/);
            var targetUserId = args[2];

            for (var i in client.servers[serverId].channels) {
                var channel = client.servers[serverId].channels[i];

                var allowMask = 0;
                var denyMask = client.createPermissionsMask([Discord.Client.Permissions.TEXT_SEND_MESSAGES]);

                var perms = this.getPermissionOverwrites(serverId, channel.id, targetUserId, 'member');
                if (perms) {
                    denyMask = perms.deny & ~client.createPermissionsMask([Discord.Client.Permissions.TEXT_SEND_MESSAGES]);
                    allowMask = perms.allow;
                }

                client.editChannelPermissions(channel.id, targetUserId, 'member', allowMask, denyMask);
            }

            client.sendMessage({
                to: channelId,
                message: util.format('<@!%s> has been unmuted on all channels!', targetUserId)
            });
        }
    });

    /*
     * Display the last time the specified user was seen on this channel
     * Usage: .lastseen @user
     */
    var LastSeenCommand = new Command(/^\.lastseen +(<@!?([0-9]+)>)$/i, function (client, user, userId, channelId, message, event) {
        var serverId = client.serverFromChannel(channelId);
        var args = message.match(/(<@!?([0-9]+)>)/);
        var targetUserId = args[2];

        if (targetUserId === client.id) {
            client.sendMessage({
                to: channelId,
                message: util.format('I\'m always watching.')
            });
        }
        else if (targetUserId === '159592526498496512') { // Luna
            client.sendMessage({
                to: channelId,
                message: util.format('She\'s always here.')
            });
        }
        else if (targetUserId === '175044949744680970') { // me!
            client.sendMessage({
                to: channelId,
                message: util.format('...')
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
    });

    /*
     * Echo a phrase back to the user
     * Usage: .say phrase
     */
    var SayCommand = new Command(/^\.say +(.+)$/i, function (client, user, userId, channelId, message, event) {
        var match = message.match(/^\.say +(.+)$/i);
        var messageToSay = match[1];

        var serverId = client.serverFromChannel(channelId);

        if (this.userHasAdmin(serverId, userId)) {
            client.sendMessage({
                to: channelId,
                message: messageToSay
            });
        }
    });

    /*
     * Pokes a user back :>
     */
    var PokeBackCommand = new Command(/^\*?pokes +(<@!?([0-9]+)>)\*?$/i, function (client, user, userId, channelId, message, event) {
        var args = message.match(/(<@!?([0-9]+)>)/);
        var targetUserId = args[2];

        if (targetUserId === client.id) {
            client.sendMessage({
                to: channelId,
                message: util.format('*pokes <@!%s> back*', userId)
            });
        }
    });

    /*
     * Pretty self-explanatory
     */
    var UnflipTableCommand = new Command(/^\(╯°□°）╯︵ ┻━┻$/i, function (client, user, userId, channelId, message, event) {
        client.sendMessage({
            to: channelId,
            message: '┬─┬﻿ ノ( ゜-゜ノ)'
        });
    });

    var PantsuCommand = new Command(/^\.pantsu$/i, function (client, user, userId, channelId, message, event) {

        var pantsuTypes = [
            'lace',
            'polkadot',
            'ichigo',
            'striped',
            'frilly',
            'loli',
            'soiled'
        ];

        var pantsuType = pantsuTypes[Math.floor(pantsuTypes.length * Math.random())];
        var pantsuCount = Math.round(Math.random() * 100); // Number of pantsu to give the user

        var model = new models.UserPantsu().save({
            discord_user_id: userId,
            count: pantsuCount
        }).then(function() {
            knex('user_pantsu').sum('count as total').where('discord_user_id', userId).then(function(result) {
                var total = 0;

                if(result.length > 0) {
                    total = result[0].total;
                }

                client.sendMessage({
                    to: channelId,
                    message: util.format('<@!%s> received %d %s pantsu! They have %d pantsu in total.',
                        userId, pantsuCount, pantsuType, total)
                });
            });
        });

    });

    var RankCommand = new Command(/^\.rank( +)?(<@!?([0-9]+)>)?/i, function (client, user, userId, channelId, message, event) {
        var args = message.match(/^\.rank( +)?(<@!?([0-9]+)>)?/i);

        var targetUserId = userId;

        if(args[3]) {
            targetUserId = args[3];
        }

        knex('messages').sum('xp as total').where('user_id', targetUserId).then(function(result) {
            var total = 0;

            if(result.length > 0) {
                total = result[0].total;
            }

            client.sendMessage({
                to: channelId,
                message: util.format('<@!%s> XP: %d',
                    targetUserId, total)
            });
        });

    });

    return {
        Command: Command,
        TextRespondCommand: TextRespondCommand,
        UploadRespondCommand: UploadRespondCommand,
        NickCommand: NickCommand,
        GameCommand: GameCommand,
        PokeCommand: PokeCommand,
        PatCommand: PatCommand,
        MuteCommand: MuteCommand,
        UnmuteCommand: UnmuteCommand,
        MuteAllCommand: MuteAllCommand,
        UnmuteAllCommand: UnmuteAllCommand,
        LastSeenCommand: LastSeenCommand,
        SayCommand: SayCommand,
        LastSeenCommand: PokeBackCommand,
        UnflipTableCommand: UnflipTableCommand,
        PantsuCommand: PantsuCommand,
        RankCommand: RankCommand
    };
}