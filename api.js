'use strict';
const Homey = require('homey');

module.exports = [
    {
        description: 'Retrieve all rain data',
        method: 'GET',
        path: '/raindata',
        role: 'owner',
        requires_authorization: true,
        fn: function (args, callback) {
             callback(null, Homey.app.getRainData());
        }
    }
];