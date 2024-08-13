const { JWT } = require("google-auth-library");
const axios = require("axios");
const fs = require("fs");
const SERVICE_ACCOUNT_FILE =
  "./victoryapp-1-firebase-adminsdk-g8vmj-6190eb8890.json";
const ServiceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_FILE));
const SCOPES = ["https://www.googleapis.com/auth/firebase.messaging"];

const client = new JWT({
  email: ServiceAccount.client_email,
  key: ServiceAccount.private_key,
  scopes: SCOPES,
});
async function getToken() {
  const token = await client.authorize();
  console.log(token.access_token);
  return token.access_token;
}
module.exports = { getToken };
//getToken();
