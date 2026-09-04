const mongoose = require("mongoose");
const { SignJWT, jwtVerify } = require("jose");

const SECRET = "dev-only-placeholder-change-me";
const KEY = new TextEncoder().encode(SECRET);
const EMAIL = "agilemindshubcentral@gmail.com";

async function main() {
  await mongoose.connect("mongodb://127.0.0.1:27017/quicklaunch", { dbName: "quicklaunch" });
  const users = mongoose.connection.collection("users");
  let user = await users.findOne({ email: EMAIL });
  if (!user) {
    const now = new Date();
    const r = await users.insertOne({
      email: EMAIL, name: "Agile Minds Hub", role: "admin",
      provider: "password", createdAt: now, updatedAt: now,
    });
    user = await users.findOne({ _id: r.insertedId });
  } else {
    await users.updateOne({ _id: user._id }, { $set: { role: "admin" } });
    user = await users.findOne({ _id: user._id });
  }

  const sub = String(user._id);
  const token = await new SignJWT({
    type: "session", sub, email: user.email, name: user.name || "Agile Minds Hub", role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime("2592000s")
    .sign(KEY);

  try {
    const v = await jwtVerify(token, KEY, { algorithms: ["HS256"] });
    console.log("SELF-VERIFY=OK role=" + v.payload.role);
  } catch (e) {
    console.error("SELF-VERIFY=FAIL " + e.code);
    process.exit(1);
  }
  console.log("ADMIN_USER_ID=" + user._id + " ROLE=" + user.role);
  console.log("COOKIE=ql_session=" + token);
  await mongoose.disconnect();
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
