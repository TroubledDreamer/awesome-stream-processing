import json
import datetime
from confluent_kafka import Producer
import time
import random
import os
import sys

def delivery_report(err, msg):
    if err is not None:
        print(f"Message delivery failed: {err}")
    else:
        # optional: debug ack
        # print(f"Delivered message to {msg.topic()} [{msg.partition()}] at {msg.offset()}")
        pass

def is_broker_available():
    try:
        p = Producer({
            "bootstrap.servers": os.getenv("WARPSTREAM_BOOTSTRAP_SERVERS", "warpstream:9092"),
            "socket.timeout.ms": 10000,
            "connections.max.idle.ms": 10000
        })
        _ = p.list_topics(timeout=5)
        p.flush(1)
        return True
    except Exception as e:
        print(f"Broker not available: {e}")
        return False

def simulate_energy_production(dt: datetime.datetime) -> float:
    hour = dt.hour
    minute = dt.minute
    if 6 <= hour <= 18:
        time_factor = max(0, 1 - abs(12 - (hour + minute / 60)) / 6)
    else:
        time_factor = 0
    month = dt.month
    if month in [12, 1, 2]:
        season_factor = 0.3
    elif month in [3, 4, 5]:
        season_factor = 0.5
    elif month in [6, 7, 8]:
        season_factor = 0.8
    else:
        season_factor = 0.6
    base_production = 0.05
    fluctuation = random.uniform(0.6, 1.0)
    production = base_production * time_factor * season_factor * fluctuation
    return round(production, 3)

topic = os.getenv("ENERGY_PRODUCED_TOPIC", "energy_produced")

kafka_config = {
    "bootstrap.servers": os.getenv("WARPSTREAM_BOOTSTRAP_SERVERS", "warpstream:9092"),
    "message.timeout.ms": 120000,
    "socket.keepalive.enable": True,
    "socket.timeout.ms": 30000,
    "connections.max.idle.ms": 300000,
    # librdkafka queue tuning
    "queue.buffering.max.messages": 100000,
    "queue.buffering.max.kbytes": 1048576,
    "linger.ms": 50,
}

print("Waiting for WarpStream broker to be available...")
max_retries = int(os.getenv("BROKER_RETRY_MAX", "30"))
retry_count = 0
while not is_broker_available() and retry_count < max_retries:
    retry_count += 1
    print(f"Retry {retry_count}/{max_retries}...")
    time.sleep(2)

if retry_count >= max_retries:
    print("Kafka broker did not become available. Exiting.")
    sys.exit(1)

print("WarpStream broker is available. Starting producer...")

producer = Producer(kafka_config)

producing = True
# optional: limit messages for test environment
max_messages = int(os.getenv("PRODUCE_MAX_MESSAGES", "0"))  # 0 => unlimited
sent = 0
meters = list(range(1, int(os.getenv("METER_COUNT", "10")) + 1))

try:
    while producing:
        now = datetime.datetime.utcnow()
        for meter in meters:
            payload = {
                "production_time": now.isoformat() + "Z",
                "meter_id": meter,
                "energy_produced": simulate_energy_production(now)
            }
            message_str = json.dumps(payload)
            try:
                producer.produce(topic, value=message_str, callback=delivery_report)
            except BufferError:
                # backpressure: poll and wait briefly then retry once
                producer.poll(0.1)
                time.sleep(0.05)
                try:
                    producer.produce(topic, value=message_str, callback=delivery_report)
                except BufferError:
                    # if still full, drop or sleep longer
                    print("Local queue full after retry, sleeping...")
                    producer.poll(0.1)
                    time.sleep(0.5)
            # service background delivery callbacks
            producer.poll(0)
            sent += 1
            if max_messages and sent >= max_messages:
                producing = False
                break
        # pacing: adjust to your test data cadence
        time.sleep(float(os.getenv("PRODUCE_INTERVAL_SEC", "1.0")))
finally:
    print("Flushing outstanding messages...")
    producer.flush(10)