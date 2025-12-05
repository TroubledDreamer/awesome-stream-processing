import os
import json
import datetime
import time
import random
from confluent_kafka import Producer, KafkaException

# AdminClient may live in confluent_kafka.admin in some package versions.
try:
    from confluent_kafka.admin import AdminClient  # preferred
except Exception:
    AdminClient = None  # we'll fallback to using Producer.list_topics

BOOTSTRAP_SERVERS = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "warp:9092")
TOPIC = "energy_consumed"


def is_broker_available(bootstrap_servers: str, timeout: float = 5.0) -> bool:
    """
    Try to verify broker reachability. Prefer AdminClient if available, otherwise
    create a short-lived Producer and call list_topics as a fallback.
    """
    if AdminClient is not None:
        try:
            admin = AdminClient({"bootstrap.servers": bootstrap_servers})
            admin.list_topics(timeout=timeout)
            return True
        except Exception as e:
            print(f"[broker check][AdminClient] not available: {e}")
            return False
    else:
        # Fallback: use Producer.list_topics (works with confluent-kafka even if admin module missing)
        try:
            p = Producer({"bootstrap.servers": bootstrap_servers})
            # list_topics will raise if it cannot reach brokers
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

    if 6 <= hour < 9:  # Morning peak (6 AM to 9 AM)
        time_factor = 1.4
    elif 17 <= hour < 21:  # Evening peak (5 PM to 9 PM)
        time_factor = 1.7
    elif 9 <= hour < 17:  # Daytime (9 AM to 5 PM)
        time_factor = 1.2
    elif 21 <= hour or hour < 6:  # Nighttime (9 PM to 6 AM)
        time_factor = 0.7
    else:
        time_factor = 0.5

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
        current_time = datetime.datetime(1997, 5, 1, 0, 0, 0)
        while True:
            for meter_id in range(1, 21):
                energy_consumed = simulate_energy_consumption(current_time)
                data = {
                    "consumption_time": current_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                    "meter_id": meter_id,
                    "energy_consumed": energy_consumed,
                }
                message_bytes = json.dumps(data).encode("utf-8")
                try:
                    producer.produce(TOPIC, value=message_bytes, callback=delivery_report)
                except KafkaException as ke:
                    print(f"[produce] Kafka exception while producing: {ke}")
                producer.poll(0)

            producer.flush(1.0)
            current_time += datetime.timedelta(minutes=1)

            # Sleep only when simulating real-time progression
            if current_time.day != 1:
                time.sleep(0.0005)

    except KeyboardInterrupt:
        print("[main] Interrupted by user")
    finally:
        print("[shutdown] Flushing producer and exiting")
        producer.flush()


if __name__ == "__main__":
    main()

# import json
# import datetime
# import time
# from confluent_kafka import KafkaProducer
# import random

# # Check if broker is available
# def is_broker_available():
#     global producer
#     try:
#         return True
#     except Exception as e:
#         print(f"Broker not available: {e}")
#         return False

# def simulate_energy_consumption(date: datetime.datetime) -> float:

#     # Time of day factors
#     hour = date.hour
#     minute = date.minute
    
#     # Basic curve for energy consumption based on time of day
#     if 6 <= hour < 9:  # Morning peak (6 AM to 9 AM)
#         time_factor = 1.4
#     elif 17 <= hour < 21:  # Evening peak (5 PM to 9 PM)
#         time_factor = 1.7
#     elif 9 <= hour < 17:  # Daytime (9 AM to 5 PM)
#         time_factor = 1.2
#     elif 21 <= hour or hour < 6:  # Nighttime (9 PM to 6 AM)
#         time_factor = 0.7
#     else:
#         time_factor = 0.5  # Default factor for any edge cases

#     fluctuation = random.uniform(0.9, 1.1)

#     base_consumption = 0.025 

#     consumption = base_consumption * time_factor * fluctuation
    
#     return round(consumption, 3)

# # Kafka topic to produce messages to
# topic = 'energy_consumed'

# kafka_config = {
#     'bootstrap_servers': ['localhost:9092']
# }

# """current_time = datetime.datetime(1997, 5, 29, 0, 0, 0)
# for meter_id in range(1, 4):
#     for meter_id in range(1, 6):
#         energy_consumed = simulate_energy_consumption(current_time)
#         data = {
#             "production_time": current_time.strftime('%Y-%m-%dT%H:%M:%SZ'),
#             "meter_id": meter_id,
#             "energy_consumed": energy_consumed
#         }
#         print(data)
#     current_time += datetime.timedelta(minutes=1)"""

# """start = datetime.datetime.now()
# print(start.day)"""

# # Kafka producer
# producer = KafkaProducer(**kafka_config)

# if __name__ == "__main__":

#     try:
#     # Produce messages to the Kafka topic
#         start = datetime.datetime.now()
#         current_time = datetime.datetime(1997, 5, 1, 0, 0, 0)
#         energy_consumed = simulate_energy_consumption(current_time)
#         while is_broker_available():
#             for meter_id in range(1, 21):
#                 data = {
#                     "consumption_time": current_time.strftime('%Y-%m-%dT%H:%M:%SZ'),
#                     "meter_id": meter_id,
#                     "energy_consumed": energy_consumed
#                 }
#                 message_str = json.dumps(data).encode('utf-8')
#                 producer.send(topic, message_str)
#             current_time += datetime.timedelta(minutes=1)
#             if current_time.day != 1:
#                 time.sleep(0.8)

#     finally:
#         print('Producer closed')

#         # Wait for any outstanding messages to be delivered and delivery reports received
#         producer.flush() 
#         producer.close()