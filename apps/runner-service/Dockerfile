FROM oven/bun:1-alpine

RUN apk add --no-cache bash

WORKDIR /code

COPY package*.json ./

RUN bun install

COPY . .

EXPOSE 3000

CMD [ "bun","run","src/index.ts" ]