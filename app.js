const express = require("express");
const db = require("./mydb");

require("dotenv").config();
const IP = process.env.IP;
const PORT = process.env.PORT;

const app = express();

// A middle for checking if an api key is provided by the user
// If an api key is provided in the authorization header field then
// the api key is attached to the req object
const getApiKey = async (req, res, next) => {
  const apiKey = req.headers.authorization;
  if (!apiKey) {
    res.status(403).json({
      status: "fail",
      data: { apiKey: "No api key in Authorization header" },
    });
  } else {
    req.apiKey = apiKey.replace("Bearer ", "").trim();
    next();
  }
};

// A middleware for checking if an api key is valid
// and is still active.
// if Ok the id of the user performing the request is attached to the req object.

const validateApiKey = async (req, res, next) => {
  try {
    const result = await db.getUserByApiKey(req.apiKey);
    // Check if user is active
    // check if null result then not found
    if (!result || !result.active) {
      res.status(403).json({ status: "fail", data: { key: "Invalid api key" } });
    } else {
      req.userId = result.id;
      next();
    }
  } catch (e) {
    console.log(e);
    res.status(500).json({ code: "error", message: "Internal server error" });
  }
};

app.use(express.urlencoded({ extended: false })); // to support URL-encoded bodies
app.use(express.json()); // to support JSON-encoded bodies

app.post("/register", async (req, res) => {
  const username = req.body.username;
  const email = req.body.email;
  try {
    const result = await db.register(username, email);
    res.json({
      status: `welcome ${username}, you have been successfully registered: ${email}`,
      data: { id: result.id, key: result.apiKey.key },
    });
  } catch (e) {
    if (e.status === "sorry, something went wrong") {
      res.status(400).json({ status: e.status, data: e.dataError });
    } else {
      // e.status === 50X
      res.status(500).json({ status: e.status, message: e.message });
    }
  }
});

/*

Method : POST
URL : http://127.0.0.1:3333/register

BODY :
 {
    "username" : "mathis",
    "email" : "mathis@mail.com"
}

HEADERS :
Name : Content-Type
Value : application/json

Response: 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 81
ETag: W/"51-HC4mlLU8wg20KxT6+107p7qTpx8"
Date: Sun, 01 Aug 2021 14:53:45 GMT
Connection: keep-alive
Keep-Alive: timeout=5
{
    "status": "welcome mathis you have been successfully registered: mathis@mail.com",
    "data": {
        "id": 1,
        "key": "52b8418c-7ad4-4a65-91f5-9551b19da1fd"
    }
}
*/

app.use(getApiKey);
app.use(validateApiKey);

app.get("/user_by_id/:userId", async (req, res) => {
  let userId = req.params.userId;
  if (isNaN(userId)) {
    res.json({ status: "fail", data: { userId: `Sorry but ${userId} is not a number` } });
    return;
  }
  userId = Number(userId);
  try {
    const result = await db.getUserById(userId);
    res.json({ status: "success", data: { user: result } });
  } catch (e) {
    if (e.status === "fail") {
      res.status(400).json({ status: e.status, data: e.dataError });
    } else {
      // e.status === 50X
      res.status(500).json({ status: e.status, message: e.message });
    }
  }
});

app.get("/myinfo", async (req, res) => {
  const userId = req.userId;
  try {
    const result = await db.getUserById(userId);
    res.json({ status: "success", data: { user: result } });
  } catch (e) {
    if (e.status === "fail") {
      res.status(400).json({ status: e.status, data: e.dataError });
    } else {
      // e.status === 50X
      res.status(500).json({ status: e.status, message: e.message });
    }
  }
});

app.get("/user_by_username/:username", async (req, res) => {
  // A implémenter
  try {
    const result = await db.getUserByUsername(req.params.username);
    res.json({ status: "success", data: { user: result } });
  } catch (e) {
    if (e.status === "fail") {
      res.status(400).json({ status: e.status, data: e.dataError });
    } else {
      res.status(500).json({ status: e.status, message: e.message });
    }
  }
});

/*

Method : GET
URL : http://127.0.0.1:3333/user_by_username/mathis

BODY :
 {
    "username" : "username"
}

HEADERS :
Name : Content-Type
Value : application/json

Response: 200 OK

X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 142
ETag: W/"8e-qSL5tJOuTZJwGpzgu6LLYWZOjtk"
Date: Sun, 01 Aug 2021 16:06:38 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{
    "status": "success",
    "data": {
        "user": {
            "id": 1,
            "username": "mathis",
            "email": "mathis@mail.com",
            "createdAt": "2021-08-01T14:53:45.353Z",
            "active": true
        }
    }
}
*/

app.post("/send_message", async (req, res) => {
  const dst = req.body.dst; // dst est une string
  const content = req.body.content;
  try {
    const resultDstUser = await db.getUserByUsername(dst);
    if (!resultDstUser) {
      res.status(400).json({
        status: "fail",
        data: { message_sent: false, message: `${dst} does not exist` },
      });
      return;
    }
    if (resultDstUser.id === req.userId) {
      res.status(400).json({
        status: "fail",
        data: {
          message_sent: false,
          message: `you can not send a message to yourself`,
        },
      });
      return;
    }
    const result = await db.sendMessage(req.userId, resultDstUser.id, content);
    res.json({ status: "success", data: { message_sent: true } });
  } catch (e) {
    if (e.status === "fail") {
      res.status(400).json({ status: e.status, data: e.dataError });
    } else {
      res.status(500).json({ status: e.status, message: e.message });
    }
  }
});

app.get("/read_message/:username", async (req, res) => {
  const peerUsername = req.params.username;
  if (peerUsername === req.username) {
    res.status(400).json({
      status: "fail",
      data: {
        messages: `you can not have a conversation with yourself`,
      },
    });
    return;
  }
  try {
    const peerUser = await db.getUserByUsername(peerUsername);
    if (!peerUser) {
      res.status(400).json({
        status: "fail",
        data: { messages: `${peerUsername} does not exist` },
      });
      return;
    }
    const result = await db.readMessage(req.userId, peerUser.id);
    const messages = result.map((message) => {
      if (message.srcId === req.userId) {
        message.src = req.username;
        message.dst = peerUsername;
      } else {
        message.src = peerUsername;
        message.dst = req.username;
      }
      delete message.srcId;
      delete message.dstId;
      return message;
    });
    res.json({
      status: "success",
      data: { messages: result },
    });
  } catch (e) {
    if (e.status === "fail") {
      res.status(400).json({ status: e.status, data: e.dataError });
    } else {
      res.status(500).json({ status: e.status, message: e.message });
    }
  }
});

app.delete("/delete_user_by_id/:id", async (req, res) => {
  //const id = req.params.id;
  let id = req.id;
  if (isNaN(id)) {
    res.json({ status: "fail", data: { id: `${id} is not a number` } });
    return;
  }
  id = Number(id);
  try {
    const result = await db.deleteUserById(id);
    res.json({ status: "success", data: { user: result } });
  } catch (e) {
    if (e.status === "fail") {
      res.status(400).json({ status: e.status, data: e.dataError });
    } else {
      // e.status === 50X
      res.status(500).json({ status: e.status, message: e.message });
    }
  }
});

app.listen(PORT, IP, () => {
  console.log(`listening on ${IP}:${PORT}`);
});
