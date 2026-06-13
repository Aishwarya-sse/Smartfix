const crypto = require('crypto');

class MockQuery extends Array {
  populate(path, select) {
    for (let i = 0; i < this.length; i++) {
      const item = this[i];
      if (path === 'partner' && item.partner) {
        if (typeof item.partner === 'string') {
          const partner = mockDb.User.data.find(u => u._id === item.partner);
          if (partner) {
            item.partner = { ...partner };
          }
        }
      } else if (path === 'user' && item.user) {
        if (typeof item.user === 'string') {
          const user = mockDb.User.data.find(u => u._id === item.user);
          if (user) {
            item.user = { ...user };
          }
        }
      }
    }
    return this;
  }

  select(fieldsString) {
    return this;
  }

  sort(compareFn) {
    if (typeof compareFn === 'object') {
      const key = Object.keys(compareFn)[0];
      const desc = compareFn[key] === -1;
      super.sort((a, b) => {
        let valA = a[key];
        let valB = b[key];
        if (valA instanceof Date) valA = valA.getTime();
        if (valB instanceof Date) valB = valB.getTime();
        if (valA < valB) return desc ? 1 : -1;
        if (valA > valB) return desc ? -1 : 1;
        return 0;
      });
    }
    return this;
  }

  exec() {
    return this;
  }
}

class MockModel {
  constructor(name, defaultFields = {}) {
    this.name = name;
    this.defaultFields = defaultFields;
    this.data = [];
  }

  async find(query = {}) {
    const matched = this.data.filter(item => this._matches(item, query));
    const wrapped = matched.map(item => this._wrapInstance(item));
    return new MockQuery(...wrapped);
  }

  async findOne(query = {}) {
    const matched = this.data.find(item => this._matches(item, query));
    return matched ? this._wrapInstance(matched) : null;
  }

  async findById(id) {
    if (!id) return null;
    const matched = this.data.find(item => item._id === id.toString());
    return matched ? this._wrapInstance(matched) : null;
  }

  async create(doc) {
    const newDoc = {
      _id: doc._id || crypto.randomBytes(12).toString('hex'),
      ...this.defaultFields,
      ...doc,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.data.push(newDoc);
    return this._wrapInstance(newDoc);
  }

  async findByIdAndUpdate(id, update, options = {}) {
    if (!id) return null;
    const index = this.data.findIndex(item => item._id === id.toString());
    if (index === -1) return null;
    
    const original = this.data[index];
    const updated = {
      ...original,
      ...update,
      updatedAt: new Date()
    };
    this.data[index] = updated;
    return this._wrapInstance(updated);
  }

  _matches(item, query) {
    for (const key in query) {
      if (key === '$or' && Array.isArray(query[key])) {
        return query[key].some(subQuery => this._matches(item, subQuery));
      }
      
      const queryVal = query[key];
      const itemVal = item[key];
      
      if (queryVal && typeof queryVal === 'object' && !Array.isArray(queryVal)) {
        // Simple support for geo or custom fields
        continue;
      }
      
      if (itemVal !== queryVal) {
        return false;
      }
    }
    return true;
  }

  _wrapInstance(item) {
    const modelInstance = { ...item };
    modelInstance.save = async () => {
      const idx = this.data.findIndex(d => d._id === item._id);
      const dataToSave = { ...modelInstance };
      delete dataToSave.save;
      dataToSave.updatedAt = new Date();
      
      if (idx !== -1) {
        this.data[idx] = dataToSave;
      } else {
        this.data.push(dataToSave);
      }
      return this._wrapInstance(dataToSave);
    };
    return modelInstance;
  }
}

const mockDb = {
  User: new MockModel('User', { isVerified: false, isAvailable: true }),
  Request: new MockModel('Request', { status: 'Pending', partner: null }),
  Conversation: new MockModel('Conversation', { messages: [], active: true })
};

// Seed some active partners for immediate testing!
mockDb.User.create({
  _id: '65c2a1e8f1b2c3d4e5f6a7b9',
  name: 'CleanGreen Services (Chennai)',
  email: 'partner1@smartfix.com',
  password: 'hashedpassword',
  role: 'partner',
  isVerified: true,
  partnerCategory: 'garbage',
  latitude: 13.0827,
  longitude: 80.2707, // Chennai coordinates
  isAvailable: true
});

mockDb.User.create({
  _id: '65c2a1e8f1b2c3d4e5f6a7ba',
  name: 'Plumbing Pro Services',
  email: 'partner2@smartfix.com',
  password: 'hashedpassword',
  role: 'partner',
  isVerified: true,
  partnerCategory: 'water',
  latitude: 13.0850,
  longitude: 80.2800,
  isAvailable: true
});

mockDb.User.create({
  _id: '65c2a1e8f1b2c3d4e5f6a7bb',
  name: 'Rapid Waste Removal',
  email: 'partner3@smartfix.com',
  password: 'hashedpassword',
  role: 'partner',
  isVerified: true,
  partnerCategory: 'garbage',
  latitude: 13.0900,
  longitude: 80.2600, // Close to partner 1
  isAvailable: true
});

module.exports = mockDb;
