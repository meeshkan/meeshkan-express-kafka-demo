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

We'll create a RESTful server with [Express](https://expressjs.com/). We use Express because it has ready-made [middleware](https://github.com/Meeshkan/express-middleware) for recording traffic logs in [http-types](https://meeshkan.github.io/http-types/) format. HTTP Types is a human-readable JSON format for HTTP exchanges, with a single exchange looking as follows:

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

### HTTP traffic is valuable

- HTTP traffic is valuable data
- HTTP traffic is high volume -> made for Kafka
- http-types is a convenient format for logging HTTP traffic

- You'll learn a bit Node.js
- You'll learn how to start Kafka

- Create an Express server
- Add middleware logging to Kafka in http-types format
- Show an example application creating OpenAPI specs on the fly

## Middle

### Create a Node.js server

### Start Kafka

### Start recording

### Example: read recordings to create a specification

## Conclusion

- For better performance, you probably want to use a format like Avro

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
