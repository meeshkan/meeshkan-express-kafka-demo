import express = require("express");
import debug = require("debug");
import httpExpress from "@meeshkaml/express-middleware";
import * as kafka from "@meeshkanml/http-types-kafka";
import { HttpExchange } from "http-types";

const debugLog = debug("express-app");

const KAFKA_TOPIC = "express_recordings";
const KAFKA_CONFIG: kafka.KafkaConfig = {
  brokers: ["localhost:9092"],
};
const PORT = 3000;

const buildApp = (kafkaTransport: kafka.HttpTypesKafkaProducer) => {
  const app = express();

  const transport = async (exchange: HttpExchange) => {
    debugLog("Sending an exchange to Kafka");
    await kafkaTransport.send(exchange);
  };

  app.use(
    httpExpress({
      transports: [transport],
    })
  );

  app.get("/", (_: express.Request, res: express.Response) => {
    res.json({ hello: "world" });
  });

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
