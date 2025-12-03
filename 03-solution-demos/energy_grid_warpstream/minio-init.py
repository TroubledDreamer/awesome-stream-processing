import boto3
import time

# Wait for MinIO to be ready
time.sleep(3)

# Connect to MinIO
s3 = boto3.client(
    's3',
    endpoint_url='http://minio:9000',
    aws_access_key_id='admin',
    aws_secret_access_key='admin123',
    region_name='us-east-1'
)

# Create bucket
try:
    s3.create_bucket(Bucket='warpstream')
    print('Bucket warpstream created successfully')
except:
    print('Bucket already exists')