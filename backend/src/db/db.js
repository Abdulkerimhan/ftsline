// src/db/db.js
// BURASI DB KATMANI. (Mongo/Mongoose veya SQL'e göre dolduracaksın)

export const db = {
  matrix_nodes: {
    findOne: async (filter) => {
      throw new Error("db.matrix_nodes.findOne not implemented");
    },
    find: async (filter) => {
      throw new Error("db.matrix_nodes.find not implemented");
    },
    insertOne: async (doc) => {
      throw new Error("db.matrix_nodes.insertOne not implemented");
    },
    updateOne: async (filter, update) => {
      throw new Error("db.matrix_nodes.updateOne not implemented");
    },
    updateMany: async (filter, update) => {
      throw new Error("db.matrix_nodes.updateMany not implemented");
    },
  },

  pro_payments: {
    find: async (filter) => {
      throw new Error("db.pro_payments.find not implemented");
    },
  },
};
