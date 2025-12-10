import json
import datetime
import time
from kafka import KafkaProducer  # pyright: ignore[reportMissingImports]
import random

# Check if broker is available
def is_broker_available():
    try:
        test_producer = KafkaProducer(bootstrap_servers=['kafka:9092'], request_timeout_ms=5000)
        test_producer.close()
        return True
    except Exception as e:
        print(f"Broker not available: {e}")
        return False

def simulate_energy_consumption(current_time):
    """
    Simulates energy consumption based on the current time.
    Works with both timezone-aware and naive datetime objects,
    but always converts internally to UTC for consistency.
    """

    # Ensure timestamp is timezone-aware (UTC)
    if current_time.tzinfo is None:
        # Assume naive timestamps are intended to be UTC
        current_time = current_time.replace(tzinfo=datetime.timezone.utc)
    else:
        # Normalize to UTC in case a different tz is provided
        current_time = current_time.astimezone(datetime.timezone.utc)

    # Example consumption logic — adjust as needed
    hour = current_time.hour

    # Simple diurnal consumption pattern
    if 0 <= hour < 6:
        base_consumption = 1.2
    elif 6 <= hour < 12:
        base_consumption = 3.7
    elif 12 <= hour < 18:
        base_consumption = 5.4
    else:
        base_consumption = 2.8

    # Add some variation
    noise = (current_time.microsecond % 100000) / 1000000.0

    return round(base_consumption + noise, 3)


# Kafka topic to produce messages to
topic = 'energy_consumed'

kafka_config = {
    'bootstrap_servers': ['kafka:9092']
}

# Wait for Kafka to be ready
print("Waiting for Kafka broker to be available...")
max_retries = 30
retry_count = 0
while not is_broker_available() and retry_count < max_retries:
    print(f"Retry {retry_count + 1}/{max_retries}...")
    time.sleep(2)
    retry_count += 1

if retry_count >= max_retries:
    print("Kafka broker did not become available. Exiting.")
    exit(1)

print("Kafka broker is available. Starting producer...")

# Kafka producer
producer = KafkaProducer(**kafka_config)

if __name__ == "__main__":
    try:
        # The moment the program begins, in UTC (timezone-aware)
        start = datetime.datetime.now(datetime.timezone.utc)

        while True:
            # Always use the current real UTC time (timezone-aware)
            current_time = datetime.datetime.now(datetime.timezone.utc)

            # Recalculate energy for this timestamp
            energy_consumed = simulate_energy_consumption(current_time)

            for meter_id in range(1, 21):
                data = {
                    "consumption_time": current_time.strftime('%Y-%m-%dT%H:%M:%S.%fZ')[:-3] + 'Z',
                    "meter_id": meter_id,
                    "energy_consumed": energy_consumed
                }
                message_str = json.dumps(data).encode('utf-8')
                producer.send(topic, message_str)

            # current_time += datetime.timedelta(milliseconds=100)  # <-- original increment, now comment
            # if current_time.day != 1:                             # <-- original conditional, now comment
            time.sleep(0.1)  # send data every 100ms

    except Exception as e:
        print("Error:", e)


    finally:
        print('Producer closed')
        producer.flush() 
        producer.close()