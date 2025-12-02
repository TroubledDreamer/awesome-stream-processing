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
    elif month in [9, 10, 11]:
        season_factor = 0.6

    base_production = 0.05  
    fluctuation = random.uniform(0.6, 1.0)
    production = base_production * time_factor * season_factor * fluctuation
    
    return round(production, 3)

topic = 'energy_produced'

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
        while True:
            for meter_id in range(1, 21):
                energy_produced = simulate_energy_production(current_time)
                data = {
                    "production_time": current_time.strftime('%Y-%m-%dT%H:%M:%SZ'),
                    "meter_id": meter_id,
                    "energy_produced": energy_produced
                }
                message_str = json.dumps(data).encode('utf-8')
                producer.produce(topic, value=message_str, callback=delivery_report)
            current_time += datetime.timedelta(minutes=1)
            if current_time.day != 1:
                time.sleep(0.8)

    finally:
        print('Producer closed')
        producer.flush()