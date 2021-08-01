const crypto = require("crypto");
const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient();

const customizeError = (e) => {
  // A query error
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    e.status = "fail";
    e.dataError = {};
    switch (e.code) {
      case "P2002":
        e.dataError[e.meta.target[0]] = `Sorry but this ${e.meta.target[0]} already exists`;
        break;
      default:
        e.dataError[e.meta.target[0]] = e.message;
    }
  } else {
    e.status = "error";
  }
  throw e;
};

exports.register = async (username, email) => {
  const apiKey = crypto.randomUUID();
  try {
    const result = await prisma.user.create({
      data: {
        username: username,
        email: email,
        apiKey: {
          create: {
            key: apiKey,
          },
        },
      },
    });
    console.log(result);

    return await prisma.user.findUnique({
      where: {
        id: result.id,
      },
      select: {
        id: true,
        apiKey: {
          select: {
            key: true,
          },
        },
      },
    });
  } catch (e) {
    customizeError(e);
    throw e;
  }
};

exports.getUserByApiKey = async (apiKey) => {
  try {
    /* 1ere alternative: la meilleure */
    const result = await prisma.user.findFirst({
      where: {
        apiKey: {
          key: {
            contains: apiKey,
          },
        },
      },
    });
    /* 2eme alternative: result est différent
    const result =  await prisma.apiKey.findUnique({
      where: {
        key: apiKey,
      },
      select: {
        user: true,
      },
    })*/
    return result;
  } catch (e) {
    customizeError(e);
    throw e;
  }
};

exports.getUserById = async (userId) => {
  try {
    const result = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
    return result;
  } catch (e) {
    customizeError(e);
    throw e;
  }
};

exports.getUserByUsername = async (username) => {
  // A implémenter
  try {
    const result = await prisma.user.findUnique({
      where: {
        username: username,
      },
    });
    return result;
  } catch (e) {
    customizeError(e);
    throw e;
  }
};

exports.sendMessage = async (srcId, dstId, content) => {
  // A Implémenter
  try {
    const result = await prisma.message.create({
      data: {
        srcId: srcId,
        content: content,
        dstId: dstId,
      },
    });
    return result;
  } catch (e) {
    customizeError(e);
    throw e;
  }
};

exports.readMessage = async (user1Id, user2Id) => {
  // A Implémenter
  try {
    return await prisma.message.findMany({
      // par exemple: SELECT * FROM message WHERE src_id = 3 AND dst_id = 1 OR src_id = 1 AND dst_id = 3 ORDER BY created_at ASC;
      where: {
        OR: [
          {
            AND: [
              {
                srcId: user1Id,
              },
              {
                dstId: user2Id,
              },
            ],
          },
          {
            AND: [
              {
                srcId: user2Id,
              },
              {
                dstId: user1Id,
              },
            ],
          },
        ],
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        srcId: true,
        dstId: true,
        content: true,
        createdAt: true,
      },
    });
  } catch (e) {
    customizeError(e);
    throw e;
  }
};

exports.deleteUserById = async (id) => {
  try {
    const result = await prisma.user.delete({
      where: {
        id: id,
      },
    });
    return result;
  } catch (e) {
    customizeError(e);
    throw e;
  }
};

/*
exports.deleteUser = async (username, email) => {
  try {
    const result = await prisma.user.delete({
      where: {
        email: "email",
      },
      select: {
        email: true,
        username: true,
      },
    });
    return result;
  } catch (e) {
    customizeError(e);
    throw e;
  }
};
*/
