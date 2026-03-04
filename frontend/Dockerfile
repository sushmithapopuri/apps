# Build Stage: Build the React + Vite application
FROM node:20-slim AS build-stage

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Pass build arguments for VITE variables
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build the application
RUN npm run build

# Output Stage: serve built files to the shared volume
FROM alpine:3.19

COPY --from=build-stage /app/dist /app/dist

# On start, copy built files to the Caddy-served volume and exit
CMD ["sh", "-c", "cp -r /app/dist/. /srv/frontend/ && echo 'Frontend assets deployed to /srv/frontend' && sleep 3"]
