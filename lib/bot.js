/**
 * Created by oscar on 14/07/2016.
 */
var YuiDiscordClient = require('./discord');
var util = require('util');
var moment = require('moment');

const BOT_VERSION = '0.1';

function YuiBot(token) {
    (function(scope) {

        scope.client = null;
        scope.commands = [ ];
        scope.adminRoles = [ ];
        scope.blacklistedChannels = [ ];

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

        scope.setBlacklistedChannels = function(blacklistedChannels) {
            this.blacklistedChannels = blacklistedChannels;
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

                if(scope.blacklistedChannels.indexOf(channelId) >= 0) {
                    return;
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

module.exports = YuiBot;