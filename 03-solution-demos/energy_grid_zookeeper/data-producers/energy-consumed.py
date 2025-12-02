import json
import datetime
import time
from kafka import KafkaProducer
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

def simulate_energy_consumption(date: datetime.datetime) -> float:
    # Time of day factors
    hour = date.hour
    minute = date.minute
    
    # Basic curve for energy consumption based on time of day
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
        start = datetime.datetime.now()
        current_time = datetime.datetime(1997, 5, 1, 0, 0, 0)
        energy_consumed = simulate_energy_consumption(current_time)
        while True:
            for meter_id in range(1, 21):
                data = {
                    "consumption_time": current_time.strftime('%Y-%m-%dT%H:%M:%SZ'),
                    "meter_id": meter_id,
                    "energy_consumed": energy_consumed
                }
                message_str = json.dumps(data).encode('utf-8')
                producer.send(topic, message_str)
            current_time += datetime.timedelta(minutes=1)
            if current_time.day != 1:
                time.sleep(0.8)

    finally:
        print('Producer closed')
        producer.flush() 
        producer.close()