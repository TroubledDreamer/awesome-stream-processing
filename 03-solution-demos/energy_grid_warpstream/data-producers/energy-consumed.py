import os
import json
import datetime
import time
import random
from confluent_kafka import Producer

# AdminClient may live in confluent_kafka.admin in some package versions.
try:
    from confluent_kafka.admin import AdminClient  # preferred
except Exception:
    AdminClient = None  # fallback to Producer.list_topics

BOOTSTRAP_SERVERS = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "warp:9092")
TOPIC = "energy_consumed"


def is_broker_available(bootstrap_servers: str, timeout: float = 5.0) -> bool:
    if AdminClient is not None:
        try:
            admin = AdminClient({"bootstrap.servers": bootstrap_servers})
            admin.list_topics(timeout=timeout)
            return True
        except Exception as e:
            print(f"[broker check][AdminClient] not available: {e}")
            return False
    else:
        try:
            p = Producer({"bootstrap.servers": bootstrap_servers})
            p.list_topics(timeout=timeout)
            return True
        except Exception as e:
            print(f"[broker check][Producer fallback] not available: {e}")
            return False


def wait_for_broker(bootstrap_servers: str, max_wait: float = 30.0, interval: float = 2.0) -> bool:
    waited = 0.0
    while waited < max_wait:
        if is_broker_available(bootstrap_servers):
            return True
        time.sleep(interval)
        waited += interval
        print(f"[broker check] retrying... waited {waited:.0f}/{max_wait}s")
    return False


def simulate_energy_consumption(date: datetime.datetime) -> float:
    hour = date.hour

    if 6 <= hour < 9:
        time_factor = 1.4
    elif 17 <= hour < 21:
        time_factor = 1.7
    elif 9 <= hour < 17:
        time_factor = 1.2
    else:
        time_factor = 0.7

    fluctuation = random.uniform(0.9, 1.1)
    base_consumption = 0.025

    consumption = base_consumption * time_factor * fluctuation
    return round(consumption, 3)


def delivery_report(err, msg):
    if err is not None:
        print(f"[delivery] Failed to deliver message: {err}")


def main():
    print(f"[startup] using bootstrap servers: {BOOTSTRAP_SERVERS}")

    if not wait_for_broker(BOOTSTRAP_SERVERS, max_wait=30, interval=2):
        print("[startup] Broker not reachable after retries. Exiting.")
        return

    producer_cfg = {"bootstrap.servers": BOOTSTRAP_SERVERS}
    producer = Producer(producer_cfg)

    try:
        start = datetime.datetime.now()
        current_time = datetime.datetime(1997, 5, 1, 0, 0, 0)

        while is_broker_available(BOOTSTRAP_SERVERS):

            for meter_id in range(1, 21):
                for _ in range(500):
                    energy_consumed = simulate_energy_consumption(current_time)

                    data = {
                        "consumption_time": current_time.strftime('%Y-%m-%dT%H:%M:%SZ'),
                        "meter_id": meter_id,
                        "energy_consumed": energy_consumed
                    }

                    message_str = json.dumps(data).encode('utf-8')

                    # Produce message with async queue handling
                    while True:
                        try:
                            producer.produce(TOPIC, message_str, callback=delivery_report)
                            break
                        except BufferError:
                            producer.poll(0.1)  # Wait and process delivery reports

            producer.poll(0)  # Process callbacks after batch
            current_time += datetime.timedelta(minutes=1)

    except KeyboardInterrupt:
        print("[main] Interrupted by user")

    finally:
        print("[shutdown] Flushing producer and exiting")
        producer.flush(timeout=10)


if __name__ == "__main__":
    main()
