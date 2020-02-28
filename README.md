# Express + HttpTypes + Kafka + Meeshkan

Example [express](https://expressjs.com/) server using [Meeshkan express-middleware](https://github.com/Meeshkan/express-middleware) to record HTTP traffic to [Kafka](https://kafka.apache.org/).

## Prerequisites

1. [**Node.js**](https://nodejs.org/en/download/) >= 8.0 and optionally [`yarn`](https://yarnpkg.com/)
1. Either [**Docker**](https://docs.docker.com/) or [**Kafka**](https://kafka.apache.org/quickstart#quickstart_download) installation
1. Optional: **Python 3.6+** if building OpenAPI specification with [meeshkan](https://github.com/meeshkan/meeshkan)

## Instructions

First, clone the repository and navigate inside it.

Install Express server dependencies:

```bash
$ yarn
# OR if using `npm`
$ npm install
```

If you have Docker, start local Kafka cluster with one Zookeeper and Kafka node using Docker compose:

```bash
$ docker-compose up -d
```

Alternatively, if you have Kafka installed, start Zookeeper and Kafka as instructed in [Kafka documentation](https://kafka.apache.org/quickstart#quickstart_startserver).

Create the destination topic:

```bash
$ docker exec kafka1 kafka-topics --bootstrap-server localhost:9092 --topic http_recordings --create --partitions 3 --replication-factor 1
# OR if not using Docker
$ bin/kafka-topics.sh --bootstrap-server localhost:9092 --topic http_recordings --create --partitions 3 --replication-factor 1
```

Start the Express server:

```bash
$ yarn start
# OR if using `npm`
$ npm run start
```

Start console consumer to read messages from Kafka:

```bash
$ docker exec kafka1 kafka-console-consumer --bootstrap-server localhost:9092 --topic http_recordings --from-beginning
```

Alternatively, if you use [`kafkacat`](https://github.com/edenhill/kafkacat):

```bash
$ kafkacat -b localhost:9092 -t http_recordings -C
```

Start making calls to the server and see traffic being recorded in Kafka:

```bash
# Try get a user with invalid id
curl http://localhost:3000/users/does-not-exist
# Create a user with POST /users
$ curl -X POST -d '{"name": "Kimmo", "email": "kimmo@example.com" }' -H "Content-Type: application/json" http://localhost:3000/users
# Get user with GET /users/{id}
$ curl http://localhost:3000/users/5720862f-9534-4d97-8afe-c07f38a728b7
```

To create an OpenAPI specification from recordings, install [`meeshkan`](https://pypi.org/project/meeshkan/):

```bash
$ pip install meeshkan
```

and run the following command:

```bash
$ meeshkan build --source kafka -o my_spec
```

`meeshkan` writes the OpenAPI specification to `my_spec/` directory.

Finally, close the Express server and tear down Docker:

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
