/**
 * This file should just contain any static values that are per-bot specific.
 * There should not be any application logic.
 */
module.exports = {
    token: 'aaaaaaa',
    textResponses: [
        {
            trigger: /^ping$/i,
            response: 'pong'
        }
    ],
    fileResponses: [
        {
            trigger: /^.approve$/i,
            file: 'approve.png',
            message: 'Sign Of Approval!'
        }
    ]
};