import subprocess
import os
import time
from kafka import KafkaProducer
from kafka.errors import NoBrokersAvailable

def wait_for_kafka():
    """Wait for Kafka to be available"""
    max_retries = 30
    for attempt in range(max_retries):
        try:
            producer = KafkaProducer(bootstrap_servers=['warpstream:9092'])
            producer.close()
            print(f"Kafka is ready after {attempt + 1} attempts")
            return True
        except NoBrokersAvailable:
            print(f"Waiting for Kafka... attempt {attempt + 1}/{max_retries}")
            time.sleep(5)
    return False

print("Waiting for Kafka to be ready...")
if not wait_for_kafka():
    print("Failed to connect to Kafka after 30 attempts")
    exit(1)

# Get the current directory
current_directory = os.path.dirname(os.path.realpath(__file__))

# File paths for the Python files
file1_path = os.path.join(current_directory, 'energy-consumed.py')
file2_path = os.path.join(current_directory, 'energy-produced.py')

print("Starting producers...")
# Start file1.py in a separate process
process1 = subprocess.Popen(['python3', file1_path])

# Start file2.py in a separate process
process2 = subprocess.Popen(['python3', file2_path])

# Wait for both processes to finish (which they never will in this case)
process1.wait()
process2.wait()