# Pre-seeded MongoDB for the AutoBB Web UI demo.
#
# The base mongo image runs every *.js in /docker-entrypoint-initdb.d/ on first
# start (against MONGO_INITDB_DATABASE). seed.js fabricates a synthetic dataset
# with now-relative dates, so a fresh container always has fresh-looking data.
#
# Build context is the demo/ directory:
#   docker build -f demo/db.Dockerfile -t autobb-demo-db demo
FROM mongo:7

ENV MONGO_INITDB_DATABASE=autobbdb

COPY seed.js /docker-entrypoint-initdb.d/seed.js
