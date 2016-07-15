/**
 * Created by oscar on 15/07/2016.
 */

module.exports = (function() {

    this.xpForLevel = function(level) {
        return 5 * Math.pow(level, 2) + 50 * level + 100;
    };

    this.levelForXp = function(xp) {
        var level = 0;

        while(true) {
            if(xp < this.xpForLevel(level)) {
                return level - 1;
            }

            level++;
        }

        return level;
    };

    return this;
});