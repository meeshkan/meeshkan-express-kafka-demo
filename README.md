# Express + HttpTypes + Kafka + Meeshkan

Example [express](https://expressjs.com/) server using [Meeshkan express-middleware](https://github.com/Meeshkan/express-middleware) to push HTTP traffic to [Kafka](https://kafka.apache.org/).

## Instructions

Install dependencies:

```bash
$ yarn
```

Start local Kafka cluster using Docker:

```bash
$ docker-compose up
```

Create the destination topic:

```bash
$ docker exec kafka1 kafka-topics --bootstrap-server localhost:9092 --topic express_recordings --create --partitions 3 --replication-factor 1
```

Start the server:

```bash
$ yarn start
```

Make calls to the server:

```bash
$ curl http://localhost:3000
```

Start console consumer to read messages from Kafka:

```bash
$ docker exec kafka1 kafka-console-consumer --bootstrap-server localhost:9092 --topic express_recordings --from-beginning
```

Alternatively, if you use `kafkacat`:

```bash
$ kafkacat -b localhost:9092 -t express_recordings -C
```

## Miscellaneous

### Using Kafka CLI locally

Create the topic:

```bash
$ kafka-topics.sh --bootstrap-server localhost:9092 --topic express_recordings --create --partitions 3 --replication-factor 1
```

List topics:

```bash
$ kafka-topics.sh --bootstrap-server localhost:9092 --list
```

Delete the topic:

```bash
$ kafka-topics.sh --bootstrap-server localhost:9092 --topic express_recordings --delete
```

Print consumer groups:

```bash
$ kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --all-groups
```
