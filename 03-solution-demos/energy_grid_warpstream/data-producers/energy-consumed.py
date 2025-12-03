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

def simulate_energy_consumption(dt: datetime.datetime) -> float:
    # simple synthetic load pattern
    hour = dt.hour
    peak = 1.0 if 18 <= hour <= 22 else 0.6 if 8 <= hour <= 18 else 0.3
    base = 0.5
    fluct = random.uniform(0.8, 1.2)
    return round(base * peak * fluct, 3)

topic = os.getenv("ENERGY_CONSUMED_TOPIC", "energy_consumed")

kafka_config = {
    "bootstrap.servers": os.getenv("WARPSTREAM_BOOTSTRAP_SERVERS", "warpstream:9092"),
    "message.timeout.ms": 120000,
    "socket.keepalive.enable": True,
    "socket.timeout.ms": 30000,
    "connections.max.idle.ms": 300000,
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
max_messages = int(os.getenv("PRODUCE_MAX_MESSAGES", "0"))
sent = 0
meters = list(range(1, int(os.getenv("METER_COUNT", "10")) + 1))

try:
    while producing:
        now = datetime.datetime.utcnow()
        for meter in meters:
            payload = {
                "consumption_time": now.isoformat() + "Z",
                "meter_id": meter,
                "energy_consumed": simulate_energy_consumption(now)
            }
            message_str = json.dumps(payload)
            try:
                producer.produce(topic, value=message_str, callback=delivery_report)
            except BufferError:
                producer.poll(0.1)
                time.sleep(0.05)
                try:
                    producer.produce(topic, value=message_str, callback=delivery_report)
                except BufferError:
                    print("Local queue full after retry, sleeping...")
                    producer.poll(0.1)
                    time.sleep(0.5)
            producer.poll(0)
            sent += 1
            if max_messages and sent >= max_messages:
                producing = False
                break
        time.sleep(float(os.getenv("PRODUCE_INTERVAL_SEC", "1.0")))
finally:
    print("Flushing outstanding messages...")
    producer.flush(10)