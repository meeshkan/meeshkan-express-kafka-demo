---
title: How to record API traffic from Node.js server to Kafka
tags: node,typescript,api,kafka
published: false
---

# How to record API traffic from Node.js server to Kafka

Topic: How to record API traffic from Node.js server to Kafka

Audience: Developers creating Node.js servers
Goal: Introduce http-types to developers and teach how to record HTTP traffic from Express to Kafka

## Introduction

API traffic is a valuable source of data. Logs of API traffic can tell you what your users are doing, how your APIs are performing and if there are any anomalies in API usage such as DoS attacks. While there are excellent tools such as [Datadog](https://www.datadoghq.com/) for logging and anomaly detection, for full flexibility you might want to also process logs yourself.

API traffic is typically high-volume data, so you need to ensure recording traffic does not hinder API performance. Logs could also be coming from various sources such as servers written in different languages, so you probably want to decouple your data sources from your data sinks. One option is [Apache Kafka](https://kafka.apache.org/), a high-performance "distributed streaming platform". Kafka is a good choice for analysis not only because it can ingest data at huge volumes from various sources but also also because it's tailormade for real-time use cases such as sending alerts of DoS attacks.

In this tutorial, we'll learn how to record API traffic from a Node.js server to Apache Kafka in JSON format. We'll build the server, start a local Kafka cluster with Docker, and finally use the recording stream to build an OpenAPI specification of our Node.js server on-the-fly.

To follow along, you should have a recent installation of [Node.js](https://nodejs.org/en/), either [Docker](https://docs.docker.com/) or [Kafka](https://kafka.apache.org/quickstart#quickstart_download) installation and, for the last part, [Python](https://www.python.org/) 3.6+. All code and instructions can be found in [this GitHub repository](https://github.com/Meeshkan/meeshkan-express-kafka-demo).

## Creating a Node.js server

We'll create a RESTful server with [Express](https://expressjs.com/) and record traffic logs in [HTTP Types](https://meeshkan.github.io/http-types/) format. HTTP Types is a human-readable JSON format for HTTP exchanges, with an example exchange looking as follows:

```json
{
  "request": {
    "method": "get",
    "protocol": "http",
    "host": "example.com",
    "headers": {
      "accept": "*/*",
      "user-agent": "Mozilla/5.0 (pc-x86_64-linux-gnu) Siege/3.0.8"
    },
    "pathname": "/user/repos",
    "query": { "param": "value" },
    "timestamp": "2018-11-13T20:20:39+01:00"
  },
  "response": {
    "statusCode": 200,
    "body": "Hello as response!",
    "headers": {
      "content-length": "1999",
      "content-type": "text/html; charset=utf-8"
    },
    "timestamp": "2018-11-13T20:20:39+02:00"
  }
}
```

To log HTTP traffic from Express to Kafka, we'll need (1) a middleware converting Express requests and responses to HTTP Types objects and (2) a transport sending HTTP types objects to Kafka. The first task is handled by [@meeshkanml/express-middleware](https://github.com/Meeshkan/express-middleware) package, and the second by [http-types-kafka](https://github.com/meeshkan/http-types-kafka-node). We'll see below how to put all of these together.

Our server is defined in [src/index.ts](https://github.com/meeshkan/meeshkan-express-kafka-demo/blob/master/src/index.ts). The entrypoint to the program is the `main()` function defined as follows:

```ts
const KAFKA_TOPIC = "http_recordings";
const KAFKA_CONFIG: KafkaConfig = {
  brokers: ["localhost:9092"],
};

const main = async () => {
  const httpTypesKafkaProducer = HttpTypesKafkaProducer.create({
    kafkaConfig: KAFKA_CONFIG,
    topic: KAFKA_TOPIC,
  });

  const kafkaExchangeTransport = async (exchange: HttpExchange) => {
    debugLog("Sending an exchange to Kafka");
    await httpTypesKafkaProducer.send(exchange);
  };

  const app = buildApp(kafkaExchangeTransport);

  // Prepare
  await kafkaTransport.connect();

  app.listen(PORT, "localhost", () => {
    console.log(`Listening at port ${PORT}`);
  });
  app.on("close", () => console.log("Closing express"));
};

main();
```

Here we first create a Kafka producer by defining the Kafka topic to write to and the list of brokers consisting only of `localhost:9092`. `http-types-kafka` is a simple wrapper around [kafkajs](https://github.com/tulios/kafkajs), and `KafkaConfig` is defined in `kafkajs`. Transport of HTTP types is a function taking a `HttpExchange` object and returning a promise, defined in our case simply as

```ts
const kafkaExchangeTransport = async (exchange: HttpExchange) => {
  debugLog("Sending an exchange to Kafka");
  await httpTypesKafkaProducer.send(exchange);
};
```

In real-world use case, you would want to handle errors more carefully.

The Express `app` is defined in the `buildApp` function

```ts
import httpTypesExpressMiddleware from "@meeshkanml/express-middleware";

const buildApp = (exchangeTransport: (exchange: HttpExchange) => Promise<void>) => {
  const app = express();

  app.use(express.json());

  const kafkaExchangeMiddleware = httpTypesExpressMiddleware({
    transports: [exchangeTransport],
  });

  app.use(kafkaExchangeMiddleware);

  const userStore = new UserStore();

  app.use("/users", usersRouter(userStore));

  return app;
};
```

Here we use `express.json()` middleware to parse request bodies as JSON. Express middleware for logging API traffic is created with the `httpTypesExpressMiddleware` imported from [@meeshkanml/express-middleware](https://www.npmjs.com/package/@meeshkanml/express-middleware) package. The object takes a list of transports as an argument, so you could also send your logs to other destinations such as local file.

The actual user-facing API of our server is mounted on `/users` route defined in `usersRouter`. The function creating the [Express router](https://expressjs.com/en/4x/api.html#router) takes an instance of `UserStore` to access the list of users. For demonstration purposes, we define a simple synchronous in-memory user store as follows:

```ts
// Representation of user
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
```

The store keeps an in-memory dictionary of users by mapping user IDs to `User` objects and exposes `getUserById` and `createUser` methods for getting and creating users.

User requests are handled by our server as follows:

```ts
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
    res.location(`users/${newUser.id}`);
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
```

The router exposes `POST /` and `GET /:userId` routes for creating and fetching users, respectively. Remember the router is mounted to `/users`, so the routes translate to `POST /users` and `GET /users/:userId` routes at top-level.

Create user request is handled by first validating the user input. Creating a new user is then delegated to `userStore.createUser` and the created `User` object is send back to the user as JSON.

Fetching a user proceeds similarly: the user ID given in the route must be a string, after which a user is fetched from `userStore.getUserbyId`. The store returns `undefined` if the user is not found, so that's converted to a response with status code 404.

## Preparing Kafka

Before starting our server, we need to start Kafka. If you prefer to install Kafka on your own machine, you can follow the instructions in [Kafka Quick Start](https://kafka.apache.org/quickstart). Alternatively, you can use Docker. The accompanying [repository](https://github.com/Meeshkan/meeshkan-express-kafka-demo) has a Docker Compose file [zk-single-kafka-single.yml](https://github.com/meeshkan/meeshkan-express-kafka-demo/blob/master/zk-single-kafka-single.yml). As the name implies, it starts a single instance of Zookeeper and single instance of Kafka, which is sufficient for our purposes. The Docker Compose file has been copied with small modifications from [this repository](https://github.com/simplesteph/kafka-stack-docker-compose).

Using Docker Compose, you can start the Kafka cluster with

```bash
$ docker-compose -f zk-single-kafka-single.yml up -d
```

This starts Zookeeper and Kafka in the background. Data is persisted in the `zk-single-kafka-single/` directory. Kafka broker is listening at port 9092 published also by Docker.

Now we need to create a Kafka topic for our recordings. Run one of the following commands to create a topic named `http_recordings`, depending on whether you have Kafka tools installed or not:

```bash
# If you have Kafka installed
$ bin/kafka-topics.sh --bootstrap-server localhost:9092 --topic http_recordings --create --partitions 3 --replication-factor 1
# If you're using Docker
$ docker exec kafka1 kafka-topics --bootstrap-server localhost:9092 --topic http_recordings --create --partitions 3 --replication-factor 1
```

The latter command executes `kafka-topics` command inside the `kafka1` container started by Docker Compose.

To see messages arriving to Kafka, start a console consumer consuming `http_recordings` topic:

```bash
# If you have Kafka installed
$ bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic http_recordings --from-beginning
# If you're using Docker
$ docker exec kafka1 kafka-console-consumer --bootstrap-server localhost:9092 --topic http_recordings --from-beginning
```

### Recording calls

Now we're ready to start our server and make some calls! You can start the server with

```bash
$ yarn start
# OR if using npm
$ npm run start
```

Let's now make some calls to `localhost:3000` using `cURL`:

```bash
# Try fetching a user that does not exist
$ curl http://localhost:3000/users/non-existent
# Not found

# Create a user
$ curl -X POST -d '{"name": "Kimmo", "email": "kimmo@example.com" }' -H "Content-Type: application/json" http://localhost:3000/users
# {"id":"95768802-5476-4cae-aae4-fb51a6b62ec1","name":"Kimmo","email":"kimmo@example.com"}

# Replace the user ID with the value you got
$ curl http://localhost:3000/users/95768802-5476-4cae-aae4-fb51a6b62ec1
# {"id":"95768802-5476-4cae-aae4-fb51a6b62ec1","name":"Kimmo","email":"kimmo@example.com"}

# To save the created user ID to environment variable USER_ID in bash, you can use sed to replace the whole response body with the captured ID:
$ export USER_ID=`curl -X POST -d '{"name": "Kimmo", "email": "kimmo@example.com" }' -H "Content-Type: application/json" http://localhost:3000/users | sed 's/.*"id":"\([^"]*\)".*/\1/'`

# Get created user by using the environment variable
$ curl http://localhost:3000/users/${USER_ID}
```

Our Kafka console consumer should print HTTP exchanges line by line, showing we're successfully recording:

```bash
{"request":{"method":"get","protocol":"http","host":"localhost","headers":{"host":"localhost:3000","user-agent":"curl/7.54.0","accept":"*/*"},"body":"{}","path":"/non-existent","pathname":"/non-existent","query":{}},"response":{"statusCode":404,"headers":{"x-powered-by":"Express","content-type":"text/plain; charset=utf-8","content-length":"9","etag":"W/\"9-0gXL1ngzMqISxa6S1zx3F4wtLyg\""},"body":"Not Found"}}
{"request":{"method":"post","protocol":"http","host":"localhost","headers":{"host":"localhost:3000","user-agent":"curl/7.54.0","accept":"*/*","content-type":"application/json","content-length":"48"},"body":"{\"name\":\"Kimmo\",\"email\":\"kimmo@example.com\"}","path":"/","pathname":"/","query":{}},"response":{"statusCode":200,"headers":{"x-powered-by":"Express","location":"users/4b5be6a1-d8fc-4d88-8626-f02d2bb6a2ce","content-type":"application/json; charset=utf-8","content-length":"88","etag":"W/\"58-UlPz3KdpdSQ1q3AlXhHJG4COjFQ\""},"body":"{\"id\":\"4b5be6a1-d8fc-4d88-8626-f02d2bb6a2ce\",\"name\":\"Kimmo\",\"email\":\"kimmo@example.com\"}"}}
```

## Creating OpenAPI specification from recordings

As a use case for our HTTP recordings, we'll use the recordings to create an [OpenAPI](https://swagger.io/specification/) specification from the recordings using [`meeshkan`](https://github.com/Meeshkan/meeshkan) Python tool. OpenAPI specification acts as a contract specifying the API endpoints and what data they consume or produce, and you can use it for documentation or testing.

To get started, install `meeshkan` from [PyPI](https://pypi.org/project/meeshkan/):

```bash
$ pip install meeshkan
```

To create an OpenAPI specification to directory `my_spec/`, run the following command:

```bash
$ meeshkan build --source kafka -o my_spec
```

`meeshkan` will update the OpenAPI specification in memory whenever new data arrives in `http_recordings` topic. Stop `meeshkan` with `Ctrl+C` and the specification is written to `my_spec` directory with an `openapi.json` as follows:

```json
{
  "openapi": "3.0.0",
  "info": { "title": "API title", "version": "1.0", "description": "API description" },
  "paths": {
    "/non-existent": {
      "summary": "Path summary",
      "description": "Path description",
      "get": {
        "responses": {
          "404": {
            "description": "Response description",
            "headers": {},
            "content": { "text/plain": { "schema": { "type": "string" } } },
            "links": {}
          }
        },
        "summary": "Operation summary",
        "description": "Operation description",
        "operationId": "id",
        "parameters": [
          { "name": "user-agent", "in": "header", "required": false, "schema": { "type": "string" } },
          { "name": "accept", "in": "header", "required": false, "schema": { "type": "string" } },
          { "name": "host", "in": "header", "required": false, "schema": { "type": "string" } }
        ]
      }
    },
    "/": {
      "summary": "Path summary",
      "description": "Path description",
      "post": {
        "responses": {
          "200": {
            "description": "Response description",
            "headers": {},
            "content": {
              "application/json": {
                "schema": {
                  "required": ["email", "id", "name"],
                  "properties": {
                    "id": { "type": "string" },
                    "name": { "type": "string" },
                    "email": { "type": "string" }
                  },
                  "type": "object"
                }
              }
            },
            "links": {}
          }
        },
        "summary": "Operation summary",
        "description": "Operation description",
        "operationId": "id",
        "parameters": [
          { "name": "content-length", "in": "header", "required": false, "schema": { "type": "string" } },
          { "name": "accept", "in": "header", "required": false, "schema": { "type": "string" } },
          { "name": "host", "in": "header", "required": false, "schema": { "type": "string" } },
          { "name": "user-agent", "in": "header", "required": false, "schema": { "type": "string" } },
          { "name": "content-type", "in": "header", "required": false, "schema": { "type": "string" } }
        ]
      }
    }
  },
  "servers": [{ "url": "http://localhost" }]
}
```

## Conclusion

- For better performance, you probably want to use a format like Avro
-

## How to write

Find a good topic and commit to it
Make your goals and audience specific
Have a beginning, middle, and end
Get feedback and iterate
Add finishing touches: packaging, publication, and promotion

Introduction
The first paragraph or two of your post will either convince the reader to stay on or lose their attention. Start off with a little bit of context to help people understand where your post fits into the big picture. Then, tell your audience what they will get out of reading your article. It might be tempting to leave the big reveal for the end, but watch out: if you don’t have a good hook, your readers won’t stick around to find out.

Middle
Now that you’ve told your readers what to expect, give it to them! Feel free to go into as much detail as you need, and leave sign-posts along the way to orient people. Use a lot of headings, numbered lists, and formatting to help people understand where they are, and enable them to skip around to the content they are most interested in.

Conclusion
Don’t just taper off into the void at the end of the article. If your reader has made it all the way there, they really care. Give them a quick summary of what they learned, a pat on the back for reading, and maybe even something to do next if they’re inspired - a call to action.
