FROM python:3.8

WORKDIR /app

COPY data-producers/energy-consumed.py .
COPY data-producers/energy-produced.py .
COPY data-producers/run-producers.py .

RUN pip install confluent-kafka

CMD ["python", "run-producers.py"]