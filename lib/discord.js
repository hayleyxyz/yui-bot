/**
 * Created by oscar on 14/07/2016.
 */
var Discord = require('discord.io');
var util = require('util');

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

module.exports = YuiDiscordClient;