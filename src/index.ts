import express = require("express");
import debug = require("debug");
import httpExpress from "@meeshkanml/express-middleware";
import * as kafka from "@meeshkanml/http-types-kafka";
import { v4 as uuidv4 } from "uuid";
import { HttpExchange } from "http-types";
import * as url from "url";

const debugLog = debug("express-app");

const KAFKA_TOPIC = "http_recordings";
const KAFKA_CONFIG: kafka.KafkaConfig = {
  brokers: ["localhost:9092"],
};
const PORT = 3000;

// Resource representation
interface User {
  id: string;
  name: string;
  email: string;
}

interface CreateUserInput {
  name: string;
  email: string;
}

class UserStore {
  private readonly users: Record<string, User> = {};
  constructor() {}

  getUserById(userId: string): User | undefined {
    return this.users[userId];
  }

  createUser(userInput: CreateUserInput): User {
    const userId = uuidv4();
    const user: User = {
      id: userId,
      name: userInput.name,
      email: userInput.email,
    };
    this.users[userId] = user;
    return user;
  }
}

const parseCreateUserInput = (body: any): CreateUserInput => {
  if (typeof body.name !== "string") {
    throw Error(`Bad name: ${body.name}`);
  }
  if (typeof body.email !== "string") {
    throw Error(`Bad email: ${body.email}`);
  }
  return {
    name: body.name,
    email: body.email,
  };
};

const USERS_ROUTE = "/users";

const usersRouter = (userStore: UserStore): express.Router => {
  const router = express.Router();

  router.post("/", (req: express.Request, res: express.Response) => {
    // Handle post user
    let userInput: CreateUserInput;
    debugLog("Incoming post user", req.body);
    try {
      userInput = parseCreateUserInput(req.body);
    } catch (err) {
      debugLog("Bad request", err, req.body);
      return res.sendStatus(400);
    }
    const newUser = userStore.createUser(userInput);
    // Set Location for client-navigation
    res.location(`${USERS_ROUTE}/${newUser.id}`);
    return res.json(newUser);
  });

  router.get("/:userId", (req: express.Request, res: express.Response) => {
    // Handle get user
    const userId = req.params.userId;
    if (typeof userId !== "string") {
      return res.sendStatus(400);
    }
    const maybeUser = userStore.getUserById(userId);
    if (maybeUser) {
      return res.json(maybeUser);
    } else {
      return res.sendStatus(404);
    }
  });

  return router;
};

const buildApp = (kafkaTransport: kafka.HttpTypesKafkaProducer) => {
  const app = express();

  app.use(express.json());

  const transport = async (exchange: HttpExchange) => {
    debugLog("Sending an exchange to Kafka");
    await kafkaTransport.send(exchange);
  };

  app.use(
    httpExpress({
      transports: [transport],
    })
  );

  const userStore = new UserStore();

  app.use(USERS_ROUTE, usersRouter(userStore));

  return app;
};

const main = async () => {
  const kafkaTransport = kafka.HttpTypesKafkaProducer.create({ kafkaConfig: KAFKA_CONFIG, topic: KAFKA_TOPIC });
  const app = buildApp(kafkaTransport);

  // Prepare
  await kafkaTransport.connect();

  app.listen(PORT, "localhost", () => {
    console.log(`Listening at port ${PORT}`);
  });
  app.on("close", () => console.log("Closing express"));
};

main();
