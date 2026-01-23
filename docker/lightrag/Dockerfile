FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl gcc libpq-dev \
  && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir "lightrag-hku[api]"

EXPOSE 9621
