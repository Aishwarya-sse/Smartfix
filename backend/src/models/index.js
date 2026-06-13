const mongoose = require('mongoose');
const UserReal = require('./User');
const RequestReal = require('./Request');
const ConversationReal = require('./Conversation');
const PostReal = require('./Post');
const dbMock = require('./dbMock');

const modelsProxy = new Proxy({}, {
  get: (target, prop) => {
    if (global.useMemoryDb) {
      return dbMock[prop];
    }
    const realModels = {
      User: UserReal,
      Request: RequestReal,
      Conversation: ConversationReal,
      Post: PostReal
    };
    return realModels[prop];
  }
});

module.exports = modelsProxy;

