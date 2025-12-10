import json
import datetime
from kafka import KafkaProducer  # pyright: ignore[reportMissingImports]
import time
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

def simulate_energy_production(date: datetime.datetime) -> float:
    """
    Simulates realistic solar energy production (comparable to consumption values).
    Handles both timezone-aware and naive datetime objects by normalizing to UTC.
    """

    # Ensure timestamp is timezone-aware (UTC)
    if date.tzinfo is None:
        date = date.replace(tzinfo=datetime.timezone.utc)
    else:
        date = date.astimezone(datetime.timezone.utc)

    hour = date.hour
    minute = date.minute

    # --- Time-of-day solar curve ---
    # Peak at noon, zero at night. Produces only 6 AM – 6 PM.
    if 6 <= hour <= 18:
        # smooth curve centered on 12:00
        time_factor = max(0, 1 - abs(12 - (hour + minute / 60)) / 6)
    else:
        time_factor = 0.0

    # --- Seasonal scaling ---
    month = date.month

    if month in (12, 1, 2):       # Winter
        season_factor = 0.6   # lower solar intensity
    elif month in (3, 4, 5):      # Spring
        season_factor = 0.9
    elif month in (6, 7, 8):      # Summer
        season_factor = 1.2   # highest production
    else:                         # Autumn
        season_factor = 0.8

    # --- Base peak output (midday summer) ---
    # Increase this to make solar match consumption scale.
    peak_output = 6.0  # typical midday output (can tune)

    # --- Natural fluctuation ---
    fluctuation = random.uniform(0.85, 1.15)

    # Final production
    production = peak_output * time_factor * season_factor * fluctuation

    return round(production, 3)


# Kafka topic to produce messages to
topic = 'energy_produced'

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
        # Start time of the producer in UTC (timezone-aware)
        start = datetime.datetime.now(datetime.timezone.utc)

        while True:
            # Always use current real UTC time (timezone-aware)
            current_time = datetime.datetime.now(datetime.timezone.utc)

            for meter_id in range(1, 21):
                energy_produced = simulate_energy_production(current_time)

                data = {
                    "production_time": current_time.strftime('%Y-%m-%dT%H:%M:%S.%fZ')[:-3] + 'Z',
                    "meter_id": meter_id,
                    "energy_produced": energy_produced
                }

                message_str = json.dumps(data).encode('utf-8')
                producer.send(topic, message_str)

            # current_time += datetime.timedelta(milliseconds=100)  # <-- original increment (now comment)
            # if current_time.day != 1:                            # <-- original day check (now comment)
            time.sleep(0.1)

    except Exception as e:
        print("Error:", e)


    finally:
        print('Producer closed')

        # Wait for any outstanding messages to be delivered and delivery reports received
        producer.flush() 
        producer.close()