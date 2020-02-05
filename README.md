# Express + HttpTypes + Kafka + Meeshkan

## Using Kafka

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
$ kafka-topics.sh --bootstrap-server localhost:9092 --topic express-recordings --delete
```
