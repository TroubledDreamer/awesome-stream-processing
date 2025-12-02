import json
import datetime
from confluent_kafka import Producer
import time
import random
import os

def delivery_report(err, msg):
    if err is not None:
        print(f'Message delivery failed: {err}')

def is_broker_available():
    try:
        p = Producer({
            'bootstrap.servers': 'warpstream:9092', 
            'socket.timeout.ms': 10000,
            'connections.max.idle.ms': 10000
        })
        # Actually attempt to get metadata
        metadata = p.list_topics(timeout=5)
        p.close()
        return True
    except Exception as e:
        print(f"Broker not available: {e}")
        return False

def simulate_energy_consumption(date: datetime.datetime) -> float:
    hour = date.hour
    
    if 6 <= hour < 9:
        time_factor = 1.4
    elif 17 <= hour < 21:
        time_factor = 1.7
    elif 9 <= hour < 17:
        time_factor = 1.2
    elif 21 <= hour or hour < 6:
        time_factor = 0.7
    else:
        time_factor = 0.5

    fluctuation = random.uniform(0.9, 1.1)
    base_consumption = 0.025 
    consumption = base_consumption * time_factor * fluctuation
    
    return round(consumption, 3)

topic = 'energy_consumed'

kafka_config = {
    'bootstrap.servers': os.getenv('WARPSTREAM_BOOTSTRAP_SERVERS', 'warpstream:9092'),
    'message.timeout.ms': 120000,
    'socket.keepalive.enable': True,
    'socket.timeout.ms': 30000,
    'connections.max.idle.ms': 300000
}

print("Waiting for WarpStream broker to be available...")
max_retries = 30
retry_count = 0
while not is_broker_available() and retry_count < max_retries:
    print(f"Retry {retry_count + 1}/{max_retries}...")
    time.sleep(2)
    retry_count += 1

if retry_count >= max_retries:
    print("Kafka broker did not become available. Exiting.")
    exit(1)

print("WarpStream broker is available. Starting producer...")

producer = Producer(kafka_config)

if __name__ == "__main__":
    try:
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
                producer.produce(topic, value=message_str, callback=delivery_report)
            current_time += datetime.timedelta(minutes=1)
            if current_time.day != 1:
                time.sleep(0.8)

    finally:
        print('Producer closed')
        producer.flush()