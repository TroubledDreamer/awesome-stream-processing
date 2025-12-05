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
    AdminClient = None  # fallback to Producer.list_topics

BOOTSTRAP_SERVERS = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "warp:9092")
TOPIC = "energy_produced"


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


def simulate_energy_production(date: datetime.datetime) -> float:
    hour = date.hour
    minute = date.minute

    if 6 <= hour <= 18:
        time_factor = max(0, 1 - abs(12 - (hour + minute / 60)) / 6)
    else:
        time_factor = 0

    month = date.month
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
                energy_produced = simulate_energy_production(current_time)
                data = {
                    "production_time": current_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                    "meter_id": meter_id,
                    "energy_produced": energy_produced,
                }
                message_bytes = json.dumps(data).encode("utf-8")
                try:
                    producer.produce(TOPIC, value=message_bytes, callback=delivery_report)
                except KafkaException as ke:
                    print(f"[produce] Kafka exception while producing: {ke}")
                producer.poll(0)

            producer.flush(1.0)
            current_time += datetime.timedelta(minutes=1)
            if current_time.day != 1:
                time.sleep(0.005)

    except KeyboardInterrupt:
        print("[main] Interrupted by user")
    finally:
        print("[shutdown] Flushing producer and exiting")
        producer.flush()


if __name__ == "__main__":
    main()






# import json
# import datetime
# from confluent_kafka import KafkaProducer
# import time
# import random

# # Check if broker is available
# def is_broker_available():
#     global producer
#     try:
#         return True
#     except Exception as e:
#         print(f"Broker not available: {e}")
#         return False

# def simulate_energy_production(date: datetime.datetime) -> float:

#     hour = date.hour
#     minute = date.minute
    
#     # Basic curve for solar production based on time of day (higher at noon)
#     if 6 <= hour <= 18:  # Solar production only between 6 AM and 6 PM
#         # Calculate time factor based on proximity to noon
#         time_factor = max(0, 1 - abs(12 - (hour + minute / 60)) / 6)
#     else:
#         time_factor = 0  # No production at night

#     month = date.month
    
#     if month in [12, 1, 2]:  # Winter
#         season_factor = 0.3
#     elif month in [3, 4, 5]:  # Spring
#         season_factor = 0.5
#     elif month in [6, 7, 8]:  # Summer
#         season_factor = 0.8
#     elif month in [9, 10, 11]:  # Autumn
#         season_factor = 0.6

#     base_production = 0.05  

#     fluctuation = random.uniform(0.6, 1.0)

#     # Calculate the final production for the minute
#     production = base_production * time_factor * season_factor * fluctuation
    
#     return round(production, 3)

# #current_time = datetime.datetime(1997, 5, 29, 12, 0, 0)
# #print(simulate_energy_production(current_time))

# # Kafka topic to produce messages to
# topic = 'energy_produced'

# kafka_config = {
#     'bootstrap_servers': ['localhost:9092']
# }
# # Kafka producer
# producer = KafkaProducer(**kafka_config)

# if __name__ == "__main__":

#     try:
#     # Produce messages to the Kafka topic
#         start = datetime.datetime.now()
#         current_time = datetime.datetime(1997, 5, 1, 0, 0, 0)
#         while is_broker_available():
#             for meter_id in range(1, 21):
#                 energy_produced = simulate_energy_production(current_time)
#                 data = {
#                     "production_time": current_time.strftime('%Y-%m-%dT%H:%M:%SZ'),
#                     "meter_id": meter_id,
#                     "energy_produced": energy_produced
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