// e2e-real/support/dbCleanup.js — TEST-ONLY utility, never used by
// application code.
//
// Exists to work around a real backend bug discovered by this E2E suite
// (documented in the final report): Order.payment_order_id is `String?
// @unique` in prisma/schema.prisma, and MongoDB's default (non-sparse)
// unique index treats `null` as a real value — so at most ONE order in the
// entire database can have payment_order_id: null (i.e. be an unpaid
// draft) at any moment. A test that intentionally drives a draft order
// into a permanently-refused state (e.g. "product deleted mid-checkout")
// would otherwise leave that null slot stuck forever, blocking every
// later draft-order creation in the suite (or, in production, every later
// real customer). This connects directly to the SAME dedicated E2E
// database (never dev/prod — see backend 2.0/.env.e2e) using the
// `mongodb` driver already a dependency of backend 2.0, and deletes
// exactly the one order id the calling test itself just created and
// intentionally broke. It is test cleanup, not a workaround shipped
// anywhere near application code.
const { MongoClient, ObjectId } = require('../../../backend 2.0/node_modules/mongodb');

const DATABASE_URL =
  process.env.E2E_DATABASE_URL ||
  'mongodb+srv://advikaautoaccessories:J0naI2agou8uZzON@cluster0.yymmdae.mongodb.net/advikaautoaccessories_e2e?appName=Cluster0';

async function deleteStuckDraftOrder(orderId) {
  const client = new MongoClient(DATABASE_URL);
  try {
    await client.connect();
    const db = client.db();
    await db.collection('Order').deleteOne({ _id: new ObjectId(orderId) });
    await db.collection('OrderItem').deleteMany({ orderId });
  } finally {
    await client.close();
  }
}

module.exports = { deleteStuckDraftOrder };
