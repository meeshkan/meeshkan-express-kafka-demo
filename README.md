# Express + HTTP Types + Kafka + Meeshkan

An example [express](https://expressjs.com/) server using [Meeshkan express middleware](https://github.com/meeshkan/express-middleware) to record HTTP traffic to [Kafka](https://kafka.apache.org/).

The full tutorial associated with this repository is available on the Meeshkan blog: [Building a real-time HTTP traffic stream with Apache Kafka](https://meeshkan.com/blog/building-a-real-time-http-traffic-stream-with-apache-kafka/).

## Prerequisites

1. [**Node.js**](https://nodejs.org/en/download/) >= 8.0 and optionally [**yarn**](https://yarnpkg.com/)
1. Either [**Docker**](https://docs.docker.com/) or [**Kafka**](https://kafka.apache.org/quickstart#quickstart_download) installation
1. Optional: **[Python](https://www.python.org/) 3.6+** and [**pip**](https://pip.pypa.io/en/stable/installing/) if building an OpenAPI specification with our [HTTP Mocking Toolkit (HMT)](https://github.com/meeshkan/hmt)

## Instructions

### Setting up the server

First, clone the repository and navigate inside it:

```bash
git clone https://github.com/meeshkan/meeshkan-express-kafka-demo.git
cd meeshkan-express-kafka-demo
```

Install Express server dependencies:

```bash
# If you're using npm
$ npm install

# If you're using yarn
$ yarn
```

### Preparing Kafka

If you have Docker, start a local Kafka cluster with one Zookeeper and Kafka node by using Docker Compose:

```bash
$ docker-compose up -d
```

> _Note: You can find the configuration for this in our [docker-compose.yml](./docker-compose.yml) file._

Alternatively, if you have Kafka installed, start Zookeeper and Kafka as instructed in [Kafka documentation](https://kafka.apache.org/quickstart#quickstart_startserver).

Create the destination topic:

```bash
# If you're using Docker
$ bin/kafka-topics.sh --bootstrap-server localhost:9092 --topic http_recordings --create --partitions 3 --replication-factor 1

# If you have Kafka installed
$ docker exec kafka1 kafka-topics --bootstrap-server localhost:9092 --topic http_recordings --create --partitions 3 --replication-factor 1
```

### Starting the server

Start the Express server:

```bash
# If you're using npm
$ npm run start

# If you're using yarn
$ yarn start
```

### Working with Kafka

Start console consumer to read messages from Kafka:

```bash
# If you're using Docker
$ docker exec kafka1 kafka-console-consumer --bootstrap-server localhost:9092 --topic http_recordings --from-beginning

# If you have Kafka installed
$ bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic http_recordings --from-beginning
```

Alternatively, if you use [`kafkacat`](https://github.com/edenhill/kafkacat):

```bash
$ kafkacat -b localhost:9092 -t http_recordings -C
```

Start making calls to the server via [`curl`](https://curl.haxx.se/) and see traffic being recorded in Kafka:

```bash
# Create a user with POST /users
$ curl -X POST -d '{"name": "Kimmo", "email": "kimmo@example.com" }' -H "Content-Type: application/json" http://localhost:3000/users

# Get user with GET /users/{id}
$ curl http://localhost:3000/users/5720862f-9534-4d97-8afe-c07f38a728b7
```

> _Note: The recorded traffic logs are in the [HTTP Types](https://github.com/meeshkan/http-types/) format._

### Creating an OpenAPI specification

To create an OpenAPI specification from recordings, install [`hmt`](https://pypi.org/project/hmt/):

```bash
$ pip install hmt
```

Then, run the following command:

```bash
$ hmt build --source kafka -o my_spec
```

> _Note: This instructs `hmt` to write the OpenAPI specification to the `my_spec/` directory._

### Shutting down the server and Kafka cluster

Finally, stop the Express server and close down the Kafka cluster:

```bash
$ docker-compose down
```

## Miscellaneous

### Using Kafka CLI locally

Create the topic:

```bash
$ kafka-topics.sh --bootstrap-server localhost:9092 --topic http_recordings --create --partitions 3 --replication-factor 1
```

List topics:

```bash
$ kafka-topics.sh --bootstrap-server localhost:9092 --list
```

Delete the topic:

```bash
$ kafka-topics.sh --bootstrap-server localhost:9092 --topic http_recordings --delete
```

Print consumer groups:

```bash
$ kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --all-groups
```
